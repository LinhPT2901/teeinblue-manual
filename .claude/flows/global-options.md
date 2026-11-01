# Global Options (`/global-options`)

Sidebar **Assets → Global Options** (không nằm trong Store Settings). Mỗi GO chỉ 1 loại layer.

## Tạo

1. Nút **` Global Option`** (`main button:has-text("Global Option")`) → dialog **`Select a layer type`** (cùng picker `+ Layer`, `Static Image` / `Static Vector` `(Unavailable)`; submenu Photo Upload phải click bằng toạ độ).
2. Click item → **`/global-options/create/<type>`** (vd `song-search`, `additional-option`, `route-maps`).
3. Điền → `Save` (`button.promise-button.btn-primary:has-text("Save")` hoặc `getByRole('button',{name:/Save/})`) ⇒ `POST /api/global-options` 201 → id trong `/global-options/<id>/edit`. Sửa ⇒ PUT 200.

### 🔴 Field `Global Option Name(internal)` KHÔNG nhận `fill()`
- Input `.field--text:has(label:has-text("Global Option Name")) input` (không name/id; `main input[type=text]` first không phải ô này). `fill()` đổi DOM nhưng model giữ default `New <Type> option`.
- Cách đúng: click → `ControlOrMeta+a` (Backspace) → `pressSequentially(<tên>)` → verify `.value` → `Save`.
- Ở `/global-options/<id>/edit` phải đợi data load mới gõ; gõ sớm ⇒ nối chuỗi (`<tên>New Song Search option`).
- `form_label`, `#cart_template` thì `fill()` bình thường.

### Additional Option
- Trang create chỉ có tab `Create new` / `Select from category` + display type (mặc định `Inline Radio Button`; `Dropdown Option Name` = value `text`; có ghi nhận mặc định `radio`) + `Item name`/`Add new` (item lưu LOCAL). **Không có ô Name lúc tạo** ⇒ POST với tên `New Additional Option option`, đổi tên + `Option Title` ở `/global-options/<id>/edit`.
- `Create new` lưu **inline**: `additional_option_source: "inline"`, `options:[{id:<uuid>,name}]` — không tạo clipart category. Không có form_label mặc định (layer hiện `Option title: -`).
- List item inline hiện `Bulk action` thay vì `Select all`. Xoá item: `Bulk action` → `Delete items` → checkbox phải item (force) → `.inline-additional-options__bulk-delete` → popup → bấm `Save` trang (PUT `/api/global-options/<id>`).

### Song Search
Field: `Global Option Name(internal)` · `Category` · `Option Title:` (`input[name=form_label]`) · `Placeholder text:` · `Add instruction for customer:` · `Load song lyrics` (OFF) · `Show customization data on cart/checkout` · `Cart display template:` (`input#cart_template`, `{{title}}`) + `Available Value` + `Preview (using sample data)` (`{{title}} - {{artists}}` → `Mr. Brightside - The Killers`) · `Custom class:` · `Preview:` (`input#preview_layer`). Không có toggle required.

### Route Maps
`/global-options/create/route-maps`: Name, `Option Title` (`input[name=form_label]`), switch giống panel layer (show_in_cart ON mặc định), không có required.

### Addon Charge
Form giống panel layer Addon Charge, thêm Name ở đầu. Xem `layers-form-elements.md`.

## Gắn GO vào layer

- Panel ✎ → `label[for="customization_type-global_option"]` → `Select a global option*:` (vue-multiselect): mở bằng `.layer-panel--active .multiselect` / `.layer-editor-panel .multiselect` / `.multiselect__select` → gõ tên → click `.layer-panel--active .multiselect__content-wrapper li:has-text("<tên>")` / `.multiselect__option`. (`input[placeholder="Select a global option"]` là element ẨN — click thẳng timeout.)
- Panel sau khi chọn: `<tên GO>` + link `Edit` (mở sửa GO — đừng bấm) + `Option title: <...>`.
- JSON layer: `customization_type: global_option`, `global_option: <id>` (giữ `form_label` cũ của layer; storefront hiện Option Title của GO).
- Nhiều layer cùng GO ⇒ storefront 1 field, lên cart 1 lần (localStorage: `storefront-sdk.md`).
- 🔴 Defect mở (2026-08-28): cart template / show_in_cart của GO Song Search bị bỏ qua ở SDK — xem `storefront-sdk.md`.
