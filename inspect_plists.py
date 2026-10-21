import json
import plistlib
from pathlib import Path

root = Path('extracted/MagiMir2.app')
out = {'privacy_manifests': [], 'frameworks': []}
for p in root.rglob('PrivacyInfo.xcprivacy'):
    try:
        d = plistlib.loads(p.read_bytes())
        out['privacy_manifests'].append({
            'path': p.relative_to(root).as_posix(),
            'tracking': d.get('NSPrivacyTracking'),
            'tracking_domains': d.get('NSPrivacyTrackingDomains', []),
            'collected_data_types': d.get('NSPrivacyCollectedDataTypes', []),
            'accessed_api_types': d.get('NSPrivacyAccessedAPITypes', []),
        })
    except Exception as e:
        out['privacy_manifests'].append({'path': p.relative_to(root).as_posix(), 'error': str(e)})
for p in root.glob('Contents/Frameworks/*.framework/Versions/A/Resources/Info.plist'):
    try:
        d = plistlib.loads(p.read_bytes())
        out['frameworks'].append({
            'name': p.parents[3].name,
            'identifier': d.get('CFBundleIdentifier'),
            'version': d.get('CFBundleShortVersionString') or d.get('CFBundleVersion'),
        })
    except Exception:
        pass
print(json.dumps(out, indent=2))
