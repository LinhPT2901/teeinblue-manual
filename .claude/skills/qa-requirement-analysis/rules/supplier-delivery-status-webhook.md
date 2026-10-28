# Rule: Supplier webhook → Shopify `Delivery status` (fulfillment event)

## Khi nào áp dụng
Issue có keyword: `Delivery status`, `delivered`, `undelivered`, `failed to deliver`, `tracking webhook`,
`trackInfo`, `checkpoint_delivery_status`, `fulfillment event`, `shipment status`, `supplier webhook`,
`printbelle` / `printway` / `gearment` / `dreamship` / tên nhà in khác, `carrier`, `logistic`,
`sync tracking number`, `auto-update status from supplier`.

## Context cần nhận diện
- Chuỗi dữ liệu có **3 chặng**, không phải 2: `Supplier → webhook endpoint của teeinblue → Shopify API`.
  Lỗi có thể nằm ở bất kỳ chặng nào → khi fail phải xác định chặng (webhook nhận được chưa? app parse đúng chưa? Shopify từ chối chưa?).
- `Delivery status` trên Orders list là **field native của Shopify**, không phải cột do app tạo. App ghi vào nó
  bằng cách tạo **fulfillment event** (DELIVERED / FAILURE / IN_TRANSIT...) trên một **fulfillment đã tồn tại**.
  → **Điều kiện tiên quyết: order phải Fulfilled (có fulfillment + tracking) trước.** Gửi delivery status khi
  chưa có fulfillment thì không có gì để ghi vào → cột vẫn rỗng, và đó **không** phải bug nếu scope không nói khác.
- Shopify có **nhiều** shipment status hơn cặp delivered/failure (in transit, out for delivery,
  attempted delivery, ready for pickup, confirmed, label printed). Supplier cũng có tập status riêng
  (transit, pending, notfound, expired, exception...). Fix thường chỉ **map một tập con** → mọi status ngoài
  tập đó phải **giữ nguyên cột rỗng**, và "không đổi" chính là expected result, không phải thiếu tính năng.
- Fulfillment event trong Shopify là **append-only và có thứ tự ngầm**: sau khi đã DELIVERED, event lùi về
  IN_TRANSIT có thể bị Shopify từ chối hoặc không đổi hiển thị. → Test chuyển trạng thái ngược phải xác nhận
  expected với dev, đừng tự suy luận.
- Supplier webhook thường là **cùng một endpoint dùng chung** cho cả tracking number và delivery status
  (payload khác nhau ở một field). → Mọi thay đổi ở đây **luôn có regression risk lên tracking number sync**.
- Webhook từ supplier **có thể gửi lại nhiều lần** cho cùng một trạng thái (retry, poll định kỳ)
  → phải idempotent: không tạo event trùng, không spam Shopify API.

## Requirement cần kiểm tra
- Mapping đúng từng status supplier → giá trị Shopify hiển thị (delivered → `Delivered`,
  undelivered/failed → `Failed`); yêu cầu **danh sách mapping đầy đủ, dạng bảng**, không chấp nhận "vv".
- Status ngoài tập được map → cột `Delivery status` **không thay đổi** (rỗng vẫn rỗng, đã có giá trị vẫn giữ).
- Gửi lặp cùng payload → trạng thái cuối đúng, không nhân đôi event/notification.
- Tracking number + carrier + tracking URL vẫn sync đúng như trước (regression bắt buộc).
- Scope theo supplier: chỉ supplier được nêu, các supplier khác **không đổi hành vi** (kể cả không lỗi).
- Thẩm quyền/xác thực webhook: payload mang token/user_id — token sai, user_id không khớp order,
  orderNo không tồn tại → phải từ chối, không ghi bừa sang order của user khác.
- Order cũ đã sai trước khi deploy có được backfill không, hay chỉ áp dụng cho webhook mới.
- Thời gian hội tụ: webhook → cột đổi mất bao lâu (đồng bộ ngay hay qua queue/job có delay).

## Impacted areas
- Shopify order detail + Orders list (`Delivery status`, `Fulfillment status`, timeline/fulfillment events).
- Webhook endpoint của supplier trong teeinblue-api (cùng endpoint với tracking sync) và job/queue phía sau.
- Order detail trong teeinblue portal: tracking number, carrier, trạng thái item.
- Email/notification của Shopify gắn với delivery event (Shopify có thể gửi mail "delivered" cho customer)
  → đổi hành vi này ảnh hưởng tới end-customer, phải xác nhận có mong muốn hay không.
- Shopify API rate limit nếu webhook đến dồn dập hoặc bị gọi lặp.
- Các supplier khác dùng chung code path fulfillment/tracking.

## Risks
- **Không tái hiện được bằng webhook thật**: supplier quyết định khi nào gửi → QA phải tự simulate bằng
  Postman. Simulate sai shape payload → fail giả, hoặc pass giả vì app chấp nhận payload dễ hơn thực tế.
- Setup test phải **chèn tay vào DB** (fulfiller, user_fulfillment) → rủi ro làm bẩn/hỏng data staging và
  rủi ro test trên state không giống prod. Phải có cleanup.
- Cần order **thật tồn tại trên Shopify store**; staging hay có order orphan → mất thời gian chọn sai order.
- Đánh dấu `Failed` sai (do map status mơ hồ) **tệ hơn** để rỗng: khách hàng thấy đơn "giao thất bại" oan.
- Phụ thuộc setting bên supplier (có push mọi tracking change hay không) → pass trên staging vẫn có thể
  "không hoạt động" trên prod, và đó không phải bug của code.
- Test `Failed` và test `Delivered` **không dùng lại cùng order** được (event đã terminal) → phải chuẩn bị
  nhiều order độc lập.

## Suggested test focus
1. Happy path đủ 2 bước: webhook tracking (fulfillment được tạo, `Fulfilled`) → webhook delivered → cột `Delivered`.
2. Nhánh failed: `undelivered` → cột `Failed`, trên **order khác** đã fulfilled.
3. Status ngoài tập map (transit, pending, notfound, expired, exception) → cột **không đổi**, từng giá trị một case.
4. Idempotency: gửi lại webhook delivered 2-3 lần → vẫn `Delivered`, không nhân event.
5. Regression tracking sync: tracking number/carrier/URL vẫn ghi đúng sang Shopify như trước.
6. Thứ tự bất thường: delivered đến **trước** khi có fulfillment; delivered rồi mới transit; nhiều checkpoint
   trong cùng `trackInfo` (lấy cái nào?) — xác nhận expected với dev trước khi chạy.
7. Payload lỗi: thiếu field status, status rỗng/null, `trackInfo: []`, orderNo không tồn tại,
   token/user_id sai → không crash, không ghi sai order.
8. Supplier khác (không phải supplier trong scope) gửi status tương tự → không đổi hành vi.
9. Order nhiều item / nhiều fulfillment (nhiều supplier trên 1 order) → chỉ phần đúng bị cập nhật.
10. Kiểm tra cả Shopify order timeline để thấy event được tạo, không chỉ tin cột hiển thị.

## Open questions template
- Bảng mapping đầy đủ status supplier → Shopify shipment status là gì? Status nào cố tình bỏ qua?
- Điều kiện tiên quyết có bắt buộc order đã Fulfilled? Nếu delivered đến trước tracking thì expected là gì?
- Nếu `trackInfo` có nhiều checkpoint thì app lấy checkpoint nào (mới nhất theo `checkpoint_date`, hay cuối mảng)?
- Đã `Delivered` rồi nhận `undelivered` (hoặc ngược lại) thì cột đổi hay giữ? Shopify có cho phép không?
- Webhook đến → cột đổi mất bao lâu (sync hay qua job có delay)? Mốc pass/fail của QA là bao nhiêu?
- Việc tạo delivery event có kích hoạt email Shopify gửi cho end-customer không? Có mong muốn không?
- Order đã delivered trước khi deploy có được backfill không?
- Xác thực webhook: token/user_id sai hoặc orderNo của user khác thì xử lý thế nào?
- Có log/monitoring nào để thấy webhook đã nhận và event đã đẩy thành công lên Shopify?
