# Artwork editor — tạo, lưu, template, layer list, picker

Thêm artwork vào campaign: `campaign-product-base.md` / `campaign-by-shopify-products.md`. Toolbar/Transform: `toolbar-transform.md`. Panel ✎ của từng loại layer: `layers-*.md`, `personalization-populate-conditional.md`.

## Dialog `Artwork details`

- Mở khi bấm ` New artwork` (từ print area hoặc `/artworks` → `button:has-text("New artwork")`).
- Field: `Name*`, `Category` + ` New category`, `Artwork size:` radio `Custom size` (mặc định) / `Import printarea size`, `Width (px)` / `Height (px)` (mặc định **1600 / 1600**), `Design format:`, `Save` / link `Cancel`. **Không có Internal tags.**
- 🔴 Ô Name: dùng **`input[name="name"]:visible`**. Các cách khác trúng nhầm ô search layer list phía sau (`input.afb__name__input`, `Search by name`) ⇒ tên vào filter, Name rỗng → `name is required` / "No layers match": `getByRole('textbox').first()`, `[role=dialog]:has-text("Artwork details") input[type=text]` nth0, `getByRole('textbox',{name:/Name/})` (không có accessible name).
- Nút Save: `button:visible:text-is("Save")`, `.dialog-artwork-setup button.btn-primary:has-text("Save")` hoặc `button[type=submit].btn-sm.btn-primary:text-is("Save")` (`button:has-text("Save")` trùng `Save & Close`).
- Kích thước: không có `max` (4500x4500 OK), không có min (5000x10 OK). Fill `input[name=width|height]` sau Cmd+A/Delete không bị nối chuỗi.
- `Design format:` (multiselect, `.dialog-artwork-setup .multiselect` last): PNG_RGB (mặc định), PNG_SRGB, PNG_ADOBE_RGB, JPEG, JPEG_CMYK, JPEG_CMYK_COATED_FOGRA39, SVG, EPS, AI, PDF.
  - Chọn SVG ⇒ cảnh báo `Order design can't be rendered if artworks contain any images.`; header `(1600x1600 - SVG)`.
  - 🔴 Artwork SVG có layer raster (Photo Upload) ⇒ Save `POST /api/artworks` **400** `Artwork "<tên>" is set to vector format but contains raster layers. Affected layers: ...`. Artwork SVG chỉ chứa Vector Upload thì 201 (`design_format:"svg"`). Raster để artwork PNG_RGB riêng. EPS/AI/PDF chưa thử.
- `Save` trong dialog chỉ đóng dialog: header hiện `<tên> (1600x1600 - PNG_RGB)`, panel trái `Default template` + ` Layer` / ` Import`. **Artwork chưa được tạo** cho tới lần Save đầu của editor.
- Đổi tên artwork có sẵn: nút **`a.p-1.ml-2` có `i.las.la-pen`** cạnh title (`.artwork-editor-header i.la-pen` nth0) → dialog `Artwork details` → sửa `Name*` → `Save` — **chỉ đổi local**, phải Save/Save & Close artwork (PUT) mới lưu. Đừng nhầm `button.aemt-btn` `Edit` (mode editor).

## Lưu artwork

- Header: `Edit` · `Live preview` · `Logs` · `Cancel` · `Save & Close` (+ ` History` sau lần Save đầu). Không có màn Translations.
- **Save không đóng**: nút caret cạnh `Save & Close` → menu ` Save`. Selector theo ngữ cảnh:
  - Editor mở từ campaign: caret trong `.dialog-artwork-editor` (`button.btn-primary.px-1`); `.btn-group--update` đầu trang là của campaign và bị dialog che. Cũng dùng được `.artwork-editor-header-right .v-popper > .btn`, `button.btn-primary.px-1:has(.dropdown-toggle)` → `span.ml-1:text-is("Save")`.
  - Editor ở `/artworks`: `.artwork-editor-header-right button.btn-primary.px-1`.
  - Popper mở ra: `.v-popper__popper--shown` → `Save`.
- Lần Save đầu ⇒ `POST /api/artworks` 201 (trả full JSON, id); URL `/artworks?id=<id>`; header hiện **`(#<artworkId> - 1600x1600 - PNG_RGB)`** + nút `Logs`. Sau đó `PUT /api/artworks/<id>` (response `data` = list template → layers, JSON thật).
- Save đôi lúc không bắn PUT dù popper mở ⇒ `waitForResponse(PUT /api/artworks/<id>)`, retry nếu không có.
- **Lưu từng chặng**: session portal hết hạn im lặng — `Save & Close` fail toast đỏ `Unauthenticated.` và **mất hết layer vừa thêm**. Save ngay sau layer đầu tiên.
- **Toast là cách duy nhất biết validate fail** (console sạch): sau mỗi Save đọc toast. Validate fail chỉ chạy `validate-default-value`, không PUT.
- Cancel editor: `.artwork-editor-header-right` >> text `Cancel` (`getByText('Cancel')` trúng span ẩn).

## Đọc artwork JSON

- `GET /api/artworks/<id>` = 405.
- GraphQL `POST https://staging-api.teeinblue.com/api/graphql` `{ artworks_by_pk(id){ templates } }` (cookie + X-XSRF-TOKEN).
- Body response PUT `/api/artworks/<id>` (patch `XMLHttpRequest.send` hoặc network log).
- Campaign đã publish: merchant JSON công khai (`storefront-sdk.md`), `artworks[0].data[0].layers`. Deep-diff 2 artwork: so layers, bỏ key id/top/left/width/height.

## Artwork 2.0 vs 1.0

- `.artwork-editor-header` **có** `.convert-artwork-button` (`Convert to Artwork 2.0`) ⇒ **1.0**; không có ⇒ **2.0**. `document.body.innerText.includes(...)` trả false (text xuống dòng) — dùng selector hoặc `header.innerText`.
- `New artwork` luôn là 2.0. Cần 1.0: duplicate artwork 1.0 có sẵn (**#3730 `default value - art 1.0 copy`**, bản gốc của user — chỉ duplicate). #2716 `song search` cũng là 1.0.
- Text layer 1.0: panel `GENERAL` · `PERSONALIZATION SETTING` (số ít) · `CONDITIONAL SETTING` · `EXTRA`.
  - `GENERAL`: `Default text`, `Text option:` (`Create a new option` / `Share with another layer`), `Enable text background`, toggle `Populate values from other options`.
  - `PERSONALIZATION SETTING`: radio `No personalization` / `Enable personalization` (id `editable-false`/`editable-true`, click `label[for="editable-true"]`). Bật mới hiện `Allow customers to change Text Color` · `Allow customers to reposition text` · `Allow customers to change Font` (bật ⇒ `"Select a font" label:` + `Select one font category:` + note *"Only work if default text uses a Custom font, not Google Font"*).
- Song Search 1.0 (#2716): panel chỉ `Option Title` · `Placeholder text` · `Add instruction for customer` · `Load song lyrics`; không có cart toggle/template.
- Schema 1 (chưa migrate): chưa tìm thấy. Campaign cũ nhất có artwork (id 104, artwork 74, 2023) đã là schema 2 (2026-09-29, best-effort).

## Template

Panel trái có 2 hàng:
- **Hàng tab template** (`Default template`, `Template 1`…) + 3 icon: chevron (mở/thu), **gear ⚙ (~355,64) = `Template Settings`**, **`+` (~383,64)** → `Add new` / `Import from artwork`. Template mới tên `Template 1`, **rỗng**.
- **Hàng `Template: <tên>`** (chỉ hiện khi KHÔNG có layer nào đang chọn — double-click tab template để deselect): eye (preview, disabled khi chỉ 1 template) · `las la-pencil-alt` (Edit template) · `las la-copy` (Duplicate) · `las la-trash-alt` (Delete — **chỉ có khi ≥2 template**) · `alab-action__more`.
- Edit template (bút chì hàng y≈103; Default ~277,103, khi ≥2 template ~249,103; `button.text-white:has(i.la-pencil-alt)`) → modal `Edit - <tên>`: Name, Thumbnail, toggle `Extra charge for this template`; Save/Cancel là **link**. `i.la-pencil-alt:visible` first có thể trúng bút chì trang campaign ⇒ dùng toạ độ.
- **Template Settings** (gear): radio `display_type-select|radio|radio_button` (mặc định Dropdown List), `input[name="label"]` = `Label of template options` (mặc định rỗng), `input[name="placeholder"]` (mặc định `Choose an option`), toggle `Show selected template on cart/checkout` (OFF), `Done`. Lưu theo artwork khi Save.
- Verify template đã lưu: trang campaign, `PERSONALIZATION FORM` có combobox `<tên artwork> template*` (`id="<artworkId>-template"`).

## Layer list

- Layer mới nằm **trên cùng** list. Mỗi hàng: thumbnail, tên, icon (hover) pencil `#manage-layer` → duplicate → delete; `.artwork-sortable-layer-visible button` / `.artwork-sortable-layer-lock button` (hover + force).
- `#manage-layer` trùng id khi ≥2 layer ⇒ luôn scope `#artwork-sortable-layer-layer-<id> #manage-layer` (hoặc `li.artwork-layer-item[data-type="..."] >> nth=0 >> #manage-layer`). Lấy id: `[id^="artwork-sortable-layer-layer-"]`. Có thể dùng `button:has(i.la-pen)` trong hàng.
- Có 2 element trùng id `artwork-layer--layer-XXXX` (trang campaign + canvas) ⇒ lấy phần tử CUỐI.
- **Đổi tên**: double-click `.artwork-sortable-layer-name` → `<input>` (`.artwork-sortable-layer-name input:visible` hoặc `#artwork-sortable-layer-layer-<id> .artwork-sortable-layer-name input`) → gõ + Enter. Sau dblclick `li:has(.text-truncate:text-is(...))` không còn khớp. Ghi lại id ngay sau rename.
- **Xoá**: `i.la-trash-alt` trên hàng, xoá NGAY không confirm: `li.artwork-layer-item:has(.text-truncate:text-is("<tên>")) button:has(i.la-trash-alt)` (`.artwork-sortable-layer-name:text-is` không khớp).
- 🔴 Panel ✎ đang mở **che layer list và nút `+ Layer`** (`.layer-panel__body` / `.layer-editor-panel` intercept) ⇒ bấm back `.layer-editor-title button` / `.btn.btn-link.text-white` / chevron `<` (≈20,65) trước. Panel ✎ của layer A cũng che ✎ của layer B ⇒ đọc config bằng GraphQL.
- Panel `History` (Versions / Activity log) hay tự mở lại khi mở ✎ layer khác ⇒ đóng bằng `getByTitle('Close')`.

### Chọn nhiều layer, group, ẩn/khoá
- Click `.artwork-sortable-layer-thumbnail` = **thay** selection; thêm bằng Ctrl/Cmd + click.
- Thanh `N selected` (`.alab-actions`), tên trong `span.sr-only`: `Group (Ctrl/Cmd+G)` · `Ungroup (Ctrl/Cmd+Shift+G)` · `Copy to clipboard` · `Duplicate` · `Duplicate & Link options` · `Delete`. Selector: `.alab-actions button:has(span.sr-only:text-is("<tên>"))` — không scope `.alab-actions` sẽ trúng 5 nút Duplicate của mockup gallery campaign.
- Group: `li.artwork-layer-item[data-type="group"]`, tên `Group 1`; thumbnail group = chevron expand/collapse. Query layer list dùng `> .artwork-sortable-layer-wrapper` để không trúng con. JSON group `{id,name,type:"group"}`, con có `group_id: layer-<groupId>`. Group 1 layer tạo được.
- Ẩn group ⇒ chỉ group `visible:false`; khoá group ⇒ group và con đều `locked:true`.
- `Duplicate` thường: giữ url ảnh, populate, font size, personalization; tên `<gốc> copy` (lần 2 → `copy copy`). Duplicate & Link: `layers-text.md`.

## Section panel ✎

- Accordion: click `.layer-panel__header` để mở (click 2 lần = mở rồi đóng). Section mở có `layer-panel--active`; có thể 2 panel cùng active ⇒ scope theo header.
- DOM header là **Title Case** (`div.layer-panel__header > span.mr-auto` = `Personalization Settings`), CSS hiển thị uppercase ⇒ `browser_find`/exact uppercase không khớp. Dùng `.layer-panel__header:has(span.mr-auto:text-is("Personalization Settings"))` hoặc regex `/^personalization settings$/i`.
- Section có thể thu gọn mặc định ⇒ field (vd `input[name=form_label]`) chưa có trong DOM tới khi mở.
- Đọc nhanh: `[...document.querySelectorAll('.layer-panel')].map(p=>p.className+' >>> '+p.innerText.split('\n')[0])`.
- Toggle là `label.vue-js-switch` (`aria-checked`, class `toggled`); click chữ không ăn: `div:has(> label.vue-js-switch):has-text("<nhãn>") label.vue-js-switch`. Radio bị label chặn ⇒ click `label[for="<id>"]`.

## Layer picker (`+ Layer`)

- Nút: `page.locator('button:visible').filter({hasText:/^\W*Layer\s*$/}).last()` (`getByRole('button',{name:/^\s*Layer$/})` không khớp).
- Danh sách (2026-08-26, `.add-layer-popup`):

| Nhóm | Items |
|---|---|
| TEXT | Single-line Text · Paragraph ▸ (Normal / Custom Shape) · Curve Text · Other ▸ (Warp Text / Spiral Text) |
| IMAGE | Static Image · Clipart Category ▸ (1 Clipart Category / Group of clipart categories) · Photo Upload ▸ (Single Upload / Multiple Uploads) · Text to Image (AI) · Dynamic Clipart by Text ▸ (Manual Placement / Auto Placement) |
| VECTOR | Static Vector · Vector Category · Vector Upload |
| MAPS & ASTRONOMY | Street Maps · Route Maps · Star Maps · Moon Phase |
| PUZZLES | Scrabble ▸ (Cross Word / Single-line) · Word Search · Word Cloud |
| OTHERS | Song Search · Calendar · QR Code · Clock |
| FORM ELEMENTS | Toggle Switch · Additional Option · Addon Charge · JSON List · Font · Color |

- Submenu render bên trong `.add-layer-popup`, phải **click** (hover không mở), rồi click item (`:text-is("Single Upload"):visible`). Có lúc submenu phải click bằng toạ độ.
- Thêm ngay không dialog: Single-line Text (`Text layer`), Route Maps (`Route Maps layer`), Word Search, Addon Charge, Toggle (`Toggle`), Font, Color, JSON List, Song Search (`Song search`)…
- Mở dialog chọn ảnh/vector trước: Static Image, Photo Upload (Single/Multiple), Text to Image (AI), Static Vector, Vector Upload, Clipart/Vector Category, Dynamic Clipart by Text. Tên layer = tên file asset ⇒ đổi tên ngay.
- `data-type` / type đã quan sát: `text`, `curve-text`, `shape-text` (Paragraph ▸ Custom Shape, = `shape_text` trong SDK), `warp-text` (= `warp_text`), `spiral-text`, `static-photo` (Static Image), `photo` (Photo Upload ▸ Single), `multiple-uploads`, `dynamic-by-text` (Manual Placement), `clipart-frame` (Auto Placement), `toggle`, `font`, `color`, `additional-option`, `addon-charge`, `group`. Static Vector ghi nhận là data-type vector. Các loại khác theo registry bên dưới.
- Registry bundle có đúng 35 layerType (2026-08-27): `additional-option, addon-charge, calendar, clipart-category, clipart-frame, clock, color, curve-text, dynamic-by-text, font, group-clipart-categories, json-list, maps, moon-phase, multiple-uploads, paragraph, photo, qr-code, route-maps, scrabble-crossword, scrabble-single-line, shape-text, song-search, star-maps, static-photo, static-vector, text, text-to-image, toggle, vector-category, vector-upload, warp-text, word-cloud, word-search`.
- 🔴 **Không tạo được** từ portal: layer `artwork-ref` (ArtworkLayer chỉ dùng trong mockup `type==="artwork"`) và **Paragraph legacy** (chỉ 1 layerType `paragraph`). Gặp yêu cầu ⇒ báo blocked.
- ` Import` cạnh ` Layer`: `PSD Single template` / `PSD Group-to-template` / `Import from Canva`.

## Duplicate artwork (`/artworks`)

- Card `div.vgrid-col > .artwork-item` (không có id). Nút: `i.la-pencil` · **`i.la-copy`** · `i.las.la-ellipsis-h`. Hover card → `i.la-copy` ⇒ `POST /api/artworks/<id>/clone` 201, bản `<tên> copy` ở đầu lưới, không toast/confirm.
- Clone sinh **layer id mới** cho mọi layer, url ảnh giữ nguyên (kể cả `_master_large`), tự remap `retrieval_layer` sang id mới.
- Lấy id: click tên (`.artwork-item__name a`) → editor mở, URL `/artworks?id=<newId>`. Trùng tên ⇒ phân biệt bằng thời gian + xác nhận id trên URL. Chọn card bằng `.artwork-item:has(img[src*="<thumbnail hash>"])`.
- Search `/artworks`: `main input[placeholder="Search"]` + Enter ⇒ `?name=`.
- 🔴 `/artworks?id=<id>` tự MỞ editor (dialog chặn list) ⇒ muốn thao tác list thì mở `/artworks` trần.
- Menu `...` của artwork có `Import to Translation` (`dynamic-translations.md`).
- Đổi trang SPA không mất hook: click `a[href="/fonts"]` (2 link trùng trong sidebar, dùng phần tử đầu).
