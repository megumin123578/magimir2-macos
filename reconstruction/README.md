# MagiMir2 reconstruction workspace

This directory is a clean-room reconstruction scaffold derived from static
observations of the shipped `MagiMir2` 2.0.5 macOS ARM64 application. It is not
the original source tree.

## Current evidence

- Flutter AOT application binary:
  `../extracted/MagiMir2.app/Contents/Frameworks/App.framework/Versions/A/App`
- Native image-processing framework:
  `../extracted/MagiMir2.app/Contents/Frameworks/MagpieMobile.framework/Versions/A/MagpieMobile`
- Static assessment: `../MagiMir2_analysis_report.md`
- Generated AOT inventory: `evidence/aot-inventory.json`

The inventory currently establishes the presence of Dart package paths, module
names, feature vocabulary, and API route strings. It does not establish HTTP
methods, payload schemas, runtime reachability, or server authorization.

## Regenerate the inventory

From the workspace root:

```powershell
node .\reconstruction\tools\extract_aot_inventory.js `
  .\extracted\MagiMir2.app\Contents\Frameworks\App.framework\Versions\A\App `
  .\reconstruction\evidence\aot-inventory.json
```

## Reconstruction stages

1. Static inventory — package/module map, API route catalog, assets, and native
   boundary names.
2. Runtime contract capture on a controlled macOS ARM64 test host — UI states,
   HTTP method/schema, and native channel calls.
3. Offline Flutter shell — navigation and local state only.
4. Verified adapters — add network and native implementations only after their
   contracts have evidence.

The initial Flutter shell lives in `flutter_app`. It intentionally makes no
production network requests and contains no embedded credentials.
