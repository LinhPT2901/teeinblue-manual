# Campaign by Shopify Products (platform product, `/platform-products`)

Import 1 Shopify product có sẵn (không tạo Shopify product mới, không có print area của PB).
ID platform product và campaign PB là 2 dãy riêng. Mở `/campaigns/<id>/edit` với id platform product ⇒ `This action is unauthorized` — dùng `/platform-products/<id>/edit`.

## Bước 1 — Tạo

1. Sidebar `Campaigns` → **`by Shopify Products`** → `/platform-products` (heading `Campaigns by Shopify products`) → `New campaign` → `/platform-products/new`.
2. `Choose a store:` — dropdown custom (không phải `<select>`): click text store đang chọn → click `linh-tib-staging | linh-tib-staging.myshopify.com`. Không cần switch instance sidebar (request trả `instance_id:58`).
3. `Select a Shopify product:` → `Choose a Shopify product` → dialog **`Select a product from store <store>`** (bảng `Product / Status / Vendor / Product type`, sort mặc định `Created at desc`; dialog không nằm trong `#modals-container`).
   - Có ô `Search..` + sort (2026-10-26/28): gõ (vd `TIB-5505`) + Enter lọc được kể cả chuỗi có `[`. Phân trang `›` (~29 trang).
   - Cột Status = **`Used`** khi product đã gắn campaign teeinblue (kể cả do campaign PB tạo); còn lại là status Shopify (`Active`/`Draft`/`Unlisted`). Chọn product chưa `Used`.
   - Product trùng/gần trùng tên ⇒ xác nhận id qua link `a[href$="/products/<shopifyId>"]` (`admin.shopify.com/store/<shop>/products/<id>`) trong cùng `tr`, rồi click `getByText('<title>', {exact:true})` (thẻ `<b>`) trong hàng đó.
4. `Internal tags (optional)`: `#internal-tags` (pressSequentially) — điền issue key.
5. ` Create` ⇒ `POST /api/platform-products` body `{instance_id, name, platform_linked_id, internal_tags}` 201, trả `id`, **`uuid`**, `published_at:null` → `/platform-products/<id>/edit`.

🔑 Tên campaign = title Shopify product, **không đổi được trong portal** (không có field name, `Edit internal info` chỉ có Internal tags, click tên ở Step 2 không mở popover, menu `...` ở list chỉ `Duplicate campaign` / `Delete campaign`). Muốn tên theo issue phải đổi title bên Shopify.

## Bước 2 — Editor `/platform-products/<id>/edit`

- Top bar: `Logs` · `Edit internal info` · `Launch` (sau publish: `Unpublish` / `View` / `Update`).
- Header: `<store> | <store>.myshopify.com` + tên product + link `https://admin.shopify.com/store/<shop>/products/<id>`.
- `STEP 1: ADD ARTWORK`: toggle `Connect artworks with Shopify variants` (mặc định OFF) + list `Artworks:` + `Select artwork`.
- `STEP 2: PREVIEW YOUR CAMPAIGN`: cần mockup riêng. Nút `Upload mockup` / `Import` / `...`.

## Bước 3 — Artwork

- Tạo mới: `Select artwork` → `Select your artwork` → ` New artwork` → `Name*` → `Save` (chưa POST) → layer → `Save & Close` (`POST /api/artworks` 201) → **click card artwork mới** để gắn (bỏ qua ⇒ artwork rời). Có thể tạo liên tiếp artwork thứ 2.
- Dialog sau Save & Close có lúc vẫn mở; card mới nhất đứng đầu (`a few seconds ago`) ⇒ `[title=<tên>]` first.
- Gắn artwork có sẵn (dùng chung được với campaign PB và campaign by Shopify khác): `.vgrid-entry-wrapper[title="<tên>"] img` ⇒ `POST /api/platform-artworks {artwork_id, platform_product_id, position}` 201, dialog tự đóng.

## Connect artworks with Shopify variants

- Toggle ON ⇒ `PUT /api/platform-products/<id>` (`enable_artwork_variant_assignment:true`).
- Mỗi artwork có nút đỏ `Select variants to connect` → dialog `.dialog-platform-variant-selector-popup` "Assign variants to: <artwork>" (checkbox variant, filter Size/Color, `Remove all connections`) → `Save` ⇒ `PUT /api/platform-artworks/<pivotId>` `{"platform_variant_ids":[...]}`; nút đổi `Connected to some variants`.
- 1 variant có thể gắn nhiều artwork (không bị disable).
- Preview Step 2: `Variant: Select to preview` → dialog `Select variant to preview` → `button.select-single-button` (`Select`) của hàng (click ô tên không chọn). Slider vẫn lật qua mọi mockup; form chỉ hiện field của artwork gắn variant.
- Để OFF nếu muốn nhiều artwork cùng hiện cho 1 variant (vd test Quick Navigation).

## Bước 4 — Mockup (bắt buộc, hết lỗi `No mockup`)

1. `Upload mockup` → dialog asset picker: upload zone (`Drag and drop, or click to upload!`, `input[type=file]` multiple) + grid ảnh có sẵn. Upload ⇒ `temporary-files/upload-url` → `POST /api/mockup-layers/by-temporary-file` 201.
2. 🔴 Hành vi tick không ổn định giữa các phiên:
   - Có lần chỉ upload mà không tự chọn ⇒ hệ thống lấy **ảnh ĐẦU TIÊN cũ của grid** làm mockup (2026-09-16).
   - Có lần card mới chưa hiện trong grid ⇒ grid tick sẵn ảnh cũ ⇒ bấm `Reload`, card mới lên đầu.
   - Có lần card mới tự tick đúng; có lần không tick gì.
   - **Luôn tự kiểm**: đúng ảnh được tick và footer `Select 1 images` trước khi bấm. Đợi hết `Generating...`.
3. Dùng ảnh thư viện có sẵn: click `img` của `.layer-listing__item` (dialog không ở `#modals-container` ⇒ `page.locator('.layer-listing__item:visible')`, **đợi item load** — đọc ngay sau 4s có thể count=0) ⇒ footer `Select 1 images`.
4. ⇒ `POST /api/platform-products/<id>/platform-mockups {"mockup_layer_ids":[..]}` 204; mockup mới lên cuối gallery (`li.campaign-gallery-thumbnail[title="#<id>"]`). Dùng lại 1 mockup-layer cho nhiều campaign ⇒ mỗi campaign có platform-mockup riêng.
5. Mockup Editor → `Add Artwork` (xem `mockup-editor.md`) → `Save & Close`.

## Bước 5 — Assign mockups cho variant

1. Khối phải Step 2: `Variants are managed by Shopify.` + `Assign mockups`.
2. Dialog `Assign mockups`: `Select variants` (multi-select, `Select all`) + `Select mockups` (checkbox; có lần không tick sẵn dù chỉ 1 mockup, có lần tick sẵn).
   - `Select all` bấm 2 lần thành `Deselect all` (toggle) ⇒ kiểm `.multiselect__tag` đủ số variant.
   - Checkbox `.mockup-assignment-grid__checkbox` không nhận `check()` ⇒ bấm link `Select all` của phần mockups (khi link variants đã thành `Deselect all` thì đó là `Select all` đầu tiên còn lại), hoặc check `#modals-container input[type=checkbox]`.
3. `Save` ⇒ `PUT /api/platform-mockups/<id> {"platform_variant_ids":[...]}`. Variant sold out vẫn assign được.
4. Khi đã có assignment, `Assign mockups` mở **`Mockup assignments`** (Group by `Mockup`/`Variant`, `Bulk assign`), mỗi mockup 1 hàng + `Edit` → `Assign variants to a mockup` (tag có `×` = `.multiselect__tag-icon`). Hàng chỉ hiện tên artwork ⇒ thứ tự = position; xác nhận id bằng `GET /api/platform-products/<id>/platform-mockups`.
   - 🔴 Bấm `Save` khi dropdown variant còn mở ⇒ chỉ đóng dropdown, không PUT. Click ra ngoài (đoạn mô tả) trước rồi `Save`.
   - Bỏ variant khỏi mọi mockup được; Group by Variant hiện `Not assigned yet.`
5. ⚠️ Bỏ qua bước này: banner vẫn "valid and ready to launch" nhưng không variant nào map mockup ⇒ storefront/preview có thể trống.

## Bước 6 — Publish

Xem `publish-sync.md` (mục Campaign by Shopify Products).

## Lưu ý storefront

- Product Shopify phải được publish vào sales channel **Online Store** (Shopify admin) thì storefront mới hiện. Dấu hiệu chưa publish: `/products/<handle>` 404, search/collection không ra, nút `View` chỉ mở trang chủ. Đây không phải lỗi portal; không tự sửa channel, báo người dùng. (Campaign 532 từng gặp, đã hết 2026-09-30.)
- Variant id ↔ title không có trong API portal ⇒ storefront `/products.json?limit=250&page=N` hoặc `/products/<handle>.js` (sau password `oe`; curl từ máy bị `local_rate_limited` ⇒ fetch trong tab browser).

## Đọc state (read-only)

- `GET staging-api/api/platform-products/<id>` (cookie): `published_at`, `artworks[].platform_variant_ids`, `artworks[].data`; `GET .../platform-products/<id>/platform-mockups`: `platform_variant_ids`. Route `/platform-artworks` theo product không tồn tại (404).
- GraphQL `platform_products_by_pk { name internal_tags platform_linked_id published_at platform_mockups{id platform_variant_ids} platform_artworks{artwork_id} }`.

## Shopify Admin (khi task cần tạo/duplicate Shopify product)

- Profile Playwright cần session Shopify Admin (người dùng login tay); `.env` không có credential Shopify.
- `products/new`: mặc định Status Active, Inventory tracked ON, Sell when out of stock OFF, publish All channels (có Online Store). Variant: `Add options like size or color` → `Create custom option` → combobox `Option name` + textbox `Option value` (ô kế `Add another value`) → `Done`. Quantity nhiều variant: save product rồi vào `/products/<id>/variants/<vid>` → button `Quantity` (nth0 = Available) → spinbutton `Quantity` → `Done` → `Save`. Product 1 variant: nhập thẳng `Shop location quantity available` trước khi save.
- **Duplicate product**: `More actions` → `Duplicate product` → dialog: textbox `Title` (prefill `<tên> (Copy)`), checkbox Media/SKUs/Barcodes/Inventory quantities/Translations (tick hết), radio `Product status` mặc định **Set as draft** ⇒ chọn `label.choice:has-text("Set as active")` → `Duplicate product` ⇒ `/products/<newId>`. Bản duplicate tự có `published_at` + `published_scope: web`, storefront `.js` 200 ngay.
  - 🔴 Duplicate copy cả **metafield** ⇒ chọn nguồn KHÔNG có namespace `teeinblue.*` (kiểm `/products/<id>/metafields.json`). Nguồn sạch đã dùng: `Bulk Stitch Shirt in Cloud - to` (8086635151676, 3 variant Blue/1,2,3, 5 ảnh; `Blue / 1` hết hàng).
- Liệt kê nhanh: `fetch('/store/linh-tib-staging/products.json?limit=250&fields=...')` trong tab admin.
- Product không thuộc campaign nào trên linh-tib-staging (merchant JSON 404, 2026-10-22): `shopify-sku`, `variants`, `addon-1`.
