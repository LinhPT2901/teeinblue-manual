# Storefront SDK, merchant API, cart/checkout

Không phải portal — rule khi test SDK trên storefront staging.

**Chạy case storefront bằng `scripts/tib/` (runner + helper, xem `scripts/tib/README.md`)** — các selector/bẫy dưới đây đã nằm trong helper; sửa helper khi UI đổi.

## Thông tin chung

| Mục | Giá trị |
|---|---|
| Storefront v1 | `https://linh-tib-staging.myshopify.com` (password `oe`) |
| Storefront v2 | `https://linh-tib-checkout.myshopify.com` (password `oe`) |
| SDK bundle | `staging-sdk.teeinblue.com/shopify/app-v1.js`; v2: `app-v2.js` + `async.js?v=2`; open platform: `staging-sdk.teeinblue.com/open/index.js` |
| Product test paragraph | `/products/refactor-paragraph` — campaign 2491 / artwork #3642, 4 layer paragraph (v1 variant 53977389662524, v2 variant 50234099892464) |
| localStorage | `teeinblue-customizations` (array `{productId, customization, timestamp}`), `teeinblue-global-options`, `teeinblue-text-to-image-gen-state`, `teeinblue_signed_thumbmark` |
| Lưu customization (ATC) | `POST https://staging-api.teeinblue.com/api/merchant/shopify/customization?shop=<shop>&id=<productId>` |
| Đọc customization | `GET .../api/merchant/shopify/customization/<uuid>?shop=<shop>` (public, có `layer-<id>-data`) |
| Config campaign công khai | `GET https://staging-api.teeinblue.com/api/merchant/campaigns/<shopifyProductId>.json?shop=<shop>` (thiếu `shop` → 422; product không thuộc campaign → 404). Chứa full layer JSON (`artworks[0].data[0].layers`), `campaign_artworks[].printarea_id`, `options[].addons[]` |
| Shopify product id | storefront `/products/<handle>.js` (`id`) |
| API helper | `await window.teeinblue.getCurrentCustomization()` |

- Storefront SDK đọc live API ⇒ form + preview có thể đã hiện artwork mới dù sync fail.
- Preview mockup là ảnh; SVG thật ở `.tee-mockup-artwork__wrapper svg` (715px, bị che) ⇒ lấy `outerHTML` ra file html riêng rồi screenshot. Đếm dòng paragraph = số `tspan` trong `#artwork-layer--layer-<id>`.
- SDK **khôi phục giá trị field cũ từ localStorage** khi mở lại product ⇒ gõ bị nối (`Owner AOwner A`). Cmd+A/Delete trước khi gõ, hoặc xoá localStorage.
- Nút ATC của SDK: `button.tee-btn.tee-btn--atc` / `#teeAtcButton` (nút native bị ẩn).
- Design PNG trên CDN (`cdn.ownego.com/.../designs/*.png`) trả 403 (signed URL) ⇒ verify qua payload merchant API.
- Add to cart tạo cart item thật → chỉ bấm khi case cần.

## Paragraph — Rule 1 → 6

**Rule 1 — 2 key mỗi paragraph layer:**
```
layer-XXXXXX        = raw value (textarea.value, chỉ hard \n user gõ Enter)
layer-XXXXXX-data   = { lines: "<text SAU khi wrap>", font_size: <số sau auto-shrink> }
```
Không assert `layer-XXXXXX === layer-XXXXXX-data.lines`.

**Rule 2 — wrap engine:** soft break = đúng 1 space thay bằng `\n`; hard `\n` giữ nguyên; không cắt giữa từ (từ dài tràn dòng riêng, `font_size` shrink — vd `Supercalifragilistic...` cfg 100 → 35); không collapse whitespace. Dùng checker `scripts/tib-check-paragraph-parity.js` (`checkParity(value, lines)` / `auditCustomizations()`), đừng `replace(/\s+/g,' ')`.

**Rule 3 — ai dùng gì:**

| Nơi | Nguồn |
|---|---|
| Live preview SVG (`.tee-artworks-wrapper text`, gộp `tspan` bằng `\n`) | `lines` (+ prefix/suffix) |
| File design/print (`_tib_design_link_1`) | `lines` + `font_size` |
| Cart line-item property | raw value |
| Open API `GET /openapi/v1/customizations/{uuid}` | raw value, key theo LABEL, không expose `lines`/`font_size` |

**Rule 4 — merchant API không recompute `lines`:** POST body = response = GET. `lines` sai từ SDK được lưu thật và dùng in ⇒ mismatch raw vs `lines` là bug dữ liệu đơn hàng.

**Rule 5 — field chưa động vào** chỉ có `layer-XXXX-data`, không có `layer-XXXX` ⇒ `value === undefined` vs `lines === ""`; handle riêng.

**Rule 6 — 3 đường value programmatic (nghi phạm parity):**

| Đường | Cơ chế | Ghi chú |
|---|---|---|
| Populate values | option trong Artwork settings của layer (vd Song lyrics) | Bundle `mapperSchemas` → `applyMapperForSources`; `handleFontLoaded` return sớm khi `mapperSchemas` rỗng |
| Duplicate & Link options | 2+ layer dùng chung value, geometry riêng | `lines` khác nhau hợp lệ ⇒ `checkParity()` từng layer |
| Sync giữa template | store config `sync_between_templates`, khớp theo Option Title | giữa template trong cùng campaign |
`clearAll()` sai vì set value không schedule recompute (TC-TIB-714). Chi tiết case: `docs/qa-checklist-paragraph.md` P8/P9/P10. `{{lyrics}}` là case nặng nhất.

**Rule 9 — Template & sync (verify 2026-08-25):** sync mang **raw value**; `lines`/`font_size` **tính lại** theo layer đích (nguồn Hourglass Of Shine cfg 120 → 6 dòng/fs 109; đích Roboto 22 → 2 dòng/fs 22). localStorage chỉ giữ layer của template ĐANG chọn — đổi template xoá key `layer-*` template cũ, đổi lại thì khôi phục (đúng, không phải mất data).

Cạm bẫy test SDK:
- Debounce 10ms: `input` rồi `blur` cùng tick ⇒ `lines` giữ giá trị cũ. Happy path chờ ≥50ms sau khi gõ. Trước khi gọi là bug: `qa-rules.md` (Rule 13).
- State bẩn: `localStorage.removeItem('teeinblue-customizations')` (+ `teeinblue-global-options`) + reload trước mỗi case.
- Font cache: 4 font campaign đã cache ⇒ không tái hiện "submit trước font_loaded" nếu không throttle.

## Rule 11 — SDK v1 vs v2

Hợp đồng dữ liệu giữ nguyên (cùng key, cấu trúc, quy tắc wrap; checker chạy nguyên xi; server không recompute). Khác ở UI/theme:

| Điểm | v1 (linh-tib-staging) | v2 (linh-tib-checkout) |
|---|---|---|
| Nút ATC | `#teeAtcButton` | nút THEME `button.product-form__submit` / `#ProductSubmitButton-...` |
| Endpoint cart | `/cart/add.js` (JSON) | `/cart/add` (FormData) |
| Clear all (X) | có | không (`enable_clear_all_text_options` tắt) |
| Auto chọn template | có | không — chọn tay mới render field |

Bug TC-TIB-714 còn trên v2 (debounce race); safety net `validate() → paragraph_flush → flushPendingCalculation()` chạy cả khi validation fail.

## Rule 12 — Cache SDK: bust trước mỗi lần re-test

Bundle `cache-control: max-age=315360000`. URL script có `?token=...&shop=...`, token khác giữa store ⇒ tự ghép URL = cache key khác (fetch bản mới trong khi trang chạy bản cũ).
```js
const url = [...document.querySelectorAll('script[src]')].find(s=>/app-v1\.js/.test(s.src)).src;
await fetch(url).then(r=>r.text()).then(t=>t.length);                    // bản trang đang chạy
await fetch(url,{cache:'no-store'}).then(r=>r.text()).then(t=>t.length); // bản server
await fetch(url, {cache:'reload'}); location.reload();                    // nếu lệch
await fetch(url).then(r=>r.text()).then(t=>/<marker fix>/.test(t));      // verify
```
So số ký tự bundle (vd 2026-08-26: cũ 1.578.781, mới 1.584.530). Ghi vào test case: bundle size + Last-Modified + đã bust hay chưa.

## Rule 15 — Route `merchant/*` của SDK v1 (2026-08-26)

Hai wrapper fetch:
- `Ll(url, init)`: thêm `X-Thumbmark-ID`, bắt 429, đọc `X-RateLimit-*`. Route: `photo-upload`, `customer-uploads/{id}/apply-effects`, `customer-uploads/{id}/image-filter-effects/async`, `customer-uploads/generate` (T2I), `customer-uploads/generate-from-multiple-images`.
- `wi(url, init)` (sau này thấy tên `Ci`): fetch trần. Route: `vector-upload`, `pdf-upload`, `gpx-upload`, `upload-url` (presigned), `strava-upload`, `customer-uploads/{id}/image-filter-effects/status`, `merchant/gpx/parse`, `merchant/gpx/convert-geojson`, `merchant/games/...`, `merchant/campaigns/{platformProductId}.json`, `customization` (ATC).

Segment platform không đồng nhất: có `shopify` — `thumbmark`, upload routes, `customer-uploads/*`, `customization`; không có — `merchant/games/{type}/{base64}.json`, `merchant/gpx/*`, `merchant/campaigns/{id}.json`, `merchant/maps/tiles`, `merchant/maps/places`, `merchant/songs-search`.

`merchant/games/{type}`: `word-search`, `crossword` (Scrabble ▸ Cross Word), `single_line` (gạch dưới), `word-cloud`; sub-endpoint `/image_effect`, `/photo-border`, `/elevation-profile`. Format `GET /api/merchant/games/{type}/{base64url-json-config}.json` — URL tự chứa input, không cần session; storefront phục vụ như ảnh cache lâu (Regenerate trúng cache browser).

Thumbmark: `GET /api/merchant/shopify/thumbmark` (không auth, không `shop`) → `{"thumbmark": "<32>.<64 hex>"}` (97 ký tự, có dấu chấm), header `X-RateLimit-Limit: 30`. Fallback client = 32 ký tự không dấu chấm, 8 hex lặp 4 lần (`fallbackBrowserFingerprint()`, entropy 32 bit) ⇒ thấy dạng này là đang fallback. Cache `localStorage['teeinblue_signed_thumbmark']`, fetch LAZY (chỉ khi có route `Ll`; trang load / upload presigned không gọi). Test: xoá key rồi bấm Generate. Đã thấy 1 lần Generate bắn 2 GET (08-26) và 1 GET (08-28); reload có cache ⇒ 0 GET; dùng chung giữa tab. Endpoint thumbmark có rate limit riêng (~6-30, `Too Many Attempts.`, có lúc trả HTML).

## Upload & request map (linh-tib-staging)

| Action | Requests |
|---|---|
| Photo upload (2026-08-28 → 10-09) | `POST upload-url` 200 → `PUT` storage (`s3.us-east-1.wasabisys.com/teeinblue-cdn-staging/wa/customers/uploads/<file>`) 200 → `POST customer-uploads/{id}/uploaded-at` 204; không thumbmark. Nhánh `photo-upload` chỉ khi `useDirectUpload` = false |
| Photo upload (2026-10-23) | `upload-staging.teeinblue.com/v1/shopify/uploads?field_id=&campaign_id=` 201 (~67s); photo có GenAI effect đi `.../v1/shopify/genai-uploads` (fail) → fallback `upload-error-logs` + `upload-url` → `image-filter-effects/async` 202 → poll `status`. Multi upload cũng có lúc fail ~36s rồi fallback presigned |
| Vector upload | `POST vector-upload` 201 + CDN GET; rate limit 4/phút (lần 5 → 429, widget không vỡ, hiện "Cannot upload. Contact us for more information.: HTTP error!") |
| PDF vào Vector Upload | `POST pdf-upload` 201 (`multiple_file_types`=true) |
| GPX | `POST gpx-upload` 200 → dialog `Select & continue` → `gpx/parse` 200 (có shop parse inline) |
| AI Generate | `POST customer-uploads/generate` 202 → poll `image-filter-effects/status`; có thumbmark |
| Populate `{{input}}` + effect | `customer-uploads/<id>/derive` 202 |
| ATC (v1, campaign PB) | `POST customization?shop=&id=<shopifyProductId>` 201 body `{data:{<artworkId>:<templateId>, layer-<id>:<value>, artwork-<id>:<versionId>, platform_linked_id:<variantId>}, platform_variant_id}` → `/cart/add.js` → `PUT customization/<uuid>/cart-token` 204 `{cart_token}` → `GET /cart.js`. Không thumbmark; `x-ratelimit-limit: 4` |

- Photo Upload: file < 10 KB bị chặn client (`photo is too small (<10kb)`), không request. Upload bằng `setInputFiles` vào `.tee-field--layer-<id> input[type=file]`.
- Customization rate limit 4/phút ⇒ ATC 4 item rồi chờ ~60s. Cùng variant + giá trị khác ⇒ mỗi ATC 1 line riêng.
- Cart khi `show_in_cart` OFF: line chỉ có `_customization_id`, `customization_id`, `_customization_image`, `_customization_edit_link`, `_tib_design_link_1`, `_tib_fulfilled_sku`.
- Addon Charge: localStorage lưu **id option** (`layer-<id>: "id-110897"`), không phải label; đọc label qua `#layer-<layerId>-<optionId>` hoặc cart. Radio nằm ngoài viewport ⇒ click `.tee-field--layer-<id> label:has-text("<label>")`.

## AI generate rate limit (2026-09-09)

`POST /api/merchant/shopify/customer-uploads/generate?shop=<shop>` — FormData `effects` (JSON), `field_id=layer-<id>`, `rate_limit_id=<platformProductId>`; header `X-Thumbmark-ID` signed. Thành công 202 `{"id":<n>,"status":0}`.

| Lớp | Ngưỡng | 429 message |
|---|---|---|
| Per-layer | 3 / layer (`field_id`) | `Upload limit exceeded for this field. You can upload 3 images per hour for this form field. Try again in mm:ss` (reset thực tế ~300s — label "per hour" không khớp) |
| Per-IP | 10 / network / ~10 phút (bỏ qua thumbmark) | `Too many upload requests from this network. Try again in mm:ss` |
| Per-thumbmark | không tồn tại | — |
Đổi thumbmark khi per-IP cạn vẫn 429. Không có `Retry-After`, chỉ `X-RateLimit-Limit/Remaining/Reset`.
Cách đo: bấm Generate 1 lần qua UI, wrap `window.fetch` để capture; SDK giữ reference fetch gốc ⇒ đếm bằng network log; replay bằng `window.__origFetch`; cần nhiều AI layer (campaign 2566 có 5: field_id 836548, 604524, 725075, 217763, 148189).

## Global Option trên storefront

- `teeinblue-global-options`: `{ "<goId>": { "value": {…}, "extra": {}, "timestamp": … } }`. `teeinblue-customizations` có key `global-option-<id>` (bản sao đầy đủ) song song `layer-<id>`.
- Giá trị GO tồn tại xuyên sản phẩm ⇒ test lặp xoá cả 2 key.
- Nhiều layer cùng GO chia chung 1 entry ⇒ lên cart 1 lần.
- 🔴 Defect mở (verify 2026-08-28 chưa fix): merge `gk()` whitelist `N.SONG_SEARCH` = `["form_label","form_placeholder","input_hint","lyric_enabled","custom_class"]` thiếu `cart_template` và `show_in_cart` ⇒ cart template của GO bị bỏ qua (TC-TIB-GO-03). Nhánh GO và nhánh layer thường đi code path khác — bộ case riêng TC-TIB-GO-01 → GO-04.

## Template selector trên storefront

Là `.tee-field` đầu tiên (`select`, label = label template); ban đầu `Choose an option` nhưng form hiện layer template đầu; đổi template ⇒ field đổi ngay. SDK nhớ template qua localStorage (sang locale khác vẫn giữ).

## Edit customization

- `PUT merchant/customizations/<uuid>?shop=` chỉ phát từ customize page `https://staging-sdk.teeinblue.com/customize/?customization-id=&product-id=<shopifyProductId>&shop=` (nút `Update cart`), body `{data:{...}, platform_product_id:<id>}`, 200, ratelimit 4.
- Customize page chỉ hỗ trợ campaign by Shopify Products; campaign PB hiện `Your design does not support edit for now, contact shop owner`. Edit link trong cart campaign PB = product page `?customization-id=` → GET customization → ATC tạo customization MỚI.

## Checkout & order (linh-tib-staging)

- COD (2026-10-13): `/checkout` → `#email`, `input[name=lastName][placeholder="Last name"]`, `#shipping-address1` (Esc đóng autocomplete), Postal code, City → `#basic-paymentOnDelivery` (force) → `Complete order` → `/thank-you`. Order ở `/orders` (`#ins58-xxxx`, `/orders/<id>`).
- Bogus credit card (market en-de, EUR): điền contact/address bằng role textbox (`Address` combobox → Esc), đợi Payment render (~5-8s); Payment **re-render sau khi nhập address** ⇒ nhập thẻ SAU khi shipping method hiện, lấy lại ref. Card: `browser_type` slowly vào textbox trong iframe (`Card number` "1", `Expiration date (MM / YY)` "1230", `Security code`); qua CDP dùng `page.locator('iframe[name^="card-fields-<n>"]').click()` + `keyboard.type` (`frameLocator(...).fill` dồn chữ vào Card number). Expiry hay nhập lẫn ⇒ đọc lại `12 / 30` trước `Pay now`; xoá bằng End + Backspace.
- Portal order detail: mỗi item `Item ID: #-<id> <Status>` + `Latest log: ...`; `Item Activity logs` (nth theo item) mở modal `Line item #<id> (order )`, log mới trước. Item về Ready sau ~15s → ~3 phút.
