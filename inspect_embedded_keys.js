const fs = require('fs');
const crypto = require('crypto');
const file = process.argv[2];
const text = fs.readFileSync(file).toString('latin1');
const rx = /-----BEGIN (PRIVATE|PUBLIC) KEY-----[\s\S]*?-----END \1 KEY-----/g;
const results = [];
for (const match of text.matchAll(rx)) {
  const pem = match[0];
  try {
    const key = match[1] === 'PRIVATE' ? crypto.createPrivateKey(pem) : crypto.createPublicKey(pem);
    const pub = match[1] === 'PRIVATE' ? crypto.createPublicKey(key) : key;
    const spki = pub.export({ type: 'spki', format: 'der' });
    results.push({
      kind: match[1].toLowerCase(), offset: match.index, pem_sha256: crypto.createHash('sha256').update(pem).digest('hex'),
      public_spki_sha256: crypto.createHash('sha256').update(spki).digest('hex'),
      key_type: key.asymmetricKeyType,
      details: Object.fromEntries(Object.entries(key.asymmetricKeyDetails || {}).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v])),
    });
  } catch (e) {
    results.push({ kind: match[1].toLowerCase(), offset: match.index, parse_error: e.message });
  }
}
console.log(JSON.stringify(results, null, 2));
