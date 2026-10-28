# Artwork-Ref Layer & Render Dedup (teeinblue)

Dùng rule này khi issue nhắc tới: `artwork-ref` / `artwork_ref` layer, render campaign **mockup**, render **customization image**, dedup render artwork dùng chung, `RenderSizePolicy`, `GenerateDesign`, board composite, hoặc bất kỳ thay đổi nào duyệt qua "mọi layer của board". Bổ trợ [[campaign-object-model]], [[printarea-mapping]], [[curve-text-render]].

## Context cần nhận diện

`artwork-ref` **không phải layer do seller tạo trong artwork editor**. Kiểm chứng 2026-08-27 trên staging portal: layer picker có đúng 35 `layerType` và **không có** `artwork-ref`/`artwork`; nút Import chỉ có PSD/Canva. Component `ArtworkLayer` (`layer.artwork_id` → `<use xlink:href="#tee-artwork-{id}">`) chỉ được dùng trong **MockupLayer**.

Đây là layer **do hệ thống sinh ra ở tầng render** (giải thích của dev, TIB-5357):

- Khi render **campaign mockup** hoặc **customization image**, nếu trên đó có **nhiều print area dùng chung 1 artwork**, hệ thống chỉ render artwork **một lần**.
- Board sau đó **thay cả cụm artwork to** bằng **một layer `artwork-ref`**, layer này mang thông tin đủ để tìm tới **file artwork đã generate** rồi thay thế (composite) vào.

⇒ Đây là cơ chế **tối ưu/dedup render**, không phải feature của seller.

## Hệ quả QA quan trọng

1. **Không dựng được qua UI.** Mọi test case viết kiểu "tạo layer artwork-ref trong artwork editor" là **sai tiền đề**. Muốn trigger phải: render mockup / customization image của campaign có ≥2 print area dùng chung 1 artwork.
2. **Declared box của `artwork-ref` ≠ kích thước artwork thật.** Box của `artwork-ref` là vùng nó chiếm **trên board mockup** (thường nhỏ), trong khi file artwork đã được render riêng ở size gốc (có thể rất lớn). Bất kỳ policy nào quyết định dựa trên declared box của `artwork-ref` đều có nguy cơ:
   - **False negative**: board mockup nhẹ trên giấy nhưng artwork thật đã ngốn RAM ở lần render trước → vẫn lọt normal tier.
   - **False positive**: mockup phóng to `artwork-ref` (zoom, mockup lớn) → board bị đánh giá quá cỡ/reject dù artwork thật bình thường.
3. **Double counting.** Artwork đã đi qua `GenerateDesign` một lần với size thật của nó. Khi board mockup tính lại box của `artwork-ref`, cần rõ đây là lần đánh giá **thứ hai trên cùng nội dung** — routing/reject có bị tính trùng không.
4. **Error message vô nghĩa với người dùng.** TIB-5357 thêm layer identity vào reject message. Nếu layer gây reject là `artwork-ref` — một layer hệ thống tự sinh — thì merchant/support đọc message sẽ không map được về layer nào trong artwork editor.
5. **Mâu thuẫn với model 1:1 cần làm rõ.** Theo [[campaign-object-model]], "1 printarea → đúng 1 artwork". Dev lại nói "nhiều printarea dùng chung 1 artwork". Hai phát biểu này chỉ dung hoà được nếu "dùng chung" xảy ra ở tầng **mockup** (mockup ↔ printarea là many-to-many) hoặc khi nhiều printarea trỏ cùng một artwork **record**. Luôn hỏi rõ điều kiện trigger trước khi dựng data.

## Requirement cần kiểm tra

- Điều kiện chính xác để hệ thống thay artwork bằng `artwork-ref` (bao nhiêu print area, cùng mockup hay khác mockup, cùng campaign hay khác).
- File artwork đã generate được **tìm** như thế nào (theo id? theo hash? cache key?) và xử lý ra sao khi **chưa tồn tại / đã bị xoá / stale**.
- Thứ tự: artwork được render trước rồi board mới composite, hay board dispatch trước và chờ.
- `artwork-ref` có được **recurse** vào không (nó trỏ tới artwork chứa nhiều layer con) hay chỉ tính đúng box của chính nó.
- Kết quả visual: mockup/customization image dùng dedup phải **giống hệt** bản không dedup (pixel-identical).

## Impacted areas

- Render campaign mockup (portal preview, gallery, product image trên storefront). — Confirmed
- Render customization image (preview cart/checkout/order). — Confirmed
- Cơ chế dedup/cache file artwork đã generate. — Confirmed
- Bất kỳ policy nào duyệt "mọi layer của board" (`RenderSizePolicy::decideForBoard`). — Confirmed
- Campaign nhiều print area dùng chung artwork — regression chính. — Confirmed

## Risk patterns

- Layer hệ thống sinh bị áp cùng luật với layer do người dùng tạo → routing/reject sai tier.
- Artwork file chưa sẵn sàng khi board composite → mockup thiếu artwork hoặc render lỗi im lặng.
- Cache stale: sửa artwork nhưng mockup vẫn dùng file cũ.
- Dedup làm mất hiệu ứng riêng của từng print area (scale/rotate/mask khác nhau trên từng vị trí).
- Reject message trỏ tới layer người dùng không thấy được trong editor.

## Open questions template

- Setup tối thiểu để trigger `artwork-ref` là gì — QA dựng được qua portal không, hay phải nhờ dev seed?
- Box của `artwork-ref` được lấy từ đâu: kích thước trên board hay kích thước artwork gốc?
- Có recurse vào layer con của artwork được reference không?
- Artwork file thiếu/stale thì fallback thế nào?
- Reject message nêu identity của `artwork-ref` thì merchant hiểu bằng cách nào?

## Suggested test focus

- Campaign có ≥2 print area dùng chung 1 artwork → render mockup + customization image, so sánh visual với campaign không dùng chung (pixel-identical).
- Artwork bị sửa sau khi mockup đã render → mockup có cập nhật không (cache invalidation).
- Artwork file bị xoá/chưa generate → hành vi fallback.
- Regression: campaign 1 print area / mỗi print area 1 artwork riêng → render không đổi.
- Với issue động tới policy duyệt layer: verify board có `artwork-ref` không bị reject/route sai chỉ vì layer này.
