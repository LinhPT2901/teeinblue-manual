# TIB Reusable Test Data — data đặc thù dùng lại được

Danh mục data **khó tìm / không tự tạo được** (account đặc thù, store đặc thù, campaign/product ở trạng thái hiếm).
Khác ledger (`runs/<KEY>/ledger.md` = mọi thứ agent đã TẠO cho từng issue, để dọn): file này là chỗ TRA TRƯỚC khi đi tìm data đặc thù.

**Quy tắc:**
- **Xác minh trước khi dùng:** mở link/ID, kiểm trạng thái thực tế. Lệch với file thì tin môi trường và sửa dòng.
- **Được sửa?** = `Không`: chỉ đọc/dùng, không đổi gì. = `Trả lại`: được đổi tạm nhưng phải trả về nguyên trạng sau khi dùng (trước khi đổi phải `acquire` qua `scripts/tib_runctl.py`, kể cả khi chạy một mình). = `Có`: data QA riêng, sửa thoải mái.
- **Sau khi dùng:** chỉ cập nhật thông tin **có thay đổi** hoặc **vừa xác minh** (cột "Xác minh gần nhất", "Trạng thái"). Không ghi nhật ký từng lần dùng.
- **Tìm ra** data đặc thù mới → thêm dòng ngay.
- **Tìm không ra** → ghi ở mục "Đã tìm, chưa có": tìm ở đâu, lúc nào. Mục này chỉ để tránh tìm lại ngay, **không phải kết luận data không tồn tại**. Lần sau cần thì thử nguồn khác (hỏi Dev, query khác) trước khi quét lại cùng chỗ.
- Không ghi password/token; chỉ ghi tên biến trong `.env`.

## Account / org

| ID / link | Mục đích | Môi trường | Xác minh gần nhất | Được sửa? | Trạng thái / ghi chú |
|---|---|---|---|---|---|
| user 64, `TIB_STAGING_EMAIL` | Account chính QA (store linh-tib-staging) | staging | — | Trả lại (config account) | default_layer_value: required:false, show_in_cart:true |
| user 247, `TIB_NO_MAPBOX_KEY_TOKEN` | Account **không có Mapbox** | staging | — | Không | user 64/94 đều có Mapbox |
| `TIB_ONBOARDING_EMAIL` / `_PASSWORD` | Store mới **chưa connect fulfillment** | staging | 2026-10-13 (TIB-5548) | Không (giữ sạch) | Login trong profile Playwright sẽ thay session linh-tib-staging |
| org 94 "OETester 241", store oe24-staging-tib; `TIB_USER_B_*` | Victim cross-tenant (IDOR) | staging | 2026-10-30 (TIB-5500) | Trả lại | Staff 2 là editor org 94 → KHÔNG dùng header `x-acting-user-id` |
| `TIB_STAFF_GEN_ONLY`, `TIB_STAFF_VIEW_ONLY` | Staff quyền hạn chế (chỉ Generate / chỉ View) | staging | — | Không | — |
| `TIB_USER_A_*`, `TIB_USER_B_*` | 2 tenant cho test phân quyền | staging | — | Trả lại | — |
| instance 287, `TIB_BOUNDLESS_EMAIL` | Boundless (open platform) | staging | 2026-10-29 (TIB-5585) | Trả lại | Không chạy song song với instance 58 (account linhtester dùng chung) |

## Store / instance

| ID / link | Mục đích | Môi trường | Xác minh gần nhất | Được sửa? | Trạng thái / ghi chú |
|---|---|---|---|---|---|
| instance 58, linh-tib-staging.myshopify.com (password `oe`) | Storefront Shopify thường (non-Plus) | staging | — | Trả lại (setting store do người dùng đổi) | Không generate test design được → lấy design qua order. Thanh toán Bogus thẻ `1` |
| instance 237, linh-tib-checkout.myshopify.com (password `oe`) | Checkout extension / Checkout page (cần **Plus**) | staging | 2026-10-27 (TIB-5510) | Trả lại | Bắt buộc cho case Checkout |
| instance 561, linh-open-platform.myshopify.com, product `the-collection-snowboard-hydrogen` (platform product 279, artwork 2179) | Storefront Boundless | staging | 2026-10-29 (TIB-5585) | Không | Dùng data có sẵn, không tạo mới; locale /de/ /fr/ chạy |

## Campaign / product ở trạng thái đặc thù

| ID / link | Mục đích | Môi trường | Xác minh gần nhất | Được sửa? | Trạng thái / ghi chú |
|---|---|---|---|---|---|
| platform product 532 (`/platform-products/532/edit`), Shopify product 10489842860348 | Campaign by Shopify product, 2 artwork / 1 variant (Quick Navigation) | staging, instance 58 | 2026-09-30 (TIB-5349) | Có (data QA) | Đã lên Online Store; Quick nav toggle OFF |
| campaign 3185 (`/campaigns/3185/edit`) | Campaign draft dùng lại khi hết blocker `preview_thumbnail` | staging, instance 58 | 2026-10-23 (TIB-5539) | Có (data QA) | Draft rỗng |
| storefront v1 `/products/refactor-paragraph` (template select + Song search bắt buộc) | Ví dụ `scripts/tib/examples/` EX-01, EX-04: đổi template, validation thiếu field | staging, instance 58 | 2026-11-01 | Không | Ví dụ phụ thuộc — đổi campaign thì sửa ví dụ |
| storefront v1 `/products/sdk-fix-preconnect-hints-lighthouse-reports-as-unused` (photo bắt buộc + text `Name`) | Upload + ATC đơn giản; ví dụ EX-02 | staging, instance 58 | 2026-11-01 | Không | ATC tạo customization thật |
| storefront v1 `/products/tib-5439-fix-ambiguous-order-item-activities-log-for-manual-sent-change-vs-confirm-send` (1 text `Name`, không bắt buộc) | ATC tối giản, giả lỗi mạng; ví dụ EX-03 | staging, instance 58 | 2026-11-01 | Không | — |

## Đã tìm, chưa có (không phải kết luận vĩnh viễn)

| Cần | Đã tìm ở đâu | Lúc nào | Kết quả | Lần sau thử |
|---|---|---|---|---|
| Product base / variant giá $0 | 2 PB chuẩn (tshirt/mug) + search "zero"/"free" trong catalog 464 PB | 2026-09-29 (TIB-5482) | Không thấy | Hỏi Dev ID hoặc nhờ seed; không sửa giá PB của người khác |
| Campaign artwork schema 1 (chưa migrate 2.0) | campaign 94 (không có artwork), 104/artwork 74 (đã 2.0); ~430 campaign còn lại chưa quét | 2026-09-29 (TIB-5482) | Không thấy | Hỏi Dev ID hoặc query DB |
