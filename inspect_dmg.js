const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const input = path.resolve(process.argv[2] || 'MagiMir2_mac_arm64_2.0.5.dmg');
const fd = fs.openSync(input, 'r');
const stat = fs.fstatSync(fd);
if (stat.size < 512) throw new Error('File is too small to be a UDIF image');
const trailer = Buffer.alloc(512);
fs.readSync(fd, trailer, 0, 512, stat.size - 512);
if (trailer.toString('ascii', 0, 4) !== 'koly') throw new Error('Missing UDIF koly trailer');
const u32 = o => trailer.readUInt32BE(o);
const u64 = o => trailer.readBigUInt64BE(o);
const xmlOffset = u64(216);
const xmlLength = u64(224);
const sectorCount = u64(492);
const summary = {
  path: input,
  file_size: stat.size,
  signature: 'koly',
  version: u32(4),
  header_size: u32(8),
  flags: `0x${u32(12).toString(16).padStart(8, '0')}`,
  data_fork_offset: u64(24).toString(),
  data_fork_length: u64(32).toString(),
  resource_fork_offset: u64(40).toString(),
  resource_fork_length: u64(48).toString(),
  segment_number: u32(56),
  segment_count: u32(60),
  xml_offset: xmlOffset.toString(),
  xml_length: xmlLength.toString(),
  image_variant: u32(488),
  sector_count: sectorCount.toString(),
  virtual_size: (sectorCount * 512n).toString(),
  data_checksum: { type: u32(80), bits: u32(84), value: `0x${u32(88).toString(16).padStart(8, '0')}` },
  master_checksum: { type: u32(352), bits: u32(356), value: `0x${u32(360).toString(16).padStart(8, '0')}` },
};
if (summary.data_checksum.type === 2 && typeof zlib.crc32 === 'function') {
  let crc = 0, pos = Number(u64(24)), left = Number(u64(32));
  const chunk = Buffer.alloc(1024 * 1024);
  while (left > 0) {
    const n = Math.min(left, chunk.length); fs.readSync(fd, chunk, 0, n, pos);
    crc = zlib.crc32(chunk.subarray(0, n), crc); pos += n; left -= n;
  }
  summary.data_checksum.computed = `0x${(crc >>> 0).toString(16).padStart(8, '0')}`;
  summary.data_checksum.valid = summary.data_checksum.computed === summary.data_checksum.value;
}
console.log(JSON.stringify(summary, null, 2));
if (xmlLength > 0n && xmlOffset + xmlLength <= BigInt(stat.size)) {
  if (xmlLength > 32n * 1024n * 1024n) throw new Error('Refusing unexpectedly large UDIF plist');
  const xml = Buffer.alloc(Number(xmlLength));
  fs.readSync(fd, xml, 0, xml.length, Number(xmlOffset));
  const out = path.join(path.dirname(input), 'MagiMir2_udif_plist.xml');
  fs.writeFileSync(out, xml);
  console.log(`PLIST=${out}`);
}
fs.closeSync(fd);
