# Rule: Hành vi khác nhau theo POD/fulfillment provider (per-provider capability flag)

## Khi nào áp dụng
Issue có keyword: `POD`, `print-on-demand`, `fulfillment provider`, `Printify`, `Myze`, `Printbelle`,
`Printway`, `Gearment`, `Dreamship`, hoặc bất kỳ tên nhà in nào, kèm theo một rule/block áp dụng
"cho mọi provider" nhưng có **một provider ngoại lệ** được nêu riêng trong comment sau đó.

## Context cần nhận diện
- Thiết kế ban đầu hay được phát biểu dưới dạng rule chung ("mọi provider đều X"), nhưng comment
  cập nhật sau đó thường thu hẹp lại: "trừ provider Y". Khi đọc comment cập nhật, luôn hỏi lại:
  **rule gốc có còn đúng cho các provider KHÔNG được nêu tên không, hay đã bị thay đổi ngầm?**
  Comment cập nhật thường chỉ nói rõ về provider ngoại lệ, không nhắc lại tường minh phần còn
  nguyên cho các provider khác — đây là nguồn ambiguity lớn nhất, phải hỏi PO/Dev thay vì suy diễn.
- Hành vi provider-specific gần như luôn đi kèm một **feature flag ở tầng config của riêng
  provider đó** (ví dụ `supports_pickup`), không phải flag toàn hệ thống. Flag này thường:
  - Chỉ bật trên **local**, chưa bật ở bất kỳ môi trường chia sẻ nào (staging/prod) tại thời điểm
    comment được viết — nghĩa là **không thể verify được trên staging cho tới khi dev bật**.
  - Không có UI để QA tự kiểm tra trạng thái — phải hỏi dev xác nhận trước khi chạy test, và nếu
    chưa bật thì case liên quan phải để `blocked`, không phải `not-run`/`failed`.
- Có 2 flow UI khác nhau hay bị gộp nhầm thành một khi viết test case: ví dụ "Bulk Fulfill pages"
  (hiện lỗi khi chặn) và modal "Confirm & Send to fulfill" trên order detail (âm thầm loại bỏ,
  không lỗi) — cùng một rule nghiệp vụ nhưng **UX khác nhau tuỳ điểm vào**. Luôn map rõ: rule áp
  dụng cho path nào, path nào không được nhắc tới thì chưa chắc đã được test.
- "Known limitation, accepted by PO" là một dạng phát biểu đặc thù: PO đã xác nhận một hành vi
  *trông giống bug* là chấp nhận được. Test case cho phần này phải nêu rõ trong Expected Result là
  **không được report bug** nếu quan sát đúng như limitation đã mô tả — tránh việc người chạy sau
  không có context lại report nhầm.

## Requirement cần kiểm tra
- Với MỖI rule được phát biểu "áp dụng cho mọi provider trừ Y": xác nhận với PO/Dev rule đó có còn
  nguyên vẹn cho các provider khác sau bản cập nhật hay đã đổi luôn (ví dụ: một bug report riêng về
  "pickup item biến mất khỏi listing" có thể chính là hệ quả/mặt trái của việc thêm ngoại lệ cho
  provider Y — kiểm tra xem 2 thay đổi có phải cùng một root cause không).
- Trạng thái feature flag riêng của provider trên từng môi trường (local/staging/prod) — xác nhận
  trước khi chạy, không tự suy đoán từ hành vi quan sát được.
- Nếu có nhiều entry point UI cho cùng một hành động nghiệp vụ (list page action vs. detail page
  modal action), test riêng từng entry point — đừng coi một cái đã pass là đủ cho cái còn lại.

## Impacted areas
- Trang/API liệt kê item theo lô (bulk action pages) — dễ bị ẩn/loại item sai nếu logic filter theo
  provider bị áp dụng nhầm phạm vi (áp cho tất cả thay vì chỉ non-exception provider, hoặc ngược lại).
- Modal/flow xác nhận riêng lẻ trên trang chi tiết — thường có logic loại bỏ âm thầm khác với logic
  chặn-và-báo-lỗi của trang danh sách.
- Payload gửi cho provider thật (field mô tả pickup/shipping) — có thể tính sai ở granularity khác
  với UI (ví dụ tính theo order thay vì theo item) mà PO đã biết và chấp nhận.

## Risks
- Verify trên staging trong lúc feature flag của provider chưa bật → kết luận "vẫn còn bug" hoặc
  "đã hết bug" đều có thể sai, vì đang test nhánh code/config chưa active.
- Report nhầm "known limitation, accepted by PO" thành bug mới do thiếu context — lãng phí thời
  gian dev triage lại điều đã được quyết định trước đó.
- Chỉ test path chính (trang danh sách) mà bỏ qua path phụ (modal chi tiết) tưởng đã cover chung.

## Suggested test focus
1. Với rule chung: test lại trên provider KHÔNG được nêu ngoại lệ, xác nhận rule gốc vẫn đúng.
2. Với provider ngoại lệ: test riêng đủ các entry point (list action, single action, modal action).
3. Case cho "known limitation, accepted by PO": expected result ghi rõ "PASS nếu đúng như limitation
   đã mô tả, không report bug".
4. Thêm 1 case blocker/precondition kiểm tra trạng thái feature flag riêng của provider trên đúng
   môi trường sẽ chạy test, trước khi chạy các case phụ thuộc vào nó.
5. Nếu nghi ngờ một bug report riêng và một exception-rule mới có cùng root cause (ví dụ cùng đụng
   tới logic filter theo delivery method), verify trực tiếp qua API/DB thật thay vì qua UI hoặc qua
   một tool/MCP trung gian có thể đã lược bớt field cần thiết — nhiều internal tool (MCP, wrapper)
   không expose đủ field để phân biệt được (ví dụ thiếu hẳn field đánh dấu pickup/shipping).

## Open questions template
- Sau bản cập nhật cho provider ngoại lệ, rule gốc có còn áp dụng y nguyên cho các provider khác
  không, hay đã đổi luôn (ví dụ: ẩn hẳn khỏi listing thay vì chỉ chặn khi fulfill)?
- Feature flag riêng của provider đã bật trên môi trường nào? Bao giờ bật trên staging/prod?
- Rule áp dụng cho những entry point UI/API nào? Có entry point nào chưa được liệt kê không?
- "Known limitation" đã được PO xác nhận bằng văn bản ở đâu (comment/link) để trích dẫn lại khi cần?
