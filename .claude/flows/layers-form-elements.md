# Layer form elements & đặc biệt: Toggle, Font, Color, Additional Option, Addon Charge, JSON List, Song Search, Route Maps, puzzle

## Toggle Switch (`toggle`)

- Panel: `Option Title:` (`input[name="form_label"]`), **`Toggle label:`** (`input[name="toggle_label"]`, rỗng), `Show option title` (ON), **`Pre-enable toggle`** (ON ⇒ storefront ON sẵn; JSON `default_value: true`, `value: true`).
- Tên layer mặc định `Toggle`.

## Font layer (`font`)

- 🔴 BẮT BUỘC chọn font category, thiếu ⇒ toast `Font: - Select one font category is required` (console sạch).
- ✎ → `Select one font category*:` → link ` Search` → dialog `Latest categories` → click item ⇒ `Selected: <cat>` + `Available values:`.
- Panel Font / Color: chỉ `PERSONALIZATION SETTINGS` + `CONDITIONAL SETTING` + `EXTRA`; có **`Populate to other layers:`** (combobox `Select layers`) ⇒ populate wire được từ 2 phía.

## Color layer (`color`)

- Không bắt buộc — mặc định radio `Color picker`, save được ngay.
- Color category: `Color options:` radio **`Solid Color category`** (`color_option-color_category_option`) → `Select one color category*:` → ` Search` → popup `Search categories by name` → click ⇒ JSON `clipart: <catId>`, `color_option: color_category_option`.
- Color kiểu `Color picker` không lên danh sách Option của CONDITIONAL SETTING.

## Additional Option (`additional-option`)

- Panel: `Option Title` + `Select additional options category:` (treeselect). Category **bắt buộc** (ghi nhận 2026-10-28; ghi chép 2026-08-28 nói không bắt buộc đã đưa vào archive — nếu Save lỗi thiếu category thì theo bản mới).
- Category có sẵn trên staging: `dropdown`, `dropdown + thumbnail`, `radio`, `inline button`, `number`, `thumbnail`, `photo upload`, `Number - additional option`…
- Chọn category có sẵn: link `Search` trong panel → popup gõ tên → click (treeselect `Search top-level category` gõ không ra kết quả).
- **Tạo category ngay trong panel**: nút ` New category` là `div.btn` (`.layer-editor-panel div.btn:has-text("New category")`) → modal `.vm--modal` `Category`: ô Name = `input:not([type=radio])` đầu tiên (không name/placeholder; có lúc dùng toạ độ), Custom class, radio `category_display_type-image|text|dropdown|radio|radio_button` = Thumbnail Images / **Dropdown Option Name** (`text`) / **Dropdown Option Name + Thumbnail** (`dropdown`) / Inline Radio Button / Radio → `Create` (`POST /api/clipart-categories` type additional_option) → cột `Additional Options`: `input[placeholder="Item name"]` + `Add new` (mỗi item `POST /api/cliparts` 201; chờ ~3-5s/item, add nhanh thì item 2 bị nuốt — verify GraphQL `clipart_categories{cliparts{name}}`) → lưu `button.clipart-category-editor__btn` (`Save`, PUT). Category tự gắn vào layer. Đóng modal: × góc phải (~1182,149).
- Default value: `Show option to select default value` → click nút item ⇒ JSON `default_value: <clipartId>`, `additional_option: <catId>`.
- **Dùng Global Option**: `label[for="customization_type-global_option"]` → `.layer-editor-panel .multiselect` → gõ tên → `.multiselect__option` ⇒ panel hiện `<tên GO>` + `Edit` + `Option title: -`. Không bấm `Edit` (mở sửa GO). JSON `customization_type: global_option`, `global_option: <id>`.
- Storefront field AO dùng GO: `#tee-field--layer-<AO layer id>` dạng `.tee-custom-select` → click `.tee-custom-select__input` → `.tee-custom-select-item`. `getCurrentCustomization()` lưu `global-option-<id>: "<optionId>"`.
- Trang độc lập `/additional-options` → `New category` → cùng form → `Create` (URL `?id=<id>`).

## Addon Charge (`addon-charge`)

- `+ Layer` → `FORM ELEMENTS` → `Addon Charge`, thêm ngay, tên `Addon charge`.
- Panel: `PERSONALIZATION SETTINGS` · `CONDITIONAL SETTING` · `EXTRA` (`Group name:`). Không DESIGN/POPULATE.

| Field | Selector | Ghi chú |
|---|---|---|
| Radio personalization | `input[name=customization_type]` `-normal` / `-global_option` | không có No personalization |
| `Option Title:` | `input[name=form_label]` | |
| **`Charge method:`** | radio `name="addon_charge_mode"`: `#addon_charge_mode-variant` (`Add a separate addon item to the cart`, mặc định) / `#addon_charge_mode-direct_price` (`Adjust the item price directly` — *"...Requires the shop to have the Teeinblue cart transform function installed."*) | label chặn click input ⇒ click `<label>` |
| `Option values*:` | `#field__options .repeater-list-item input[name="name"]` | 2 hàng **value** prefill `Option 1`/`Option 2` (save được ngay; ghi đè khi cần). Xoá hàng `.repeater-remove` (không confirm) |
| `Display options as:` | `input[name=display_type]` (`radio_button`/`radio`/`dropdown`/`image`) | mặc định `radio_button` (Inline Radio Button) |
| `Enable multiple selection` | toggle | OFF; ON + Inline Radio ⇒ storefront render checkbox |
| `Mark this option as required` / `Show customization data on cart/checkout` | toggle | theo config (Rule 14) |

- Toggle `Additional Charge` (thấy 2026-08-27) không còn thấy 2026-10-22.
- Mỗi option value có thumbnail uploader (`input#thumbnail-<id>_create`).
- Mapping app block Shopify **Digital Download**: "custom name" = `Option Title`, "custom values" = các hàng `Option values*` (portal không có field tên "Custom name"). Khớp default `digital`/`yes`: Option Title `digital`, 1 value `yes`.
- Layer thứ 2+ trong cùng artwork: mở panel bằng `#artwork-sortable-layer-layer-<id> #manage-layer` (trùng tên). Layer mới nằm đầu list: `li.artwork-layer-item[data-type="addon-charge"] >> nth=0 >> #manage-layer`.

### Mode `variant` (legacy) — nút `Attach`
- Click `Attach` → dialog **`Attach a Shopify variant to use as Extra charge`**, mỗi store 1 hàng (`.row:has-text("linh-tib-staging.myshopify.com")` last): combobox `Product:` (prefill **`Preset - Addon product`** ở linh-tib-staging; có search server-side — gõ pressSequentially, chuỗi có `[` không ra) + `Variant:` (`.multiselect` nth1; options `<tên> - <giá>`: `addon 1 - 25000`, `addon 2 - 25000`, `out of stock - 25000`, **`free - 0`**, `addon 3/4/5 - 25000`) → `Attach` cùng hàng ⇒ hàng hiện `<Product> - <variant> - <giá> (quantity: 1)` + nút xoá. Nút option đổi `+1 variants`. Đóng: `Close` (footer / ×).
- `Preset - Addon product` là Shopify product (không phải Product Base); `free - 0` là variant giá 0 duy nhất đã thấy.
- Cart legacy: line chính `_tib_addon_variant: <variantId>:1`, line addon riêng có `_tib_customization_id`.

### Mode `direct_price` — `Price: + Add`
- Nút `Attach` đổi thành **`Price:` + ` Add`** → dialog **`Price`** (*"This amount is added to the item price when the buyer selects this option."*), bảng `Stores | Price`, mỗi store 1 nút `Add` → `spinbutton` (mặc định `1`) + đơn vị tiền của STORE đó. Hàng: `div.row:has-text("linh-tib-staging.myshopify.com")`; ô `.dialog-prices-by-instance input[type=number]`; đóng `.dialog-prices-by-instance button.btn-outline-primary` (`Close`; tránh `text=Close` trùng `Save & Close`).
- Giá **per-store**, không có ô USD. linh-tib-staging = VND; linh-tib-checkout portal ghi EUR (store này base price/tỷ giá bất thường — storefront hiển thị số lạ, không phải bug tính năng).
- Lưu khi **blur** (Tab/click ra ngoài). 🔴 Nút nhỏ `X` (`class="col-1 btn"`, `la la-times`) cạnh ô là **XOÁ record giá**, không phải xác nhận.
- `0` nhập được nhưng list hiển thị giống chưa set (`Price: [+ Add]`); phân biệt bằng mở dialog (spinbutton 0 vs nút Add). Dòng đã có giá hiện `Price: Multiple rates` + **`Edit`**.
- Id spinbutton `field__id-<n>` đổi mỗi lần mở ⇒ tìm theo text tên store.
- **Sửa giá 1 store không đụng store khác**: mở editor (URL `?product-id=<pbId>&artwork-id=<artworkId>`) → `#manage-layer` đúng layer → `Edit` → chỉ sửa spinbutton hàng store cần (không click `Add`/`X` hàng khác) → Cmd+A + Delete → fill → Tab → đọc lại → `Close` → Save → `Update` chỉ hàng store đó (`publish-sync.md`).
- Storefront: SDK tự cộng tổng (`.tee-price--current`), dòng phụ `Selection will add <giá> to the price`. Cart không có line addon.
- 🔴 Quan sát 2026-09-29: giá **ÂM** (-10.000₫) không trừ vào tổng và label không hiện hậu tố giá (giá dương cộng đúng). Chưa báo bug. Evidence `evidence/TIB-5482/05-storefront-staging-negative-price-not-reduced.png`.
- Campaign editor preview giá: `.tee-product-price` (`.tee-price--current`, `.tee-price--compare`, `.tee-price--saving`); store EUR định dạng `20.00€`, addon `+18.00€`.
- Storefront linh-tib-checkout: dropdown addon hiện raw `+<span class=money>$59,000.00</span>` (moneyFormat có HTML do custom script theme).
- Verify config: merchant JSON công khai (`options[].addons[]` có id/rate/product_id/instance_id); `addon_charge_mode` không có trong JSON đó.

### Charge by Character count (Text 2.0)
- Toggle `Charge by Character count` (id `field__price_per_letter_enabled`, click `.vue-js-switch`) → `Price per character:` + ` Add` → cùng dialog `Price` per-store. Mặc định OFF.

### Extra charge theo template
- Bút chì hàng `Template: Default template` (deselect layer trước) → `Edit - Default template` → toggle `Extra charge for this template`; Save/Cancel là link.

### Global Option kiểu Addon Charge
- `/global-options` → `Global Option` → `Addon Charge` (cạm bẫy Name xem `global-options.md`). `Adjust the item price directly` ⇒ hàng option đổi `Price: [+ Add]`.
- Gắn vào layer (`Use an existing global option` → `.multiselect__select` → click option) ⇒ toàn bộ `Charge method:` **bị ẨN** (không phải disable); panel còn tên GO + `Edit` + `Option title: <tên>`.
- Nhiều layer trỏ cùng GO ⇒ form/storefront chỉ render 1 field.

### Product Page Settings liên quan
`shop-config-defaults.md` (mục Product Page Settings / Content).

## JSON List (`json-list`)

- Không vẽ gì lên canvas. Panel: `PERSONALIZATION SETTINGS` · `CONDITIONAL SETTING` · `EXTRA`.

| Field | Selector | Default |
|---|---|---|
| Radio | `input[name=customization_type]` (`normal`/`global_option`) | `normal` |
| `Option Title:` | `input[name=form_label]` | rỗng |
| `JSON File URL:` | `input#source_url` | `https://cdn.teeinblue.com/examples/cities.json` |
| `Load preview` | button | → `N item(s) loaded` + 5 item đầu |
| `Placeholder text:` | `input[name=form_placeholder]` | |
| `Option display template:` | `textarea#option_template` (nhiều dòng) | `{{name}}` |
| `Cart display template:` | `input#cart_template` (1 dòng) | `{{name}}` |
| `Default value (name):` | select | `-- Select a default value --` |
| `Add instruction for customer:` | `textarea#input_hint` | |
| `Mark this option as required` | toggle | |
| `Show customization data on cart/checkout` | toggle | theo config |
| `Custom class:` | `input[name=custom_class]` | |

- Mỗi template có `Available Value` + `Preview (using the first item from your JSON file)`.
- `Available Value` ĐỘNG theo file đã load, flatten nested: `jsonplaceholder.typicode.com/users` ⇒ `{{id}} {{name}} {{username}} {{email}} {{address.street}} {{address.suite}} {{address.city}} {{address.zipcode}} {{address.geo.lat}} {{address.geo.lng}} {{phone}} {{website}} ...` (dùng cho test nested path).
- `option_template` giữ `\n` qua Save + reload.
- URL chỉ nhận http(s): `data:` URL làm `Load preview` disabled.
- 🔴 `option_template` chứa `<script` ⇒ `PUT /api/artworks/<id>` bị WAF chặn (`net::ERR_FAILED`, toast `Network Error`), cả artwork không lưu. Biến thể không có `<script` (vd `<img src=x onerror=...>`) lưu bình thường.
- Storefront render `option_template` là HTML thật nhưng v-dompurify strip event handler (`onerror` null, không alert).
- Item JSON List không được dịch (`dynamic-translations.md`).

## Song Search (`song-search`)

- `OTHERS` → `Song Search`, tên `Song search`. Không vẽ gì lên canvas. Panel chỉ `PERSONALIZATION SETTINGS` + `CONDITIONAL SETTING`.

| Field | Selector | Default |
|---|---|---|
| Radio | `input[name=customization_type]` `-normal` / `-global_option` (không No personalization) | normal |
| `Quick-fill from a global option` | button | |
| `Option Title:` | `input[name=form_label]` | rỗng |
| `Placeholder text:` | `input[name=form_placeholder]` | |
| `Add instruction for customer:` | `textarea#input_hint` | |
| `Load song lyrics` | toggle (JSON `lyric_enabled`) | OFF |
| `Show customization data on cart/checkout` | toggle | theo config |
| `Cart display template:` | `input#cart_template` | `{{title}}` |
| `Available Value` | button | |
| `Custom class:` | `input[name=custom_class]` | |

- 🔑 Không có toggle `Mark this option as required`, nhưng field vẫn hiện `*` ở PERSONALIZATION FORM và storefront (`Choose your song*`).
- `Available Value` của cart template: đúng 4 token `{{title}}`, `{{artists}}`, `{{url}}`, `{{duration}}` — không có `{{lyrics}}` (chỉ có ở Browse values của POPULATE VALUES).
- Store linh-tib-checkout (SDK v2): field Song search required ⇒ phải chọn bài mới submit.

## Route Maps

- Thêm ngay, tên `Route Maps layer`, 700x700 @450/450, không khoá tỉ lệ.
- Panel (2026-10-26): DESIGN SETTINGS (`Upload GPX default` / zoom / line color / thickness / Map styles URL / `Show Marker/Pin`), PERSONALIZATION (radio + Option Title + `Apply mask image`, `Allow customers to change elevation profile`, `Allow customers to change map styles`, `Add instruction for customer`, `Show customization data on cart/checkout`, `Custom class`), CONDITIONAL, EXTRA.
- **Không có toggle required** (JSON không có key `required`; storefront vẫn `Your route*` `span.tee-asterisk`) và **không có setting Strava** ở layer. Nút `Connect Strava` do SDK render, label từ shop config `gpx_upload_button_text_strava`.
- Hỗ trợ Global Option (`/global-options/create/route-maps`, xem `global-options.md`).
- Storefront: `Choose an gpx` (`accept=.gpx`) → `gpx-upload` 200 → dialog Leaflet `Cancel` / **`Select & continue`** (phải bấm, nếu không overlay `vm--overlay data-modal="tee-dialog-route-maps"` chặn mọi click) → `gpx/parse` 200. Sau upload: thumbnail + `button.tee-btn.tee-photo-clear` (X), tên track, `Choose another GPX`, `Connect Strava`, `Recustomize route map`. File `5km.gpx` hiện `Invalid date - 5.09km - 0:00:00`.

## Puzzle / khác

- Word Search: 700x700 @450/450; `Default words` = `Anne, Bravo` (2/30); `Min col/row` 8; field `*` required cứng.
- Word Cloud: 700x700 @450/450; `Default words` = `Anne,Bravo,Charlie`; `Number of words` 200; `Enable custom shape` ON, shape `Heart`, `Use shape's color` ON; `*` required cứng.
- Scrabble single-line mặc định `background_image: https://cdn.teeinblue.com/images/scrabble-background.png`.
- Maps / Route / Star không có key `required`.
- `merchant/games/{type}`: xem `storefront-sdk.md`.
