# Rule: Social login / OAuth (Google, Apple, Facebook…) vào portal

## Khi nào áp dụng
Issue có keyword: `Socialite`, `Continue with Google`, `OAuth`, `OpenID`, `social login`, `SSO`, `callback`, `redirect URI`, `email_verified`, `social_error`, hoặc thêm đường đăng nhập bằng identity provider bên ngoài.

## Context cần nhận diện
- Social login là **một entrypoint auth mới** chạy song song với email/password, Shopify embedded, accept invite, admin login-as. Rủi ro lớn nhất là nó **đi tắt qua các chốt chặn** mà đường cũ có: 2FA, xác nhận invite, verify email, staff bị gỡ khỏi org, account bị khoá.
- Match account theo email → mọi khác biệt về chuẩn hoá email đều là edge case: hoa/thường, khoảng trắng, Gmail dấu chấm/`+alias`, Google Workspace domain riêng (không phải @gmail.com).
- teeinblue: 1 email có thể là staff ở **nhiều owner/store** (xem `session-auth-2fa-migration.md`) → sau social login vào org nào phải được nói rõ.
- Staff tạo qua Shopify install **không có password** → social login có thể là lần đầu họ vào được form login thường. Hỏi có phải intended không.
- Google chặn OAuth trong iframe/webview → nút trong context embedded (Shopify admin) có thể không chạy.
- OAuth consent screen ở chế độ "Testing" chỉ cho test user được liệt kê → môi trường test phải được cấu hình trước, nếu không QA thấy lỗi giả.

## Đã xác nhận ở teeinblue (TIB-5334, 2026-10-27)
- Staff đa-org: social login vào **default user** lưu trong bảng `staff_user` (không có màn chọn org).
- Email là staff active ở org X + có invite pending ở org Y → **không đổi staff status** (invite vẫn pending), vẫn login vào default user. `invite_pending` chỉ áp khi Staff tồn tại *duy nhất* dưới dạng invite chưa accept.
- Nút chỉ có ở trang staff login/register của portal; login qua Shopify admin không mở trang này → context embedded/iframe nằm ngoài scope.
- Dev confirm (comment 55715): 2FA (TOTP/email/recovery) **bắt buộc** sau Google, giống sau password. Hand-off `/oauth?code=` dùng 1 lần, TTL 60s (`AUTH_EXCHANGE_TTL`), exchange xảy ra *trước* 2FA → Cancel/reload ở màn 2FA phải bấm Google lại.
- Default org chỉ dùng khi approved; không thì fallback sang org approved đầu tiên; không còn org nào → `oauth_failed`. `invite_pending` chỉ khi chưa từng accept invite nào. Staff không có trạng thái locked/suspended.
- Email lưu lowercase, so khớp chính xác sau khi lowercase (không trim, không chuẩn hoá dấu chấm/`+alias` Gmail → `no_account`).
- Socialite stateless, **không kiểm `state`** (follow-up riêng) → không viết case "state sai bị reject"; ghi nhận là residual risk.
- Rate limit `GOOGLE_OAUTH_RATE_LIMIT`/phút/IP, bucket riêng dùng chung cho redirect + callback (1 login = 2 request); 2FA dùng limiter Fortify riêng.
- `social_error` lạ/rỗng → text `oauth_failed`; F5 hiện lại toast là known issue, không log bug.
- Sau đề xuất của QA (comment 55794, 2026-10-28): **bỏ nút ở Register** (nút "Continue with Google" trên trang đăng ký dễ bị hiểu là sign up) và **Google login không thay thế verify email** — Staff chưa verify → `email_unverified`, không đánh dấu verified; `invite_pending` ưu tiên hiển thị trước. Bài học: với social login chỉ-đăng-nhập, luôn hỏi (1) nút có nên xuất hiện ở trang Register không, (2) social login có đi tắt qua bước verify email không.
- Consent screen "Testing" vs "In production": ở Testing, Google chặn mọi account không có trong danh sách test users ngay ở màn Google (lỗi `access_denied`/"Access blocked"), request không về tới teeinblue → case "no account" sẽ ra lỗi của Google thay vì toast `no_account`. Trước khi test phải xác nhận trạng thái này.

## Requirement cần kiểm tra
- Ma trận kết quả theo trạng thái account: tồn tại/active, không tồn tại, invite pending, bị gỡ khỏi org, email chưa verify, account bị khoá/suspend, có 2FA bật, staff đa-org.
- Mỗi nhánh reject: error code cụ thể, toast text cụ thể, URL đích, không tạo session, không tạo account.
- Hand-off token/session sau callback: có lộ token trên URL không, dùng 1 lần không, có hết hạn không.
- OAuth `state` (chống login CSRF), callback mở trực tiếp không param, code giả/đã dùng.
- Rate limit: ngưỡng, áp per-route hay chung bucket redirect + callback; staging có thể đặt khác production.

## Impacted areas
- Trang Login, Register, `/oauth` hand-off page, toast/error handling theo query param.
- Email verification state của Staff (bị ghi đè thành verified).
- Logic invite/accept invite, staff đa-org/store selector, 2FA challenge.
- Regression: email/password login, Shopify login, register + verify email, accept invite, logout.

## Risks
- Bypass 2FA của teeinblue qua social login (nếu không hỏi rõ thì đây là lỗ hổng ngầm).
- Bypass invite acceptance khi email đã có account ở org khác nhưng invite pending ở org mới.
- Account takeover nếu chấp nhận email chưa verify từ provider, hoặc nếu match lỏng (alias/dấu chấm).
- Login CSRF nếu không kiểm `state`.
- Token hand-off lộ trong URL/history/Referer.
- Phụ thuộc cấu hình Google Cloud (redirect URI, publish status) — lỗi config dễ bị nhầm thành bug code.

## Suggested test focus
1. Happy path từ mọi nút (Login, Register) → đúng account, đúng org, không tạo account mới.
2. Ma trận reject từng trạng thái account, mỗi case tách test data riêng.
3. Tương tác với 2FA, staff đa-org, staff Shopify không password.
4. Security: callback trực tiếp, `state` sai/thiếu, code reuse, token trên URL, `social_error` lạ/XSS trong query.
5. Rate limit theo header thực tế.
6. Regression các đường login khác.

## Open questions template
- Staff có 2FA bật thì social login có bị challenge 2FA không?
- Staff thuộc nhiều org → vào org nào sau login?
- Email đã là staff active ở org X, đồng thời có invite pending ở org Y → login hay `invite_pending`?
- Match email: chỉ case-insensitive, hay có chuẩn hoá Gmail dấu chấm/`+alias`?
- Có kiểm OAuth `state` không (stateless Socialite?)?
- Hand-off sang `/oauth` truyền gì trên URL, có dùng 1 lần không?
- Nút có hiển thị/hoạt động trong context embedded (Shopify admin iframe) không?
- Toast text chính xác cho từng error code?
