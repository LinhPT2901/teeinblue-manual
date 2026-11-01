# Rule: Hasura permission hardening (column/table lockdown cho role `user`)

## Khi nào áp dụng
Issue có keyword: `Hasura`, `tables.yaml`, `insert_permissions` / `update_permissions` / `delete_permissions` / `select_permissions`, `X-Hasura-User-Id`, `untrack table`, `metadata apply`, `field "..." not found in type`, hoặc security fix "chỉ backend Laravel được ghi cột X" (teeinblue portal đọc/ghi một phần qua Hasura GraphQL, phần còn lại qua REST).

Bổ trợ [[access-control-idor]], [[xss-sanitization]], [[ssrf-url-fetch]].

## Context cần nhận diện
- Portal FE dùng **cả** Hasura GraphQL lẫn REST. Gỡ quyền trên Hasura chỉ an toàn nếu mọi luồng FE ghi cột/bảng đó đã đi REST. Dev thường nói "FE không dùng" — đó là claim cần regression chứng minh, không phải fact.
- Hasura metadata phải được **apply** lên môi trường test, Metadata Status không có inconsistent object; nếu chưa apply thì mọi negative test đều "fail giả".
- Bỏ cột khỏi permission → lỗi `field "<col>" not found in type '<table>_set_input'/'_insert_input'`. Bỏ cả action/table → `field "<root>" not found in type 'mutation_root'/'query_root'`. Không phải 403 HTTP: Hasura trả **HTTP 200 kèm `errors[]`**. Verify theo body, không theo status code.
- Hasura có thể có nhiều role (`user`, `staff`, `anonymous`, ...). Ticket thường chỉ nói `user`. Phải hỏi các role khác.
- Select permission có thể thêm filter (vd `deleted_at: {_is_null: true}`) → ảnh hưởng tới mọi màn đọc bảng đó qua GraphQL, kể cả quan hệ lồng (artwork → layer_images).

## Requirement cần kiểm tra
- Ma trận **table × action (insert/update/delete/select) × column**, mỗi ô: bị chặn hay vẫn mở (có chủ đích). Các ngoại lệ "vẫn giữ quyền" (vd `deleted_at` update cho soft-delete) phải liệt kê rõ.
- Read sau khi chặn write vẫn hoạt động.
- Payload hỗn hợp: mutation gồm 1 cột hợp lệ + 1 cột bị chặn → toàn bộ mutation bị reject, cột hợp lệ cũng không được ghi.
- Mutation lồng (nested insert qua relationship) không là đường vòng ghi cột bị chặn.
- Danh sách bảng bị untrack phải **đầy đủ** (ticket hay chỉ liệt kê một phần).

## Impacted areas
- Mọi màn portal đọc/ghi các bảng bị đổi permission, kể cả quan hệ lồng.
- Client khác có thể gọi Hasura: storefront SDK/customize app, Shopify extension, MCP, Open API, job/worker — cần Dev xác nhận.
- Dữ liệu cũ đã bị ghi giá trị rác trước khi fix (cleanup/migration?).

## Risks
- False positive: một màn ít dùng vẫn ghi qua GraphQL → lỗi `field not found` chỉ thấy ở console, UI có thể im lặng không lưu.
- Lỗ còn sót ở role khác, bảng khác cùng pattern, hoặc qua nested insert / `on_conflict` upsert.
- Untrack bảng làm gãy relationship mà query FE đang dùng (lỗi khi load màn).
- Filter soft-delete trong select làm artwork cũ tham chiếu asset đã xoá bị thiếu data.

## Suggested test focus
1. Pre-check: metadata đã apply, không inconsistent object.
2. Regression portal mỗi luồng ghi bị ảnh hưởng, mở DevTools Network lọc `graphql` xem có `errors[]`.
3. Negative Hasura trực tiếp với token user thật: mỗi table × action × column bị chặn, check `errors[]` + query lại giá trị không đổi.
4. Mixed payload, nested insert, upsert `on_conflict`.
5. Read vẫn chạy cho cột bị chặn ghi.
6. Role khác (staff) nếu có.

## Open questions template
- Hasura có role nào khác ngoài `user` (staff/anonymous)? Có cùng quyền cần gỡ không?
- Danh sách đầy đủ bảng bị untrack?
- Client nào ngoài portal gọi Hasura bằng session user?
- Dữ liệu rác đã ghi trước fix có cleanup không?
- Endpoint Hasura staging + cách lấy token cho QA?

## Bài học TIB-5507 (2026-10-15)
- QA Plan của Dev thường **rộng hơn description** (description chỉ nói chặn ghi cột ảnh, PR còn gỡ delete permission, untrack 33 bảng, thêm filter soft-delete). Lập scope theo PR/QA Plan mới nhất, đối chiếu từng mục với description để tìm mục description có mà Plan thiếu (vd `products.thumbnail` → đã fix ở ticket khác).
- Bảng bị untrack mà Plan vẫn nói "màn X load được data của bảng đó" (vd `layer_image_categories` untrack nhưng "categories load") → hỏi data đó lấy qua REST hay relationship nào; nếu không rõ là mâu thuẫn tiềm ẩn.
- Validation kiểu `prohibited` cho phép giá trị rỗng/`null` → hỏi rõ rỗng/`null` bị **bỏ qua** hay **ghi đè** cột thành rỗng (có thể thành đường xoá ảnh không qua pipeline).
- Filter soft-delete trên select + "Trash page vẫn list item đã xoá" → Trash phải đọc qua REST; artwork/design/order đang tham chiếu asset đã xoá cần kết quả render cụ thể.
