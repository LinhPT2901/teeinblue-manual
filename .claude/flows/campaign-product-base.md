# Campaign by Product Base (`/campaigns`)

## Luồng chuẩn (người dùng chốt 2026-08-23)

```
1. Create campaign          →  /campaigns/new  (title = title issue)
2. Thêm product base        →  dialog "Select your product"
3. Thêm artwork mới vào print area  (artwork name = title issue)
4. Publish campaign         →  Launch → store linh-tib-staging.myshopify.com   (xem publish-sync.md)
```

- Đi đủ 4 bước đúng thứ tự. Artwork **tạo từ trong print area của campaign**, không tạo rời ở `Artworks` rồi gắn.
- Bước nào fail thì dừng, ghi ledger trạng thái dở dang, không nhảy cóc.

## Quy ước data của đội (2026-08-23)

- Mỗi issue → **1 campaign + 1 artwork**, cả hai tên **= title issue** (nguyên văn). Issue key vào `Internal tags` của campaign.
- Product base chỉ dùng: **`example product base - tshirt`** (id **3139**, print area `Front`/`Back` 1400x1400) hoặc **`example product base - mug`** (id **3140**). Cả hai ở instance `Enterprise (Test)`, vendor `automation`.
- Publish → mặc định store `linh-tib-staging.myshopify.com`, trừ khi yêu cầu nói store khác (vd `linh-tib-checkout` cho Checkout page).
- Cần PB riêng → xem `product-base.md`.

## Trang list `/campaigns`

- Tiêu đề `Campaigns by Product Bases`, nút `Bulk creator` (`/campaigns/bulk-editor`) và `New campaign` (`/campaigns/new`).
- Tab: `All` / `Published` / `Unpublished` / `Archived` / `Update required`.
- Bộ lọc: `Search`, `Internal Tags`, `Type`, `Vendor`, `Tags`, `Published on store`.
- Param `sort`/`sort_type` trên URL không có tác dụng (FE không đọc).
- Search `name=<keyword>` đôi khi render bảng rỗng ngay sau load; thử keyword khác trong title.
- Menu `...` của hàng (`i.la-ellipsis-h` → popup `.v-popper__popper`): `View campaign logs` / `Duplicate campaign` / `Mark as archive` / `Import to Translation` / `Delete campaign`.

## Bước 1 — Tạo campaign rỗng

1. Navigate `https://staging-portal.teeinblue.com/campaigns/new`.
2. Form **Basic information**: textbox `Campaign title` (bắt buộc), `Internal tags (optional)`.
3. Click `Save` (accessible name có icon ở đầu: `" Save"`).
4. Redirect **`/campaigns/<id>/edit`**, toast `Success — Your campaign has been created`. **ID lấy từ URL.**

Internal tags (XSS, TIB-5278 2026-08-28): field không chặn `< >`, lưu RAW. Cell list `.vgrid-column-data--internal_tags` render qua v-dompurify ⇒ tạo `<img src="x">` thật nhưng strip `onerror` (TC-TIB-118); tooltip FloatingVue khi hover ⇒ escaped text (TC-TIB-128). Filter `internal_tags=` vẫn chạy.

Internal tags nhận nhiều tag ngăn bằng dấu phẩy (không phải chip): `TIB-4889,TIB-011` → filter `Internal Tags` tìm được từng tag (`/campaigns?...&internal_tags=TIB-4889`). Sửa tag campaign có sẵn: header `...` → `Edit internal info` → `Internal tags (optional)` → `Save`.

## Bước 2 — Trang editor `/campaigns/<id>/edit`

- Top bar: `Listing info`, `Logs`, `Launch` (sau publish: `View` + `Update`).
- `STEP 1: ADD PRODUCTS & ARTWORKS` → `Available Products:` + button `Add more product`.
- `STEP 2: PREVIEW YOUR CAMPAIGN`.
- Banner dưới cùng khi chưa đủ: `Your campaign is NOT ready to launch because of some unresolved issues.` + `View details`.
- Mở `/campaigns/<id>/edit` với id của campaign **by Shopify Products** → trang trắng + toast `This action is unauthorized.` URL đúng là `/platform-products/<id>/edit`.

## Bước 3 — Thêm product base

1. `Add more product` → dialog `Select your product`.
2. Search (`[role=dialog] input[placeholder*=Search]`):
   - Search theo **TITLE**, không theo internal name (gõ internal name → `No data matched`).
   - Gõ nguyên `example product base - tshirt` có lúc ra `No data matched` ⇒ gõ `example`. Có phiên phải **Enter** mới lọc. Kết quả có thể chưa lọc kịp.
   - Chọn card chắc nhất bằng ảnh mockup: `.vgrid-entry-wrapper:has(img[src*="/products/3139/"])`. Card có `title="<product title>"` ⇒ `[role=dialog] [title="<title>"]` cũng dùng được khi title không trùng (catalog có nhiều card trùng title như `Unisex  Hoodie`, `Men Basic T-shirt`).
3. Click card → dialog đóng, URL thành `/campaigns/<id>/edit?product-id=<pbId>`.
4. `STEP 1` hiện `Print Areas of <tên PB>`: button `Select artwork for all` + từng print area `Front (1400x1400)` / `Back (1400x1400)` + `Select artwork`.
5. **Check console + network sau bước này** (blocker bên dưới).

Add PB tự copy toàn bộ mockup của PB thành campaign_mockups (GraphQL `insert_campaign_products` nested `campaign_mockups.data[].layers` + `POST /api/campaign-mockups/generate` + `POST /api/campaign-products/<cp>/campaign-mockups/sync`). PB 3139 cho 5 mockup.

### 🔴 Blocker `preview_thumbnail` — tái phát 2026-10-23, có thể đã hết, kiểm lại

- Triệu chứng: click card → GraphQL `insert campaign_products` (kèm `campaign_mockups.data[].preview_thumbnail`) trả 200 nhưng body `errors: validation-failed ... field 'preview_thumbnail' not found in type: 'campaign_mockups_insert_input'` + `PAGEERROR` console. UI đóng dialog im lặng; reload thì `Available Products` rỗng.
- Lịch sử: gặp 2026-08-23, hết 2026-08-25, **tái phát 2026-10-23** (campaign 3185, bundle `assets/index.xYTv-L4c.js` / `vendor.DkKJvYwp.js`; 2026-10-22 còn chạy ⇒ regression deploy). 2026-10-26 và 2026-10-28/29 add PB 3139 lại chạy bình thường.
- Gặp lỗi: dừng, không retry, báo người dùng. Reload/bust cache không cứu (lỗi phía server). Bulk creator không phải workaround (xem dưới). Khi PB được gắn qua MCP thì editor portal vẫn dùng bình thường cho các bước sau.

## Đổi tên campaign

- Dialog `Listing info` **không** chứa title.
- Inline editor: STEP 2, click link tên campaign → `<textarea>` + nút `Save` (`role=button[name="Save"]`, chỉ 1 khi inline mở) / link `Cancel`. Lưu qua GraphQL (verify `campaigns_by_pk{name}` hoặc `/campaigns?limit=20&name=<keyword>`).
- Handle Shopify sinh lại theo title mới khi Launch.
- Title > 140 ký tự → banner `ready to launch with some warnings` (chỉ cảnh báo Etsy truncate), Launch Shopify vẫn chạy.

## Campaign info (2026-10-26)

- `Listing info` → dialog **`Edit campaign info`** (tab Shopify/Etsy): `input[name=product-type]` (mặc định **`Customizer`**), `input[name=vendor]` (rỗng), `input[name=product-tags]` (text, `t1,t2` lưu nguyên chuỗi), Product Thumbnail. Save = GraphQL `update_campaigns`. Icon ⚠ trên nút khi chưa có thumbnail. Không có field handle.
- **Label available product**: link `AVAILABLE PRODUCT` ở STEP 2 (`.campaign-option-title .vinput-value a`) → popup input placeholder `Available Product` → ✓ `button.vinput-btn-primary`. DB mặc định `null`, UI uppercase bằng CSS.
- **Product display type**: icon ⚙ cạnh label (`button:has(.la-cog)`) → dialog `Display available product on store`: radio `product_display_type-radio` (mặc định) / `-dropdown` + Save.
- Đọc lại: `GET https://staging-api.teeinblue.com/api/campaigns/<id>` (cookie + X-XSRF-TOKEN) trả name/label_available_product/product_display_type/product_tags… (không có vendor/product_type/internal_tags/uuid — xem GraphQL `campaigns_by_pk`; campaign PB không lộ `uuid`).

## Gắn artwork vào print area

Tạo artwork mới (chi tiết dialog/editor: `artwork-editor.md`):
1. Click `Select artwork` của print area → dialog **`Select your artwork`**, có nút ` New artwork`.
2. ` New artwork` → artwork editor + dialog `Artwork details` → điền `Name*` → `Save`.
3. Thêm layer → `Save & Close` (lúc này mới `POST /api/artworks` 201).
4. ⚠️ **`Save & Close` chỉ TẠO artwork, không tự gắn.** Phải click card artwork trong dialog `Select your artwork`.
   - Có phiên dialog quay lại, có phiên đóng luôn (kể cả artwork đầu/thứ hai). **Luôn kiểm print area đã đổi từ `Select artwork` sang tên artwork chưa.** Nếu dialog đã đóng: bấm lại `Select artwork` của print area rồi click card.
   - Selector card (thay đổi theo phiên, thử lần lượt): `[role=dialog] [title="<tên>"]`, `.vgrid-entry-wrapper[title="<tên>"] img`, `[role=dialog] img[alt="<tên>"]` / `img[alt^="<tên>"]`, `.dialog-artwork-selector .vgrid-field` đầu tiên (= artwork mới nhất). `.vgrid-entry-wrapper:has([title=..])` KHÔNG khớp (chính wrapper mang title).
   - Request gắn: `POST /api/campaign-artworks` 201 hoặc `POST /api/campaign-artworks/batch-apply-to-printareas`. Bản batch có lúc gắn **cả Front lẫn Back** dù mở từ Front — kiểm lại.
   - UI print area có thể cập nhật chậm (sau reload); verify bằng GraphQL/screenshot.
5. Sau khi gắn: print area hiện thumbnail + tên + ` Edit artwork` / ` Locate artwork`.

Chọn đúng nút print area:
- `.cas-no-artwork` là `<div>` bọc ngoài; click nó KHÔNG mở dialog. Click `button` bên trong.
- `main .cas-no-artwork` nth=0 = `Select artwork for all`; nth=1 = Front; nth=2 = Back ⇒ `main .cas-no-artwork >> nth=1 >> button`. Hoặc `getByRole('button',{name:' Select artwork'}).nth(1)` cho Front.
- Click nhầm nth=0 ⇒ artwork gán cho CẢ Front lẫn Back.
- Đừng tìm print area bằng text cha (có thể không chứa `Front (`) — index -1 ⇒ `nth(-1)` = Back (đã dính).
- Selector theo khối: `.product-pa:has-text("Front (1400x1400)") ...`.

Gắn 1 artwork cho cả Front + Back: sau khi gắn Front, bấm `Select artwork` của Back → click cùng card. Verify qua merchant JSON `campaign_artworks[].printarea_id` có 13865 (Front) + 13866 (Back) của PB 3139.

Gỡ / đổi artwork của print area:
- Hover khối artwork → `.cas-remove` (title `Remove`, icon ×; selector `.product-pa:has-text("Front (1400x1400)") .cas-remove button`) → dialog **`Remove artwork`** → `Remove` ⇒ `DELETE /api/campaign-artworks/<id>` 204 (soft delete; GraphQL `campaign_artwork_printareas` vẫn trả bản ghi có `deleted_at` ⇒ lọc `where:{deleted_at:{_is_null:true}}`).
- Rồi `Select artwork` → click card artwork khác.

Chọn artwork có sẵn: click `img` của card ⇒ `POST /api/campaign-artworks` 201.

Lấy artwork id không cần mở editor: khối `PERSONALIZATION FORM` render `<select id="<artworkId>-template">` cho từng artwork gắn:
```js
[...document.querySelectorAll('[id$="-template"]')].map(e=>e.id)
// -> ["tee-field--3754-template","3754-template", ...]
```
Hoặc URL editor `?product-id=<pbId>&artwork-id=<artworkId>`.

Mở artwork editor trực tiếp: URL `/campaigns/<id>/edit?product-id=<pbId>&artwork-id=<artworkId>`.

## Locate artwork / auto-fit

- Gắn artwork vào print area tự fit **contain + căn giữa**, làm tròn: 4460x6823 → 915x1400 @0/243; 3000x1999 → 1400x933 @234/0; 5000x10 → 1400x3 @699/0; 6823x4460 → 1400x915 @243/0; 3001x3001 → 1400x1400; **997x1399 → 998x1400 @0/201 (artwork nhỏ hơn printarea vẫn bị phóng lên)**.
- Nút Locate: `.product-pa:has-text("Front (1400x1400)") button[title="Adjust artwork's position in printarea"]` (click text `Locate artwork` không mở). Input: `#artwork-width`, `#artwork-height`, `#artwork-rotate`, `#artwork-top`, `#artwork-left`; nút `Save` / `Cancel` / `Reset all`.

## Artwork theo variant

- Campaign by PB **không** gán artwork theo variant: artwork gắn theo printarea; `Assign mockups` chỉ map mockup ↔ variant.
- Muốn artwork khác nhau theo variant: PB bật `Custom variant's printarea` (vd mug 3140: 11oz→printarea 11oz, 15oz→15oz). Toggle `Connect artworks with Shopify variants` chỉ có ở campaign by Shopify Products.
- Storefront campaign PB có artwork Front + Back: form hiện field cả 2 theo thứ tự Front rồi Back.

## Mockup trong campaign

- Bỏ bớt mockup: thumbnail `li.campaign-gallery-thumbnail[title="#<campaignMockupId>"]` → hover → `button:has(i.la-close)` → dialog `Remove a mockup with printarea?` (`getByRole('button',{name:'Remove anyway'})`) HOẶC `Confirm / Are you sure to remove ?` (`Remove`) ⇒ `DELETE /api/campaign-products/<cp>/campaign-mockups` body `{"ids":[..]}` 204. Không đụng mockup gốc của PB. `button:visible` filter hasText không khớp ⇒ dùng getByRole.
- Sửa mockup trong campaign: nút Edit thumbnail `main button:has(span.sr-only:text-is("Edit"))` nth(k) → Mockup Editor (`Your printareas`, toggle `Preview artwork` ON mặc định) → `Save & Close` ⇒ `PUT /api/campaign-products/<cp>/campaign-mockups/<id>` 200.
- 🔴 PB 3139: mockup 7966 và 7967 có layer printarea `Front` thiếu `visible:true` (eye OFF) ⇒ preview báo `No printarea found. Edit this mockup and add printarea to view changes.` Sửa: Mockup Editor → click ô eye (x≈16) hàng `Front (1400x1400)` → `Save & Close`. Mockup 7748 chỉ có printarea `Back`. Mockup Front visible: 7749 (pos0, model nữ, vuông), 8154 (pos4, model nam, printarea tròn).
- Mockup đầu tiên của PB 3139 có print area tròn trên preview storefront ⇒ phần mép artwork 1600 có thể bị viền tròn che (chỉ là preview mockup).
- Lật preview: `.tee-slider__button--next`.
- **Mockup assignment của campaign PB lưu ở `campaign_mockups.variant_ids`**, không đụng `mockups.variant_ids` của PB. Dialog `Mockup assignments` hàng theo position, chỉ hiện tên printarea (không id) ⇒ đối chiếu GraphQL `campaign_mockups(order_by:{position:asc})`. Gỡ variant: `.multiselect__tag-icon` (×); Save phải bấm **2 lần** (lần 1 chỉ đóng dropdown).
- Storefront đổi variant: ảnh chính gallery đổi theo campaign_mockup gán variant.

## Giới hạn 250 variants (2026-10-12)

- Add PB KHÔNG chặn khi tổng variant > 250 (3 PB 11+181+152 = 344 lưu được).
- Chặn ở LAUNCH: `View details` → dialog `Campaign errors` mục **`Over 250 variants:`** `Campaign cannot have more than 250 variants. Disable some variants to launch your campaign.` UI không hiện con số — đếm bằng GraphQL `campaign_products{ campaign_variants_aggregate{aggregate{count}} }`.

## Duplicate / archive campaign

- **Duplicate**: `...` → `Duplicate campaign` ⇒ `POST /api/campaigns/<id>/clone` 200, không dialog/toast. Bản copy `<tên> copy`, giữ Internal tags, PB, mockup (campaign_mockups mới), **DÙNG CHUNG artwork gốc**, chưa publish.
- Muốn artwork riêng cho bản clone: `/artworks` duplicate artwork (`artwork-editor.md`) → trong campaign clone `×` ở print area → `Remove` (chỉ xoá campaign_artwork của bản clone) → `Select artwork` → click `img[alt="<tên> copy"]` → đổi tên artwork.
- Rename bản clone qua inline title rồi Launch ⇒ handle theo title mới.
- **Archive**: `...` → `Mark as archive` chạy ngay (không confirm), `campaigns.status` 0→1, sang tab `Archived`.

## Bulk creator (`/campaigns/bulk-editor`) — không dùng làm workaround

Trang `Bulk create campaigns`: chọn store, mỗi hàng = 1 campaign: picker `Artwork`, combobox `Choose 1-5 products`, `Campaign name`, `Tags (separated by comma)`, `Product type`, `Vendor`, nút `Create & Publish`. Không dùng được vì: bắt buộc artwork có sẵn (không mở editor), luôn publish, "The selected artwork will be applied to all printareas of all added product bases".

## Khác

- `Generate test design` ở campaign editor **disabled**, tooltip `Not available for Development stores` (linh-tib-staging là dev store). Artwork editor không có Test design. Lấy design qua order.
- Đọc nhanh state (read-only) bằng GraphQL trong page: `campaigns_by_pk(id){ campaign_products{ id campaign_mockups{ id mockup_id } } campaign_artwork_printareas{ id artwork_id printarea_id } campaign_instances{ instance_id status platform_linked_id } }`. `campaign_instances` không có platform product id ⇒ lấy Shopify product id qua storefront `/products/<handle>.js`.
- Description PB render ở khối `DESCRIPTION` của STEP 2 ngay cả khi chưa publish.
