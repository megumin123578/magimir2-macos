# Native boundary findings

Source artifact:
`MagiMir2.app/Contents/Frameworks/MagpieMobile.framework/Versions/A/MagpieMobile`

## Observed processing pipeline names

Printable native symbols expose a `MagRetouchEngine` and the following effect
step families:

- AI deform
- blemish/removal (`FuRuRemove`)
- eye, face, hair, skin, skin color and skin fidelity UCA
- human matting
- ID photo
- inpaint
- manual liquify
- makeup
- protection/masking
- Photoshop-style deformation
- rotate and crop
- tone mimic, tone, curves and HSL/HSL v2
- traction and wrinkle processing

An Objective-C selector is present for
`processEffectWithOrderId:params:humanMattingResult:idPhotoPreviewResult:renderToTexture:progress:renderComplete:`.
This establishes a native asynchronous processing boundary, but not its argument
serialization or result ownership rules.

## Observed cryptographic primitives

The framework statically contains Crypto++ type names for:

- RSA OAEP with SHA-1
- RSA PKCS#1 v1.5 encryption
- RSA PKCS#1 v1.5 signatures with SHA-1
- RSA-PSS verification with SHA-256
- AES/Rijndael CBC encryption and decryption
- HMAC-SHA256
- ChaCha

These are library capabilities present in the binary. Their presence alone does
not prove which primitive is used by each application protocol. Existing nearby
strings (`v2 request encrypt`, `v2 response decrypt`, `cpubkey`, `signature`)
support an inferred application-specific v2 envelope, which still requires
call-site or controlled-runtime evidence.

## Safety boundary

The embedded private key and static secret found during the earlier assessment
are intentionally excluded from reconstruction source and generated evidence.
They must not be copied into a new client. A replacement protocol should use
server-held credentials or server-issued ephemeral/session material.

## Remaining evidence needed

- Flutter method-channel names and codec payloads.
- Ownership/lifetime rules for image buffers and progress callbacks.
- Exact `EffectParams` serialization and default values.
- Which effects run locally versus invoke cloud APIs.
- The concrete v2 request envelope and the server's trust decision.

