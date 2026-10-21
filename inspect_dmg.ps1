param(
    [Parameter(Mandatory = $false)]
    [string]$Path = ".\MagiMir2_mac_arm64_2.0.5.dmg"
)

$resolved = (Resolve-Path -LiteralPath $Path).Path
$stream = [System.IO.File]::OpenRead($resolved)
try {
    if ($stream.Length -lt 512) { throw "File is too small to be a UDIF image" }
    $stream.Position = $stream.Length - 512
    $trailer = New-Object byte[] 512
    [void]$stream.Read($trailer, 0, 512)

    function Read-BE32([byte[]]$b, [int]$o) {
        return [uint32](($b[$o] -shl 24) -bor ($b[$o+1] -shl 16) -bor ($b[$o+2] -shl 8) -bor $b[$o+3])
    }
    function Read-BE64([byte[]]$b, [int]$o) {
        $hi = [uint64](Read-BE32 $b $o)
        $lo = [uint64](Read-BE32 $b ($o + 4))
        return ($hi -shl 32) -bor $lo
    }

    $sig = [Text.Encoding]::ASCII.GetString($trailer, 0, 4)
    if ($sig -ne 'koly') { throw "Missing UDIF koly trailer" }
    $xmlOffset = Read-BE64 $trailer 216
    $xmlLength = Read-BE64 $trailer 224
    $summary = [ordered]@{
        path = $resolved
        file_size = $stream.Length
        signature = $sig
        version = Read-BE32 $trailer 4
        header_size = Read-BE32 $trailer 8
        flags = ('0x{0:X8}' -f (Read-BE32 $trailer 12))
        data_fork_offset = Read-BE64 $trailer 24
        data_fork_length = Read-BE64 $trailer 32
        resource_fork_offset = Read-BE64 $trailer 40
        resource_fork_length = Read-BE64 $trailer 48
        segment_number = Read-BE32 $trailer 56
        segment_count = Read-BE32 $trailer 60
        xml_offset = $xmlOffset
        xml_length = $xmlLength
        image_variant = Read-BE32 $trailer 488
        sector_count = Read-BE64 $trailer 492
        virtual_size = (Read-BE64 $trailer 492) * 512
    }
    $summary | ConvertTo-Json

    if ($xmlLength -gt 0 -and ($xmlOffset + $xmlLength) -le $stream.Length) {
        $stream.Position = [int64]$xmlOffset
        $xmlBytes = New-Object byte[] ([int]$xmlLength)
        [void]$stream.Read($xmlBytes, 0, $xmlBytes.Length)
        $xmlPath = Join-Path (Split-Path $resolved) 'MagiMir2_udif_plist.xml'
        [System.IO.File]::WriteAllBytes($xmlPath, $xmlBytes)
        "PLIST=$xmlPath"
    }
}
finally {
    $stream.Dispose()
}
