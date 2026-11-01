# Mockup Editor

Dùng chung cấu trúc cho mockup của Product Base, campaign mockup (by PB), platform mockup (by Shopify / Boundless).

## Mở editor

- PB: `/products/<id>/edit` → card mockup → `button:has(span.sr-only:text-is("Edit"))` (hoặc `.mockup-action__btn.v-popper--has-tooltip >> nth=0`).
- Campaign by PB: thumbnail `main button:has(span.sr-only:text-is("Edit"))` nth(k).
- Platform product: `button.campaign-gallery-product-action` (sr-only label hiện `$t('common.edit_mockup')` — i18n chưa dịch). Có ≥2 mockup ⇒ 2 nút (1 ẩn) ⇒ click thumbnail cần sửa trước rồi `button.campaign-gallery-product-action >> visible=true`. Boundless: `button.ml-auto.border-0:has(span.sr-only:text-is("Edit"))` nth(k) theo thứ tự gallery.

## Printarea layer (PB / campaign PB)

- ` Add Printarea` → menu list printarea (`Front (1400x1400)` / ...) → chọn từng cái.
- Mockup mới: layer printarea mặc định **100x100 @ top 50/left 50**, các layer chồng nhau ⇒ dời bằng Transform. Mockup legacy: layer printarea được fit giữa mockup (vd front 400x503 @185/200 trên mockup 800x873).
- Mỗi lần ` Add Printarea` xong **popup Transform tự đóng** ⇒ mở lại cho layer mới.
- Eye (x≈16) trên hàng printarea = `visible`. Printarea thiếu `visible:true` ⇒ preview campaign báo `No printarea found...`.
- Toggle `Preview artwork` (ON mặc định) trong `Your printareas`.
- Layout từng dùng (mockup 200x200, 4 printarea 80x80, lưới 2x2): `Front (10,10)` · `Back (10,110)` · `Left Sleeve (110,10)` · `Right Sleeve (110,110)`.

## Transform trong Mockup Editor

- Popup Transform KHÔNG có id `#quick-transform-editor-*`; chỉ `input.form-control[type=number]` không id/name.
- Mở: `.qte-field:has-text("Transform") >> visible=true`.
- Lấy ref bằng `browser_find` regex `Width:|Left:` rồi dùng ref của `spinbutton`.
- Đọc lại: `[...document.querySelectorAll('input[type=number]')].filter(i=>i.offsetParent).map((i,n)=>n+':'+i.value)` → thứ tự `... 4:width 5:height 6:top 7:left 8:rotate` (0-3 là ô khác của trang dưới).
- Printarea layer **khoá tỉ lệ** (Width=80 ⇒ Height 80).
- Clear an toàn: click ô → `ControlOrMeta+a` → `browser_type` giá trị mới.

## Ảnh nền / Add Image

- ` Add Image` là **div** (`.new-mockup-printarea div.btn:has-text("Add Image")`), dùng chung dialog thư viện asset. Chọn `.layer-listing__item:has(img[alt="<tên>"]) .mockup-layer-listing__thumbnail` → `Select 1 image`. Ảnh mới sinh layer = kích thước canvas (vd 200x200 @0/0), tên = tên ảnh.
- Xoá layer nền sai: chọn layer → nút `Delete` trên toolbar hàng layer → dialog `Confirm` → `Delete`.
- Rename layer: double-click tên (`getByText('<tên>',{exact:true})`) → `input.form-control-sm:visible` → Cmd+A, gõ, Enter.

## Add Artwork (platform / Boundless mockup)

- `button:has-text("Add Artwork")` → picker nổi liệt kê artwork của campaign → click tên (`button.dropdown-item:has-text("<tên>")` hoặc `:visible:text-is("<tên>")` `.last()`).
- Layer artwork 480x480 căn giữa canvas 960x960 (@240,240). 2 artwork add liên tiếp **chồng đúng vị trí nhau** ⇒ dời bằng Transform (vd 1 @ 40/40, 2 @ 440/440).
- Artwork KHÔNG tự gắn vào mockup; mockup chưa Add Artwork ⇒ preview banner `No artwork found. Edit this mockup and add artwork to view changes.`
- Panel `Layer options`: Opacity 100%, `Enable masked` OFF, `Enable perspective` OFF.
- Mockup Boundless không có layer printarea (`platform_mockups.layers` chỉ `image` + `artwork`).

## Lưu

- `Save & Close` (header, cùng dạng group với artwork editor):
  - PB: `PUT /api/products/<pb>/mockups/<id>` 201, body `{width,height,color_as_variant,default_background_color,layers:[...]}` (layer mới append CUỐI).
  - Campaign PB: `PUT /api/campaign-products/<cp>/campaign-mockups/<id>` 200.
  - Platform: `PUT /api/platform-mockups/<id>` 200.
- **Alt text** (chỗ "đặt tên" duy nhất của mockup — mockup không có field name): link `Alt text` cạnh tiêu đề `Mockup Editor` → modal `dialog-mockup-alt-text` → Save trong `.vm--container:has([data-modal="dialog-mockup-alt-text"])` (nút Save khác bị overlay che) ⇒ lưu ngay, toast `Saved alt text successfully`. GraphQL `mockups.alt`.
