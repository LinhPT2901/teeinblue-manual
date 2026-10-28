# Rule: Paddle billing webhook & usage charge

## Khi nào áp dụng
Issue có keyword: `Paddle`, `webhook`, `price.created`, `subscription.*`, `transaction.*`, `custom_data`, `subscription_type`, `Plan`, `Platform`, `usage charge`, `SendUsageChargeToPaddle`, `billing`, `subscribe`, `cancel/resume subscription`, `upgrade/downgrade plan`, `order fulfillment fee`, `undefined array key` trong Sentry của billing service.

## Context cần nhận diện
- Teeinblue dùng **Paddle** làm payment/billing provider (không phải Shopify Billing API) → subscription, plan, usage charge đều đi qua Paddle, và Paddle bắn webhook ngược về teeinblue-api.
- **Một event type của Paddle có thể đến từ nhiều nguồn khác nhau.** Cụ thể `price.created` có ít nhất 2 nguồn:
  1. **Manual plan creation**: staff TIB tạo plan thật trong Paddle dashboard, gắn `custom_data.subscription_type` → handler map sang `Platform` nội bộ (Shopify, Etsy...) và tạo record `Plan`.
  2. **Usage charge tự động**: job `SendUsageChargeToPaddle` bill phí order fulfillment tích luỹ, gửi Paddle một **inline one-off price** (name: "Teeinblue Usage Charge", **không có `custom_data`**). Paddle tự tạo `Price` resource ngầm → bắn cùng event `price.created`.
- Hệ quả: code chỉ handle case 1 sẽ crash `undefined array key` ở case 2, và crash này lặp **hàng trăm lần/tháng** (chạy theo lịch), nên Sentry sẽ có hàng nghìn event dù không merchant nào báo lỗi.
- **Phân biệt "skip im lặng" và "fail loudly"**: fix đúng phải skip case 2 (bình thường) nhưng vẫn **báo lỗi** khi case 1 bị thiếu/sai tag — nếu skip tất cả thì lỗi cấu hình plan thật sẽ bị che giấu.
- **QA có thể tạo price/plan trực tiếp trong Paddle Sandbox Dashboard** (xác nhận TIB-4938, 28/08/2026) → đây là cách verify tốt nhất cho loại bug này, vì price tạo tay sinh ra webhook **ký đúng chữ ký Paddle**, không cần dev dispatch job hay giả payload.
  - Tạo price **có** `custom_data.subscription_type` hợp lệ → verify nhánh manual plan.
  - Tạo price **không có** `custom_data` → payload cùng **hình dạng** với usage-charge price → exercise cùng code branch. **Lưu ý:** đây không phải đúng đường đi của usage charge thật; nếu handler nhận diện bằng **tên price** chứ không phải bằng việc vắng `custom_data`, kết quả mong đợi sẽ khác → phải hỏi dev điều kiện nhận diện **trước khi** chốt expected result.
  - Tạo price có `custom_data` nhưng `subscription_type` sai → verify nhánh fail loudly.
- Loại bug này **không trigger được qua UI app** — nó phụ thuộc payload Paddle gửi. QA không "click ra" được crash; verify chủ yếu là **regression các flow billing bình thường** + đọc unit test/Sentry.

## Requirement cần kiểm tra
- Webhook `price.created` từ **usage charge** (không có `custom_data`) → xử lý xong, **không throw**, không tạo `Plan` rác, không map sai `Platform`.
- Webhook `price.created` từ **manual plan** (có `custom_data.subscription_type` hợp lệ) → vẫn tạo `Plan` đúng như trước (không regression).
- Webhook `price.created` có `custom_data` nhưng **thiếu/sai `subscription_type`** (giá trị không map được `Platform`) → phải **fail loudly** (log/Sentry), không bị nuốt chung với case usage charge.
- **Usage charge vẫn được thu đúng**: skip webhook không được làm mất/không ghi nhận khoản phí fulfillment.
- Các flow subscription khác không bị ảnh hưởng: subscribe, cancel, resume, upgrade, downgrade.
- Sau deploy: Sentry issue tương ứng **ngừng sinh event mới** (đây là AC thực chất, cần theo dõi vài ngày hoặc sau ít nhất 1 lần chạy usage-charge job).

## Impacted areas
- Handler webhook Paddle (`HandlePaddleWebhook`) và toàn bộ event type đi chung entrypoint — thêm điều kiện nhánh có thể ảnh hưởng event khác.
- Bảng/model `Plan`, `Platform`; danh sách plan hiển thị trên Pricing/Billing page của portal.
- Job `SendUsageChargeToPaddle` và hoá đơn phí fulfillment của merchant.
- Trang Billing/Subscription trong portal: trạng thái gói, ngày gia hạn, nút Cancel/Resume/Change plan.
- Quyền/giới hạn theo plan (feature gating, quota campaign/order) — sai `Plan` là sai quota.
- Sentry alerting / log volume.

## Risks
- Fix quá rộng (skip mọi price thiếu `custom_data`) → **lỗi cấu hình plan thật bị che giấu**, plan không được tạo mà không ai biết.
- Không tái hiện được trên staging nếu không có quyền vào Paddle Sandbox → QA dễ pass "theo lời dev" mà không verify thật.
- Webhook cần **chữ ký Paddle hợp lệ**; tự curl payload giả sẽ bị reject → không phải là bằng chứng fix hoạt động. Cách hợp lệ: tạo price thật trong Sandbox Dashboard.
- Price/plan tạo tay trong sandbox để test sẽ **sinh record `Plan` thật trong DB staging** → cần dọn, tránh nhiễu data cho test sau và cho các QA khác.
- Regression billing là loại rủi ro **tiền bạc**: charge sai / không charge / plan sai quota, khó phát hiện bằng UI.
- Sentry im lặng sau deploy có thể chỉ vì job usage-charge chưa chạy lại → kết luận sớm là false positive.
- Sandbox Paddle và production Paddle khác plan/price ID → data test không map 1-1.

## Suggested test focus
1. Regression flow billing trên staging với Paddle sandbox/test card: **subscribe → active**.
2. **Cancel** subscription → trạng thái cancel phản ánh đúng ở portal (và ngày hết hạn/downgrade).
3. **Resume** subscription đã cancel → active trở lại.
4. **Upgrade / downgrade** plan → gói mới + quota/feature theo gói mới đúng.
5. Kiểm tra danh sách Plan trong portal **không xuất hiện plan rác** tên "Teeinblue Usage Charge".
6. Kích hoạt (hoặc nhờ dev chạy) job usage charge → phí fulfillment vẫn ghi nhận đúng, không có Sentry event mới.
7. *(Optional — chỉ khi QA/PO chủ động muốn exercise từng nhánh)* Tạo price/plan thật trong Paddle Sandbox Dashboard cho 3 biến thể (có custom_data hợp lệ / không có custom_data / custom_data sai). Nếu làm thì ưu tiên cách này hơn simulate event vì webhook ký đúng; nhớ dọn price/plan sau. **Mặc định KHÔNG cần** — xem mục "Scope verify mặc định" bên dưới.
8. Theo dõi Sentry issue gốc sau deploy — số event mới = 0 sau khi job chạy lại.
9. Đọc/xác nhận unit test trong PR (`PlanTest.php`, `HandlePaddleWebhookTest.php`) có cover đúng 2 case và có test cho case tag sai.
10. Kiểm tra feature gating theo plan sau các thao tác trên (quota campaign, số order) — không bị reset/nhảy sai.

## Scope verify mặc định cho bug crash-only (chốt TIB-4938, 09/09/2026)

Loại bug này **chỉ sửa crash, không đổi hành vi nghiệp vụ** — case usage-charge trước fix crash, sau fix skip; không merchant nào thấy khác biệt. Vì vậy scope verify QA chốt là:

- **Không tạo price/plan mới** trong Paddle Sandbox. Dùng plan sẵn có trên staging.
- **Expect = production parity**: sau khi deploy bản fix, Sentry issue tương ứng **ngừng sinh event mới**. Đó là AC thực chất.
- Cộng thêm **regression 4 flow billing** (subscribe / cancel / resume / upgrade-downgrade) trên plan sẵn có.
- Nhánh "fail loudly" (tag sai) **không verify thủ công** — dựa vào unit test trong PR.

**Điều kiện tiên quyết để kết luận pass:** job sinh ra webhook (ở đây là `SendUsageChargeToPaddle`) phải **chạy lại ít nhất 1 lần sau thời điểm deploy**. Sentry im lặng khi job chưa chạy là **false positive**, không phải bằng chứng. Luôn hỏi lịch job và đối chiếu mốc deploy trước khi đóng ticket.

## Open questions template
- Fix có ảnh hưởng event Paddle nào khác ngoài `price.created` không?
- Case `custom_data` có nhưng `subscription_type` không hợp lệ được xử lý ra sao (throw, log, hay skip)?
- Có `Plan` rác nào đã bị tạo trong DB từ trước không, cần cleanup/migrate không?
- Job `SendUsageChargeToPaddle` chạy theo lịch nào, để QA canh verify Sentry sau deploy?
- Webhook từ Paddle Sandbox có trỏ về **staging** không (endpoint đã cấu hình đúng chưa), để price tạo tay thực sự tới handler cần test?
- Staging có kết nối Paddle sandbox đầy đủ (plan, price, test card) không?
- Tiêu chí pass cuối cùng là gì: unit test xanh, hay Sentry 0 event mới sau N ngày?
- Có cần verify trên production (chỉ monitor Sentry) sau khi deploy không?
