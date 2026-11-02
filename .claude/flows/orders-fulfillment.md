# Orders, line item status, fulfillment provider

Order từ storefront và cách xem trong portal: `storefront-sdk.md` mục Checkout & order.

## Đổi status line item (quan sát 2026-10-29, TIB-5439)

- **Item-level** chỉ có ở `Bulk Fulfill` → danh sách theo status → tick item → `Change status` ⇒ `PUT /api/instances/{id}/order-items/status`.
- Order detail và Orders list đổi ở **order-level** ⇒ `PUT /api/orders/tib-status`.
- Paused có endpoint riêng `POST /order-items/pause` kèm reason.
- Item ở tab Canceled không có `Change status`.
- Regenerate design không đổi status item.

## Fulfillment provider

- merchOne = Picanova (đổi tên): portal hiện `merchOne`, route vẫn `/fulfillments/picanova`; toast có thể `[Picanova]` hoặc `[merchOne]` theo `fulfillments.display_name`. (TIB-5548)
- Store chưa connect fulfillment: account onboarding trong `tib-reusable-test-data.md`.
