# Store config, giá trị mặc định layer (Rule 14), Settings pages

## Rule 7 — Đọc store config không cần login / browser

```
GET https://staging-api.teeinblue.com/api/merchant/shopify/config?shop=<shop-domain>
```
Public, ~123 setting. Đọc riêng từng shop (vd `?shop=linh-tib-checkout.myshopify.com`).

Setting liên quan (linh-tib-staging, 2026-08-25 trừ khi ghi khác):

| Setting | Giá trị | Ý nghĩa |
|---|---|---|
| `sync_between_templates` | true | Sync value giữa template, khớp theo Option Title |
| `personalization_value_mapping` | "none" | KHÔNG phải công tắc populate values (PO xác nhận 2026-08-25) |
| `enable_clear_all_text_options` | true | Nút X (Clear all) trong field |
| `auto_select_first_template` | true | Tự chọn template đầu khi load |
| `auto_zoom_text` | false | |
| `text_max_length_warning` | (chuỗi) | |
| `template_label` | `"{{ ARTWORK_NAME }} template"` | Label template trên storefront |
| `multiple_file_types` | true (2026-10-23) | Vector Upload nhận `*/*`, PDF đi `pdf-upload` |
| `is_display_customization_edit_link` | — | = toggle `Show button for customers to edit design in cart` ở `/general-settings` |
| `gpx_upload_button_text_strava` | — | Label nút `Connect Strava` |

Đổi setting phải qua Portal → Store Settings (ảnh hưởng toàn store staging — người dùng tự đổi, hỏi trước).

## Rule 14 — Mặc định của field KHÔNG phải hằng số

- Shop có `default_value` riêng (vd `default_value: { show_in_cart: true }`) ⇒ layer mới (và global option) thừa hưởng. Giá trị UI = `config.default_value[<key>]` nếu có.
- Đã đổi qua lại nhiều lần trên linh-tib-staging (show_in_cart OFF 2026-08-26/27 → ON từ 2026-08-28; required OFF → ON từ khoảng 2026-10-21/22). **Đọc lại mỗi phiên.**
- Quy trình trước khi báo bug "sai mặc định": xem `qa-rules.md`.

### Mặc định quan sát gần nhất (instance 58, 2026-10-28 → 10-30)

| Layer | Mặc định |
|---|---|
| Text 2.0 | `customization_type normal`, **required ON**, show_in_cart ON, prefill / reposition / charge by char / attach for fulfillment / prefix-suffix / RTL OFF |
| Photo Upload | normal, editor `static`, `contain`, live preview ON, min size OFF, **required ON**, show_in_cart ON, Option Title rỗng |
| Curve / Paragraph / Word Cloud / Calendar / Clock / QR / Scrabble / Word Search / Moon / Clipart category / AO / Addon / T2I / JSON / Vector Upload | required ON, show_in_cart ON (T2I không có toggle, JSON `required:true` theo default user) |
| Addon Charge | required ON, show_in_cart ON, multiple OFF, mode `variant`, Inline Radio Button, option `Option 1/2` |
| Maps / Route / Star | không có key required |
| Static image / Static vector | `no_customization`, reposition OFF |
| Additional Option | `Create a new option`, show_in_cart ON; `Show this layer on first load` OFF |
| Global Option AO (2026-10-26) | required ON, show_in_cart ON |
| Shadow | OFF, `#000000`, X/Y 0, blur 1, display `mockup_order` |
| Photo border | OFF, `contour_cut`, `#FFFFFF`, size 10, thin line OFF, `mockup_order` |
| Multiple Uploads | Single Output, max 3, provider trống |
| T2I | fit mode contain |
| ImagenHub effect | `Use Template Default Size` OFF, `Apply color to sketch result` OFF |
| Toggle | `Show option title` ON, `Pre-enable toggle` ON |
| Warp / Spiral | Warp text case UPPERCASE; Spiral Normal |
| Global Option Addon Charge (2026-09-29) | show_in_cart ON (khác layer-local cùng thời điểm OFF) |

Instance khác:
- 237 linh-tib-checkout (2026-10-27): Addon required ON, show_in_cart ON; Text required ON, show_in_cart ON.
- 287 Boundless (2026-10-21): Text show_in_cart **OFF**, required OFF.

### Lịch sử quan sát (linh-tib-staging, để thấy mặc định đổi theo thời gian)

- 2026-08-26/27: show_in_cart OFF (config đổi về false ở phiên TIB-030), required OFF; Photo live preview ON. Bảng chi tiết trong `_archive.md`.
- 2026-08-28 → 09-09: show_in_cart ON trở lại; required OFF.
- 2026-10-05 → 10-19: show_in_cart ON cho Text/Photo/Color/Toggle/AO/Clipart/Warp/Spiral/Curve; required OFF; Photo không có key `photo_border` khi chưa bật; Clipart layer `required: false`.
- 2026-10-21: T2I/AO/Photo/Clipart/Multi/Text/JSON show_in_cart ON, required OFF; cùng ngày (TIB-5282 phần 3) Text required **ON**.
- 2026-10-22: Photo required **ON**, Text required ON; Addon Charge required ON, Charge method `variant`.
- 2026-10-26: AO/Text/JSON/Photo/T2I required ON.
- 2026-10-27 → 10-30: như bảng trên.

## Settings pages

- **`/general-settings`**: toggle `Show button for customers to edit design in cart` (`label.vue-js-switch` aria-checked). Không có field money format.
- **Product Page Settings** (`/product-page-settings`, tab `Elements & Behaviors` / `Styles & Colors`): mục `Price:` có `Show Compare at Price`, `Show "Save" badge` (+ radio `action_button_in_show_save_badge` amount/percentage, `position_of_price`), `Show custom info below price`; mục `Addon Charge:` có `Show addon price warning message`, `Show addon price on options`, **`Add addon price to product price`** ("Only work with Campaigns by Product base"). Toggle `label.vue-js-switch` (aria-checked / `toggled`).
- **Product Page Content** (`/product-page-content`): `Other:` có `“Saving amount” in Price` (= `saving`), `Custom info below price` (= `inc. Tax`); `Addon Charge:` có template `Selection will add {{PRICE}} to the price` và `+{{VALUE}}`. Không có setting "custom compare price template" (2026-10-14).
- 3rd-party Services: `emboss_provider` (`/api/user` private_config) — linh-tib-staging = `teeinblue`.

## Money / market

- linh-tib-staging: giá VND raw. Từ browser CDP storefront có thể mặc định market **Germany | EUR €** ⇒ bấm `Germany | EUR €` → `Vietnam` ⇒ `/en-vn/`, giá VND. Chuỗi `Variant sold out or unavailable` trong label variant là text ẩn của theme (kiểm `.js` available).
- linh-tib-checkout: `paymentSettings.currencyCode = EUR`, `window.teeinblueShop.shopCurrency = "EUR"`; script `teeinblue-custom-script` trong theme ghi đè `shopCurrency: "USD"`, `moneyFormat: "<span class=money>${{amount}}</span>"`; market mặc định từ VN = VND.
