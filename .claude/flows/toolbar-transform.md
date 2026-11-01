# Toolbar canvas, Transform, font, shadow, border, HD, Print Effects

## Selector toolbar (artwork editor)

Toolbar nằm trên canvas, mỗi item là `div.qte-field`, accessible name hầu hết rỗng:

| Chức năng | Selector |
|---|---|
| Transform (W/H/Top/Left/Rotate + `Fit to canvas`) | `.qte-field:has-text("Transform") >> visible=true` (`.qte-field--alignment:has-text("Transform")` không khớp mọi loại layer, vd warp-text) |
| Align | `.qte-field--alignment:has-text("Align")` |
| Font family | `.qinline-fontname` (nth=0) |
| Font size | `input.qinline-value[type=number]` (nth=0; `>> visible=true`) |
| Align text | `.qte-field.qte-alignment` |
| Vertical align | `.qte-field.qte-alignment-vertical` |
| Màu chữ | `.qte-field.qte-color` |
| Stroke | `.qinline-stroke` |
| Background image | `.qinline-bg-toggle` (icon `///`) |
| Letter spacing + Line height | `.qinline-letter-spacing` (icon `|↔|`) |
| Skew | `.qinline-skew` |
| Shadow | `.qinline-shadow` |
| Curve radius (Curve Text) | `.qte-field.qte-curve` |
| Overflow "..." | `i.las.la-ellipsis-h` trong `.qte-field` cuối |

- Mọi popup đều **toggle**: click lại trigger để đóng (Escape KHÔNG đóng).
- 🔴 Nút `...` overflow bị `.artwork-form-panel` (x=1200 ở viewport 1600) che ⇒ click link **` Preview Options`** (`.artwork-form-panel >> text=Preview Options`) để thu panel phải; toolbar giãn, không còn overflow.
- Toolbar theo loại layer:
  - Text: font, size, align, color, stroke, background image, skew, letter-spacing, shadow (Text không có Print Effects). Không có toggle Autoscale.
  - Warp Text: `Transform | Align | Print Effects | font | color | ... | Warp`.
  - Photo: `Transform | Align | Print Effects | [shadow] | Border`.
  - Static Image (2026-10-27): `Transform | Align | [shadow] | Border | Print Effects | HD`.
  - Layer linked: chỉ `Transform` / `Align` / `Shape Cut` (photo linked: `Transform | Align | Print Effects`, không Border).
  - Multiple Uploads ▸ Multiple Outputs: không có Transform (chỉ `Border`).

## Transform

- Input id: `#quick-transform-editor-width` · `-height` · `-top` · `-left` · `-rotate` (Mockup Editor không có id — `mockup-editor.md`). `getByRole('spinbutton',{name:'Width:'})` cũng đúng. `page.locator('input[type=number]').nth(n)` RẤT DỄ SAI (input ẩn của trang campaign + overflow).
- 🔴 `fill()` khi ô đang có giá trị có thể **nối chuỗi / nhân đôi** (`400` ⇒ `400400`, `1200` ⇒ `1201200`), UI không báo lỗi. Cách đúng: click ô → `ControlOrMeta+a` → `Delete`/`Backspace` → `fill`/type → Enter hoặc click sang field khác. Sau mỗi field đọc lại:
  ```js
  ['width','height','top','left'].map(k=>k+'='+document.querySelector('#quick-transform-editor-'+k)?.value)
  ```
- Popup Transform là toggle: click khi đang mở = đóng (`#quick-transform-editor-*` trả undefined). Kiểm `#quick-transform-editor-width` visible trước khi click. Popup GIỮ MỞ khi click sang layer khác trong layer list và tự nạp giá trị layer mới. Mở/đóng popup đôi khi bỏ chọn layer ⇒ click lại thumbnail.
- `top/left` UI là góc trên-trái. JSON: Text lưu **tâm** (`left/top` = tâm); Paragraph lưu góc trên-trái.
- Khoá tỉ lệ: icon `.qtransform--fields i.la-lock` giữa Width/Height. Photo, clipart, static image: click được để mở khoá (`la-lock-open text-danger`). Layer linked: khoá, chỉ 4 handle góc. **Warp Text / Spiral Text: khoá cứng** (icon `cursor: not-allowed; opacity .5`) ⇒ chỉ box vuông.
- Height của layer khoá tỉ lệ chỉ cập nhật khi click sang field khác.
- Lưu bị trừ 0.01 ở top/left trong một số trường hợp (vd 40 → 39.99; width/height lẻ như 50.88 ⇒ 200 lưu 199.99 — nhập `200.01` để ra 200). Có phiên lưu đúng. Kiểm từng layer sau Save.
- Width/Height thập phân được lưu nguyên (50.88) dù ô chỉ HIỂN THỊ số nguyên ⇒ đọc body PUT hoặc merchant API.
- Gõ lại đúng giá trị đang hiển thị không bắn change ⇒ gõ giá trị khác trước rồi mới gõ giá trị đích.

### Thứ tự set kích thước theo loại layer
- Text 2.0 / Curve Text 2.0: đổi Height hoặc font size làm **Width reset** về mặc định (513/514) và Top/Left tính lại theo tâm. Thứ tự: Default text → `Height` → font size → **`Width` + Top/Left SAU CÙNG** → đọc lại 4 field. (Đổi Height khi `3000x122` ⇒ Width nhảy 7670.) Gõ text mới cũng có thể làm width nhảy ⇒ set lại W.
- Text "fit" theo box: đổi font size không to ra nếu box hẹp; set H trước rồi W, font tự scale.
- Paragraph: đổi font size sau Transform KHÔNG reset W/H.
- Curve text font lớn tràn box ⇒ giảm font size rồi set lại W.

## Font

- Popup font: radio `Google Fonts` / `Custom Fonts` (click `label[for="typography_type-custom"]`).
- Custom: tên đổi `Empty fonts!!!` + ` Select a font` → dialog `Your Custom Fonts` → `div.vgrid-col:has(a:text-is("<tên font>")) >> text=Select` (click tên `<a>` = inline rename). Font có sẵn: `CenturyGothic125`, `ptshoot`, `Roboto Condensed ExtraBold`, `Hourglass Of Shine`, `LFC`…
- Upload font trong editor: ` Upload fonts` → dialog `Browse fonts to upload:` → `Choose File` (file chooser) → `POST /api/custom-fonts` 201, card mới đầu lưới. Đóng dialog nhỏ `.font-uploader > .dialog-close`.
- Google: combobox Font family (vue-multiselect) → gõ textbox `-searchbox` → click option; variant mặc định `regular`. Đổi variant: click text `regular` → `li.multiselect__element` filter `/^\s*900\s*$/`. Dropdown đóng nếu script tách bước.
- JSON: layer custom font giữ `typography` Google cũ song song `custom_font {url,size,family}`; layer Google có `custom_font: {size}`.

## Background image (Text / Curve / Warp / Paragraph)

- `.qinline-bg-toggle` → `Default background image:` + `Browse` → **thư viện ảnh type `image`** (category, dropzone, `Select` = `button.promise-button.btn-primary`). Upload `POST /api/library-images/by-temporary-file` (nhận AVIF). Lưu `background_image: users/64/library/<...>_large.webp`. Chọn card `img[alt="<tên>"]`. Chi tiết thư viện: `assets-library.md`.
- Warp Text: popup ghi "Background does NOT work with stroke".
- Render SVG: `<clipPath>` chứa `<text fill="#..."/>` + `<image clip-path=...>`; `<text>` ngoài cùng `fill="none"` — không phải bug.

## Shadow

- Trigger `.qinline-shadow` (2 element trùng class; dùng `.first()`). Với text layer `.qinline-shadow` first có thể là bản ẨN ⇒ sau `Preview Options`, click icon bằng toạ độ (~1195,64).
- Popup `.qfield--shadow`: `#shadow-enable` (toggle, OFF), `#shadow-offset-x`/`-y` (0), `#shadow-blur` (1, min 0, không max), màu (`.vc-input__input`, `#000000`), radio `display_shadow-mockup_order` (*Mockup Preview & Order Design*, mặc định) / `display_shadow-mockup`.
- Note UI: *"(Shadow does NOT work with AI, EPS, or PDF format)"*. Đơn vị = px hệ toạ độ artwork.
- Thứ tự: chọn layer (`#artwork-sortable-layer-layer-<id> .artwork-sortable-layer-thumbnail`) → `.qinline-shadow` → `#shadow-enable` → fill → đọc lại → click trigger để đóng.
- Có ở mọi loại layer đã thử (Text, Static Image, Vector Category, Clipart Category).
- JSON: key phẳng `shadow_enabled/shadow_color/shadow_blur/shadow_offset_x/shadow_offset_y/shadow_display`.
- Verify không mở popup: SVG `<filter>`:
  ```js
  [...document.querySelectorAll('filter')].map(f => { const ds = f.querySelector('feDropShadow'); return f.id + ' :: ' + (ds ? `dx=${ds.getAttribute('dx')} dy=${ds.getAttribute('dy')} sd=${ds.getAttribute('stdDeviation')}` : 'no-dropshadow'); });
  ```
  `artwork-filter-layer--layer-<id>` (campaign preview), `--artwork-preview-<id>` (canvas). Hậu tố `--zero-blur` + không `feDropShadow` ⇒ blur sau scale về 0, mất shadow.
- `stdDeviation` = `blur × ratio` (ratio = preview width / artwork width), floor về 1 nếu < 1. Ratio đo artwork 4500: canvas 0.19 (855), campaign preview 0.1111 (500), storefront SDK v1 0.158889 (715) — đọc từ DOM, đừng tính tay.
- Storefront: offset 0 ⇒ `feDropShadow`; offset ≠ 0 ⇒ `filter=""` + nhân bản `<text>` dịch `offset × ratio`, không blur; Image/Vector/Clipart blur nhỏ ⇒ `--zero-blur`, mất shadow.

## Border (photo border)

- Có ở photo, clipart-category, static-photo; layer linked không có.
- Trigger: `.qinline-stroke:text-is("Border") >> visible=true` (`div.qte-field` filter `^Border$` không khớp khi popup mở). Container `.qfield--photo-border`.
- `#photo-border-enable` (scope container; đừng dùng `label.vue-js-switch` chung — trúng `Show customer's photo on live preview`), `Type` (`label:has-text("Custom shape")` / `"Contour cut"`), màu (`.qfield--photo-border .vc-input__input` first, nhận 8-hex có alpha: `#0000FF80`; 6-hex lưu `...FF`), size `#photo-border-size` (**Enter không commit, phải Tab**), switch `Add a thin line around the border`, `Display border on`.
- Mặc định: OFF, `contour_cut`, `#FFFFFF`, size 10, thin line OFF, display `mockup_order`. Type tên đầy đủ `Custom shape (for Photo Upload only)`.
- `custom_shape`: note "A shape image is required... Set it up in Crop into a custom shape" luôn hiện; `Display border on` bị ẩn (JSON vẫn `mockup_order`).
- Network: contour_cut ⇒ `GET /api/merchant/games/photo-border/<base64>.json` mỗi lần đổi color/size; custom_shape không thấy POST photo-border-masks.
- Ảnh placeholder `uploaded` (1200x1200) có vùng bán trong suốt ⇒ màu border lộ qua; dùng ảnh đặc nếu cần nhìn sạch.

## HD

- Static-photo, clipart-category: `.qte-field.qte-field--no-separator.ml-auto > button.hd-btn` (`span.hd-btn__label` "HD"). Chưa bật: class `hd-btn v-popper--has-tooltip`, không aria-pressed; JSON không có key hd. 2 bản trong DOM (1 ẩn) ⇒ lọc `offsetParent`.

## Print Effects / Emboss

- Có ở photo / static-photo (Text không có). `Print Effects` → `Customize` → `Effect`: `Cut` / `Emboss` (`.sc-effect-btn--emboss`) → grid Rows/Columns (mặc định 3x3; `.sc-cell--origin` ★ = ô chứa layer) → click ô đích (`.sc-cell` nth) → `Apply layout`.
- Lưu: template `shape_cut_layout:"3x3"`, layer `emboss:{cell_index, target_cells:[...]}`. Bản emboss render ở ô đích cùng offset tương đối ⇒ đặt layer gọn trong 1 ô. Chỉ hiện trên Order Design.
- Cần `emboss_provider` ở 3rd-party Services (`/api/user` private_config): linh-tib-staging = **`teeinblue`** (B&W, không gọi 3rd-party; khác: `imagenhub` + template).

## Curve radius

- `.qte-field.qte-curve` → `Curve radius:` (slider + `input[aria-label="Curve radius"]`), range **-200..200**, mặc định 50 (300 clamp về 200). 200 = gần tròn kín; 60 = cung mềm.
