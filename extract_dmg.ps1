param(
    [string]$Dmg = '.\MagiMir2_mac_arm64_2.0.5.dmg',
    [string]$BlockMap = '.\MagiMir2_blkx.json',
    [string]$Output = '.\MagiMir2_raw.img',
    [string]$Lzfse = '.\tools\lzfse-build\Release\lzfse.exe'
)

$dmgPath = (Resolve-Path -LiteralPath $Dmg).Path
$mapPath = (Resolve-Path -LiteralPath $BlockMap).Path
$lzfsePath = (Resolve-Path -LiteralPath $Lzfse).Path
$outPath = [IO.Path]::GetFullPath((Join-Path (Get-Location) $Output))
$tables = Get-Content -LiteralPath $mapPath -Raw | ConvertFrom-Json
$source = [IO.File]::OpenRead($dmgPath)
$target = [IO.File]::Open($outPath, [IO.FileMode]::Create, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$target.SetLength(217579520)
$tempDir = Join-Path (Get-Location) '.dmg-chunk-work'
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$compressedPath = Join-Path $tempDir 'chunk.lzfse'
$decodedPath = Join-Path $tempDir 'chunk.raw'
$decodedCount = 0
$written = [int64]0
try {
    foreach ($table in $tables) {
        $baseSector = [int64]$table.first_sector
        $dataOffset = [int64]$table.data_offset
        foreach ($chunk in $table.chunks) {
            $kind = [string]$chunk.kind
            if ($kind -in @('end', 'comment', 'ignore', 'zero')) { continue }
            $inputOffset = $dataOffset + [int64]$chunk.compressed_offset
            $inputLength = [int]$chunk.compressed_length
            $expected = [int64]$chunk.sectors * 512
            $outputOffset = ($baseSector + [int64]$chunk.sector) * 512
            $buffer = New-Object byte[] $inputLength
            $source.Position = $inputOffset
            $read = $source.Read($buffer, 0, $buffer.Length)
            if ($read -ne $buffer.Length) { throw "Short read at $inputOffset" }
            if ($kind -eq 'raw') {
                $decoded = $buffer
            }
            elseif ($kind -eq 'lzfse') {
                [IO.File]::WriteAllBytes($compressedPath, $buffer)
                if (Test-Path -LiteralPath $decodedPath) { Remove-Item -LiteralPath $decodedPath -Force }
                & $lzfsePath -decode -i $compressedPath -o $decodedPath
                if ($LASTEXITCODE -ne 0) { throw "LZFSE decoder failed at input offset $inputOffset" }
                $decoded = [IO.File]::ReadAllBytes($decodedPath)
                $decodedCount++
            }
            else {
                throw "Unsupported chunk type: $kind"
            }
            if ($decoded.LongLength -ne $expected) {
                throw "Decoded size $($decoded.LongLength), expected $expected at sector $outputOffset"
            }
            $target.Position = $outputOffset
            $target.Write($decoded, 0, $decoded.Length)
            $written += $decoded.LongLength
        }
    }
    [ordered]@{ output = $outPath; size = $target.Length; decoded_chunks = $decodedCount; written_bytes = $written } | ConvertTo-Json
}
finally {
    $target.Dispose()
    $source.Dispose()
}
