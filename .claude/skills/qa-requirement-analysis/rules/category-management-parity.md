# Category Management Parity Across Modules (teeinblue)

Dùng rule này khi issue yêu cầu thêm/sửa **Category** cho một module (Global Option, Additional Option, Artwork, hoặc module mới) với yêu cầu kiểu "matching the existing Category structure used in X". Đây là pattern lặp lại: mỗi lần một module mới được gắn category, spec thực tế nằm ở **implementation đã có của module khác**, không nằm trong text issue.

## Context to recognize

- Issue mô tả ngắn (Currently/Expectation) + vài screenshot, không có AC chi tiết, không có data/validation rule cụ thể.
- Câu văn dạng "matching the existing Category structure used in Artwork/Additional Option" — nghĩa là nguồn sự thật (source of truth) là UI/behavior đang chạy thật của module tham chiếu, không phải text trong ticket.
- Thường có vòng feedback UI giữa QA/PO/Dev trong comment (vd: "UI này không giống Additional Options hay category của Artwork" → dev update lại UI) trước khi vào QA Review — cần đọc comment để biết bản UI cuối cùng đã match chưa, đừng chỉ đọc description gốc.

## Requirements to check

- **Phạm vi category**: per-store hay global toàn account? (issue thường nhấn mạnh "per store" trong summary nhưng cần Dev xác nhận model dữ liệu).
- **CRUD category**: tạo/sửa/xóa category ở đâu, ai được phép, có giới hạn số lượng/tên trùng không.
- **Gán category cho item**: 1 item (option/artwork) thuộc 1 category hay nhiều category? Có bắt buộc chọn category không, hay có "Uncategorized" mặc định?
- **Data migration**: các item đã tồn tại trước khi có category thì được gán category gì (mặc định/null/Uncategorized)?
- **Xóa category đang được dùng**: item thuộc category bị xóa thì xử lý ra sao (chuyển về Uncategorized, chặn xóa, hay xóa luôn liên kết)?
- **Filter/Search/Group theo category**: danh sách item có filter dropdown theo category không, hành vi khi chọn nhiều category, khi không chọn gì.
- **UI parity thật sự**: so sánh trực tiếp UI category của module mới với module tham chiếu (Additional Option, Artwork) — không suy luận từ ảnh trong ticket vì ảnh có thể đã lỗi thời (đã có ít nhất 1 vòng sửa UI trong comment).

## Impacted Areas

- Module đang được thêm category (form tạo/sửa item, danh sách item, filter bar).
- Module tham chiếu (Additional Option, Artwork) — regression nếu code category bị refactor/share chung component.
- Multi-store: nếu category scope theo store, kiểm tra category không leak giữa các store của cùng account.
- API/backend field mới cho category (nếu có endpoint public/API riêng cho Global Option).

## Risks

- Ticket không có AC/data rule → dễ viết test case dựa trên suy đoán UI cũ (ảnh trong ticket) thay vì UI thực tế đã merge.
- Không rõ per-store vs global scope → test sai phạm vi (test 1 store nhưng bug thực chất ở store khác).
- Bỏ sót case xóa category / migrate item cũ.

## Open Questions To Consider

- Category của Global Option là per-store hay chia sẻ toàn account?
- Item cũ (tạo trước feature này) được gán category gì mặc định?
- Xóa 1 category đang có item gán vào thì item đó ra sao?
- UI cuối cùng (sau các comment feedback) đã match 100% với Additional Option/Artwork chưa, hay có khác biệt có chủ đích?

## Suggested Test Focus

- So sánh side-by-side UI/behavior category giữa module mới và module tham chiếu (Additional Option, Artwork) trên cùng 1 store.
- CRUD category: tạo, sửa tên, xóa (kèm case category đang có item).
- Gán/đổi/bỏ category cho item; filter danh sách theo category (chọn 1, nhiều, không chọn).
- Multi-store: category tạo ở store A không xuất hiện/ảnh hưởng ở store B (nếu scope per-store được xác nhận).
- Item tồn tại trước feature: kiểm tra category mặc định sau khi feature release.
