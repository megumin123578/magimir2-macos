# Phân tích tĩnh `MagiMir2_mac_arm64_2.0.5.dmg`

Ngày phân tích: 2026-10-21. Không thực thi ứng dụng; chỉ đọc và giải nén tĩnh.

## Kết luận nhanh

- Đây là DMG UDIF hợp lệ, dùng LZFSE, chứa GPT + một volume APFS tên `MagiMir2`.
- Ứng dụng là Flutter macOS ARM64, phiên bản `2.0.5`, bundle ID `com.magic.magimir`.
- Toàn bộ 54 Mach-O tìm thấy đều là ARM64. Hash trang code-signing của cả 54 file đều khớp CodeDirectory nhúng.
- Chữ ký mang Team ID `YUHD86NT78`, chứng thư `Developer ID Application: SUNCLOUD CO., LTD.`, thời gian ký 2026-10-16.
- Ứng dụng có hardened runtime nhưng không bật App Sandbox; cho phép JIT và outbound network.
- Phát hiện bảo mật chính: `MagpieMobile` nhúng một private key RSA 2048-bit có thể phân tích hợp lệ và một chuỗi bí mật tĩnh 24 ký tự. Chuỗi lân cận liên hệ chúng với mã hóa request/decrypt response của giao thức v2. Không ghi khóa ra báo cáo.
- Không tìm thấy LaunchAgent, LaunchDaemon, Login Item, privileged helper, XPC service hay lệnh shell/persistence đáng ngờ trong phạm vi tìm kiếm tĩnh.
- Không thể kết luận notarization/Gatekeeper trên Windows; không thấy ticket slot nhúng trong 54 Mach-O.

## Nhận dạng và toàn vẹn

| Mục | Giá trị |
|---|---|
| DMG SHA-256 | `a38c92d0b6d18ec73d3ab372d3c67d3ff5ad310c5d596afd975dc5bb09934b41` |
| Kích thước DMG | 58,755,141 byte |
| UDIF data CRC32 | `db04e02a` (khớp trailer) |
| Ảnh đĩa thô SHA-256 | `b8731f3364667d28046a77b2869f37ac3f1a7bde5e175444dcf46036cf991cc4` |
| Kích thước logic | 217,579,520 byte |
| APFS UUID | `0ec77dfb-4170-4c16-bebb-9228bc1999f3` |
| APFS tạo/sửa | 2026-10-16 12:12:15 / 12:12:17 |

Main executable SHA-256: `a2e7124590cfb208e6e39dfe95e8d08bcb96ea492b121b6ac1a532d578025133`.

Flutter AOT `App.framework` SHA-256: `5aa3ee531529a9040637e217eac9486005649eab93da9e7aacb5a9e2fc2d1017`.

`MagpieMobile` SHA-256: `95b55de6162e839e7a6c2be7e0a22fe4d76d1cc41b9272d9741f243bc354538d`.

## Bundle và nền tảng

- `CFBundleShortVersionString`: `2.0.5`
- `CFBundleIdentifier`: `com.magic.magimir`
- Copyright: `Magimiu AI Limited`
- Build: Xcode `26.6`, SDK macOS `26.5`
- `Info.plist` khai báo macOS tối thiểu `10.15`, nhưng Mach-O chính khai báo tối thiểu `11.0.0`; thực tế nên xem macOS 11 là ngưỡng an toàn.
- Bundle có 577 file đã materialize, khoảng 120.6 MB. 7-Zip không tạo được 103 symlink framework trên Windows, nhưng các file thật trong `Versions/A` vẫn được trích xuất.

Thành phần đáng chú ý: FlutterMacOS, Realm 20.0.1, SQLite, Firebase Core/Crashlytics/Sessions/Installations, StoreKit, desktop updater, camera/remote camera, OpenCV 4.12, libcurl và plugin Magpie riêng.

## Chữ ký và quyền

Main executable:

- CodeDirectory ID: `com.magic.magimir`
- Team ID: `YUHD86NT78`
- Hardened runtime: có (`CS_RUNTIME`, flags `0x10000`)
- Entitlements:
  - `com.apple.security.app-sandbox = false`
  - `com.apple.security.cs.allow-jit = true`
  - `com.apple.security.network.client = true`
- Không có `get-task-allow` trong entitlement XML quan sát được.

Chứng thư ký:

- Subject: `Developer ID Application: SUNCLOUD CO., LTD. (YUHD86NT78)`
- Hiệu lực: 2023-08-22 đến 2027-02-02
- Signing time: 2026-10-16 12:12
- SHA-256 CodeDirectory chính `d8ade167...d924e6` khớp CMS message digest.

Giới hạn: kiểm tra trên Windows xác nhận cấu trúc CMS, chứng thư, digest và toàn bộ page hashes; không thay thế `codesign --verify --deep --strict` và `spctl -a -vv` trên macOS.

## Chức năng suy ra từ mã/tài nguyên

- Chỉnh sửa ảnh/portrait, làm đẹp da và khuôn mặt, liquify, màu sắc, background, quần áo, ID photo và batch export.
- Camera/tethered camera, thông tin camera, import ảnh và preset.
- Đăng nhập email/password/mã xác minh và QR WeChat; tài khoản cửa hàng/team/seat.
- Subscription, ví/điểm, mã kích hoạt và StoreKit purchase.
- Local storage qua Realm và SQLite.
- Auto-update qua `release.json`; mã có đường kiểm SHA-256, checksum, primary signature và chữ ký DMG. Đây là bằng chứng tĩnh về cơ chế kiểm tra, chưa chứng minh mọi nhánh update đều enforce kiểm tra.

## Network và dữ liệu

Endpoint/base URL quan sát được gồm:

- Production API: `https://api.hunliji.com`
- Dev/pre-production: `https://dev-api.hunliji.com`, `https://pre-api.hunliji.com`, `https://dev.hunliji.com`
- CDN/upload: `https://qnm.hunliji.com`
- Product/privacy/update: `https://www.magimir.com`, `/download2`, `/policy/privacy`
- Firebase Crashlytics/Installations/Sessions và Apple app analytics/ad services; có cả Google Ads conversion deeplink.

Tên API tĩnh cho thấy các luồng đăng nhập, upload Qiniu, gửi ảnh xử lý AI, trừ điểm trước/sau xử lý, feedback có attachment, subscription và quản lý seat. Đây là suy luận từ tên route và string; chưa quan sát traffic runtime.

21 privacy manifest từ framework khai báo không tracking. Các mục data collection quan sát được gồm crash data và other diagnostic data, không linked, không tracking; accessed API gồm file timestamp, disk space và user defaults.

## Phát hiện bảo mật

### Cao — private key RSA nhúng trong client

`MagpieMobile.framework/Versions/A/MagpieMobile` chứa:

- Một private key RSA 2048-bit parse được, exponent 65537.
- Public-SPKI SHA-256 của private key: `4e8d7021fbd1a364b71089134e4c2a80c3eddec017bb524b1674e496bb448c7b`.
- PEM SHA-256: `483a8ec5e773a8c610487a0bf89b64b9cf3edd354eced3246b6799e913b98050`.
- Một public key RSA riêng lân cận có SPKI SHA-256 `a4fca6c8c9ab829fdaea551b43b26e9eed11b1d5ee1f43ed70abaeff291533a3`.
- Một chuỗi tĩnh 24 ký tự lân cận, SHA-256 `8d67b712982eefa75aa0f2e434d619fd82d860f5c6b6c3a200aac022aa8d08e8`.

Các string ngay cạnh gồm `v2 request encrypt`, `v2 response decrypt`, `cpubkey`, `signature` và `verify signature failed`. Vì mọi người dùng đều có thể trích key khỏi client, key này không thể được xem là bí mật hoặc dùng để chứng minh client hợp lệ. Cần kiểm tra backend để xác định tác động cụ thể, sau đó rotate/revoke nếu server tin cậy key này; chuyển sang khóa phiên do server cấp và chữ ký server-side/public-key pinning phù hợp.

### Trung bình — ứng dụng không sandbox

App Sandbox bị tắt. Với chức năng chọn ảnh/thư mục, camera và updater, tiến trình có quyền theo user thay vì bị giới hạn trong container. `allow-jit` thường cần cho Flutter, nhưng làm tăng bề mặt tấn công nếu có lỗi memory-safety hoặc nội dung không tin cậy.

### Thấp/Thông tin — môi trường dev/pre-prod nằm trong binary

Dev và pre-production base URLs có trong AOT binary. Điều này không tự động là lỗ hổng, nhưng nên bảo đảm production build không thể chuyển môi trường bằng remote config/local preference không được bảo vệ.

### Tích cực

- CRC32 của data fork DMG hợp lệ.
- 54/54 Mach-O có page hashes khớp CodeDirectory.
- Tất cả Mach-O quan sát được ký cùng Team ID.
- Không phát hiện khóa AWS/Google/Stripe, Sentry DSN hay PEM private key khác trong các pattern đã quét.
- Không phát hiện persistence/helper đặc quyền trong bundle.

## Giới hạn và bước xác minh tiếp

Phân tích này hoàn toàn tĩnh trên Windows; không chạy app và không ghi nhận traffic. Để chốt độ tin cậy trước khi cài:

1. Trên macOS, chạy `codesign --verify --deep --strict --verbose=4 MagiMir2.app`.
2. Chạy `spctl -a -vv --type execute MagiMir2.app` và `stapler validate MagiMir2.app` để xác minh notarization.
3. Quan sát traffic trong môi trường test để xác định ảnh nào được upload, token/auth scheme, Crashlytics opt-in và update URL/signature enforcement.
4. Review giao thức v2 quanh private key nhúng và kiểm tra server có dùng key đó làm credential/authentication hay chỉ obfuscation.

