# Personalization settings, Populate values, Conditional setting

## PERSONALIZATION SETTINGS (chung)

- Radio `customization_type`: `No personalization` (id **`customization_type-no_customization`**, không phải `none`) / `Create a new option` (`-normal`, mặc định) / `Use an existing global option` (`-global_option`). Một số layer không có `No personalization` (Song Search, JSON List, Addon Charge, Multiple Uploads). Layer link: `linked`.
- Click radio qua `label[for="customization_type-<value>"]`.
- `Option Title:` = `input[name="form_label"]`; Placeholder = `input[name="form_placeholder"]` (scope `.layer-editor-panel`).
- Toggle `label.vue-js-switch`: `div:has(> label.vue-js-switch):has-text("<nhãn>") label.vue-js-switch`, đọc `aria-checked`.
- Layer có `DESIGN SETTINGS` (Text, Route Maps, Word Search…) mở ✎ thì DESIGN đang active; mở thêm PERSONALIZATION ⇒ 2 panel cùng `layer-panel--active` ⇒ `.layer-panel--active input[name=form_label]` SAI. Dùng:
  ```
  .layer-panel:has(.layer-panel__header:has-text("PERSONALIZATION SETTINGS")) input[name="form_label"]
  ```
  (header DOM là Title Case — xem `artwork-editor.md`).
- `form_label` gõ `slowly` giữ được dấu cách cuối (`Photo ` len 6) qua POST + reload.
- Required: Route Maps, Word Search, Word Cloud hiện `*` cứng; Song Search, T2I, Multiple Uploads hiện `*` dù không có toggle / `required:false`.
- Mặc định từng toggle thay đổi theo config shop: `shop-config-defaults.md`.

## POPULATE VALUES

Mở: chọn layer → ✎ → section **POPULATE VALUES** (`.layer-panel__header:has-text("POPULATE VALUES")`). Mô tả UI: *"Let this layer receive values populated from other options."* Sau reload section mặc định thu gọn.

4 toggle riêng:

| Toggle | Ảnh hưởng wrap |
|---|---|
| `Populate Content from another option` | CÓ |
| `Populate Font from another option` | CÓ — gate *"Must change from Google Font to Custom Font to use this feature"* |
| `Populate Color from another option` | Không |
| `Populate Background from another option` | Không |

- Persist bình thường (Content/Font/Color, verify 2026-08-26 trở đi).
- Gỡ gate Populate Font: đổi font của chính layer sang Custom Font trước (`toolbar-transform.md`).
- Font/Color: `Values:` textbox disabled, tự điền `{{font}}` / `{{color}}`.

### 🔴 Thứ tự đúng: chọn Source option TRƯỚC, điền Value SAU
Chọn Source **xoá trắng ô Value** (2026-08-26, 2026-10-13). Quy trình:
1. Bật toggle.
2. Mở `.multiselect` chọn `Source option:` (option hiện 2 dòng `<Option Title>\n<tên layer>`; Playwright hasText regex chuẩn hoá xuống dòng thành space ⇒ so bằng `allInnerTexts()` + `split('\n')[0]`).
3. Điền Value: gõ `#retrieval_value` / `input.retrieval-value__input`, hoặc bấm `Available Value` rồi **click dòng token** trong `.retrieval-value__variable-wrap` (list mở ra che ô Value — đừng click/gõ vào ô khi list đang mở).
4. Verify cả hai → Save.
- ≥2 toggle cùng bật: `getByRole('combobox').filter({hasText:'Select an option'})` trúng nhiều cái ⇒ set từng toggle một hoặc dùng ref snapshot.
- JSON: `retrieval_value_enabled:true`, `retrieval_layer:"layer-<sourceId>"`, `retrieval_value:"<token>"`. Clone artwork tự remap `retrieval_layer`.

### Nguồn & token
- Dialog **Browse values** → loại nguồn → copy token. 9 loại: `Street Maps` · `Star Maps` · `Text & Curve Text` · `QR code` · `Song search` · `Moon Phase - Date` · `Moon Phase - Location` · `JSON List` · `Clock`.
- Song search: `{{title}}`, `{{artists}}`, `{{url}}`, `{{duration}}`, `{{lyrics}}` (cần bật `Load song lyrics`).
- Street Maps: `{{lat}}` `{{lng}}` `{{lat:dd}}` `{{lng:dd}}` `{{lat:dms}}` `{{lng:dms}}` `{{lat:dmm}}` `{{lng:dmm}}` `{{name}}` `{{place_name}}`.
- Single-line Text nguồn: `{{value}}`, `{{value.Xchar}}`, `{{value.capitalonly}}`, `{{value.initialofword...}}`, `{{value.firstword}}`, `{{value.lastword}}`, `{{value.context.yearTo*.comma}}`, `{{value.formula(<expression>)}}`.
- Photo Upload (Single) nguồn: `{{output}}` (ảnh sau effect, = legacy `{{value}}`) / `{{input}}` (ảnh gốc, effect của target tự chạy).
- Multiple Uploads (Multiple Outputs) nguồn: `{{input.1}}`…`{{input.N}}` (N = max_photos) — ảnh gốc #N trước effect, effect của target tự chạy.
- Ô Value nhận chuỗi trộn token + literal (`{{title}} by {{artists}}`).

### Populate photo target
- Target Photo Upload (Single) → POPULATE VALUES → `Populate Content` → Source = layer Multiple Uploads / Photo → Value `{{input.N}}` / `{{input}}`.
- Target `No personalization` không sinh field trên storefront; preview hiện placeholder target. Muốn target gọi `/derive` thì target phải `Create a new option` + có ít nhất 1 effect (vd `Black & White (TIB)`): SDK chỉ bắn `POST customer-uploads/{id}/derive` cho target có `retrieval_value_enabled` + `retrieval_layer` = photo source + effect.

## CONDITIONAL SETTING

- `+ Add conditions` → multiselect `Option:` (option của layer KHÁC trong template, hiện "title / layer name"; chỉ layer sinh option — Color picker không có) → theo loại nguồn:
  - Toggle / Font: `<select>` `On` / `Off` (`"true"`/`"false"`).
  - Additional Option: multiselect `is any of:` (lúc đầu `Set value to clipart to set dependency`, đợi 1-2s thành `Select options`) → chọn value.
- Section = `#step-2-personalize`; multiselect đầu là `Show/Hide`; multiselect Option là `.multiselect` có text `Select an option`; list option render `.multiselect__content-wrapper:visible li.multiselect__element` (click trong wrapper).
- Sau lưu có `Show this layer on first load` (mặc định OFF).
- JSON: `dependency:{action:"show", match_type:"all", dependencies:[{element:"layer-<id>", value:[...]}], show_by_default:false}`. Value là clipart id với AO category; là **id option inline** (vd `"L00"`) với AO dùng GO inline.
- Storefront: layer ẩn theo condition thì `#artwork-layer--layer-<id>` không có trong SVG.
