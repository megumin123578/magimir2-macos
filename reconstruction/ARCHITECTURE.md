# Reconstructed architecture map

## Confidence legend

- **Observed**: literal path, symbol, route, or resource exists in the shipped
  artifact.
- **Inferred**: grouping or responsibility derived from several observed names.
- **Unknown**: requires runtime capture or deeper native analysis.

## Application shell

Observed Dart paths establish these top-level routes:

- `page/splash/{page,route,state}.dart`
- `page/login/{page,route,state}.dart`
- `page/home/{page,route,state}.dart`
- `page/updater/{page,route,state}.dart`

The clean-room scaffold starts at an offline editing workspace. Authentication,
updater, and production API adapters are deliberately not enabled.

## Feature modules

| Area | Static observations | Reconstruction status |
|---|---|---|
| Editing workspace | Preset, portrait, color, liquify, background, clothing, crop, history, ID photo, AI tools, mimic, camera state mixins | Navigation shell created |
| Portrait | Face, skin, eye, tooth, body, hair, makeup and blemish sections | UI/parameter contracts unknown |
| Export | Queue manager, runner, engine pool, billing status, progress and history entities | State machine to be reconstructed |
| Camera | Discovery, settings, capture/import, calibration and preview names | Native channel contract unknown |
| Presets | CRUD, categories, sorting, import/share and certification-photo parameters | 35 preset/filter route strings inventoried |
| Accounts | Email, verification code, store selection, device limit and logout | Request/response contracts unknown |
| Commerce | Subscription, wallet/points, activation codes, seats and orders | Must remain disabled until authorized test capture |
| Feedback | Upload pipeline, log zipper, markup and feedback history | Five route strings inventoried |
| Updater | Manifest, download, verification, staging and installation classes | Signature enforcement path needs runtime verification |

## Persistence

Observed source paths identify Realm models/repositories for retouch and export
state plus a separate export repository containing SQL vocabulary. Exact schema,
migration versions, and transaction behavior are not yet established.

## Service boundaries

Observed services include login, user, purchase/subscription, seat, Qiniu,
preset, background, relight, retouch deduction, AI tools, mimic, ID photo,
feedback, content, camera, cache, and updater. Generated `*.g.dart` paths imply
code-generated JSON/API bindings were part of the original build, but their
source declarations have not been recovered.

## Next implementation slices

1. Reconstruct the local project/import/edit/export state machine without any
   network dependency.
2. Capture Flutter method-channel names and argument shapes on macOS ARM64.
3. Capture only authorized test-account traffic to establish HTTP methods,
   headers, payloads, and response models.
4. Implement adapters behind interfaces and add fixture-based contract tests.

