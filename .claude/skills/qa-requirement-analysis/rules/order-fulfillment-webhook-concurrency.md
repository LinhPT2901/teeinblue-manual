# Rule: Order status & Shopify webhook đến dồn dập (concurrency / race condition)

## Khi nào áp dụng
Issue có keyword: `order status`, `fulfillment`, `fulfilled`, `Ready`, `partially fulfilled`, `webhook`, `orders/updated`, `fulfillments/create`, `line item`, `sequential`, `concurrent`, `race condition`, `debounce`, `throttle update`, `queue`, `job`, `duplicate webhook`, `sync order`, `Reprocess/Re-sync order`.

## Context cần nhận diện
- Order trong teeinblue portal là **bản sao (mirror) của order Shopify**, đồng bộ qua webhook. Trạng thái hiển thị ở **2 cấp**: order-level (Ready / Partially fulfilled / Fulfilled...) và **line-item level** (mỗi item personalized có status riêng). Bug thường chỉ xảy ra ở một trong hai cấp → luôn kiểm tra cả hai.
- Shopify gửi webhook **không đảm bảo thứ tự, có thể trùng lặp, có thể retry**. Fulfill từng item riêng lẻ trong vài giây tạo ra nhiều webhook gần như đồng thời cho **cùng một order id**.
- App thường có **optimization/dedup logic** (debounce, lock theo order id, "bỏ qua update nếu đang xử lý", so sánh `updated_at`) để tránh xử lý thừa. Chính logic này là nguồn bug: update thứ 2 bị **drop hẳn** thay vì **queue lại**.
- Phân biệt rõ 2 cách fix, vì cách test khác nhau:
  - **Queue/retry**: update sau được xếp hàng, xử lý tuần tự → trạng thái cuối đúng, có độ trễ.
  - **Re-fetch full state**: sau khi xử lý xong thì gọi lại Shopify API lấy trạng thái mới nhất của cả order → tự sửa cả trường hợp miss webhook.
- Trạng thái đúng là **eventual consistency**, không phải tức thời → test cần định nghĩa "sau bao lâu thì coi là sai". Với teeinblue, mốc thực tế là **~2-3 phút** do delay 120s của job.

## Cơ chế thật của teeinblue-api (xác nhận qua TIB-5219)
- Handler: `ShopifyWebhookHandler::handleOrdersUpdated()`. Webhook `orders/updated` được **debounce theo từng order** bằng `Cache::lock()->get()` (non-blocking).
- Webhook đầu tiên chiếm lock → dispatch job **`HandleShopifyOrderWebhookWithMetadata` với delay 120 giây**. Webhook đến sau trong burst **không lấy được lock**.
- Bug gốc: webhook thua lock bị **drop im lặng** (không job, không retry), và job sống sót luôn tin payload snapshot tại thời điểm dispatch → phản ánh trạng thái cũ. Không có reconciliation job nào sửa lại về sau.
- Fix chuẩn đã áp dụng: thua lock → ghi **conflict cache flag**; job delay kiểm tra flag → **bỏ payload cũ và fetch lại order tươi từ Shopify API**; lock chỉ release trong `finally` **sau khi** xử lý xong (thu hẹp race window thứ hai với webhook thứ ba).
- **Hệ quả cho QA: có delay cố ý 120s.** Luôn chờ **~2-3 phút** trước khi kết luận sai. Kết luận sớm hơn là false negative.
- **Scope hẹp — xác nhận với dev TIB-5219:** fix chỉ ghi **`order_items.fulfillment_status`** (Shopify fulfillment status trên order item). **Không** ghi order-level status, **không** ghi `order_items.status` (status nội bộ teeinblue). Hai thứ sau trở thành **regression assertion: phải giữ nguyên**, không phải kỳ vọng thay đổi.
- Hệ quả cho QA: luôn **snapshot cả 3 giá trị trước khi fulfill** (order status, `order_items.status`, `order_items.fulfillment_status`) rồi đối chiếu sau — nếu không sẽ không phát hiện được fix ghi nhầm sang field ngoài scope.
- Nơi kiểm tra dữ liệu: order detail page (cột Shopify fulfillment status) hoặc DB `order_items.fulfillment_status`.

## Requirement cần kiểm tra
- Sau khi tất cả line item được fulfill (dù fulfill riêng lẻ, sát nhau), **mọi item** phải về đúng status và order-level phải là Fulfilled.
- Fulfill **một phần** → order-level phải là Partially fulfilled, item chưa fulfill giữ nguyên Ready (không bị nhảy sai theo).
- Webhook **trùng lặp / đến sai thứ tự** (fulfill đến trước cancel, hoặc ngược lại) → trạng thái cuối vẫn đúng, không bị ghi đè bởi webhook cũ.
- Cẩn thận khi mở rộng sang **cancel / refund / edit order**: chúng đi qua cùng webhook `orders/updated` nhưng **ghi field khác** (order status, financial status, line-item set). Nếu scope fix chỉ là `fulfillment_status` thì các flow này **không đáng test** — chỉ **unfulfill** là thực sự ghi lại `fulfillment_status`. Xác nhận scope trước khi tốn công.
- Có cơ chế **thủ công re-sync order** không (nút Reprocess/Sync)? Nếu có, phải sửa được các order đã sai từ trước.
- Order đã sai trong quá khứ (các order được nêu trong issue) có được **backfill/migrate** không, hay chỉ fix từ nay về sau.

## Impacted areas
- Trang Orders list + Order detail trong portal (status badge, filter theo status, counter).
- Line item status trong order detail; trạng thái file/artwork gắn theo item.
- **Fulfillment service / partner flow**: nếu app đẩy đơn sang nhà in (POD/fulfill partner), status sai có thể chặn hoặc lặp việc gửi đơn.
- Email/notification hoặc export dựa trên order status.
- Job queue / worker của teeinblue-api, log webhook, retry mechanism.
- Regression cho order 1 item (case phổ biến nhất) — fix concurrency dễ làm chậm hoặc hỏng case đơn giản này.
- Multi-store: nhiều store cùng lúc bắn webhook, khoá theo order id phải scope theo store.

## Risks
- **Fix "thêm lock/queue" có thể gây trễ hoặc kẹt hàng đợi** khi merchant fulfill hàng loạt (bulk fulfill 100+ đơn) → cần test tải, không chỉ 2 item.
- Bỏ dedup hoàn toàn → xử lý thừa, tăng tải API, có thể dính rate limit của Shopify.
- Race condition **không tái hiện được 100%** → test pass 1 lần không có nghĩa là đã fix; cần lặp nhiều lần và test trên môi trường có độ trễ giống prod.
- Staging có thể xử lý webhook nhanh hơn/chậm hơn prod → **không tái hiện được bug gốc trên staging** là rủi ro lớn nhất của issue loại này.
- Trạng thái đúng nhưng **đến muộn**; nếu không thống nhất ngưỡng thời gian chấp nhận được thì QA và dev sẽ tranh cãi pass/fail.
- Order cũ đã sai vẫn sai sau khi deploy → khách hàng vẫn phàn nàn dù fix đúng.

## Suggested test focus
1. Tái hiện đúng kịch bản gốc: order **nhiều item**, fulfill **từng item riêng lẻ cách nhau 1-2 giây** → tất cả item + order-level đúng.
2. Biến thể timing: fulfill gần như đồng thời (<1s), cách 5s, cách vài phút; fulfill 2 item cùng lúc trong 1 fulfillment.
3. Fulfill một phần → kiểm tra Partially fulfilled + item chưa fulfill giữ Ready.
4. Order nhiều item với **cùng một sản phẩm/variant** (quantity > 1) và nhiều campaign khác nhau.
5. Order 1 item — **regression** case phổ biến nhất, phải không chậm hơn trước.
6. Bulk: fulfill nhiều order cùng lúc → không kẹt queue, không mất update.
7. Trạng thái khác: cancel order, refund, unfulfill, edit order sau khi đã fulfill một phần.
8. Webhook trùng/gửi lại (replay cùng payload) → không tạo trạng thái sai, không nhân đôi dữ liệu.
9. Kiểm tra lại các order đã nêu trong issue (đơn thật đang sai) sau khi deploy — lưu ý order sai **trước** khi fix thường **không tự sửa**, phải dùng order mới để verify.
10. Lặp lại kịch bản 1 nhiều lần (≥5-10 lần) vì đây là race condition.
11. **Burst 3+ webhook**: fulfill 3 item liên tiếp sát nhau — kiểm tra race window thứ hai (lock release trong `finally`) đã đóng chưa.
12. Với mọi lần verify: **chờ đủ ~2-3 phút** rồi mới kết luận; fail sớm là false negative.

## Open questions template
- Fix theo hướng nào: queue update, retry, hay re-fetch toàn bộ order từ Shopify sau mỗi webhook?
- Thời gian tối đa chấp nhận được để status hội tụ đúng là bao lâu (để QA lấy mốc pass/fail)?
- Status ở **line-item level** và **order-level** — cả hai đều nằm trong scope fix?
- Ngoài Fulfilled, các chuyển trạng thái nào khác đi qua cùng code path (cancel/refund/unfulfill/edit order)?
- Các order đã sai trước khi fix có được tự động backfill không, hay merchant phải thao tác re-sync thủ công?
- Có nút/API re-sync order thủ công để QA và support dùng không?
- Bug này tái hiện được trên staging không? Nếu không, QA verify bằng cách nào (log, webhook replay tool, hay chỉ verify trên prod)?
- Có log/monitoring nào để phát hiện update bị drop sau khi deploy?
- Fulfill số lượng lớn (bulk) có bị ảnh hưởng về hiệu năng không?
