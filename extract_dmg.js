const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const dmgPath = path.resolve(process.argv[2] || 'MagiMir2_mac_arm64_2.0.5.dmg');
const plistPath = path.resolve(process.argv[3] || 'MagiMir2_udif_plist.xml');
const outPath = path.resolve(process.argv[4] || 'MagiMir2_raw.img');
const lzfse = path.resolve(process.argv[5] || 'tools/lzfse-build/Release/lzfse.exe');
const xml = fs.readFileSync(plistPath, 'utf8');
const dmg = fs.openSync(dmgPath, 'r');
const stat = fs.fstatSync(dmg);
const trailer = Buffer.alloc(512);
fs.readSync(dmg, trailer, 0, 512, stat.size - 512);
const dataForkOffset = trailer.readBigUInt64BE(24);
const sectorCount = trailer.readBigUInt64BE(492);
const outputSize = sectorCount * 512n;
if (outputSize > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Image too large for this extractor');

const tables = [];
for (const m of xml.matchAll(/<dict>([\s\S]*?)<\/dict>/g)) {
  const body = m[1];
  const dm = body.match(/<key>Data<\/key>\s*<data>([\s\S]*?)<\/data>/);
  if (!dm) continue;
  const b = Buffer.from(dm[1].replace(/\s/g, ''), 'base64');
  if (b.toString('ascii', 0, 4) !== 'mish') continue;
  const id = (body.match(/<key>ID<\/key>\s*<string>(.*?)<\/string>/) || [])[1] || '';
  const firstSector = b.readBigUInt64BE(8);
  const dataOffset = b.readBigUInt64BE(24);
  const chunkCount = b.readUInt32BE(200);
  const chunks = [];
  for (let i = 0; i < chunkCount; i++) {
    const o = 204 + i * 40;
    chunks.push({
      type: b.readUInt32BE(o), sector: b.readBigUInt64BE(o + 8),
      sectors: b.readBigUInt64BE(o + 16), offset: b.readBigUInt64BE(o + 24),
      length: b.readBigUInt64BE(o + 32),
    });
  }
  tables.push({ id, firstSector, dataOffset, chunks });
}

const output = fs.openSync(outPath, 'w+');
fs.ftruncateSync(output, Number(outputSize));
const tempDir = fs.mkdtempSync(path.join(path.dirname(outPath), '.dmg-chunk-'));
const inFile = path.join(tempDir, 'chunk.lzfse');
const outFile = path.join(tempDir, 'chunk.raw');
let written = 0n;
let decoded = 0;
try {
  for (const table of tables) {
    for (const c of table.chunks) {
      if (c.type === 0xffffffff || c.type === 0x7ffffffe) continue;
      if (c.type === 0x00000000 || c.type === 0x00000002) continue;
      const expected = c.sectors * 512n;
      const outputOffset = (table.firstSector + c.sector) * 512n;
      const inputOffset = dataForkOffset + table.dataOffset + c.offset;
      if (c.length > BigInt(Number.MAX_SAFE_INTEGER) || expected > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Chunk too large');
      const compressed = Buffer.alloc(Number(c.length));
      fs.readSync(dmg, compressed, 0, compressed.length, Number(inputOffset));
      let raw;
      if (c.type === 0x00000001) {
        raw = compressed;
      } else if (c.type === 0x80000007) {
        fs.writeFileSync(inFile, compressed);
        try { fs.unlinkSync(outFile); } catch {}
        const result = cp.spawnSync(lzfse, ['-decode', '-i', inFile, '-o', outFile], {
          cwd: path.dirname(lzfse), encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024,
        });
        if (result.status !== 0) throw new Error(`LZFSE failed: ${JSON.stringify({status: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr})}`);
        raw = fs.readFileSync(outFile);
        decoded++;
      } else {
        throw new Error(`Unsupported chunk type 0x${c.type.toString(16)}`);
      }
      if (BigInt(raw.length) !== expected) throw new Error(`Decoded size ${raw.length}, expected ${expected}`);
      fs.writeSync(output, raw, 0, raw.length, Number(outputOffset));
      written += BigInt(raw.length);
    }
  }
} finally {
  fs.closeSync(output);
  fs.closeSync(dmg);
  for (const f of [inFile, outFile]) { try { fs.unlinkSync(f); } catch {} }
  try { fs.rmdirSync(tempDir); } catch {}
}
console.log(JSON.stringify({ outPath, outputSize: outputSize.toString(), decodedChunks: decoded, writtenBytes: written.toString() }, null, 2));
