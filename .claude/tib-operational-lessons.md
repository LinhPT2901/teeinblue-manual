# TIB Operational Lessons — gặp dấu hiệu này thì xử lý thế nào

File này trả lời "gặp dấu hiệu X thì phục hồi thế nào". Dùng data nào thì tra `tib-reusable-test-data.md`, không ghi ở đây.

## Quy trình dùng (agent `tib-test-data` / `tib-execute-testcase`)

1. Gặp trở ngại → tra bài học theo **Dấu hiệu** + **Phạm vi**.
2. Kiểm **Giới hạn** và **Độ mới** còn đúng không (đã có deploy mới? dấu hiệu có khác?).
3. Làm theo **Cách xử lý**, rồi chứng minh đã phục hồi theo **Cách xác minh**.
4. Thành công → cập nhật ngày ở **Độ mới**. Trong `actualResult`/report ghi "phục hồi theo L-xxx" + bằng chứng, **không hỏi lại người dùng**.
5. Thất bại → thêm dòng `⚠ cần kiểm tra lại (ngày, dấu hiệu khác gì)` vào **Độ mới**, thử phương án khác trong ngân sách cho phép (tối đa 2 phương án/blocked), hết thì mới `blocked`.

## Ai được ghi gì

- **Agent tự ghi được:** quan sát và cách phục hồi **đã kiểm chứng** (có bằng chứng). Bài học mới ghi trạng thái `đã kiểm chứng`.
- **Phải được người dùng xác nhận trước** (ghi trạng thái `chờ xác nhận`, không được dùng như quy tắc chung cho tới khi được xác nhận): bài học đụng tới business rule, mở rộng quyền (vd được sửa data/config mà trước đó không được sửa), hoặc đổi tiêu chí Pass.
- Workaround không bao giờ là tiêu chí Pass. Cách xử lý chỉ áp cho bước setup, không áp cho luồng đang kiểm thử.
- Mỗi bài học giữ ngắn. Dùng lại thì chỉ sửa **Độ mới**, không thêm bản trùng.

## Format

```
### L-<số> — <tên ngắn>  [đã kiểm chứng | chờ xác nhận]
- Dấu hiệu:
- Phạm vi: (store, app, môi trường, phiên bản nếu biết)
- Nguyên nhân: (đã xác minh / giả thuyết)
- Cách xử lý:
- Cách xác minh:
- Giới hạn:
- Độ mới: (ngày xác minh + bằng chứng; điều kiện cần kiểm tra lại)
```

---

### L-001 — 429 kéo dài khi tạo layer-image  [đã kiểm chứng]
- Dấu hiệu: `POST /api/layer-images/from-clipart` hoặc `/by-temporary-file` trả 429 liên tục, UI kẹt `Generating...`, không có toast. GET/publish vẫn 200.
- Phạm vi: staging portal, account user 64, artwork editor.
- Nguyên nhân: đã xác minh là quota tạo layer-image theo account, cửa sổ dài (không phải burst). Ngưỡng cụ thể: giả thuyết, ≤ 2 request liên tiếp.
- Cách xử lý: dừng mọi thao tác tạo layer-image, làm các phần khác trước; thử lại 1 lần sau vài giờ. Tính trước số request cần dùng và gom lại.
- Cách xác minh: request tiếp theo trả 201, layer có ảnh trong library.
- Giới hạn: chỉ nhóm POST tạo layer-image. Không áp cho 429 của SDK storefront (rate limit khác, staging cố ý đặt nhỏ). Nếu issue đang test chính là rate limit này thì 429 là kết quả, không phải blocker.
- Độ mới: 2026-10-01, TIB-5425, artwork 4539 (ledger). Kiểm lại nếu 429 xuất hiện ngay request đầu sau nhiều giờ, hoặc ở endpoint khác.

### L-002 — Storefront 404 dù campaign by Shopify đã publish  [đã kiểm chứng]
- Dấu hiệu: portal publish 200, nhưng `/products/<handle>` 404, không có trong `/collections/all`; nút `View` chỉ mở trang chủ.
- Phạm vi: campaign by Shopify product, store Shopify của QA (linh-tib-staging, linh-tib-checkout).
- Nguyên nhân: đã xác minh là Shopify product chưa bật sales channel Online Store.
- Cách xử lý: login Shopify admin bằng Playwright → product → bật Online Store.
- Cách xác minh: `/products/<handle>` trả trang sản phẩm có form teeinblue.
- Giới hạn: không áp khi issue đang test chính là luồng publish/sync product sang Shopify (khi đó 404 là kết quả cần ghi nhận).
- Độ mới: 2026-09-30, TIB-5349, platform product 532. Kiểm lại nếu đã bật Online Store mà vẫn 404 (kiểm password store, locale prefix, cache).

### L-003 — Payload có `<script>` bị WAF chặn lúc save/upload  [đã kiểm chứng]
- Dấu hiệu: `net::ERR_FAILED` kèm lỗi CORS (không có `Access-Control-Allow-Origin`), toast `Network Error`; payload sạch cùng endpoint thì 200/201.
- Phạm vi: staging-api.teeinblue.com (upload SVG, PUT artwork, Postman collection).
- Nguyên nhân: đã xác minh là edge/WAF chặn theo nội dung body chứa `<script` / `onload=`.
- Cách xử lý: dựng data bằng biến thể không có `<script>` (vd `<img src=x onerror=...>`).
- Cách xác minh: save 200 và payload persist nguyên văn sau reload.
- Giới hạn: chỉ khi case không bắt buộc đúng payload `<script>`. Case yêu cầu đúng payload đó thì vế đó `blocked` (cần Dev whitelist), không được thay payload rồi kết luận. Không ghi "WAF chặn" thành kết luận "app an toàn".
- Độ mới: 2026-08-28, TIB-5278, artwork 3771/3772. Kiểm lại nếu biến thể `onerror` cũng bị chặn.
