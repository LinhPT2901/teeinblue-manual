# Hành vi sản phẩm teeinblue đã xác nhận

Hành vi **by design** hoặc phạm vi đã được người dùng / PO / Dev chốt. Đây là nguồn cho bậc "rules/" trong thang quyết định của `qa-requirement-analysis`: câu hỏi nào trả lời được bằng file này thì ghi `Self-resolved (nguồn: rules/tib-product-behaviors.md#<mục>)`, không hỏi lại.

**Quy tắc cập nhật:** chỉ thêm hành vi đã có nguồn xác nhận (người dùng / PO / Dev, kèm ngày + ticket). Quan sát của agent chưa được xác nhận **không** ghi vào đây (ghi vào analysis dưới dạng assumption). Hành vi bị đổi bởi ticket mới → sửa mục cũ, ghi ngày.

---

## Layer và render

- **Calendar layer font mặc định là Heebo** (các layer text-like khác Roboto). Issue đổi font nhóm text-like mà description nói calendar đổi → nêu điểm lệch cho PO/Dev, không đánh fail. (người dùng 2026-10-08, TIB-5534)
- **Text / paragraph rỗng → design trống.** Default text chỉ ở storefront preview. Đúng cả với paragraph vừa là buyer field vừa được populate. Chỉ nhập khoảng trắng → preview và design đều trống. Nguồn populate bị xoá → value "" đè lên chỗ buyer sửa → preview về default text. Kiểm size ở trạng thái rỗng qua `font_size` trong payload line item. (người dùng 2026-10-14, TIB-5538)
- **Multiple upload photo kiểu Multiple Outputs** không tự ra design, không có property cart. Cần một layer khác populate value từ layer Multi. (người dùng 2026-10-14, TIB-5525)
- **Populate target cho luồng derive** (`{{input}}`, AI effect) phải để personalization = "Create a new option". Để "No personalization" thì SDK không gọi `POST customer-uploads/{id}/derive`, target hiện ảnh gốc. Chưa có xác nhận Dev đây là by design. (TIB-5389, 2026-10-16)
- **Upload .svg trong artwork editor tạo vector layer**, image picker ẩn SVG là chủ đích. Artwork có SVG phải đổi Design format, để mặc định thì order lỗi "Line item cannot generate design". Design format SVG chặn layer raster khi save (400 "set to vector format but contains raster layers"). Design format PDF cho layer Photo, order ra PDF có ảnh nhúng, không cần đổi format. (người dùng 2026-10-14 TIB-5512; quan sát 2026-10-28 TIB-5212/5620)

## Global option, campaign

- **Sửa global option trên Portal → storefront chỉ nhận sau khi sync campaign.** Campaign chưa từng bị đọc có thể hiện data mới ngay — trùng hợp, không lấy làm expected. (người dùng 2026-10-21, TIB-5591)
- **Cross-sell:** sản phẩm cross-sell gom vào 1 Shopify collection. Bật trong Portal Product Page settings, gắn metafield vào Shopify product của campaign chính. Có 2 metafield: collection và product (addon). Set cả hai → ưu tiên collection. Popup cross-sell không ảnh hưởng form chính. Main campaign test: `https://linh-tib-staging.myshopify.com/en-vn/products/main-campaign-campaign-by-pb`. (TIB-5418, 2026-10-15)
- **Edit customization** chỉ ở Thank You page + Order status page, chỉ cho campaign Shopify product (không có cho product base, không có ở /cart). (người dùng 2026-10-29, TIB-5510)
- **Logs campaign → Edit Activities:** chỉ test các action có option trong filter. Dòng hiện ở All nhưng không có trong filter không thuộc phạm vi, không hỏi PO/Dev. (người dùng 2026-10-28, TIB-5337)

## Dynamic Translations

- Danh sách và tên ngôn ngữ đồng bộ từ Shopify; Portal không có UI add/rename/xoá ngôn ngữ → không sinh case này. (người dùng 2026-10-30, TIB-5585)
- Lỗi Export → Import CSV có sẵn từ production: export bọc mọi ô trong `"..."`, import không bỏ ngoặc → sinh key mới. Ngoài scope các ticket trim/whitespace; khi test import dùng CSV không bọc ngoặc. (TIB-5585)
- **JSON List:** Dynamic Translations chỉ dịch label; item trong dropdown (`name`) luôn giữ text gốc. Không viết case "translated JSON List value". (người dùng 2026-10-26, TIB-5583)

## Asset, library, upload

- **Dropzone upload** (clipart, layer image, mockup library) không hiện icon green check / red mark (CSS ẩn). Thành công = text "Your file is uploaded, we are generating file preview…"; lỗi = text đỏ `[data-dz-errormessage]`. Viết expected theo text, không theo icon. (người dùng 2026-10-14, TIB-5544)
- **Cap 300 clipart/category** từ 2025 (manual, SVG, zip bulk, Open API), admin nâng được theo merchant qua Admin → Users → Config JSON `"clipart_max_per_category": N`. Chạm cap: `POST /cliparts` 422 "The category allows up to N items". Zip bulk tạo category mới từ folder, file thừa bị skip với log `Failed - <path> - …`. Hỏi cap thực tế của account test trước khi viết case limit. (Dev huyenntk 2026-10-28/29, TIB-5536)
- **Daily limit upload asset** ("… max attempts", dùng chung portal + Open API) đếm số lượt upload đã tạo trong cửa sổ trượt 24h UTC, **kể cả ảnh đã xoá**. Mốc "Wait until" = lượt cũ nhất + 24h. (người dùng 2026-10-29, TIB-5536)
- **Image library** (TIB-5192, chốt 2026-10-28/30):
  - Additional option item thumbnail không thuộc library.
  - Layer Clipart không có field mask (mask chỉ ở Photo, Maps, Route Maps, Star Maps); mask clipart = Group → Mask.
  - Campaign featured image: `POST /api/campaigns/{id}/featured-image` với `library_image_id` null → 200 và xoá ảnh (khác product dùng DELETE + confirm) — chấp nhận.
  - Mask dropzone lọc theo đuôi file — by design.
  - Library nhận SVG cho Mask và Image (sanitize, bắt buộc viewBox). Photo custom shape PNG/WebP; GenAI reference PNG/JPG/WebP.
  - AVIF bị chặn là do issue khác.
  - Addon charge thumbnail: xoá rồi upload lại, không có nút replace. Shopify Listing Product Thumbnail lưu ngay khi chọn/xoá (hành vi cũ).
  - MCP library upload max 64 MB.
  - Search library: mốc = production image layer library, `name _ilike "%term%"` (chứa chuỗi, không phân biệt hoa thường, ký tự hiểu theo nghĩa đen).
- **Câu hỏi mở cho issue nhận URL asset từ client** (từ TIB-5516): ownership check có áp cho URL CDN tuyệt đối không (hiện `cdn.ownego.com/teeinblue-staging/users/<merchant khác>/...` qua được), file nào phải private / signed URL, allowlist domain, giới hạn kích thước file tải về.

## Fulfillment, order

- **merchOne = Picanova** (đổi tên). Portal hiện "merchOne" nhưng route vẫn `/fulfillments/picanova`; toast có thể `[Picanova]` hoặc `[merchOne]` theo `fulfillments.display_name`. (người dùng 2026-10-13, TIB-5548)
- **Catalog key provider có 2 nhánh:** provider chưa nhập key dùng key teeinblue (`.env` server); merchant đã nhập key thì dùng key merchant. Test lỗi catalog phải tách 2 nhánh; message lỗi có thể khác nhau. (người dùng 2026-10-13, TIB-5548)
- **Đổi status line item:** item-level chỉ ở Bulk Fulfill → danh sách theo status → tick → Change status (`PUT /api/instances/{id}/order-items/status`). Order detail / Orders list là order-level (`PUT /api/orders/tib-status`). Paused có endpoint riêng `POST /order-items/pause` + reason. Items Canceled không có Change status. Regenerate design không đổi status. (quan sát 2026-10-29, TIB-5439)

## Bảo mật, tài khoản

- **Dialog Confirm password:** hiệu lực 15 phút. Mọi sensitive action dùng chung 1 component → regression chỉ cần 1 action khác. Account chưa có password có link tạo password. Để trống: FE chặn; toàn khoảng trắng: API báo "incorrect" (không trim). (Dev trungld 2026-10-28, TIB-5628)
- **Staff 2 ("Linh Pham") là editor đã duyệt của org 94** → header `x-acting-user-id: 94` ghi được data org 94 là hợp lệ, không phải IDOR. Test cross-tenant 64 vs 94 chỉ dùng session/token riêng. (Dev tuanva 2026-10-30, TIB-5500)
