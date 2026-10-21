const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(process.argv[2] || 'extracted/MagiMir2.app');
const cmsDir = path.resolve(process.argv[3] || 'macho-signatures');
fs.mkdirSync(cmsDir, { recursive: true });

function allFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...allFiles(p)); else if (e.isFile()) out.push(p);
  }
  return out;
}
const u32be = (b, o) => b.readUInt32BE(o);
const strz = (b, o, end = b.length) => {
  let z = o; while (z < end && b[z] !== 0) z++; return b.toString('utf8', o, z);
};
const version = n => `${n >>> 16}.${(n >>> 8) & 0xff}.${n & 0xff}`;
const cpuNames = new Map([[0x0100000c, 'arm64'], [0x01000007, 'x86_64']]);
const fileTypes = new Map([[2, 'executable'], [6, 'dylib'], [8, 'bundle']]);
const results = [];

for (const file of allFiles(root)) {
  const fd = fs.openSync(file, 'r');
  const st = fs.fstatSync(fd);
  if (st.size < 32) { fs.closeSync(fd); continue; }
  const prefix = Buffer.alloc(Math.min(st.size, 32));
  fs.readSync(fd, prefix, 0, prefix.length, 0);
  let sliceOffset = 0, sliceSize = st.size;
  if (prefix.readUInt32BE(0) === 0xcafebabe && prefix.readUInt32BE(4) >= 1) {
    sliceOffset = prefix.readUInt32BE(16); sliceSize = prefix.readUInt32BE(20);
  }
  const head = Buffer.alloc(Math.min(sliceSize, 1024 * 1024));
  fs.readSync(fd, head, 0, head.length, sliceOffset);
  if (head.readUInt32LE(0) !== 0xfeedfacf) { fs.closeSync(fd); continue; }
  const r = {
    path: path.relative(root, file).replaceAll('\\', '/'), size: st.size,
    slice_offset: sliceOffset, slice_size: sliceSize,
    cpu: cpuNames.get(head.readUInt32LE(4)) || `0x${head.readUInt32LE(4).toString(16)}`,
    cpu_subtype: `0x${head.readUInt32LE(8).toString(16)}`,
    file_type: fileTypes.get(head.readUInt32LE(12)) || head.readUInt32LE(12),
    flags: `0x${head.readUInt32LE(24).toString(16)}`, uuid: null, min_os: null,
    sdk: null, platform: null, encrypted: null, entryoff: null, rpaths: [], dependencies: [],
    code_signature: null,
  };
  const ncmds = head.readUInt32LE(16);
  let off = 32;
  let cs = null;
  for (let i = 0; i < ncmds; i++) {
    if (off + 8 > head.length) break;
    const cmd = head.readUInt32LE(off), size = head.readUInt32LE(off + 4);
    if (size < 8 || off + size > head.length) break;
    const baseCmd = cmd & 0x7fffffff;
    if (baseCmd === 0x0c || baseCmd === 0x0d || baseCmd === 0x18 || baseCmd === 0x1f || baseCmd === 0x23) {
      const nameOff = head.readUInt32LE(off + 8);
      const name = strz(head, off + nameOff, off + size);
      if (baseCmd !== 0x0d) r.dependencies.push(name);
    } else if (baseCmd === 0x1c) {
      const pOff = head.readUInt32LE(off + 8); r.rpaths.push(strz(head, off + pOff, off + size));
    } else if (baseCmd === 0x1b) {
      const x = head.subarray(off + 8, off + 24).toString('hex');
      r.uuid = `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;
    } else if (baseCmd === 0x24) {
      r.min_os = version(head.readUInt32LE(off + 8)); r.sdk = version(head.readUInt32LE(off + 12));
    } else if (baseCmd === 0x32) {
      r.platform = head.readUInt32LE(off + 8); r.min_os = version(head.readUInt32LE(off + 12)); r.sdk = version(head.readUInt32LE(off + 16));
    } else if (baseCmd === 0x2c) {
      r.encrypted = { offset: head.readUInt32LE(off + 8), size: head.readUInt32LE(off + 12), id: head.readUInt32LE(off + 16) };
    } else if (baseCmd === 0x28) {
      r.entryoff = head.readBigUInt64LE(off + 8).toString();
    } else if (baseCmd === 0x1d) {
      cs = { offset: head.readUInt32LE(off + 8), size: head.readUInt32LE(off + 12) };
    }
    off += size;
  }
  if (cs && sliceOffset + cs.offset + cs.size <= st.size) {
    const blob = Buffer.alloc(cs.size); fs.readSync(fd, blob, 0, blob.length, sliceOffset + cs.offset);
    const sig = { offset: cs.offset, size: cs.size, format: null, identifier: null, team_id: null, flags: null, hash_type: null, code_slots: null, entitlements: null, cms_path: null, slots: [], ticket_present: false };
    if (u32be(blob, 0) === 0xfade0cc0) {
      sig.format = 'embedded-superblob';
      const count = u32be(blob, 8);
      for (let i = 0; i < count; i++) {
        const slotType = u32be(blob, 12 + i * 8), bo = u32be(blob, 16 + i * 8);
        sig.slots.push(`0x${slotType.toString(16)}`);
        if (slotType === 0x10002) sig.ticket_present = true;
        if (bo + 8 > blob.length) continue;
        const magic = u32be(blob, bo), len = u32be(blob, bo + 4);
        if (len < 8 || bo + len > blob.length) continue;
        if (magic === 0xfade0c02 && (slotType === 0 || !sig.identifier)) {
          const identOff = u32be(blob, bo + 20), flags = u32be(blob, bo + 12), cdVersion = u32be(blob, bo + 8);
          sig.identifier = identOff < len ? strz(blob, bo + identOff, bo + len) : null;
          sig.flags = `0x${flags.toString(16)}`;
          sig.hash_type = blob[bo + 37]; sig.code_slots = u32be(blob, bo + 28);
          sig.code_directory_sha256 = crypto.createHash('sha256').update(blob.subarray(bo, bo + len)).digest('hex');
          const safe = r.path.replace(/[^a-zA-Z0-9._-]+/g, '_');
          sig.code_directory_path = path.join(cmsDir, `${safe}.cd`);
          fs.writeFileSync(sig.code_directory_path, blob.subarray(bo, bo + len));
          const hashOffset = u32be(blob, bo + 16), hashSize = blob[bo + 36], pageShift = blob[bo + 39];
          const codeLimit = u32be(blob, bo + 32), pageSize = 2 ** pageShift;
          const alg = sig.hash_type === 1 ? 'sha1' : (sig.hash_type === 4 ? 'sha384' : 'sha256');
          let valid = true;
          for (let slot = 0; slot < sig.code_slots; slot++) {
            const start = slot * pageSize, bytes = Math.min(pageSize, codeLimit - start);
            if (bytes < 0 || bo + hashOffset + (slot + 1) * hashSize > blob.length) { valid = false; break; }
            const page = Buffer.alloc(bytes); fs.readSync(fd, page, 0, bytes, sliceOffset + start);
            const actual = crypto.createHash(alg).update(page).digest().subarray(0, hashSize);
            const expectedHash = blob.subarray(bo + hashOffset + slot * hashSize, bo + hashOffset + (slot + 1) * hashSize);
            if (!actual.equals(expectedHash)) { valid = false; break; }
          }
          sig.code_hashes_valid = valid;
          if (cdVersion >= 0x20200 && bo + 52 <= blob.length) {
            const teamOff = u32be(blob, bo + 48); sig.team_id = teamOff && teamOff < len ? strz(blob, bo + teamOff, bo + len) : null;
          }
        } else if (magic === 0xfade7171) {
          sig.entitlements = blob.toString('utf8', bo + 8, bo + len);
        } else if (slotType === 0x10000 && magic === 0xfade0b01) {
          const safe = r.path.replace(/[^a-zA-Z0-9._-]+/g, '_');
          const cmsPath = path.join(cmsDir, `${safe}.p7b`);
          fs.writeFileSync(cmsPath, blob.subarray(bo + 8, bo + len)); sig.cms_path = cmsPath;
        }
      }
    }
    r.code_signature = sig;
  }
  fs.closeSync(fd);
  results.push(r);
}
console.log(JSON.stringify(results, null, 2));
