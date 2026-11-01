# Product Base (`/products`)

Dùng khi 2 PB chuẩn (`example product base - tshirt` 3139 / `- mug` 3140) không đáp ứng. Không sửa PB người khác đang dùng để né việc tạo mới.

## Tạo PB mới (`/products/new`)

1. Form `Basic information`: `Product title` (**prefill `Example MUG`, phải xoá**), `Internal name (optional)`, `Internal tags (optional)`, `Fulfillment provider` (bỏ trống được), `Description` → `Save` → redirect `/products/<id>/edit`.
   - 3 ô text là `main input.form-control` KHÔNG có attribute `type` ⇒ `input[type=text]` không khớp.
   - Convention tên: `QA-TIB-<issue>-<YYYYMMDD>-<mô tả ngắn>` cho cả title và internal name; Internal tags = issue key.
2. **Printareas** → bấm button ` New printarea` TRƯỚC (hàng inline có sẵn trong DOM nhưng ẩn; `fill()` vào `input[placeholder="Fulfilled key"]` vẫn "chạy" khi form chưa mở) → hàng inline: `Fulfilled key` (prefill `Front`), `Display name`, `Width`/`Height` (mặc định 1400x1400).
   - 🔴 Nút `Save` của hàng bị `div#step-3-product` (box-title sticky) chặn click, scroll không cứu. **Điền xong `Display name` rồi nhấn `Enter`** = Save.
   - Sau Enter hàng giữ mở và reset prefill `Front` ⇒ điền tiếp printarea sau, **sửa `Fulfilled key`** (vẫn `Front`).
   - PB có thể > 2 printarea (đã chạy 4: Front/Back/Left Sleeve/Right Sleeve).
3. **Variants** → bấm ` New variant` TRƯỚC (hàng ẩn, click treo "waiting for stable") → `SKU`, `Color`, `Size` (bắt buộc, viền đỏ), `#FFFFFF`, `Weight`, giá, compare price → ` Add`.
   - 🔴 Ô giá hiện `$ 0.00` nhưng thực ra rỗng: `Add` lần đầu không báo gì, row không thêm (vẫn `No record`), ô Price viền đỏ. Gõ số > 0 rồi `Add` lại.
   - Toast `Variant added. Go to campaign to enable.` (có lúc ẩn). Console `404 /api/staff-activity-logs/variant:0` vô hại.
   - Sau mỗi `Add` hàng giữ mở. Compare price để trống được (null). Mỗi variant ~30s.
   - Giá nhận thập phân (22.95, 30.99, 25.50 lưu 25.5).
   - Variant tạo TRƯỚC khi campaign add PB ⇒ tự vào campaign. Variant tạo SAU ⇒ không tự `Available`: cột `Add to campaigns` nút `.btn-add-to-campaign` → dialog `Campaigns that use this product` (`Variant status` = `Not available`) → tick campaign → `Add` → confirm `Add variant to campaigns` → `Add` ⇒ `Available`. Bỏ qua ⇒ campaign báo `No variant for this product.`
4. **Mockup** (bỏ được nếu case không cần preview) → ` Upload` → dialog thư viện (`.layer-listing__item`): click `img` → `Select 1 images`. Mockup vào trạng thái `Rendering`.
5. Mở **Mockup Editor** (`.mockup-action__btn.v-popper--has-tooltip >> nth=0`, hoặc `button:has(span.sr-only:text-is("Edit"))` trên card) → ` Add Printarea` → chọn printarea. Chi tiết: `mockup-editor.md`. → `Save & Close`.
6. ` Assign mockups` → chọn variants + mockups → `Save` → panel `Mockup assignments` xác nhận → `Close`.
   - Dialog có lúc mở ra đã chọn sẵn mọi variant (nút hiện `Deselect all`) ⇒ chỉ `Select all` phần mockups.
   - Lưu vào `mockups.variant_ids`. Panel group by Mockup/Variant, nút `Edit` từng mockup → `Assign variants to a mockup`; Save lần đầu có thể chỉ đóng dropdown, bấm lại.

Bản rút gọn tối thiểu (case không cần preview): title/internal name/tags/description → 1 printarea → 1 variant. Campaign vẫn tạo được, STEP 2 chỉ thiếu ảnh mockup.

## Description (rich text, Tiptap)

- Toolbar: `Bold` `Italic` `Strikethrough` `Underline` `H1` `H2` `H3` `Bullet list` `Numbered list` `Link` `Unlink` `Image` `Undo` `Redo` `Code`. Accessible name rỗng ⇒ dùng `title`: `page.getByTitle('Bold')`.
- 🔴 `browser_type` không `slowly` gọi `fill()` ⇒ **thay toàn bộ nội dung cũ**. Gõ nối nhiều đoạn bắt buộc `slowly: true`.
- Quy trình: click `.tiptap` (Cmd+A + Delete nếu cần) → gõ đoạn thường → `title=Bold` bật, gõ, bấm lại để tắt → `Enter`, `title=Bullet list`, gõ item, `Enter`, item 2 → verify bằng `browser_find`.
- Lỡ bấm `Code` khi không chọn gì ⇒ Bold/Italic/Strike/Underline disable tới khi tắt `Code`.
- Persist đúng structure sau Save + reload; render ở khối `DESCRIPTION` của STEP 2 campaign editor kể cả chưa publish.

## Giá variant

- Bảng `Variants` ở `/products/<id>/edit` có cột `Price (<currency>)` sửa inline. Trên linh-tib-staging là **VND raw** (PB 3139 lưu `500000`, hiện 500.000₫); form `New variant` vẽ `$` nhưng giá trị là số VND. Shopify `.js` trả price ×100.
- Nhãn cột đổi theo store đang chọn (`Price (VND)` ↔ `Price (EUR)`), số thô giữ nguyên.
- Giá hiện có: 3139 S=500.000, M=50; 3140 11oz=15oz=123.456 VND.
- Tìm PB variant giá 0 (2026-09-29): catalog `/products?limit=500` có 464 PB; 2 PB chuẩn không có giá 0; search `zero`/`free` ra 0. Không có filter theo giá; quét hết không khả thi ⇒ best-effort/blocked, không phải "đã xác nhận không tồn tại".

## Duplicate PB

- `/products` → ô `Search` theo title → hàng có `i.la-pencil` (edit) · **`i.la-copy` (duplicate)** · `i.las.la-ellipsis-h`. Selector: `main tbody tr:has(a[href="/products/<id>/edit"]) button:has(i.la-copy)`.
- Click là clone NGAY (`POST /api/products/<id>/clone` 200), không confirm. Bản copy lên đầu, title + internal name = `<title> copy`.
- Clone copy variants (id mới, giữ `available`), printareas (id mới), mockups (id mới, KHÔNG copy variant assignment), fulfillment provider.
- Card `Basic information`: Save = `button.promise-button.btn.btn-primary` đầu tiên (PUT `/api/products/<id>` rồi POST `/sync`), disabled tới khi có thay đổi.
- PB legacy (vd 205 Men Basic T-shirt) có mockup chỉ 1 image layer, không printarea ⇒ Mockup Editor → ` Add Printarea` → `Save & Close` (`PUT /api/products/<pb>/mockups/<id>` 201).

## Mockup của PB

- Trang `/products/<id>` chỉ là view; thao tác ở `/products/<id>/edit`. Card mockup: Edit / Duplicate / More (`Add to campaigns / Sync to campaigns / Remove from all campaigns / Delete mockup`).
- Duplicate mockup: card `.mockup:has(img[src*="<preview hash>"])` → `button:has(span.sr-only:text-is("Duplicate mockup"))` ⇒ `POST /api/products/<pb>/mockups/<id>/clone` 201, không confirm. Bản clone **giữ layer id** và **giữ `variant_ids`**; card mới lên cuối. `position` có thể **trùng** mockup sẵn có (7748 clone → 8154 position 4 trùng 7967). Clone KHÔNG tự thêm vào campaign đã có PB.

## Custom variant's printarea

- `example product base - mug` (3140): 2 printarea `11oz`/`15oz`, bật `Custom variant's printarea` ⇒ variant 11oz chỉ bind printarea 11oz. Campaign hiện `Variant's custom printarea(s): 11oz (1400x1400)`.
- `example product base - tshirt` (3139) không bật ⇒ variant bind Front+Back.
- Kiểm nhanh: `/products/<pbId>/edit`, bảng `Variants` có cột `Custom Printareas` thì đang bật.

## Đọc state PB (read-only)

GraphQL trong page (`fetch('https://staging-api.teeinblue.com/api/graphql', {credentials:'include', headers X-XSRF-TOKEN})`): `products_by_pk(id){ printareas variants mockups{ id variant_ids layers } }`.
