# Instance Boundless (open platform) — user 117 `linh open platform`

Cách switch sang/về: `login-instance.md` (instance active lưu phía server, dùng chung account).

## Instance của user 117

`GET /api/instances`: 287 tester-4.com, 288 tester-5.com, 270 test-1, 246 localhost, **561 `linh-open-platform.myshopify.com`** (platform Boundless/picanova nhưng domain là Shopify store thật, có storefront), 274 Etsy.
- `tester-4.com` không resolve (curl 000) ⇒ 287 không có storefront thật.
- Sidebar 287: `linh open platform` / `tester-4.com`, plan `Basic - Picanova`, header `teeinblue Boundless`.

## Khác instance Shopify

- **Không có Product Base / Campaigns by Product Base.** Sidebar: `Home`, `Artworks`, `Products (Boundless)` (`/platform-products`), `Customizations` (`/platform-customizations`), `Assets`, `Store Settings`, `Extras`, `AI Assistant (MCP)`, `Organization`. "Campaign" = **Product (Boundless)**; `campaigns_aggregate` = 0.
- Route `/products` vẫn mở được: chỉ 1 PB `Unisex Heavy Cotton Tee` (Printify, imported). Không có `example product base - tshirt/mug` ⇒ không dựng campaign PB theo quy ước ⇒ hỏi người dùng.

## Tạo Boundless product

- `/platform-products/new`: 2 input `main input:visible` (nth0 = `Product name:`, nth1 = `Internal tags (optional)`: gõ + Enter) → `Create` ⇒ `POST /api/platform-products` 201 → `/platform-products/<id>/edit`.
- Product mới có `published_at` = lúc tạo, `instance_id` null, top bar hiện `Unpublish`/`Update` dù chưa Launch. Product clone thì ngược lại (`published_at` null, `instance_id` 287, nút `Launch`).

## Editor `/platform-products/<id>/edit`

- `STEP 1: ADD ARTWORK` (1 artwork, `Edit artwork` / ×): link `Select artwork` → `Select your artwork` → `New artwork` → `Artwork details` (`input[name="name"]`, W/H mặc định 1600) → editor → `Save & Close` (`POST /api/artworks` 201) → click card `[title="<tên>"]` ⇒ `POST /api/platform-artworks` 201.
- `STEP 2: PREVIEW YOUR PRODUCT`: gallery mockup (thumbnail Edit/Duplicate/×), `Upload mockup`, `Import` (popover `From Campaigns by Product base` / `From Campaigns by Platform` → modal `Import mockups from Campaigns[ by Platform]`, filter `With printarea/Without printarea` hoặc `With artwork/Without artwork`), `...`.
- Top bar: `Unpublish` / `Logs` / `...` (chỉ `Edit internal info`) / `Launch|Update`.
- **Upload mockup**: `input[type=file]` nhận nhiều file → `POST /api/mockup-layers/by-temporary-file` mỗi file; file vừa upload **tự tick hết**. Muốn 1 mockup / 1 ảnh: bỏ tick ảnh khác (click `img`) → `Select 1 images` ⇒ `POST /api/platform-products/<id>/platform-mockups` 204. Mockup scale về cạnh dài 960 (1024x768 → 960x720).
- Mockup không có layer printarea; Add Artwork xem `mockup-editor.md`.
- Main preview: click thumbnail KHÔNG đổi ảnh lớn; dùng mũi tên `›` (≈890,589).
- **Đổi tên product**: click link tên ở STEP 2 (≈1100,295) → popover textarea + ✓ (≈1307,234) ⇒ GraphQL `update_platform_products`.
- **Duplicate**: list `/platform-products`, `.la-ellipsis-h` của hàng → `Duplicate campaign` / `Unpublish campaign` / `Delete product` ⇒ `POST /api/platform-products/<id>/clone` 201, tên `<gốc> copy`, giữ internal_tags, artwork, mockup + layer artwork (mockup id mới).
- GraphQL: `platform_products(order_by:{id:desc}){ id name platform_mockups{ id position width height layers } platform_artworks{ id artwork_id } }` (filter `instance_id` trả thiếu — bỏ where).

## Storefront Boundless (instance 561)

- Platform product 279 `testtt`: `instance_id` null (store-less, served bằng uuid `665d5dc8-0c8b-4a0b-a9d9-06bc6b443a69`), published 2026-07-28. Storefront `linh-open-platform.myshopify.com/products/the-collection-snowboard-hydrogen` nhúng `staging-sdk.teeinblue.com/open/index.js` + `window.teeinblue={id:<uuid>, shop:"linh-open-platform.myshopify.com"}`, form `#teeinblue-form`.
- Artwork 2179 `Girl & Dog` là **1.0** (schema_version 1), template selector label `linh checks import Translation`, 2 template `Default template` / `Tiếng việt`. Photo layer 1.0 (`form_type photo`) không có form_label ⇒ storefront hiện **tên layer** (`photo`) làm label.
- Locale storefront 561: primary `vi` (root), `en` `/en/`, `fr` `/fr/`, `de` `/de/`; `/zh/`, `/af/`, `/lo/`, `/vi/` 404. `GET /api/instances/561/shop-locales` chỉ trả `en` (không khớp storefront). Dịch xem `dynamic-translations.md`.

## Mặc định layer (Rule 14, instance 287, 2026-10-21)

Text: show_in_cart **OFF**, required OFF, prefill/reposition/charge by char/attach for fulfillment/prefix-suffix/RTL OFF; `customization_type normal`, input text, textcase none (khác 58).
