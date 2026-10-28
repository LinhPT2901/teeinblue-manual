# Rule: Campaign Logs / Publication History (audit log publish-update)

## Khi nào áp dụng
Issue có keyword: `Logs`, `Publication History`, `Edit Activities`, `campaign log`, `publish history`, `*_histories` table, hoặc thêm/tách tab log cho Campaign by Product base / Campaign by Shopify (platform product) — bài học TIB-5337.

Bổ trợ [[hasura-permission-hardening]], [[xss-sanitization]], [[date-range-timezone]], [[access-control-idor]].

## Context cần nhận diện
- Có 2 loại campaign: **Campaign by Product base** (đã có Logs 2 tab) và **Campaign by Shopify** (platform product). Issue kiểu "làm giống loại kia" → parity là reference, nhưng cột/status/filter của bên tham chiếu thường KHÔNG được liệt kê trong ticket → phải chụp lại bên tham chiếu làm baseline và hỏi chỗ nào cố ý khác.
- Log được ghi ở backend (bảng mới + migration + Hasura metadata), portal đọc qua Hasura → cần metadata apply + select permission scope theo user.
- Publish/update thường chạy **async (job)** → row log ghi khi job xong; trạng thái trung gian (pending/processing) có hay không phải hỏi.
- Nhiều entry point kích hoạt publish/update: nút trên portal, bulk action ở list, bulk sync (sau sửa global option/product), MCP tool, Open API. Ticket thường chỉ nói "every publish/update".
- Error message "thật" từ Shopify/job → hiển thị nguyên văn → rủi ro XSS, chuỗi dài, lộ thông tin nội bộ.

## Requirement cần kiểm tra
- Event nào ghi log: publish lần đầu, update/re-publish, sync, unpublish, delete, publish lỗi.
- Mỗi row có những cột gì (thời gian, actor, store, status, message), sort, pagination, filter, timezone hiển thị.
- Dữ liệu cũ (trước deploy): migrate log cũ sang bảng mới hay để trống → empty state.
- Tab mặc định khi mở Logs; tab cũ (Edit Activities) giữ nguyên hành vi.

## Risks
- Bỏ sót entry point (bulk/MCP/API/sync tự động) → không có log đúng lúc CS cần nhất.
- Log ghi `Published` dù Shopify thực tế không cập nhật (status theo job vs theo kết quả Shopify).
- Hasura select không scope theo owner → user A đọc log campaign user B.
- Ghi trùng row khi retry job / double click.
- Regression Logs của Campaign by Product base (component dùng chung).

## Bài học TIB-5337 (Dev trả lời 2026-10-28)
- Campaign by Shopify: chỉ `POST platform-products/{id}/publish` (nút trên trang chi tiết) ghi log; publish chạy **đồng bộ**, chỉ có `Published`/`Error`. Lỗi validate trước khi gọi Shopify (400) **không** ghi row. Unpublish ghi ở Edit Activities. Xoá campaign thì history bị xoá theo (cascade).
- Filter All/Published/Error, 10 row/trang + Load more, empty state "No history", thời gian theo timezone store (`YYYY-MM-DD HH:mm:ss`).
- Error message để nguyên, hiển thị dạng text thường, chưa cắt độ dài, chưa lọc → test chuỗi dài + coi lộ thông tin nội bộ là residual risk.
- Dev nói "MCP không có publish cho platform product", nhưng MCP staging có `publish-platform-product-tool` → luôn đối chiếu claim "không có surface X" với danh sách tool thực tế trên môi trường test.

## Suggested test focus
1. Ma trận entry point × kết quả (success/error) → đúng 1 row, đúng status/message.
2. Error message: nội dung thật, escape HTML, chuỗi dài không vỡ layout.
3. Thứ tự/timezone/pagination; campaign cũ → empty state hoặc data migrate.
4. Parity với Logs của Campaign by Product base; Edit Activities không đổi.
5. Hasura: query bảng mới bằng token user khác → không trả data; user không insert/update được.

## Chốt của QA lead TIB-5337 (2026-10-28)
- Thời gian trong Logs hiển thị theo timezone **store đang login/chọn ở sidebar** (không theo store của campaign) → đúng, không hỏi lại.
- Message Error trong history bỏ tiền tố `Shopify errors:<br>` so với response API → chấp nhận được.
- Edit Activities chỉ test theo các option có trong filter; dòng ngoài filter (published/unpublished) không phải phạm vi.
- Publish platform product qua MCP (`publish-platform-product-tool`) chưa ghi Publication History — Dev chốt để ticket sau (phụ thuộc issue feature MCP publish). Khi gặp issue MCP publish platform product → nhớ test luôn việc ghi Publication History.
