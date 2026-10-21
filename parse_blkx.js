const fs = require('fs');
const path = require('path');

const plistPath = path.resolve(process.argv[2] || 'MagiMir2_udif_plist.xml');
const xml = fs.readFileSync(plistPath, 'utf8');
const dicts = [...xml.matchAll(/<dict>([\s\S]*?)<\/dict>/g)].map(m => m[1]);
const items = [];
const typeNames = new Map([
  [0x00000000, 'zero'], [0x00000001, 'raw'], [0x00000002, 'ignore'],
  [0x7ffffffe, 'comment'], [0x80000004, 'adc'], [0x80000005, 'zlib'],
  [0x80000006, 'bzip2'], [0x80000007, 'lzfse'], [0xffffffff, 'end'],
]);
for (const body of dicts) {
  const dataMatch = body.match(/<key>Data<\/key>\s*<data>([\s\S]*?)<\/data>/);
  if (!dataMatch) continue;
  const name = (body.match(/<key>CFName<\/key>\s*<string>([\s\S]*?)<\/string>/) || [])[1] || '';
  const id = (body.match(/<key>ID<\/key>\s*<string>([\s\S]*?)<\/string>/) || [])[1] || '';
  const b = Buffer.from(dataMatch[1].replace(/\s/g, ''), 'base64');
  if (b.toString('ascii', 0, 4) !== 'mish' || b.length < 204) continue;
  const chunkCount = b.readUInt32BE(200);
  const chunks = [];
  for (let i = 0; i < chunkCount; i++) {
    const o = 204 + i * 40;
    if (o + 40 > b.length) throw new Error(`Truncated blkx ${id}, chunk ${i}`);
    const type = b.readUInt32BE(o);
    chunks.push({
      type: `0x${type.toString(16).padStart(8, '0')}`,
      kind: typeNames.get(type) || 'unknown',
      sector: b.readBigUInt64BE(o + 8).toString(),
      sectors: b.readBigUInt64BE(o + 16).toString(),
      compressed_offset: b.readBigUInt64BE(o + 24).toString(),
      compressed_length: b.readBigUInt64BE(o + 32).toString(),
    });
  }
  const counts = {};
  for (const c of chunks) counts[c.kind] = (counts[c.kind] || 0) + 1;
  items.push({
    id, name,
    first_sector: b.readBigUInt64BE(8).toString(),
    sector_count: b.readBigUInt64BE(16).toString(),
    data_offset: b.readBigUInt64BE(24).toString(),
    chunk_count: chunkCount,
    chunk_types: counts,
    chunks,
  });
}
console.log(JSON.stringify(items, null, 2));
