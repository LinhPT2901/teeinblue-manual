# Rule: Migrate token-based auth (JWT) sang session cookie (Sanctum/Fortify) + 2FA

## Khi nào áp dụng
Issue có keyword: `Sanctum`, `Fortify`, `session cookie`, `JWT` → `session`, `2FA`/`two-factor`, `TOTP`, `recovery code`, `password confirmation`/`sudo mode`, `HttpOnly cookie`, `XSRF-TOKEN`, `multi-tab session`, `sign out all devices`, hoặc migrate GraphQL/Hasura call qua API gateway.

## Context cần nhận diện
- Đổi cơ chế auth ảnh hưởng **mọi session đang tồn tại** — luôn có bước "sign out toàn bộ user một lần" khi deploy, đây là known behavior chứ không phải bug, nhưng QA cần verify đúng UX lúc đó (không lỗi, không mất dữ liệu, không error toast lạc).
- Cookie HttpOnly nghĩa là JS không đọc được token → verify "không có access/refresh token trong Local Storage" là một assertion cụ thể cần check bằng DevTools, không suy luận.
- Multi-tab: session cookie theo browser, nhưng "store đang chọn" thường là state riêng theo tab (session storage/memory) — nghĩa là 2 tab có thể **cùng đăng nhập** nhưng **khác store**. Logout thường là session-level nên **mọi tab bị logout cùng lúc**, khác với đổi store per-tab. QA hay nhầm 2 khái niệm này.
- 2FA có nhiều method độc lập (TOTP, email code, recovery code) — mỗi method có state machine riêng (enable cần password confirm trước, challenge riêng lúc login, invalidation riêng lúc disable).
- "Password confirmation cho sensitive action" (sudo mode) có **thời gian hiệu lực** (vd 15 phút) dùng chung cho nhiều action khác nhau — cần test cả việc nó *không* hỏi lại trong window và *có* hỏi lại sau khi hết hạn. **teeinblue (TIB-5628, dev confirm 2026-10-28): window = 15 phút, mọi action dùng chung 1 component.**
- Đổi transport tầng data (GraphQL đi qua API thay vì gọi thẳng Hasura) là thay đổi ngầm, dễ bị bỏ sót trong test vì UI nhìn giống hệt — chỉ lộ ra qua Network tab (đổi endpoint) hoặc khi có lỗi phân quyền/timeout khác hành vi cũ.
- Rủi ro cao nhất của loại đổi này không phải là bug logic nhỏ mà là **quét regression toàn bộ portal** (list/grid, upload, CRUD, billing, affiliate...) vì mọi request giờ đi qua cơ chế auth mới.

## Mô hình 2 đường vào portal (bài học TIB-5335, xác nhận PO 2026-09-17)

teeinblue có **2 đường login riêng biệt**, đừng gộp chung "staff"/"owner" như một khái niệm duy nhất. teeinblue chỉ có **2 role mặc định: `owner` và `editor`** (có thể tạo thêm custom role qua "create/edit roles" — vẫn là sensitive action riêng, không phải role built-in).

**Đường 1 — Shopify embedded (không cần password teeinblue):**
- Gồm cả **Shopify store owner** và **Shopify staff có quyền "manage apps"** (permission cấp trên chính Shopify, không phải trên teeinblue). Cả hai login vào portal qua Shopify Apps, **không cần password teeinblue nào**.
- Role gán tự động: nếu **email login == email của store** → role `owner`; mọi Shopify-staff khác → role `editor`. Không có case Shopify-staff được lên `owner`.
- Vẫn login qua Shopify như bình thường (không có gì đặc biệt xảy ra thêm ở tầng Shopify login do migrate Sanctum) — nhưng cơ chế **2FA / sudo-password-confirm cho nhóm này vẫn CHƯA RÕ** (họ mặc định không có password) → xem Open Question còn tồn đọng ở dưới.

**Đường 2 — teeinblue invite qua email (CHUNG cho mọi platform, kể cả Shopify):**
- Đây là cách **DUY NHẤT** để thêm người vào 1 "user"/store trên teeinblue ngoài đường Shopify-embedded — **luôn qua invite email**, không có đường tự đăng ký rồi tự gắn vào store người khác.
- 1 email/staff **có thể được invite vào nhiều owner/store khác nhau** — hệ thống hỗ trợ 1 identity thuộc nhiều "user" cùng lúc.
- Khi invite: nếu email **chưa có account teeinblue** → tạo staff account mới (cần set password qua link trong email invite, giống flow accept-invite đã có). Nếu email **đã có account** (owner hoặc staff ở nơi khác) → chỉ **thêm họ vào owner/store mới**, KHÔNG tạo account trùng, họ login lại bằng password đã có sẵn.
- **Owner của platform khác Shopify (Etsy, Boundless...) đi qua đường 2 y hệt**: phải tự tạo account teeinblue (email/password) **trước**, rồi mới connect store — **không có** biến thể "auto-create không password" nào cho Etsy/Wix/Boundless, khác hẳn Shopify. → case suy đoán "Etsy/Wix cũng bị pattern password-less giống Shopify" đã bị **bác bỏ chính thức**, đừng viết case theo hướng đó nữa.
- Trang quản lý: **`/staffs`** và **`/roles`** riêng biệt; **1 store có thể có đồng thời cả 2 kiểu staff** (Shopify-embedded tự động + teeinblue-invited qua email) hiển thị cùng nơi.

**Còn tồn đọng (chưa được PO trả lời trực tiếp, đừng tự suy đoán):**
- Cơ chế 2FA / xác nhận sudo-password cho Shopify owner/staff (nhóm mặc định không có password teeinblue) — họ có bị kẹt không, hay có luồng xác nhận khác thay password?
- Khi Shopify revoke quyền "manage apps" của 1 staff ngay trên Shopify — teeinblue phát hiện ngay hay chỉ ở request kế tiếp (giống pattern "next action" đã confirm cho case đổi password ở thiết bị khác)?
- Custom role (ngoài owner/editor mặc định) có gán được cho Shopify-embedded staff không, hay chỉ gán được cho teeinblue-invited staff?

## Staff tạo qua Shopify install không có password (bài học TIB-5335, 2026-09-17)

Staff được tạo tự động khi **chủ shop Shopify cài/mở app** chỉ có email, **không có password** — họ luôn vào dashboard qua đường embedded/auto-login (Shopify → app), chưa từng tự đặt password.

- Nếu staff này thử đăng nhập bằng **form email/password thường của portal** → phải **fail** (sai credential), vì chưa hề có password nào được set trong hệ thống.
- Muốn login được qua form thường, staff phải đi qua **Forgot password** → nhận email → link set password → từ đó mới có password để dùng form thường.
- Đừng nhầm case "sai password" (TC thường: đúng email/sai password, biết trước là có password thật) với case này (đúng email nhưng **chưa từng có password nào**) — thông báo lỗi có thể giống nhau ở UI nhưng nguồn gốc và điều kiện test data khác nhau (cần một staff mới tạo qua Shopify install, chưa từng chạy Forgot password).
- Áp dụng tương tự cho **mọi luồng auto-provision khác không đi qua form đăng ký thường** (staff invitation set password riêng ở bước accept — không bị ảnh hưởng vì họ có set password ngay lúc accept).

## Requirement cần kiểm tra
- Cookie name, `HttpOnly`, domain, thời hạn (nêu rõ số ngày) — đối chiếu đúng với số PO/dev nêu, không tự đoán.
- Đăng nhập sai, email chưa verify, staff chưa approved: message có giữ nguyên như hành vi cũ không (nếu issue nói "same as before" thì đây là confirmed, không phải assumption).
- 2FA: mỗi method (TOTP/email/recovery) có luồng enable, challenge lúc login, disable, và invalidation (recovery code dùng 1 lần, code hết hạn theo thời gian) — liệt kê riêng từng luồng, đừng gộp chung "2FA hoạt động".
- Rate limit / lockout của các luồng nhạy cảm (gửi lại email code, nhập sai code N lần) — ngưỡng cụ thể có nêu trong issue thì lấy đúng số, không có thì hỏi.
- Đổi mật khẩu / sudo action ảnh hưởng session ở **thiết bị khác** như thế nào (sign out device khác ngay hay tới lần request kế tiếp mới phát hiện) — cách phát hiện (polling? lỗi ở API call tiếp theo?) ảnh hưởng UX cần verify rõ.

## Impacted areas
- Toàn bộ portal list/grid pages nếu đổi transport GraphQL (Confirmed nếu issue nêu rõ danh sách trang bị ảnh hưởng, ngược lại Assumption).
- Upload flow (dùng token riêng cho storage-api/photo-api trên production) — Need Dev/PO confirmation nếu môi trường staging không tách host giống production.
- Flow đăng nhập phụ: Shopify/Etsy/Wix app install, accept staff invitation, admin "login as user", email verify link — mỗi flow là một entrypoint auth riêng, dễ bị bỏ sót.
- Public/Open API token và MCP: nếu issue nói rõ "not changed", đây là confirmed out-of-scope, KHÔNG cần test lại toàn bộ, nhưng nên có smoke test xác nhận thật sự không đổi.

## Risks
- Sign-out hàng loạt sau deploy có thể trùng giờ cao điểm merchant đang thao tác → mất dữ liệu form đang nhập dở (không phải bug theo issue, nhưng vẫn nên note vào regression risk).
- 2FA lockout (nhập sai quá N lần) làm mất luôn phiên đăng nhập đang chờ — nếu UX xử lý không rõ ràng, staff có thể nghĩ tài khoản bị khoá vĩnh viễn.
- Multi-tab: nếu test sai kịch bản (tưởng store đổi theo mọi tab, hoặc tưởng logout chỉ ảnh hưởng 1 tab) sẽ báo nhầm bug cho hành vi đúng thiết kế.
- Session ở thiết bị khác sau khi đổi mật khẩu: nếu chỉ verify bằng cách "chờ" mà không có action kích hoạt, dễ false-negative (tưởng vẫn còn sống vì chưa có request nào để lộ ra là đã bị revoke).
- Regression diện rộng: vì auth đổi ở tầng thấp nhất, một lỗi nhỏ (vd XSRF token thiếu ở 1 loại request) có thể fail rất nhiều feature không liên quan tới auth — nên ưu tiên chạy regression suite rộng trước khi đi sâu từng luồng 2FA.
- Môi trường staging có thể không phản ánh đúng số thiết bị/host tách biệt như production (vd storage-api/photo-api) → một số case chỉ verify được sau khi lên production.

## Suggested test focus
1. Sign-in/out cơ bản trước (happy path + sai mật khẩu + email chưa verify) — đây là nền cho mọi test khác.
2. DevTools verify cookie: đúng tên, `HttpOnly`, không có token nào lộ trong Local Storage.
3. Multi-tab: tách rõ 2 kịch bản — (a) đổi store chỉ ảnh hưởng tab hiện tại, (b) logout ảnh hưởng toàn bộ tab của browser đó.
4. Từng phương thức 2FA riêng biệt: enable → challenge lúc login (đúng/sai code) → disable; recovery code dùng 1 lần; resend/rate-limit của email code.
5. Sudo-mode password confirmation: verify cả trong-window (không hỏi lại) và ngoài-window (hỏi lại) cho ít nhất 2 sensitive action khác nhau.
6. Đổi mật khẩu → verify thiết bị khác bị đá ra bằng cách thực hiện 1 action ở thiết bị đó, không chỉ chờ thụ động.
7. Các entrypoint đăng nhập phụ (Shopify install, staff invite, admin login-as, verify email link) — mỗi cái smoke test riêng.
8. Regression rộng trên toàn bộ CRUD/list/upload/billing/affiliate trước khi coi là pass, vì đây là thay đổi tầng auth ảnh hưởng toàn hệ thống.

## Open questions template
- Cookie tồn tại bao lâu, có refresh khi hoạt động hay hết hạn cứng?
- Message lỗi đăng nhập (sai mật khẩu, email chưa verify, staff chưa approved) có giữ nguyên y hệt bản cũ, hay đã đổi text?
- Ngưỡng rate-limit/lockout cụ thể cho từng luồng nhạy cảm (resend email code, nhập sai 2FA) là bao nhiêu?
- Phát hiện "thiết bị khác bị revoke" là real-time (socket/polling) hay chỉ lộ ra ở request kế tiếp?
- Danh sách đầy đủ trang/API nào đổi từ Hasura trực tiếp sang qua API gateway?
- Staging có tách host storage-api/photo-api giống production để test upload không, hay phần đó chỉ verify được trên production?
- Case nào trong "Production-only checks" bắt buộc phải test trước khi release, và ai sign-off phần đó?
