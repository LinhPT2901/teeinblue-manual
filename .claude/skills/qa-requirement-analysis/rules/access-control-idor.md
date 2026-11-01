# Rule: Broken Access Control / IDOR (object-level authorization)

## Khi nào áp dụng
Issue có keyword: `IDOR`, `broken access control`, `authorization`, `can: middleware`, `policy`, `ownership check`, `cross-tenant`, `authorizeResource`, `403/404`, `download/clone/sync` một resource theo numeric ID, hoặc security fix siết quyền trên endpoint.

## Context cần nhận diện
- Backend thường là Laravel: `authorizeResource()` / `resourceAbilityMap()` chỉ gắn `can:` middleware cho method tên chuẩn (index/show/create/store/import/clone/edit/update/destroy). Custom action name (`cloneMultiple`, `download`, `clonePlatformMockup`, `storeFont`, `sync`...) KHÔNG được bảo vệ tự động → dễ hở.
- Nested route (`{parent}/child/{child}`) cần scope child theo parent, nếu không attacker ghép parent-của-mình + child-của-victim để bypass.
- Query không scope theo `user_id`/tenant (`Model::where('url', ...)`) là dấu hiệu IDOR.

## Requirement cần kiểm tra
- Mỗi action đọc/clone/download/sync resource private phải có object-level ownership check.
- Response code kỳ vọng: cross-tenant thường **403** (policy `can:`), route-binding mismatch hoặc unscoped lookup thường **404**. Luôn hỏi rõ code mong đợi per endpoint.
- Fix phải **transparent với owner** — không chặn nhầm luồng hợp lệ (false positive là rủi ro số 1 của security-siết-quyền).

## Impacted areas
- Từng controller/action được liệt kê + UI component tương ứng trong portal gọi endpoint đó.
- Resource/serializer có thể lộ field private (`master`, `url`, `thumbnail`, token...).
- Bulk action (`cloneMultiple`) với list ID.

## Risks
- False positive: owner bị chặn nhầm → mất tính năng.
- Bulk action với list ID lẫn của tenant khác: all-or-nothing hay partial? (thường chưa nêu rõ → open question).
- Action không có bước manual test riêng (vd `sync`, `generate`) dễ bị bỏ regression.
- Data leak: non-owner đọc được field private trước khi bị chặn.

## Xác định ownership TRƯỚC khi kết luận IDOR (bài học TIB-5018, 2026-08-21)

Đừng suy ownership của resource từ những gì UI hiển thị. Ví dụ thực tế: store selector chỉ liệt kê store đang active/connected, nhưng 1 user account sở hữu NHIỀU instance hơn thế (store cũ, đã ngắt kết nối, ẩn). Instance không có trong dropdown vẫn có thể thuộc chính user đó.

- Trước khi gọi "IDOR", phải có **ground truth ownership**: hỏi chủ tài khoản/dev instance/resource nào thuộc user nào — không đoán từ UI.
- Đọc đúng ma trận status code:
  - **200 cho resource của chính user** (kể cả store ẩn) = phân quyền ĐÚNG, không phải leak.
  - **403 cho resource của user KHÁC** = chính là bằng chứng authorization ĐANG hoạt động. Nếu hệ thống thực sự hở thì id của người khác cũng phải trả 200.
  - **404** = không tồn tại (hoặc cố tình giấu sự tồn tại).
- Chỉ kết luận IDOR khi: token của user A nhận **200 + data** cho resource mà ground truth xác nhận thuộc user B. Một endpoint trả 200 cho nhiều id KHÔNG tự động là IDOR nếu các id đó đều thuộc user A.
- Với app 1 user quản nhiều store: user search/đọc được resource ở **mọi store của chính mình** là BY DESIGN, không phải lỗ hổng.

## Suggested test focus
1. **Owner positive** cho MỌI action bị đổi (cả action phụ như sync/generate) — đảm bảo không chặn nhầm.
2. **Cross-tenant negative** qua API trực tiếp: token User B tới resource mà **ground truth xác nhận** thuộc User A → phải 403/404. Chọn resource id đã biết chắc thuộc user khác, đừng lấy id ngẫu nhiên rồi suy từ việc nó không có trên UI của mình.
3. **Nested route bypass**: parent-của-B + child-của-A → reject.
4. **Unscoped lookup**: trade public URL lấy private master → 404, không tạo bản ghi.
5. **Data-leak**: verify response không chứa field private khi bị chặn.
6. Cần 2 account (A owner / B attacker) + auth token của B; automated test hit API trực tiếp nên positive/owner flow vẫn cần verify qua UI.

## Open questions template
- Response code chuẩn hoá per endpoint (403 vs 404)?
- Bulk action với mixed ID: reject toàn bộ hay partial?
- Action phụ (sync/generate...) có cần negative test riêng?
- UI xử lý gì khi owner (edge case) nhận 403/404?

## Scope ownership theo param do CLIENT tự gửi (bài học TIB-5530, 2026-10-13)

Fix kiểu "reject khi `shop` (hoặc `instance_id`, `store`, header...) trong request không khớp owning instance" trên endpoint **anonymous/public** (storefront `merchant/*`) chỉ chặn được request gửi nhầm/naive — **không** phải authorization thật nếu param đó không được server ký/verify.
- Attacker đã có `uuid` thường cũng biết được `shop` của nạn nhân (lộ cùng chỗ: URL trang sản phẩm, `Shopify.shop` trong JS, myshopify domain) → chỉ cần gửi `shop` = shop nạn nhân là pass.
- Luôn hỏi: param scope lấy từ đâu, có được verify server-side không (Shopify app proxy signature/HMAC, session token, signed token gắn với customization)? Nếu không → ghi rõ là **residual risk** để PO chấp nhận, đừng để QA PASS AC rồi coi như đóng lỗ hổng.
- Test bắt buộc gồm 3 nhánh tách biệt: (1) shop khớp owner → 200; (2) shop khác → 403/404; (3) **attacker gửi shop = shop của owner** (đúng giá trị) từ origin/IP khác → kết quả thực tế, report đúng như quan sát, không suy luận.
- Chuẩn hoá giá trị scope: myshopify domain vs custom domain, hoa/thường, `www.`, `https://`, trailing slash, thiếu param, param rỗng, param là array → mỗi biến thể phải có kết quả xác định (không 500, không fallback cho qua).
