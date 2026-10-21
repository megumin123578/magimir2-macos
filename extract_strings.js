const fs = require('fs');
for (const file of process.argv.slice(2)) {
  const b = fs.readFileSync(file);
  let s = '';
  for (let i = 0; i <= b.length; i++) {
    const c = i < b.length ? b[i] : 0;
    if (c >= 0x20 && c <= 0x7e) s += String.fromCharCode(c);
    else { if (s.length >= 5) console.log(s); s = ''; }
  }
  s = '';
  for (let i = 0; i + 1 <= b.length; i += 2) {
    const c = i < b.length - 1 && b[i + 1] === 0 ? b[i] : 0;
    if (c >= 0x20 && c <= 0x7e) s += String.fromCharCode(c);
    else { if (s.length >= 5) console.log(s); s = ''; }
  }
}
