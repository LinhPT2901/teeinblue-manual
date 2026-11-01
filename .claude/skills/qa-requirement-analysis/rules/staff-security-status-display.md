# Rule: Hiển thị trạng thái bảo mật (password / 2FA / SSO / invite) per staff

## Khi nào áp dụng
Issue thêm cột/chip/badge trạng thái account vào bảng Staff (`/staffs`) hoặc màn tương tự: `has_password`, `two_factor_enabled`, `Pending invite`, `SSO login`, "security status", "2FA status".

## Context cần nhận diện (teeinblue)
- Staff đến từ nhiều đường (xem `session-auth-2fa-migration.md`, `social-oauth-login.md`): Shopify-embedded (không password), invite email (set password lúc accept), Google login (TIB-5334, có thể vừa có vừa không có password). "SSO" là từ mơ hồ — phải chốt nó map vào đường nào.
- Password/2FA là thuộc tính của **identity/account**, nhưng bảng Staff hiển thị **theo org**. 1 email thuộc nhiều org → cùng trạng thái ở mọi org? Invite pending ở org Y nhưng active ở org X → chip nào ở org Y?
- 2FA có nhiều method (TOTP, email code, recovery code). "2FA enabled" = method nào? TOTP đã bật nhưng chưa confirm có tính không?

## Requirement cần kiểm tra
- Ma trận state → chip: mỗi tổ hợp (password × 2FA × invite × SSO) ra đúng chip, đúng tone; các chip loại trừ nhau (Pending invite thay tất cả, SSO thay password chip).
- Data source: field mới trên API chỉ trả boolean, **không** lộ hash/secret/recovery code.
- Ai xem được cột (permission xem Staff), có áp dụng cho dòng owner/chính mình không.
- Độ tươi: staff đổi trạng thái (set password, bật/tắt 2FA, accept invite) → bảng cập nhật sau reload.

## Risks
- Gắn nhãn sai nhóm Shopify-embedded (không password là bình thường) thành amber `No password` → false alarm hàng loạt.
- Chip 2FA cho SSO/Google: amber `2FA off` gây báo động giả nếu IdP đã lo 2FA.
- Lộ thông tin bảo mật cho role không nên thấy (editor/custom role).

## Open questions template
- "SSO login" ứng với đường login nào (Shopify embedded? Google? cả hai)? Staff có cả password lẫn Google thì chip gì?
- "2FA enabled" tính method nào; email-code 2FA có tính không?
- Multi-org: trạng thái theo account hay theo org?
- Cột hiển thị cho role nào; API field trả cho ai?

## Quan sát trên staging (TIB-5567, 2026-10-27 — CHƯA có dev confirm)
- `GET /api/staffs` trả `has_password`, `two_factor_enabled`, `platform_staff`, `approved_at` (không lộ hash/secret).
- Mapping thấy được: `approved_at` null → `Pending invite`; `platform_staff=true` → `SSO login` (tức SSO ≈ Shopify staff, không phải Google); platform + `has_password=false` → `2FA via SSO`; platform + có password → `2FA`/`2FA off` theo `two_factor_enabled`; không phải platform + approved → `Password` + 2FA.
- Staff vừa active vừa có invite pending trong cùng org bị trả 2 dòng (1 active, 1 `Pending invite`).

## Đã xác nhận (TIB-5334, description + QA plan dev cập nhật 2026-10-29)
- Mỗi cách đăng nhập là 1 chip: `Password`, `Shopify SSO` (đổi tên từ "SSO login"), `Google`; sau đó tới chip 2FA. `2FA via SSO` đổi tên thành `2FA via Shopify`, và chỉ hiện khi Shopify là cách đăng nhập duy nhất.
- Chip `Google` lấy từ `staffs.google_id`: chỉ có sau lần Google login **thành công** đầu tiên, vẫn còn sau khi logout; login bị reject thì không có chip.
- Staff không có password nhưng có Google → `No password` `Google` `2FA off` (không phải `2FA via Shopify`). Shopify + có password → `Password` `Shopify SSO` + chip 2FA thật. Invite pending → chỉ `Pending invite`.
- Câu cần hỏi: Staff Shopify không có password đăng nhập bằng Google thì chip `No password` có hiện cạnh `Shopify SSO` không? `google_id` lưu theo account → chip có hiện ở mọi org không?
