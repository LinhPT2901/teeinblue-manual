# Activity log: phân biệt action thủ công vs tự động

Dùng khi issue yêu cầu log/timeline (vd `order_item_activities`, campaign Edit Activities, staff activity log) phải phân biệt các action cùng dẫn tới một trạng thái — thường là "đổi status thủ công" vs "hệ thống/flow tự đổi" (Confirm & Send, webhook, tracking, render xong).

## Context cần nhận diện

- Log thường được ghi bởi Observer khi field `status` dirty → mọi path đổi status (manual, job, webhook, system) đều đi qua cùng một chỗ. Fix thường thêm cờ "manual" chỉ ở path manual.
- Subject log là free text, không migration → dòng cũ giữ nguyên chữ cũ.
- Có thể có **nhiều tầng log**: log line item, log order-level, staff activity log. Fix một tầng không có nghĩa tầng khác đổi.

## Requirement cần kiểm tra

- Wording chính xác của từng dòng log mới — **phải lấy từ PR/Dev confirm**, comment giải pháp có open question thì chưa phải chốt.
- Ma trận: mỗi status đích × mỗi nguồn (manual đơn, manual bulk, flow tự động) → subject + type/màu timeline.
- Path tự động **giữ nguyên byte-for-byte** (regression âm tính).
- Đổi sang chính status hiện tại → có/không ghi log.
- Side effect của observer (cập nhật status order-level, cache đếm item) vẫn chạy khi đi nhánh manual.
- Cờ manual reset sau save → thao tác hệ thống ngay sau đó trên cùng item không bị gắn nhãn "manually".

## Risks

- Test trên data cũ → thấy chữ cũ, tưởng fix không chạy.
- Bulk change / change từ trang khác (list vs detail) đi endpoint khác chưa gắn cờ manual.
- Expected wording QA tự đoán từ comment đề xuất, PR cuối dùng chữ khác.

## Open Questions thường phải hỏi

- Wording cuối cùng đã chốt chưa (chính xác từng ký tự, có tên staff không)?
- Scope: chỉ status bị báo hay mọi status trong menu?
- Có những entry point manual nào (detail, list bulk, API/MCP)? Tất cả đã gắn cờ?
- Log order-level có đổi theo không?
