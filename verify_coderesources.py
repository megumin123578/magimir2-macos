import base64
import hashlib
import json
import plistlib
from pathlib import Path

contents = Path('extracted/MagiMir2.app/Contents')
resource_file = contents / '_CodeSignature' / 'CodeResources'
doc = plistlib.loads(resource_file.read_bytes())

stats = {'verified': 0, 'invalid': [], 'missing': [], 'symlinks': 0, 'unsupported': 0}
for section, algorithm in [('files', 'sha1'), ('files2', 'sha256')]:
    for rel, value in doc.get(section, {}).items():
        expected = None
        if isinstance(value, bytes):
            expected = value
        elif isinstance(value, dict):
            expected = value.get('hash2' if algorithm == 'sha256' else 'hash')
            if isinstance(value.get('symlink'), str):
                stats['symlinks'] += 1
                continue
        if expected is None:
            stats['unsupported'] += 1
            continue
        p = contents / Path(rel)
        if not p.is_file():
            stats['missing'].append(rel)
            continue
        actual = hashlib.new(algorithm, p.read_bytes()).digest()
        if actual == expected:
            stats['verified'] += 1
        else:
            stats['invalid'].append(rel)

stats['invalid_count'] = len(stats['invalid'])
stats['missing_count'] = len(stats['missing'])
print(json.dumps(stats, indent=2))
