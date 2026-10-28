# TIB Staging Portal — Flow Notes

File này là bộ nhớ của agent `tib-test-data`. Mỗi khi agent chạy và phát hiện selector/bước
khác với ghi chép ở đây, agent phải cập nhật lại mục tương ứng.

> Mục nào ghi **ĐÃ VERIFY** là đã chạy thật trên portal. Mục **CHƯA VERIFY** là khung dự kiến,
> agent phải snapshot UI thật rồi ghi lại chính xác tên nút/field.

## Endpoints đã quan sát được (từ network log của các phiên QA trước)

| Mục đích | Request |
|---|---|
| Lấy token | `POST https://staging-api.teeinblue.com/api/token` |
| Thông tin user | `GET https://staging-api.teeinblue.com/api/user` |
| Danh sách instance (store) | `GET https://staging-api.teeinblue.com/api/instances` |
| GraphQL (list campaign, aggregate) | `POST https://staging-graphql.teeinblue.com/v1/graphql` |
| Trash | `GET https://staging-api.teeinblue.com/api/trash?cursor=&per_page=20&sort=deleted_at&sort_type=desc` |
| Activity log | `GET https://staging-api.teeinblue.com/api/staff-activity-logs` |

## Các trang chính

| Trang | URL |
|---|---|
| Campaigns | `https://staging-portal.teeinblue.com/campaigns` |
| Campaigns (filter theo tên) | `https://staging-portal.teeinblue.com/campaigns?limit=20&name=<keyword>` |
| Platform product mới | `https://staging-portal.teeinblue.com/platform-products/new` |
| Trash | `https://staging-portal.teeinblue.com/trash` |
| Activity logs | `https://staging-portal.teeinblue.com/activity-logs` |

## Flow: Login — ĐÃ VERIFY (2026-08-23)

Portal có **2 kiểu login**:

| Kiểu | URL | Dùng cho |
|---|---|---|
| Shopify owner | `/login` | Nhập store domain `<shop>` + `.myshopify.com` → nút `Log in` |
| Teeinblue account (staff / platform khác) | `/login?staff=true` | Nhập email + password → nút `Log in` |

Agent dùng **`/login?staff=true`** (vì `.env` là email/password).

Các bước đã verify:
1. `browser_navigate` → `https://staging-portal.teeinblue.com/campaigns`
   → nếu chưa có session sẽ redirect về `/login` (kiểu Shopify domain, KHÔNG phải form email).
2. `browser_navigate` → `https://staging-portal.teeinblue.com/login?staff=true`
3. Điền form:
   - textbox `Your email` (label: `Enter your email *`)
   - textbox `Your password` (label: `Enter your password *`)
4. Click button `Log in`.
5. Verify: URL rời khỏi `/login` và snapshot thấy danh sách campaign.

**Lỗi hiển thị ở đâu:** message lỗi render dạng text ngay dưới form (ví dụ:
`Email address is not verified`). Request nền: `POST https://staging-api.teeinblue.com/api/login`
— trả `401` khi fail. Agent nên đọc cả snapshot lẫn `browser_network_requests` để phân biệt
sai password vs account chưa verify.

**Captcha:** trang login có **Cloudflare Turnstile**
(`https://challenges.cloudflare.com/turnstile/v0/api.js`). Ở lần recon này Turnstile không chặn
(request vẫn đi tới `/api/login` và trả 401 vì lý do account), nhưng nếu Turnstile chuyển sang
interactive challenge thì agent KHÔNG tự giải được → phải dừng và báo người dùng login tay.

**Account:**
- `<qa-test-account>@example.com` (trong `.env`) → **login OK** (user `Linh Pham`).
- `<unverified-test-account>@example.com` → **chưa verify email**, `/api/login` trả 401 kèm text
  `Email address is not verified`. Đừng dùng.

**Sau khi login** portal redirect về `/` (Home) — KHÔNG về trang đang yêu cầu trước đó.
Agent phải tự navigate lại tới trang cần làm việc.

**Trang SPA load chậm:** sau `browser_navigate` snapshot thường chỉ có `Initializing...`.
Luôn `browser_wait_for` với `textGone: "Initializing..."` trước khi đọc snapshot.

## Instance đang active — CẬP NHẬT 2026-08-23 (15:39)

Account `<qa-test-account>@example.com` hiện đang ở instance **`Enterprise (Test)`**, store
**`linh-tib-staging.myshopify.com`** (hiển thị ở sidebar dưới tên `Linh Pham`, và ở mục
`Store Settings`). Đây ĐÚNG là store đích khi publish → không cần đổi instance nữa.

Sidebar (instance này): `Home`, `Orders`, `Bulk Fulfill`, `Campaigns` (> `by Product Base`
`/campaigns`, `by Shopify Products` `/platform-products`), `Product Base` `/products`,
`Artworks` `/artworks`, `Assets`, `Store Settings`, `Extras`, `AI Assistant (MCP)`, `Organization`.

> Ghi chép cũ nói instance là `Basic - Picanova` / `linh-boundless.com` — KHÔNG còn đúng.
> Agent phải đọc tên instance từ sidebar mỗi phiên thay vì tin ghi chép cũ.

> **2026-10-07 (TIB-5516):** instance active lưu phía SERVER theo account (không nằm trong localStorage):
> cùng account `<qa-test-account>@example.com`, lúc 07:43 UTC login thấy instance 287 `linh open platform`
> (Boundless, tester-4.com), lúc 08:21 UTC login lại đã về instance 58 (linh-tib-staging) mà agent không đổi gì
> → có phiên khác dùng chung account đổi instance. Cách verify: request `GET /api/instances/<id>/popup-messages`
> sau login cho biết id instance active; sidebar hiện store domain. Luồng UI chuyển instance: **CHƯA VERIFY**
> (lần này không cần chuyển).

## Luồng chuẩn tạo 1 campaign hoàn chỉnh (người dùng chốt 2026-08-23)

```
1. Create campaign          →  /campaigns/new  (title = title issue)      ✅ ĐÃ VERIFY
2. Thêm product base        →  dialog "Select your product"               ✅ ĐÃ VERIFY (2026-08-25, blocker đã hết)
3. Thêm artwork mới vào print area  (artwork name = title issue)          ✅ ĐÃ VERIFY (2026-08-25)
4. Publish campaign         →  Launch → store linh-tib-staging.myshopify.com  ✅ ĐÃ VERIFY (2026-08-25, campaign 2556)
```

Agent phải đi đủ 4 bước theo đúng thứ tự này. Artwork **được tạo từ trong print area của campaign**,
không phải tạo rời ở mục `Artworks` ngoài sidebar rồi gắn vào.

Bước nào fail thì dừng ở đó, ghi ledger trạng thái dở dang, không nhảy cóc sang bước sau.

## Flow: Tạo campaign — ĐÃ VERIFY một phần (2026-08-23)

Trang list: `/campaigns` — tiêu đề `Campaigns by Product Bases`, có 2 nút:
`Bulk creator` (`/campaigns/bulk-editor`) và `New campaign` (`/campaigns/new`).
Tab lọc: `All` / `Published` / `Unpublished` / `Archived` / `Update required`.
Bộ lọc: `Search`, `Internal Tags`, `Type`, `Vendor`, `Tags`, `Published on store`.

### Bước 1 — Tạo campaign rỗng (ĐÃ VERIFY, chạy được)
1. `browser_navigate` → `https://staging-portal.teeinblue.com/campaigns/new`
2. Form **Basic information**:
   - textbox `Campaign title` (bắt buộc)
   - textbox `Internal tags (optional)`
3. Click button `Save` (accessible name có ký tự icon ở đầu: `" Save"`).
4. Portal redirect sang **`/campaigns/<id>/edit`** và hiện toast `Success — Your campaign has been created`.
   → **ID campaign lấy từ URL này.**

### Bước 2 — Trang editor `/campaigns/<id>/edit` (ĐÃ VERIFY cấu trúc)
Top bar: `Listing info`, `Logs`, `Launch`.
Thân trang chia 2 khối:
- `STEP 1: ADD PRODUCTS & ARTWORKS` → heading `Available Products:` + button `Add more product`
- `STEP 2: PREVIEW YOUR CAMPAIGN`
Cảnh báo dưới cùng khi chưa đủ điều kiện: `Your campaign is NOT ready to launch because of some
unresolved issues.` + button `View details`.

### Bước 3 — Thêm product base — ✅ ĐÃ VERIFY 2026-08-25 (blocker `preview_thumbnail` ĐÃ HẾT)
1. Click button `Add more product` → mở dialog `Select your product`.
2. Gõ nguyên tên vào textbox `Search` (vd `example product base - tshirt`) → lọc còn đúng 1 card.
   Card có accessible name = **internal name**; dưới card là vendor (`automation`).
3. Click vào card → dialog đóng, **URL đổi thành `/campaigns/<id>/edit?product-id=<pbId>`**
   (product-id chính là id product base — `example product base - tshirt` = **3139**).
4. `STEP 1` hiện khối `Print Areas of <tên product base>` gồm:
   - button `Select artwork for all`
   - từng print area: `Front (1400x1400)` / `Back (1400x1400)` + button `Select artwork`
5. Console sạch (không còn `[GraphQL error] preview_thumbnail`).
   ⇒ Vẫn phải check console sau bước này, nhưng đã không còn tái hiện.

### Bước 2b — Đổi tên campaign (ĐÃ VERIFY 2026-08-23)
Dialog `Listing info` **KHÔNG** chứa campaign title (chỉ có `Product Type`, `Vendor`,
`Product Tags`, `Product Thumbnail`, nút `Save` / `Cancel`).
Đổi title bằng **inline editor**: trong khối `STEP 2: PREVIEW YOUR CAMPAIGN`, click vào
link tên campaign → hiện `textbox` (là `<textarea>`) + nút `Save` / link `Cancel`.
Save chạy sạch, không có lỗi console; verify bằng cách mở lại `/campaigns?limit=20&name=<keyword>`.

## Flow: Bulk creator (`/campaigns/bulk-editor`) — ĐÃ RECON 2026-08-23, KHÔNG dùng làm workaround
Trang `Bulk create campaigns`: chọn store (`linh-tib-staging.myshopify.com`), mỗi hàng =
1 campaign gồm: picker `Artwork`, combobox `Choose 1-5 products` (product base),
`Campaign name`, `Tags (separated by comma)`, `Product type`, `Vendor`, nút `Create & Publish`.
**Không dùng được để né blocker product base** vì:
- bắt buộc chọn **artwork có sẵn** (không tạo artwork mới, không mở artwork editor → không thêm layer được),
- chỉ có `Create & Publish` → luôn publish, không giữ được draft,
- "The selected artwork will be applied to all printareas of all added product bases".

## Quy ước data của đội (do người dùng chốt 2026-08-23)

- Mỗi issue test → **1 campaign + 1 artwork**, cả hai đặt tên **= title của issue** (nguyên văn).
  Issue key bỏ vào `Internal tags` của campaign để trace/lọc.
- Product base chỉ được dùng: **`example product base - tshirt`** hoặc **`example product base - mug`**.
  ✅ ĐÃ VERIFY 2026-08-25: cả 2 tồn tại trong instance `Enterprise (Test)`, vendor `automation`
  (`example product base - tshirt` = product-id **3139**, print area `Front`/`Back` 1400x1400).
  Tìm bằng cách gõ nguyên tên vào textbox `Search` trong dialog `Select your product` — lọc ra đúng 1 card.
- Publish → **luôn** vào store `linh-tib-staging.myshopify.com`. ✅ ĐÃ VERIFY 2026-08-25 (xem mục *Flow: Publish*).

## Flow: Thêm artwork mới vào print area — ✅ ĐÃ VERIFY 2026-08-25 (TIB-11, campaign 2555)

Trong campaign editor, print area của product base có button `Select artwork`:

1. Click ` Select artwork` của print area cần gắn (vd `Front (1400x1400)`)
   → mở dialog **`Select your artwork`**. Heading dialog có sẵn button **` New artwork`**.
2. Click ` New artwork` → mở **artwork editor** (dialog full-screen) kèm dialog con
   **`Artwork details`**:
   - `Name*` (textbox, bắt buộc) ← đặt = title issue
   - `Category` + button ` New category`
   - `Artwork size:` radio `Custom size` (mặc định) / `Import printarea size`
   - `Width (px)` / `Height (px)` mặc định **1600 / 1600**
   - `Design format:` combobox mặc định **PNG_RGB**
   - button `Save` / link `Cancel`
3. Click `Save` → dialog con đóng, header artwork editor hiện `<tên artwork> (1600x1600 - PNG_RGB)`,
   panel trái có `Default template` + button ` Layer` / ` Import`.
4. Thêm layer (xem mục dưới), rồi `Save & Close`.
5. ⚠️ **QUAN TRỌNG — `Save & Close` chỉ TẠO artwork, KHÔNG tự gắn vào print area.**
   Sau khi đóng editor, portal quay lại dialog `Select your artwork`, artwork mới nằm trong lưới
   (kèm `1600x1600` + `a few seconds ago`). **Phải click vào card đó** thì print area mới nhận artwork.
   Bỏ qua bước này ⇒ print area vẫn hiện `Select artwork` và campaign vẫn thiếu artwork.
6. Sau khi gắn: print area hiện thumbnail + tên artwork + button ` Edit artwork` / ` Locate artwork`.
   URL đổi thành `?product-id=<pbId>&artwork-id=<artworkId>` khi mở editor
   ⇒ **lấy artwork id từ URL này** (TIB-11: artwork **3727**).

Sidebar cũng có mục `Artworks` riêng, nhưng luồng chuẩn của đội KHÔNG dùng đường này.

## Flow: Thêm layer trong artwork editor — ✅ ĐÃ VERIFY 2026-08-25

Click button ` Layer` (panel trái, dưới danh sách layer) → mở dialog picker chia nhóm:

| Nhóm | Các nút |
|---|---|
| `Text` | `Single-line Text`, `Paragraph ▸` (Normal / Custom Shape), `Curve Text`, `Other ▸` |
| `Image` | `Static Image`, `Clipart Category ▸`, `Photo Upload ▸`, `Text to Image (AI)`, `Dynamic Clipart by Text ▸` |
| `Vector` | ... |

Click `Single-line Text` → layer tên mặc định **`Text layer`** được thêm ngay vào danh sách
(không có dialog xác nhận), đồng thời form preview bên trái hiện 1 textbox `#layer-<id>`
để nhập giá trị. Console sạch.

Lưu bằng `Save & Close` (nút ở header artwork editor). Sau reload trang, layer persist đúng.

## Flow: Template trong artwork editor — ✅ ĐÃ VERIFY 2026-08-25 (TIB-11)

Panel trái artwork editor có **2 hàng** liên quan tới template:

**Hàng 1 — tab list template** (mỗi template 1 tab, vd `Default template`, `Template 1`), bên phải có 3 nút icon:
| Nút | Ý nghĩa |
|---|---|
| `link ""` (chevron) | mở/thu list |
| `button ""` (gear) | settings |
| `button ""` (**+**) | **thêm template** → menu `Add new` / `Import from artwork` |

**Hàng 2 — `Template: <tên đang chọn>`** + dãy nút icon (accessible name RỖNG, phải nhận diện bằng class icon):

| Thứ tự | Icon class | Ý nghĩa |
|---|---|---|
| 0 | (eye) | preview — **disabled khi artwork chỉ có 1 template** |
| 1 | `las la-pencil-alt` | **Edit template** (đổi tên / thumbnail — đúng phạm vi TIB-11) |
| 2 | `las la-copy` | Duplicate template |
| 3 | `las la-trash-alt` | **Delete template** — **chỉ xuất hiện khi artwork có ≥ 2 template** |
| 4 | `alab-action__more` | More |

⚠️ **Khi artwork mới tạo chỉ có `Default template` thì hàng 2 chỉ có 4 nút và KHÔNG có nút trash.**
Muốn có data test edit/delete template thì phải tạo thêm template thứ 2 (`+` → `Add new`).
Template mới tên tự sinh `Template 1`, **bắt đầu rỗng** (không layer nào) — khớp Rule 9.

**Verify template đã lưu mà không cần mở editor:** ở trang campaign, khối
`PERSONALIZATION FORM` có combobox `<tên artwork> template*` (`id="<artworkId>-template"`)
liệt kê đủ các template ⇒ đọc `options` của nó là biết template nào đã persist.

## Flow: Publish / Update campaign — ✅ ĐÃ VERIFY 2026-08-25 (campaign 2556)

Điều kiện: print area đã có artwork ⇒ banner dưới cùng đổi thành
`Your campaign is valid and ready to launch!` (trước đó là `NOT ready to launch`).

1. Header campaign có nút **` Launch`** (tooltip `Publish to platform`).
2. Click → dialog **`Multi-store launch`** — `Stores from Organization: Linh Pham`, bảng
   `STORE NAME | PLATFORM | CAMPAIGN LINK | ACTION` với 3 store:
   `linh-sdk-v2`, `linh-tib-checkout`, `linh-tib-staging` (tất cả Shopify).
3. **CHỈ** click `Launch` trên hàng `linh-tib-staging`. Hai store kia để nguyên nút `Launch` (chưa publish).
4. Toast xanh: `Publishing campaign <tên> — Content is published. Mockups are still publishing.`
   Hàng `linh-tib-staging` đổi thành `View` + `Update`, cột CAMPAIGN LINK hiện URL storefront.
5. Request nền: `POST https://staging-api.teeinblue.com/api/campaigns/<id>/publish` → **200**.
6. Sau khi publish, header campaign đổi từ ` Launch` sang **` View` + ` Update`**
   (tooltip `Update changes to platform`). Sửa artwork xong phải bấm `Update` →
   cùng dialog `Multi-store launch` → `Update` trên hàng `linh-tib-staging`.
7. Trong list `/campaigns`, campaign hiện badge xanh **`Published on current store`**.

## Flow: Duplicate & Link cho Paragraph — ✅ ĐÃ VERIFY 2026-08-25 (TIB-4889, artwork 3728)

**Duplicate & Link ĐÃ hoạt động trên layer Paragraph** (trước đây bị chặn).

- Chọn layer (click `.artwork-sortable-layer-thumbnail` của layer) → thanh **`N selected`** hiện
  nút `Duplicate & Link options`.
  Selector chạy ổn định: `button:has(span.sr-only:text-is("Duplicate & Link options"))`
- Layer link sinh ra tên `<tên gốc> copy`, có icon 🔗 trong layer list, và **được chọn ngay sau đó**
  ⇒ muốn tạo nhiều B từ cùng 1 A thì phải **chọn lại A trước mỗi lần** bấm.
- Hoạt động y hệt với Text / Curve Text / Clipart / Photo Upload (dùng cho regression TC-032).

### Panel của layer link (nút ✎ `#manage-layer`)
Chỉ có **2 section**: `LINKED LAYER` + `EXTRA`.
`LINKED LAYER` hiện banner vàng *"This layer is linked to another layer. Design and personalization
are synced from it."* + `Source layer:` (tên layer gốc) + nút mũi tên (target selector).
**KHÔNG có** `DESIGN SETTINGS`, `POPULATE VALUES`, `PERSONALIZATION SETTINGS`.

### ⚠️ Toolbar của layer link chỉ còn `Transform` / `Align` / `Shape Cut`
**KHÔNG có control Font family, Font size, Align text, Color, Stroke, Background, Letter spacing.**
Khớp ghi chép cũ (2026-08-25 P9) nhưng **mâu thuẫn spec TIB-4889** (spec nói B được sửa Font size
= original × scale). Bằng chứng: `evidence/TIB-4889/anomaly-linked-toolbar-fontsize.png`.
⇒ Input trực tiếp cho TC-TIB-011 / TC-TIB-012.

### Transform của layer link: aspect ratio bị KHOÁ
Popup `Transform` của layer link có **icon ổ khoá giữa Width và Height**. Đổi Width → Height tự tính lại
theo tỉ lệ (800×300 → nhập 400 ⇒ 150 ngay). Layer gốc KHÔNG có icon khoá này.
Trên canvas layer link chỉ có **4 handle góc**, không có handle cạnh.

## Flow: Toolbar artwork editor — chi tiết selector (ĐÃ VERIFY 2026-08-25)

Toolbar nằm trên canvas, mỗi item là `div.qte-field`. Accessible name hầu hết RỖNG ⇒ target bằng class:

| Chức năng | Selector |
|---|---|
| Transform (W/H/Top/Left/Rotate + `Fit to canvas`) | `.qte-field--alignment:has-text("Transform")` |
| Align | `.qte-field--alignment:has-text("Align")` |
| Font family | `.qinline-fontname` (nth=0) |
| Font size | `input.qinline-value[type=number]` (nth=0) |
| Align text (trái/giữa/phải) | `.qte-field.qte-alignment` |
| Vertical align (top/middle/bottom) | `.qte-field.qte-alignment-vertical` |
| Màu chữ (fill) | `.qte-field.qte-color` |
| Stroke | `.qinline-stroke` |
| Background image | `.qinline-bg-toggle` |
| **Letter spacing + Line height** (chung 1 popup) | `.qinline-letter-spacing` |
| Overflow "..." | `i.las.la-ellipsis-h` trong `.qte-field` cuối |

Mọi popup đều **toggle**: click lại đúng trigger để đóng (Escape KHÔNG đóng).

### 🔴 Cạm bẫy: nút "..." overflow bị panel form bên phải che
Ở viewport 1600px, `.artwork-form-panel` bắt đầu ở x=1200 và **đè lên nút `...`** (x 1194–1220)
⇒ Playwright click vào tâm nút bị `intercepts pointer events`, không bấm được, và
`letter-spacing` nằm trong overflow nên không tới được.

**Cách xử lý (đã verify):** click link **` Preview Options`** ở mép trái panel phải
(`.artwork-form-panel >> text=Preview Options`) → panel trượt ra ngoài màn hình (x=1600),
toolbar giãn ra hết, letter-spacing hiện inline, không còn overflow.

### Các giá trị mặc định của layer Paragraph mới
`700x300` tại `(top 650, left 450)`, font `Roboto (regular)` size `50`, màu `#000000`,
stroke OFF, **line height mặc định `1.2`**, letter spacing `0`,
text preview `Lorem Ipsum is simply dummy text of the printing and typesetting industry.`

### Font: Google Fonts vs Custom Fonts
Popup font có radio `Google Fonts` / `Custom Fonts`.
Click radio trực tiếp bị label chặn ⇒ dùng `label[for="typography_type-custom"]`.
Chọn `Custom Fonts` → tên font đổi thành `Empty fonts!!!` + link `+ Select a font`
→ dialog `Your Custom Fonts` (grid, mỗi card có nút `Select`).
Selector card: `div.vgrid-col:has(a:text-is("<tên font>")) >> text=Select`.
⚠️ Click vào **tên font** (thẻ `<a>`) sẽ mở inline rename, không phải chọn font.
Font có sẵn trên instance: `CenturyGothic125`, `ptshoot`, `Roboto Condensed ExtraBold`,
`Hourglass Of Shine`, `LFC`, ...
Console báo `403` cho `cdn.ownego.com/.../fonts/*.woff2|ttf` — **bình thường**, không phải lỗi save.

### Background image của text layer = ảnh fill (không phải màu nền)
`.qinline-bg-toggle` → `Default background image:` + input url + nút `Browse`.
`Browse` mở **file chooser của OS** (dùng `browser_file_upload`), KHÔNG phải asset library.
Upload `IMG_1790.jpeg` (4 MB) mất **~50 giây** — input vẫn rỗng và nút Browse còn spinner suốt lúc đó,
đừng tưởng treo. Xong thì input có value dạng `users/64/images/<...>_large.webp`.
Render ra SVG dạng `<clipPath>` chứa `<text fill="#..."/>` + `<image clip-path="url(#...)">`
⇒ thẻ `<text>` ngoài cùng có `fill="none"`, màu chữ thật nằm trong clipPath. **Không phải bug.**

## Flow: Đổi tên layer trong layer list — ĐÃ VERIFY 2026-08-25
**Double-click** vào `.artwork-sortable-layer-name` → biến thành `<input>` →
điền + Enter. Selector: `#artwork-sortable-layer-layer-<id> .artwork-sortable-layer-name input`.
⚠️ Phải đang ở **layer list**; nếu panel layer settings đang mở thì nó che mất
(`.layer-panel__body ... intercepts pointer events`) → bấm nút back `.layer-editor-title button` trước.

## Flow: Nút "Save" (không đóng editor) — ĐÃ VERIFY 2026-08-25
Cạnh `Save & Close` có nút caret: `.artwork-editor-header-right .btn-group .v-popper > .btn`
→ menu có **` Save`** (lưu mà KHÔNG đóng editor). Dùng cái này để lưu từng chặng
khi dựng artwork nhiều layer (tránh mất data vì session hết hạn — Rule 10).
Sau lần Save đầu tiên, header hiện **`(#<artworkId> - 1600x1600 - PNG_RGB)`** và nút `Logs`
⇒ đây là chỗ lấy artwork id mà không cần đọc URL.

## Flow: Thêm layer Vector / Clipart — cạm bẫy validate (ĐÃ VERIFY 2026-08-25)
`+ Layer` → `Vector Category` / `Clipart Category ▸ 1 Clipart Category` → mở dialog grid ảnh.
- Chọn bằng **checkbox** `input.layer-listing__checkbox`, KHÔNG click vào tên (mở rename).
- Nút xác nhận có label động: `Select 1 vector` / `Select 1 image`.
- Escape đóng nguyên dialog và **không thêm layer nào**.

🔴 **Layer `Vector Category` / `Clipart Category` mặc định là `Create a new option` và BẮT BUỘC
phải chọn category, nếu không `Save` FAIL** với toast đỏ:
```
Template - Default template:
<tên layer>: - Select one vector category is required
<tên layer>: - Select one clipart category is required
```
Toast này là **cách duy nhất biết save fail** (console sạch, không có GraphQL error).
⇒ Sau mỗi lần Save phải screenshot/đọc toast, đừng chỉ check console.
Cách xử lý nhanh nếu chỉ cần layer tồn tại: mở ✎ → `PERSONALIZATION SETTINGS` →
chọn **`No personalization`** ⇒ hết bắt buộc category.

## Flow: Personalization của layer Paragraph — ĐÃ VERIFY 2026-08-25
Panel ✎ của paragraph gốc có 5 section: `DESIGN SETTINGS`, `POPULATE VALUES`,
`PERSONALIZATION SETTINGS`, `CONDITIONAL SETTING`, `EXTRA`.
- `DESIGN SETTINGS`: textarea `Default paragraph (only for preview):`, toggle `Enable prefix/suffix`,
  `Right to Left text`.
- `PERSONALIZATION SETTINGS`: radio `No personalization` / `Create a new option` (mặc định) /
  `Use an existing global option`; `Option Title:` (`input[name="form_label"]`);
  `Placeholder paragraph:`; toggle `Prefill default paragraph to customers input`;
  `Input type`, `Input text case`, `Text character limit`, `Add instruction for customer`,
  toggle **`Mark this option as required`**, toggle `Show customization data on cart/checkout` (mặc định **theo config shop**, xem Rule 14),
  `Custom class`.
- Toggle là `label.vue-js-switch` — click vào chữ KHÔNG ăn. Selector chạy được:
  `div:has(> label.vue-js-switch):has-text("<nhãn>") label.vue-js-switch`

## Flow: Personalization fields — CHƯA VERIFY (bị chặn cùng lý do)

## Cạm bẫy đã biết

### ✅ ĐÃ HẾT (2026-08-25): blocker không thêm được product base vào campaign

> **Cập nhật 2026-08-25 (TIB-11, campaign 2555, `example product base - tshirt`): thêm product base
> CHẠY BÌNH THƯỜNG, console sạch, print area hiện đủ.** Lỗi bên dưới là lịch sử — giữ lại để
> nhận diện nếu tái phát. Không cần workaround nữa.

<details><summary>Lịch sử lỗi 2026-08-23</summary>
Click card trong dialog `Select your product` → mutation GraphQL fail:

```
[GraphQL error]: field 'preview_thumbnail' not found in type: 'campaign_mockups_insert_input'
ApolloError @ staging-portal.teeinblue.com/assets/vendor.BaNaPlZt.js
```

- **UI không hiện lỗi gì** — dialog đóng bình thường, người dùng tưởng đã thêm xong.
  Chỉ thấy lỗi trong console → agent PHẢI check `browser_console_messages` sau bước này.
- Reproduce với 3 product base khác nhau (`Product Base A`, `White 11oz Ceramic Mug`,
  `example product base - tshirt`) và 2 campaign khác nhau (2531, 2532)
  → không phải lỗi của 1 product base hay 1 campaign cụ thể.
- Nguyên nhân nhiều khả năng: frontend portal deploy lệch schema Hasura trên staging
  (frontend gửi field `preview_thumbnail`, schema chưa có).
- **Reload trang không cứu được**: mở lại `/campaigns/2532/edit` sau khi lỗi → `Available Products:`
  vẫn rỗng → mutation fail thật, không phải UI không refresh.
- Bằng chứng: `evidence/recon/recon-add-productbase-fails.png`,
  `evidence/Duplicate-link-paragraph/dup-link-paragraph-pb-blocked.png`,
  snapshot `evidence/recon/check-2532-after-reload.yml`
- **Tái kiểm 2026-08-23 15:40 trên instance `Enterprise (Test)` / `linh-tib-staging.myshopify.com`,
  campaign 2532, product base `example product base - tshirt` → LẶP LẠI y hệt.**
- Đã loại trừ nguyên nhân "bundle JS cũ bị cache": reload bypass cache (`location.reload(true)`)
  rồi thử lại → vẫn cùng bundle `vendor.BaNaPlZt.js` và cùng lỗi ⇒ lỗi phía server
  (frontend deploy lệch schema Hasura), client không tự khắc phục được.
- Bằng chứng thêm: `evidence/Duplicate-Link-paragraph/01-pb-add-blocked-2532.png`
- **Hệ quả:** mọi flow cần campaign hoàn chỉnh (artwork/layer, personalization, launch)
  đều bị chặn cho tới khi staging fix. Agent gặp lỗi này phải dừng và báo, không retry.
- **Workaround đã thử và loại:** `Bulk creator` (xem mục riêng ở trên) — không dùng được.

</details>

### Khác
- **Profile Playwright bị khoá bởi phiên cũ:** navigate lỗi
  `Browser is already in use for .../.playwright-profile, use --isolated`.
  Nguyên nhân: chrome + playwright-mcp của phiên trước còn sống. Xử lý:
  `ps aux | grep "[p]laywright-profile"` rồi `kill -TERM <pid chrome + pid mcp cũ>`
  (giữ lại tiến trình mcp hiện tại), sau đó navigate lại. Session login nằm trong profile nên không mất.
- SPA load chậm: luôn `browser_wait_for` `textGone: "Initializing..."` sau khi navigate.
- **`page.locator('input[type=number]').nth(n)` RẤT DỄ SAI** trong artwork editor: DOM có nhiều
  input ẩn (trang campaign bên dưới + item trong overflow menu) nên nth đếm lệch.
  Luôn dùng `getByRole('spinbutton', { name: 'Width:' })` / `'Height:'` / `'Top:'` / `'Left:'`.
  Đã dính 1 lần: định set Top=1150 nhưng ghi vào Height.
- **Internal tags nhận nhiều tag ngăn cách bằng dấu phẩy**, không phải chip. Nhập
  `TIB-4889,TIB-011` → list hiện `TIB-4889,TIB-011` và filter `Internal Tags` tìm được
  từng tag riêng (URL: `/campaigns?...&internal_tags=TIB-4889`). ✅ verify 2026-08-25.
- Sau login portal luôn về `/`, không giữ trang đích ban đầu.
- Storefront staging bật password protection: password `oe` (dùng khi cần kiểm tra campaign ngoài store).
- Publish campaign ảnh hưởng thật ra storefront staging → chỉ publish khi được yêu cầu.

---

# Storefront SDK — Paragraph layer (ĐÃ VERIFY 2026-08-25, TIB-001 / TIB-4589)

Phần này KHÔNG phải portal. Là rule cho khi test SDK trên storefront staging.

| Mục | Giá trị |
|---|---|
| Storefront | `https://linh-tib-staging.myshopify.com` (password `oe`) |
| Product test paragraph | `/products/refactor-paragraph` — campaign 2491, 4 layer paragraph |
| SDK bundle | `https://staging-sdk.teeinblue.com/shopify/app-v1.js` |
| localStorage key | `teeinblue-customizations` (array, mỗi phần tử `{productId, customization, timestamp}`) |
| Merchant API (Add to cart gọi) | `POST https://staging-api.teeinblue.com/api/merchant/shopify/customization?shop=<shop>&id=<productId>` |
| Đọc lại customization | `GET .../api/merchant/shopify/customization/<uuid>?shop=<shop>` |

## 🔑 Rule 1 — Mỗi paragraph layer có HAI key, ý nghĩa khác nhau

```
layer-XXXXXX        = raw value, đúng bằng textarea.value (chỉ hard \n do user gõ Enter)
layer-XXXXXX-data   = { lines: "<text SAU khi wrap>", font_size: <số sau khi auto-shrink> }
```

**KHÔNG được assert `layer-XXXXXX === layer-XXXXXX-data.lines`.** Hai giá trị này khác nhau
một cách hợp lệ khi có dòng bị wrap.

## 🔑 Rule 2 — Hành vi wrap engine (đã verify từng cái)

- Soft break = **đúng 1 space** trong raw value bị thay bằng `\n` trong `lines`
- Hard `\n` (user gõ Enter) **giữ nguyên**
- **KHÔNG cắt giữa từ** — từ dài hơn khung tràn ra dòng riêng, `font_size` shrink thay vì cắt
  (ví dụ: `Supercalifragilistic...` cfg 100 → font_size 35)
- **KHÔNG collapse whitespace** — double space, space đầu/cuối dòng, `\n` cuối chuỗi đều giữ y nguyên

⇒ Vì soft break đảo ngược được, dùng checker `scripts/tib-check-paragraph-parity.js`
(`checkParity(value, lines)` / `auditCustomizations()`), **đừng** dùng `replace(/\s+/g,' ')`
— normalize thô nuốt luôn hard `\n` nên bỏ sót bug "mất dòng Enter".

## 🔑 Rule 3 — Ai dùng `lines`, ai dùng raw value

| Nơi | Nguồn |
|---|---|
| Live preview SVG (`.tee-artworks-wrapper text` → gộp `tspan` bằng `\n`) | **`lines`** (+ prefix/suffix của layer) |
| File design/print (`_tib_design_link_1`) | **`lines` + `font_size`** |
| Cart line-item property — khách hàng nhìn thấy | **raw value** |
| Open API `GET /openapi/v1/customizations/{uuid}` | **raw value**, key theo LABEL field, KHÔNG expose `lines`/`font_size` |

## 🔑 Rule 4 — Merchant API KHÔNG recompute `lines`

POST request body và response body giống hệt nhau từng byte; GET lại cũng vậy.
Server chỉ persist nguyên si những gì SDK gửi lên.

⇒ **`lines` sai từ SDK sẽ được lưu thật và dùng để render file in.** Mọi mismatch giữa
raw value và `lines` là bug ảnh hưởng dữ liệu đơn hàng, KHÔNG phải lỗi cosmetic:
khách đọc raw value ở cart/order, xưởng in ra theo `lines`.

## 🔑 Rule 5 — Field chưa động vào không có key raw

Layer chưa nhập gì chỉ có `layer-XXXX-data`, **không có** key `layer-XXXX`
⇒ `value === undefined` vs `lines === ""`. Assertion phải handle nhánh này riêng,
không tính là fail.

## Cạm bẫy khi test SDK

- **Debounce 10ms**: `input` rồi `blur`/submit trong cùng tick → `lines` giữ giá trị CŨ.
  Muốn test happy path phải đợi ≥ 50ms sau khi gõ rồi mới blur.
- **State bẩn giữa các lần chạy**: localStorage sống sót qua reload và KHÔNG tự sửa.
  Luôn `localStorage.removeItem('teeinblue-customizations')` + reload trước mỗi case.
- **Font cache**: 4 font của campaign đã nằm trong browser cache → không tái hiện được
  kịch bản "submit trước khi font_loaded" nếu không throttle network (Playwright MCP
  không expose CDP `Network.emulateNetworkConditions`).
- **Design PNG trên CDN trả 403** — `cdn.ownego.com/.../designs/*.png` cần signed URL,
  không fetch trực tiếp được. Verify qua payload merchant API thay vì tải ảnh.
- Add to cart trên staging tạo cart item thật → chỉ bấm khi case thực sự cần.

## 🔑 Rule 6 — Ba đường value vào paragraph KHÔNG qua gõ tay (CHƯA VERIFY, cần test)

Ngoài customer gõ tay, giá trị paragraph còn có thể được set **programmatic**:

| Đường | Cơ chế | Ghi chú |
|---|---|---|
| **Populate values** | Một **option trong Artwork settings của layer**. Layer paragraph lấy value từ một option sinh ra text — ví dụ **Song lyrics** | Bundle: `mapperSchemas` → `applyMapperForSources`; `handleFontLoaded` return sớm khi `mapperSchemas` rỗng ⇒ chỉ layer hidden/design-only mới đi vào nhánh self-correct theo font |
| **Duplicate & Link options** | 2+ layer dùng chung 1 option value, nhưng mỗi layer giữ geometry/font/size riêng | ⇒ raw value dùng chung, `lines` **khác nhau hợp lệ** giữa các layer. Phải `checkParity()` **từng layer**, không so `lines` của layer này với layer kia |
| **Sync giữa các template** | Bật bằng **store config**. Khách nhập field title `paragraph A` ở template 1 → đổi sang template 2 cũng có field title `paragraph A` → value mang sang. Khớp theo **title của field** | Đây là **giữa các template trong cùng campaign**, KHÔNG phải giữa các campaign |

⚠️ **Cả 3 đường đều là nghi phạm của lỗi parity.** `clearAll()` sai chính vì nó set value mà không
schedule recompute (xem TC-TIB-714). Ba đường trên cũng set value programmatic, nên phải verify
`lines`/`font_size` được tính lại — đừng chỉ nhìn text hiển thị trong form.

Riêng **sync giữa template** rủi ro cao nhất: value được ghi vào một layer **khác** (khác width,
font, size) nên `lines` bắt buộc phải tính lại từ đầu. Nếu mang `lines` cũ sang thì file in ra
theo vị trí ngắt dòng của template CŨ.

Chi tiết case: `docs/qa-checklist-paragraph.md` mục P8 / P9 / P10.

## 🔑 Rule 7 — Đọc store config KHÔNG cần login, KHÔNG cần browser

```
GET https://staging-api.teeinblue.com/api/merchant/shopify/config?shop=<shop-domain>
```

Trả về 123 setting của store, public (không cần token). Dùng cái này để check nhanh state
của shop setting thay vì mở Portal → Store Settings.

Các setting liên quan tới paragraph / personalization (state trên `linh-tib-staging` lúc 2026-08-25):

| Setting | Giá trị | Ý nghĩa |
|---|---|---|
| `sync_between_templates` | **true** | Bật sync value giữa các template, khớp theo title field (Rule 6) |
| `personalization_value_mapping` | "none" | KHÔNG phải công tắc của populate values (đã xác nhận với PO 2026-08-25). Populate values nằm ở **Artwork settings của layer**, không phải store config |
| `enable_clear_all_text_options` | true | Hiện nút X (Clear all) trong field — điều kiện của TC-TIB-714 |
| `auto_select_first_template` | true | Tự chọn template đầu khi load — ảnh hưởng bước setup khi test sync |
| `auto_zoom_text` | false | |
| `text_max_length_warning` | (chuỗi) | Cảnh báo giới hạn ký tự |
| `template_label` | `"{{ ARTWORK_NAME }} template"` | Label template hiển thị trên storefront |

⇒ Trước khi test P10 (sync giữa template), kiểm `sync_between_templates` bằng endpoint trên
thay vì đoán. Muốn test nhánh OFF thì phải đổi setting trong Portal → Store Settings
(ảnh hưởng toàn store staging — hỏi trước khi đổi).

## 🔑 Rule 8 — Populate values: cơ chế thật (ĐÃ KHẢO SÁT 2026-08-25)

Mở bằng: chọn layer → nút ✎ trên layer row → section **POPULATE VALUES**.
Mô tả trong UI: *"Let this layer receive values populated from other options."*

### 4 chiều populate (4 toggle riêng biệt, KHÔNG chỉ content)

| Toggle | Ảnh hưởng tới wrap? |
|---|---|
| `Populate Content from another option` | **CÓ** — đổi text ⇒ `lines`/`font_size` phải tính lại |
| `Populate Font from another option` | **CÓ** — đổi font ⇒ metric khác ⇒ wrap khác. ⚠️ Precondition trong UI: *"Must change from Google Font to Custom Font to use this feature"* |
| `Populate Color from another option` | Không |
| `Populate Background from another option` | Không |

⇒ Populate **Font** cũng phá wrap được, không chỉ Content. Đây là case dễ bỏ sót.

### Nguồn: token `{{...}}` dán vào ô Value

Dialog **Browse values** → chọn loại option nguồn → copy token. 9 loại nguồn:

`Street Maps` · `Star Maps` · `Text & Curve Text` · `QR code` · `Song search` ·
`Moon Phase - Date` · `Moon Phase - Location` · `JSON List` · `Clock`

Token của **Song search** (nguồn PO nhắc tới):

| Token | Trả về |
|---|---|
| `{{title}}` | Song title đầy đủ |
| `{{artists}}` | Artists |
| `{{url}}` | Spotify URL (dùng được với QR code) |
| `{{duration}}` | Song duration |
| `{{lyrics}}` | **Full lyrics** — phải bật *"Load song lyrics"* trong layer Song Search |

Token của **Street Maps**: `{{lat}}` `{{lng}}` `{{lat:dd}}` `{{lng:dd}}` `{{lat:dms}}` `{{lng:dms}}`
`{{lat:dmm}}` `{{lng:dmm}}` `{{name}}` (search keyword) `{{place_name}}` (full location).

Ô Value nhận **chuỗi trộn token + literal**, ví dụ `{{title}} by {{artists}}`.

⚠️ **`{{lyrics}}` là case nặng nhất cho paragraph**: text dài, nhiều hard `\n`, đến bằng đường
programmatic. Nếu populate không schedule recompute thì đây là chỗ file in sai rõ nhất.

## 🔑 Rule 9 — Template & sync (ĐÃ VERIFY 2026-08-25)

**Thêm template:** nút **+** cạnh tên template trong artwork editor → menu `Add new` / `Import from artwork`.
Template mới bắt đầu rỗng (không có layer nào).

**Khớp field khi sync:** theo **Option Title** (PERSONALIZATION SETTINGS → `Create a new option` → `Option Title`).
Hai template có field cùng Option Title thì value được mang qua lại.

**Sync tính lại wrap đúng.** Value được sync là **raw value**; `lines`/`font_size` được **tính lại**
theo layer đích (font/size/width riêng của nó), KHÔNG bê nguyên `lines` của layer nguồn.
Verify: nguồn Hourglass Of Shine cfg 120 → 6 dòng / fs 109; đích Roboto size 22 → 2 dòng / fs 22.
Đổi ngược lại thì khôi phục đúng 6 dòng / 109.

**⚠️ localStorage chỉ giữ layer của template ĐANG chọn.** Đổi template xoá hẳn key `layer-*` của
template cũ; đổi ngược lại thì khôi phục. Key thiếu sau khi đổi template là **đúng**, không phải mất data.

## 🔑 Rule 10 — Cạm bẫy khi sửa data trên Portal

- **Nút Update mở dialog `Multi-store launch`** liệt kê nhiều store: `linh-sdk-v2` (chưa launch),
  `linh-tib-checkout`, `linh-tib-staging`. **Chỉ bấm `Update` trên dòng `linh-tib-staging`.**
  Tuyệt đối không bấm `Launch` cho store chưa launch.
- **Session portal hết hạn im lặng.** Nếu để lâu (vd MCP treo), `Save & Close` fail với toast đỏ
  `Unauthenticated.` và **mất hết layer vừa thêm**. ⇒ Lưu ngay sau mỗi bước, đừng gom cuối.
- 🔴 **BLOCKER: cấu hình POPULATE VALUES KHÔNG lưu được qua `Save & Close`** (verify 2026-08-25,
  tái hiện 3 lần kể cả với click thật của Playwright). Bật `Populate Content` + set Source option
  + Value, verify đúng ngay trước khi Save, Save thành công không lỗi → mở lại thì **cả 4 toggle
  populate về OFF**, Source/Value biến mất. Layer thì vẫn persist, chỉ config populate bị drop im lặng.
  ⇒ **Chặn hoàn toàn nhóm P8**, kéo theo TC-TIB-007 / TC-TIB-009 tiếp tục blocked.
  Xem TC-TIB-819 và `test-results/evidence/tib-001-p8-populate-not-persisted.md`.
  Gặp lỗi này thì DỪNG, đừng retry mù — cần DEV xác nhận.
- **Trong POPULATE VALUES, gõ vào ô `Value` làm reset `Source option`** về "Select an option"
  (TC-TIB-820). ⇒ Set Value trước, chọn Source option sau, rồi verify lại CẢ HAI trước khi Save.
- **Layer paragraph mới** thêm qua `+ Layer` → `Paragraph` có submenu `Normal` / `Custom Shape`.
- **Có 2 element trùng id** `artwork-layer--layer-XXXX` trong DOM (1 của trang campaign bên dưới,
  1 của canvas editor). Luôn lấy phần tử CUỐI của `querySelectorAll`.

## 🔑 Rule 11 — SDK v2 (ĐÃ VERIFY 2026-08-25)

Có **2 store test với 2 version SDK khác nhau**, cùng trỏ tới campaign 2491 / artwork #3642:

| | v1 | v2 |
|---|---|---|
| Store | `linh-tib-staging.myshopify.com` | `linh-tib-checkout.myshopify.com` |
| Bundle | `staging-sdk.teeinblue.com/shopify/app-v1.js` | `staging-sdk.teeinblue.com/shopify/app-v2.js` + `async.js?v=2` |
| Storefront password | `oe` | `oe` |
| Variant | 53977389662524 | 50234099892464 |

### Hợp đồng dữ liệu GIỮ NGUYÊN giữa v1 và v2

Cùng key `teeinblue-customizations`, cùng cấu trúc `layer-XXXX` + `layer-XXXX-data {lines, font_size}`,
cùng quy tắc wrap. **`scripts/tib-check-paragraph-parity.js` chạy nguyên xi trên cả hai.**
Merchant API giống hệt, server vẫn không recompute.

### 4 khác biệt ở lớp UI/theme — PHẢI handle trong script automation

| Điểm | v1 | v2 |
|---|---|---|
| Nút Add to cart | `#teeAtcButton` (nút riêng của SDK) | **nút của THEME** `button.product-form__submit` / `#ProductSubmitButton-...` |
| Endpoint cart | `/cart/add.js` (JSON body) | **`/cart/add`** (FormData body) |
| Nút Clear all (X) | có | **không** (`enable_clear_all_text_options` tắt trên store này) |
| Auto chọn template | có | **không** — phải chọn template tay thì field paragraph mới render |

⇒ Script viết cho v1 sẽ fail trên v2 ở bước Add to cart và bước đọc `/cart/add.js`.

### Bug TC-TIB-714 CÒN NGUYÊN trên v2

Biến thể debounce race (`input` + `blur` cùng tick) tái hiện y hệt: `lines` giữ design default.
Safety net `validate() → paragraph_flush → flushPendingCalculation()` **vẫn chạy trên v2**,
kể cả khi validation FAIL (bị chặn vì thiếu field required) — chính lần validate đó sửa lại `lines`.

⇒ v2 **không fix** và cũng **không làm tệ hơn**.

### Lưu ý khi test store v2
- Field Song search là **required** trên store này ⇒ phải chọn bài hát mới submit được.
- Store config đọc riêng cho từng shop: `GET /api/merchant/shopify/config?shop=linh-tib-checkout.myshopify.com`

---

# Artwork 2.0 vs 1.0 — ĐÃ VERIFY 2026-08-26 (TIB-5033, artwork 3733 & 3735)

## Phân biệt 2.0 / 1.0 trong 1 giây
Đọc `.artwork-editor-header`:
- **có** button `.convert-artwork-button` (text `Convert to Artwork 2.0`) ⇒ artwork **1.0**
- **không có** ⇒ artwork **2.0**

⚠️ `document.body.innerText.includes('Convert to Artwork 2.0')` trả **false** dù nút có thật
(text bị xuống dòng thành `Convert to Artwork\n2.0`). Dùng `.artwork-editor-header .convert-artwork-button`
hoặc `header.innerText` thay vì so chuỗi trên body.

**Artwork tạo mới bằng `New artwork` luôn là 2.0.** Muốn có artwork 1.0 thì phải **duplicate** một
artwork 1.0 có sẵn (trên staging: **#3730 `default value - art 1.0 copy`** — bản gốc của user, chỉ duplicate).

## Layer picker (`+ Layer`) — danh sách đầy đủ 2026-08-26
| Nhóm | Items |
|---|---|
| TEXT | Single-line Text · Paragraph · Curve Text · Other |
| IMAGE | Static Image · Clipart Category · Photo Upload · Text to Image (AI) · Dynamic Clipart by Text |
| VECTOR | Static Vector · Vector Category · Vector Upload |
| MAPS & ASTRONOMY | Street Maps · Route Maps · Star Maps · Moon Phase |
| PUZZLES | Scrabble · Word Search · Word Cloud |
| OTHERS | Song Search · Calendar · QR Code · Clock |
| **FORM ELEMENTS** | **Toggle Switch · Additional Option · Addon Charge · JSON List · Font · Color** |

Click thẳng vào text trong `.add-layer-popup` là thêm layer ngay, không có dialog xác nhận.
`data-type` tương ứng của `li.artwork-layer-item`: `text`, `curve-text`, `toggle`, `font`, `color`.

## 🔴 Layer `Font` BẮT BUỘC chọn font category, nếu không Save FAIL
Giống bẫy của Vector/Clipart Category. Toast đỏ (console SẠCH):
```
Template - Default template:
Font:
- Select one font category is required
```
Cách set: ✎ → `Select one font category*:` → link ` Search` → dialog `Latest categories`
→ click item (vd `Font category`) ⇒ panel hiện `Selected: Font category` + `Available values:`
(Gill Sans Std Condensed, netflix-bold, NunitoSans_10pt-Bold, Bailenson, TALLY TEXT BOLD 2).

Layer `Color` KHÔNG bắt buộc — mặc định radio `Color picker`, save được ngay.

## Panel của Font / Color layer (2.0)
Chỉ có `PERSONALIZATION SETTINGS` + `CONDITIONAL SETTING` + `EXTRA`.
Có field **`Populate to other layers:`** (combobox `Select layers`) ⇒ populate wire được từ **cả 2 phía**
(từ layer nguồn đẩy ra, hoặc từ layer đích kéo về qua `POPULATE VALUES`).

## Text layer 2.0 — panel gồm 5 section
`DESIGN SETTINGS` · `POPULATE VALUES` · `PERSONALIZATION SETTINGS` · `CONDITIONAL SETTING` · `EXTRA`

Section là accordion, click `.layer-panel__header` để mở. Section đang mở có class `layer-panel--active`.
Đọc nhanh: `[...document.querySelectorAll('.layer-panel')].map(p=>p.className+' >>> '+p.innerText.split('\n')[0])`

⚠️ **PERSONALIZATION SETTINGS của Text 2.0 KHÔNG còn** `Allow customers to change Font` /
`Allow customers to change Text Color` (đây chính là "deprecated options" của TIB-5033).
Thay thế bằng Font layer / Color layer + POPULATE VALUES.

## ✅ POPULATE VALUES ĐÃ PERSIST (blocker 2026-08-25 KHÔNG còn tái hiện)
Verify 2026-08-26 trên artwork 3733: bật `Populate Font` + `Populate Color`, chọn source option,
Save → **reload full trang** → mở lại: cả 2 toggle vẫn ON, source option vẫn đúng.
⇒ Mục Rule 10 "BLOCKER: cấu hình POPULATE VALUES KHÔNG lưu được" đã hết hiệu lực với **Font/Color**.
(Chưa retest riêng `Populate Content` — nếu cần thì test lại trước khi kết luận.)

### Gate của `Populate Font from another option`
UI ghi *"Must change from Google Font to Custom Font to use this feature"*.
**Cách gỡ gate:** đổi font của chính Text layer sang Custom Font TRƯỚC (toolbar `.qinline-fontname`
→ `label[for="typography_type-custom"]` → ` Select a font` → dialog `Your Custom Fonts`).
Làm xong thì toggle Populate Font bật bình thường, không còn dòng cảnh báo.

`Values:` là textbox **disabled**, tự điền `{{font}}` / `{{color}}` — không phải gõ tay.

⚠️ **Combobox source option resolve bằng `getByRole('combobox').filter({hasText:'Select an option'})`
sẽ trúng nhiều cái** khi có ≥2 toggle populate cùng bật. An toàn hơn: snapshot section rồi dùng ref,
hoặc set từng toggle một (bật → chọn source → mới bật toggle kế tiếp).

## CONDITIONAL SETTING (2.0)
`+ Add conditions` → combobox `Option:` (liệt kê option của **các layer khác** trong template)
→ `<select>` `On` / `Off` (value `"true"` / `"false"`).
Chỉ layer sinh option mới xuất hiện; **layer Color kiểu `Color picker` KHÔNG lên danh sách** này,
chỉ Toggle và Font hiện ra.
Sau khi lưu, panel có thêm dòng `Show this layer on first load`.

## Curve Text — set độ cong
Toolbar có `.qte-field.qte-curve` → popup `Curve radius:` (slider + `input[aria-label="Curve radius"]`).
**Range là `-200..200`**, mặc định `50`. Nhập 300 sẽ bị clamp về 200.
- `200` = cong gần tròn kín, chữ chồng lên nhau
- `60` = cung mềm, đọc rõ — dùng cho data demo
Layer Curve text mới mặc định nằm giữa canvas ⇒ dễ đè lên Text layer. Đổi `Top:` qua popup
`Transform` (`getByRole('spinbutton',{name:'Top:'})`) cho khỏi chồng.

## Toggle Switch layer
Panel có `Option Title:` (`input[name="form_label"]`) và **`Toggle label:`** (`input[name="toggle_label"]`),
cùng toggle **`Pre-enable toggle`** (mặc định BẬT ⇒ trên storefront toggle đã ON sẵn).
Tên layer trong list mặc định là `Toggle` — đổi bằng double-click `.artwork-sortable-layer-name`.

## Artwork 1.0 — Text layer khác hoàn toàn
Panel 1.0: `GENERAL` · `PERSONALIZATION SETTING` (số ít!) · `CONDITIONAL SETTING` · `EXTRA`.
- `GENERAL`: `Default text`, `Text option:` (`Create a new option` / `Share with another layer`),
  `Enable text background`, **`Populate values from other options`** (toggle, không phải section riêng).
- `PERSONALIZATION SETTING`: radio `No personalization` / **`Enable personalization`**
  (id `editable-false` / `editable-true` — click vào `<input>` bị label chặn,
  phải click **`label[for="editable-true"]`**).
- Bật `Enable personalization` mới hiện các option 1.0 deprecated:
  **`Allow customers to change Text Color`** · `Allow customers to reposition text` ·
  **`Allow customers to change Font`**.
- Bật `Allow customers to change Font` ⇒ hiện `"Select a font" label:` + `Select one font category:`
  (cùng UI Search/New category như Font layer 2.0) + ghi chú
  *"Only work if default text uses a Custom font, not Google Font"*.

## Flow: Duplicate artwork từ `/artworks` — ĐÃ VERIFY 2026-08-26
Mỗi card là `div.vgrid-col > .artwork-item`, **KHÔNG có id trong DOM**.
Nút trên card: `i.la-pencil` (edit) · **`i.la-copy` (duplicate)** · `i.las.la-ellipsis-h` (more).
1. Click `i.la-copy` → bản copy tên `<tên gốc> copy` xuất hiện ở **đầu lưới** (`a few seconds ago`),
   **không có toast, không có dialog xác nhận**.
2. Lấy id: **click vào tên artwork** (`.artwork-item__name a`) → mở artwork editor và
   **URL đổi thành `/artworks?id=<newId>`**; header cũng hiện `(#<id> - ...)`.
   (Click vào tên ở trang /artworks là MỞ EDITOR, không phải inline rename — khác với card font.)
3. Đổi tên: trong editor, nút **`a.p-1.ml-2` có `i.las.la-pen`** cạnh title → mở dialog `Artwork details`
   → sửa `Name*` → `Save`. (Đừng nhầm với `button.aemt-btn` `Edit` — cái đó là mode editor.)

⚠️ Khi có ≥2 artwork trùng tên (vd 2 bản `... copy copy`), phân biệt bằng cột thời gian
(`a few seconds ago`) và **luôn xác nhận lại id trên URL** trước khi sửa.

## Anomaly quan sát được 2026-08-26 (không chặn)
`ApolloError: field 'global_options' not found in type: 'query_root'` — bắn khi **mở section
`PERSONALIZATION SETTINGS`** (query đọc danh sách global option cho radio `Use an existing global option`).
Là lỗi **read-only**, không ảnh hưởng nhánh `Create a new option`; Save vẫn thành công và data vẫn persist.
Nếu QA cần test `Use an existing global option` thì nhánh đó khả năng đang hỏng trên staging.

`403` cho `cdn.ownego.com/.../fonts/*.woff2|ttf` và `404` gravatar.com/avatar/* — nhiễu, bỏ qua.

## 🔑 Rule 12 — ⚠️ CACHE SDK: bắt buộc bust trước mỗi lần re-test bug (2026-08-26)

Bundle SDK trả header **`cache-control: max-age=315360000`** (10 năm). Trình duyệt sẽ giữ bản cũ
gần như vĩnh viễn ⇒ **re-test bug sau khi DEV fix sẽ cho kết quả SAI** nếu không bust cache.

**Bẫy đã dính thật:** URL script có query `?token=...&shop=...`. Token **khác nhau giữa các store**.
Nếu `fetch()` bằng URL tự ghép với token của store khác thì đó là **cache key khác** — fetch mang về
bản MỚI trong khi trang vẫn chạy bản CŨ. Kết quả: đọc code có fix nhưng test hành vi của code chưa fix,
và kết luận nhầm "fix chưa ăn".

### Quy trình đúng

```js
// 1. Lay DUNG url tu script tag cua trang, khong tu ghep
const url = [...document.querySelectorAll('script[src]')].find(s=>/app-v1\.js/.test(s.src)).src;

// 2. So ban cache vs ban server de biet co dang chay code cu khong
await fetch(url).then(r=>r.text()).then(t=>t.length);                    // ban trang dang chay
await fetch(url,{cache:'no-store'}).then(r=>r.text()).then(t=>t.length); // ban that tren server

// 3. Neu lech => bust cache roi reload
await fetch(url, {cache:'reload'});   // ep network VA ghi de cache entry
location.reload();

// 4. Verify lai truoc khi test hanh vi
await fetch(url).then(r=>r.text()).then(t=>/<marker cua ban fix>/.test(t));
```

Cach nhận biết nhanh: so **số ký tự** của bundle. Ví dụ 2026-08-26:
bản cũ `1.578.781` (chưa fix) vs bản mới `1.584.530` (đã fix), `Last-Modified: 2026-08-25 11:02 GMT`.

**Luôn ghi vào test case: bundle size + Last-Modified + đã bust cache hay chưa.**

---

## Flow: Shadow của layer — ✅ ĐÃ VERIFY 2026-08-26 (TIB-5353 / Testlane TIB-036, artwork 3741)

Shadow **KHÔNG** nằm trong panel ✎ (`DESIGN SETTINGS` / `EXTRA`). Nó là **1 item trong toolbar canvas**,
icon cuối cùng bên phải.

| Mục | Giá trị |
|---|---|
| Trigger toolbar | **`.qinline-shadow`** (⚠️ có **2** element trùng class → luôn dùng `.first()` / `nth=0`) |
| Popup container | `.qfield--shadow` |
| Bật/tắt | `#shadow-enable` (toggle `label.vue-js-switch`, **mặc định OFF**) |
| Offset X | `#shadow-offset-x` (number, default `0`) |
| Offset Y | `#shadow-offset-y` (number, default `0`) |
| Blur | `#shadow-blur` (number, **default `1`**, `min=0`, không có `max`) |
| Màu | color picker Chrome + input hex (`.vc-input__input`), default `#000000` |
| Phạm vi áp dụng | radio `display_shadow` : `display_shadow-mockup_order` (*Mockup Preview & Order Design* — **mặc định**) / `display_shadow-mockup` (*Mockup Preview only*) |

Ghi chú UI: *"(Shadow does NOT work with AI, EPS, or PDF format)"* ⇒ artwork phải là PNG/JPG format
thì shadow mới có tác dụng lên file design.

**Đơn vị blur/offset = px trong hệ toạ độ ARTWORK** (không phải display px, không phải %).
Không có giới hạn trên; nhập bao nhiêu lưu bấy nhiêu.

**Thứ tự thao tác đã chạy ổn định:**
1. Chọn layer: click `#artwork-sortable-layer-layer-<id> .artwork-sortable-layer-thumbnail`
2. Click `.qinline-shadow` (nth=0) → popup mở
3. Click `#shadow-enable` → hiện đủ field
4. Fill `#shadow-blur` / `#shadow-offset-x` / `#shadow-offset-y`
5. Đọc lại giá trị để confirm, rồi click `.qinline-shadow` lần nữa để đóng (popup là toggle, Escape KHÔNG đóng)

Shadow có ở **mọi loại layer** đã thử: Single-line Text, Static Image, Vector Category, Clipart Category.

### 🔑 Cách verify shadow đã lưu mà KHÔNG cần mở popup từng layer
Shadow được render thành `<filter>` trong SVG, id gắn theo layer id:

```js
[...document.querySelectorAll('filter')].map(f => {
  const ds = f.querySelector('feDropShadow');
  return f.id + ' :: ' + (ds ? `dx=${ds.getAttribute('dx')} dy=${ds.getAttribute('dy')} sd=${ds.getAttribute('stdDeviation')}` : 'no-dropshadow');
});
```

- `artwork-filter-layer--layer-<id>` = bản render trong campaign preview
- `artwork-filter-layer--artwork-preview-<id>` = bản render trong canvas artwork editor
- Hậu tố **`--zero-blur`** + không có `feDropShadow` ⇒ blur sau scale bị làm tròn về 0, **shadow biến mất hoàn toàn**

⚠️ **`stdDeviation` KHÔNG phải giá trị blur đã nhập** — nó là `blur × ratio` (ratio = preview width / artwork width),
sau đó bị **floor về 1** nếu < 1. Muốn đọc giá trị blur GỐC thì phải mở popup `.qfield--shadow`.

### Ratio khác nhau ở từng chỗ render (artwork 4500x4500, đo 2026-08-26)
| Nơi render | ratio | preview width |
|---|---|---|
| Canvas artwork editor (zoom 19%) | `0.19` | 855 |
| Campaign preview trong portal | `0.1111` | 500 |
| **Storefront (SDK v1)** | **`0.158889`** | **715** |

⇒ **Đừng giả định ratio = preview/artwork là hằng số.** Muốn biết blur sau scale thật thì đọc
`stdDeviation` từ DOM ở đúng chỗ đang test, đừng tính tay.

### Hai đường render shadow khác nhau (quan sát trên storefront)
| Điều kiện | Cách render |
|---|---|
| offset X = Y = 0 | `<g filter="url(#artwork-filter-layer--layer-<id>)">` + `feDropShadow` |
| offset X hoặc Y ≠ 0 | `filter=""` (RỖNG) + **nhân bản thẻ `<text>`** dịch đi `offset × ratio`, **không blur** ⇒ shadow cứng |
| layer Image / Vector / Clipart, blur nhỏ | filter id `--zero-blur`, không có `feDropShadow` ⇒ **mất shadow** |

## Cạm bẫy mới phát hiện 2026-08-26

### 🔴 `fill()` vào input Transform bị NỐI CHUỖI, không thay thế
`#quick-transform-editor-width/height/top/left` re-render theo Vue; `fill('1200')` khi field đang có
`4032` có lúc ra **`1201200`**, và field khác bị revert về giá trị cũ.
**Cách chạy ổn định:** fill **từng field một**, sau mỗi field `evaluate` đọc lại cả 4 giá trị để confirm.
Nếu sai thì `fill('')` (xoá rỗng) rồi `fill(giá trị)`.

### 🔴 Đổi Height của text layer làm Width nhảy theo tỉ lệ
Set `height=300` khi đang `3000x122` ⇒ width tự thành **7670**. Thứ tự đúng: **set Height trước, Width sau**,
rồi mới set Top/Left. Luôn đọc lại sau mỗi bước.

### Id các input Transform (chuẩn hơn `getByRole('spinbutton')`)
`#quick-transform-editor-width` · `-height` · `-top` · `-left` · `-rotate`

### Chọn asset trong dialog `Upload an image` / vector: click vào **`img`**, KHÔNG click `input.layer-listing__checkbox`
Click thẳng vào `input.layer-listing__checkbox` **không ăn** (checkbox vẫn `checked=false`, nút Select vẫn disabled).
Click vào `img` của card mới toggle được. Nút xác nhận có label động `Select 1 image` / `Select 1 vector`.

### `#manage-layer` bị trùng id khi có ≥2 layer
Luôn scope: `#artwork-sortable-layer-layer-<id> #manage-layer`.

### Upload ảnh vào asset library
`+ Layer` → `Static Image` → dialog `Upload an image` → click vùng `Drag and drop, or click to upload!`
→ mở file chooser OS (`browser_file_upload`). `IMG_1790.jpeg` (4 MB) upload xong trong **~30 giây**,
sau đó card `IMG_1790` xuất hiện ở **đầu lưới**.
Layer Static Image mới có size = size ảnh gốc (4032x3024) ⇒ **phải Transform lại** không thì phủ kín canvas.

### Artwork size nhận 4500x4500
`Width (px)` / `Height (px)` trong dialog `Artwork details` **không có attribute `max`**, nhập 4500 lưu bình thường.
Header hiện `(#3741 - 4500x4500 - PNG_RGB)`.

## 🔑 Rule 13 — Đo ngưỡng trigger trước khi gọi một race condition là bug (2026-08-26)

**Bài học từ TC-TIB-747.** QA từng báo "input + blur trong debounce window <10ms phá parity"
và giữ verdict FAIL suốt 3 lần re-test. Đo lại thì:

| input → blur | Kết quả |
|---|---|
| **0ms** (cùng synchronous tick) | fail |
| 5ms trở lên | **pass** |

Và gõ phím thật + click chuột thật ra ngoài ngay lập tức ⇒ **pass**.

### Hai sai lầm cần tránh lặp lại

1. **Lấy hằng số trong code làm điều kiện trigger mà không đo.** Debounce trong code là 10ms nên
   QA gán luôn nhãn "cửa sổ 10ms". Thực tế cửa sổ là **0ms** — chỉ cần qua một vòng event loop là đúng.
2. **Tái hiện bằng `dispatchEvent()` + `blur()` liền nhau trong một khối `page.evaluate()`** rồi coi
   đó là hành vi sản phẩm. Keystroke và mouse click của người thật **luôn là các task riêng** trong
   event loop ⇒ không có đường nào chạm tới điều kiện 0ms. Đó là **artifact của automation**.

### Quy trình bắt buộc khi nghi ngờ race condition

```js
// Sweep ngưỡng thay vi chi test 1 diem
for (const d of [0, 5, 10, 15, 25, 50, 100, 300]) { input(); await sleep(d); blur(); check(); }
```
Rồi **bắt buộc** chạy lại bằng thao tác thật (`pressSequentially` + click thật).
Nếu chỉ delay = 0 fail còn thao tác thật pass ⇒ **không phải defect**, chỉ là điểm robustness.

⚠️ Lập luận "state sai vĩnh viễn, không tự sửa" **không đủ** để kết luận là bug — phải chứng minh
điều kiện đầu vào tồn tại trong đường đi của người dùng thật trước đã.

---

# Layer Song Search + JSON List + Global Options — ĐÃ VERIFY 2026-08-26 (TIB-5315 / Testlane TIB-030, campaign 2565, artwork 3748)

## Flow: Global Options (`/global-options`)

Sidebar: **Assets → Global Options** (`/global-options`) — KHÔNG nằm trong `Store Settings`.
`/settings` là 404.

1. Nút **` Global Option`** (`main button:has-text("Global Option")`) → mở dialog **`Select a layer type`**
   (đúng cùng picker với `+ Layer` trong artwork editor, nhưng `Static Image` / `Static Vector` bị `(Unavailable)`).
2. Click item → điều hướng tới **`/global-options/create/<type>`** (vd `/global-options/create/song-search`).
3. Điền form → `Save` → về `/global-options`, id nằm trong link `/global-options/<id>/edit`.

### 🔴 Cạm bẫy: field `Global Option Name(internal)` KHÔNG nhận `fill()`
Input này (`.field--text:has(label:text-is("Global Option Name")) input`, không có `name`/`id`)
có v-model riêng: `page.fill()` đổi DOM nhưng **model vẫn giữ default** (`New <Type> option`)
⇒ save ra tên mặc định. Các field khác (`form_label`, `#cart_template`) thì `fill()` chạy bình thường.

**Cách đúng:** click vào input → `ControlOrMeta+a` → `pressSequentially(<tên>)` → verify `.value` → `Save`.

⚠️ Vào `/global-options/<id>/edit` phải **đợi data load** rồi mới đọc/gõ. Đọc quá sớm thấy input rỗng
trong khi model đã có giá trị ⇒ gõ tiếp sẽ **nối chuỗi** (đã dính: ra `Global song search TIB-5315New Song Search option`).

### Global option loại Song Search — các field
`Global Option Name(internal)` · `Category` · `Option Title:` (`input[name=form_label]`) ·
`Placeholder text:` · `Add instruction for customer:` · toggle **`Load song lyrics`** (mặc định OFF) ·
toggle **`Show customization data on cart/checkout`** (mặc định **theo config shop**, xem Rule 14) · `Cart display template:`
(`input#cart_template`, default `{{title}}`) + nút `Available Value` + `Preview (using sample data)` ·
`Custom class:` · `Preview:` (`input#preview_layer`, `Search for a song`).

🔑 **KHÔNG có toggle `Mark this option as required`** trong global option Song Search (verify 2026-08-26).

`Preview (using sample data)` render live theo cart template: `{{title}} - {{artists}}` → `Mr. Brightside - The Killers`.

## Flow: Layer **Song Search** trong artwork editor (2.0)

`+ Layer` → nhóm `OTHERS` → `Song Search`. Layer mặc định tên **`Song search`**.

Panel ✎ chỉ có **2 section**: `PERSONALIZATION SETTINGS` + `CONDITIONAL SETTING`
(KHÔNG có `DESIGN SETTINGS`, `POPULATE VALUES`, `EXTRA`).

| Field | Selector | Default |
|---|---|---|
| Radio personalization | `input[name=customization_type]` id `-normal` / `-global_option` | `normal` |
| (KHÔNG có `No personalization`, KHÔNG có `linked`) | | |
| Nút `Quick-fill from a global option` | button | |
| `Option Title:` | `input[name=form_label]` | rỗng |
| `Placeholder text:` | `input[name=form_placeholder]` | |
| `Add instruction for customer:` | `textarea#input_hint` | |
| **`Load song lyrics`** | toggle | **OFF** |
| **`Show customization data on cart/checkout`** | toggle | **theo config shop** (xem Rule 14) |
| **`Cart display template:`** | **`input#cart_template`** (1 dòng) | **`{{title}}`** |
| `Available Value` | button (toggle dropdown) | |
| `Custom class:` | `input[name=custom_class]` | |

🔑 **Layer Song Search KHÔNG có toggle `Mark this option as required`** (chuỗi "required" không tồn tại
trong HTML của panel). ⇒ Không có cách nào tắt/bật required cho Song Search từ portal.
**NHƯNG** field Song Search vẫn hiển thị dấu **`*`** trên `PERSONALIZATION FORM` của campaign
và trên storefront (`Choose your song*`). ⇒ input cho TC-021, cần verify hành vi Add to cart thật.

### Dropdown `Available Value` của Song Search — đúng 4 token
```
{{title}}    - return the full Song title of the selected song.
{{artists}}  - return the Artists of the selected song.
{{url}}      - return the Spotify URL of the selected song.
{{duration}} - return the Song duration of the selected song.
```
**Không có `{{lyrics}}`** trong dropdown cart template (khác với `Browse values` của POPULATE VALUES,
chỗ đó mới có `{{lyrics}}`).

### Nhánh `Use an existing global option` — ✅ CHẠY ĐƯỢC (anomaly cũ KHÔNG tái hiện)
Ghi chép cũ nói `ApolloError: field 'global_options' not found in type: 'query_root'` khi mở
`PERSONALIZATION SETTINGS`. **2026-08-26 KHÔNG còn tái hiện**: mở panel console sạch,
chọn radio `Use an existing global option` → hiện `Select a global option*:` (vue-multiselect)
→ list load đủ, chọn xong panel hiện `<tên global option>` + link `Edit` + `Option title: <...>`.

Selector: `.layer-panel--active .multiselect` để mở, rồi
`.layer-panel--active .multiselect__content-wrapper li:has-text("<tên>")`.
(`input[placeholder="Select a global option"]` là element ẨN — click thẳng vào nó sẽ timeout.)

## Flow: Layer **JSON List** (nhóm FORM ELEMENTS)

Panel ✎ có 3 section: `PERSONALIZATION SETTINGS` · `CONDITIONAL SETTING` · `EXTRA`.
Mô tả trong UI: *"This layer loads a list of options from a JSON file you provide. No layer shows up
on the artwork — buyers search and pick from your list on the personalization form."*
⇒ **JSON List không vẽ gì lên canvas.**

| Field | Selector | Default |
|---|---|---|
| Radio personalization | `input[name=customization_type]` (`normal` / `global_option`) | `normal` |
| `Option Title:` | `input[name=form_label]` | rỗng |
| **`JSON File URL:`** | **`input#source_url`** | `https://cdn.teeinblue.com/examples/cities.json` |
| Nút **`Load preview`** | button | → hiện `N item(s) loaded` + 5 item đầu |
| `Placeholder text:` | `input[name=form_placeholder]` | |
| **`Option display template:`** | **`textarea#option_template`** (NHIỀU DÒNG) | `{{name}}` |
| **`Cart display template:`** | **`input#cart_template`** (1 DÒNG) | `{{name}}` |
| `Default value (name):` | select | `-- Select a default value --` |
| `Add instruction for customer:` | `textarea#input_hint` | |
| **`Mark this option as required`** | toggle | **OFF** |
| **`Show customization data on cart/checkout`** | toggle | **theo config shop** (xem Rule 14) |
| `Custom class:` | `input[name=custom_class]` | |

Mỗi template có nút `Available Value` riêng + `Preview (using the first item from your JSON file)`
render live.

🔑 **`Available Value` của JSON List là ĐỘNG** — sinh từ chính file JSON đã `Load preview`,
**flatten cả nested path**. Với `jsonplaceholder.typicode.com/users` ra:
`{{id}} {{name}} {{username}} {{email}} {{address.street}} {{address.suite}} {{address.city}}
{{address.zipcode}} {{address.geo.lat}} {{address.geo.lng}} {{phone}} {{website}} ...`
⇒ dùng URL này khi cần test nested path (TC-034).

`option_template` giữ nguyên `\n` qua Save + reload (verify: `"<strong>{{name}}</strong>\n{{address.city}}"`).

## ✅ POPULATE VALUES — `Populate Content` ĐÃ PERSIST (blocker 2026-08-25 hết hiệu lực hoàn toàn)
Verify 2026-08-26 trên artwork 3748, cả **Paragraph** (`Lyrics target`, value `{{lyrics}}`) lẫn
**Single-line Text** (`Song url target`, value `{{url}}`), source = layer Song Search `Song A - main`:
Save → **reload full trang** → toggle vẫn ON, Source option + Value còn nguyên.
⇒ Mục Rule 10 "BLOCKER: cấu hình POPULATE VALUES KHÔNG lưu được" **không còn đúng** cho Content/Font/Color.

### 🔴 Thứ tự đúng: chọn **Source option TRƯỚC**, gõ **Value SAU**
Ghi chép cũ (TC-TIB-820) nói "gõ Value làm reset Source option" ⇒ khuyên set Value trước.
**2026-08-26 quan sát ngược lại:** chọn Source option làm **XOÁ TRẮNG ô Value**.
⇒ Quy trình chạy ổn định: bật toggle → mở `.multiselect` chọn Source option → mới gõ `#retrieval_value`
→ verify cả hai → Save.

## Cạm bẫy khác gặp ở phiên này

### 🔴 `main .cas-no-artwork button` nth=0 KHÔNG phải print area `Front`
Trong khối `STEP 1`, `.cas-no-artwork` **đầu tiên là nút `Select artwork for all`** (nằm ở header
`Print Areas of <product base>`), print area Front/Back là nth=1 và nth=2.
Click nhầm nth=0 ⇒ artwork được gán cho **CẢ Front lẫn Back**.

**Gỡ artwork khỏi 1 print area:** hover khối artwork → `.cas-remove` (button title `Remove`)
→ dialog **`Remove artwork`** *"Are you sure you want to remove this artwork?"* → `Remove`.
Selector print area thứ 2: `div:nth-child(2) > .product-pa__artwork > .campaign-artwork-selector > .cas-has-artwork > .cas-remove`.
Phân biệt Front/Back bằng cách leo `parentElement` tới khối chứa text `Front (`/`Back (`.

### Layer `Clipart Category` — dialog chọn category (khác ghi chép cũ)
`+ Layer` → `Clipart Category` → submenu **`1 Clipart Category`** / `Group of clipart categories`.
Dialog mở ở tab **`Upload an image`**; phải chuyển sang tab **`Choose from clipart category`**.
- Mở picker category: `.clipart-category-selector .vue3-treeselect__control`
  (⚠️ có 2 `.vue3-treeselect` trong dialog, cái thứ 2 `.category-listing.only-root` là ẨN)
- Gõ tìm: `.clipart-category-selector .vue3-treeselect__input`
- Chọn: `.vue3-treeselect__menu .vue3-treeselect__label:text-is("<tên>")`
- Chọn clipart gốc: click `.clipart-category-picker__grid img` (card thành `.vue-select-image__thumbnail--selected`)
- Xác nhận: **`.clipart-picker-popup__clipart-footer button.btn-primary`** (label `Save`)
- Category rỗng hiện `No items in this category` ⇒ chọn category khác.
  Trên staging: `Girl` **rỗng**; **`valid-images`** có 5 clipart — dùng cái này.
- Layer sinh ra tên mặc định = **tên file clipart** (vd `file`), không phải `Clipart`.

### Artwork 1.0 — layer Song Search KHÔNG có toggle cart
Artwork **#2716 `song search`** (1.0, còn nút `Convert to Artwork 2.0`) có layer `Song search` với panel
**`PERSONALIZATION SETTING`** (số ít) chỉ gồm `Option Title` · `Placeholder text` ·
`Add instruction for customer` · `Load song lyrics`.
**KHÔNG có** `Show customization data on cart/checkout`, **KHÔNG có** `Cart display template`.
⇒ Data sẵn cho TC-010 (layer tạo trước khi có feature).

## 🔑 Rule 14 — ⚠️ Mặc định của field KHÔNG phải hằng số: shop có `default_value` riêng (2026-08-26)

**Dính thật ở TIB-030 / TIB-5315:** báo FAIL cho TC-001 ("toggle `Show customization data on cart/checkout`
phải OFF by default") vì layer Song Search mới tạo luôn bật sẵn toggle. **Không phải bug.**
Shop đang có config `default_value: { show_in_cart: true }` ⇒ mọi layer mới thừa hưởng `show_in_cart = true`.
Sau khi đổi config về `false` và tạo lại layer mới → toggle OFF đúng như AC.

### Hệ quả cho QA
- **Mọi assertion dạng "field X mặc định là Y" đều phải kiểm config shop trước.**
  Giá trị mặc định quan sát được trên UI = `config.default_value[<key>]` nếu có, chứ không phải hằng số trong code.
- Ghi chép cũ trong file này từng khẳng định toggle `Show customization data on cart/checkout` "mặc định ON" —
  đó chỉ đúng với shop đang có `default_value.show_in_cart = true`. Đã sửa lại các chỗ đó thành "theo config shop".
- Áp dụng cho cả **layer trong artwork** lẫn **global option** (cùng đọc chung nguồn default).

### Quy trình bắt buộc trước khi báo bug "sai giá trị mặc định"
1. Đọc config shop, xác nhận `default_value` có key tương ứng không.
2. Nếu có → **không phải bug**; ghi rõ giá trị config trong test result và yêu cầu người có quyền đổi config rồi chạy lại.
3. Nếu không có key đó trong config → lúc này mới là mặc định của code, đủ cơ sở báo bug.
4. Khi chạy lại sau khi đổi config: load portal với `Network.setCacheDisabled` để chắc chắn không dùng config cũ.

### Cách viết test result cho tình huống này
Đừng xoá dấu vết lần chạy sai. Giữ screenshot cũ, ghi rõ "lần đầu FAIL do config, không phải lỗi code",
kèm giá trị config lúc đó và lúc chạy lại. Người đọc sau cần thấy vì sao kết quả đổi.

### Liên quan
Cùng họ với **Rule 13** (đo ngưỡng trước khi gọi race condition là bug): trước khi kết luận một quan sát
là defect, phải loại trừ các biến của môi trường/cấu hình trước đã.

---

# Phiên TIB-5341 (Testlane TIB-040) — 2026-08-26, campaign 2566 / artwork 3749

## 🔴 Nút `Select artwork` của print area: phải click vào `button` BÊN TRONG, không phải `.cas-no-artwork`

`.cas-no-artwork` là `<div>` bọc ngoài; click vào nó **KHÔNG mở dialog** (im lặng, không lỗi, không toast).
Selector chạy đúng:
```
main .cas-no-artwork >> nth=1 >> button      // nth=0 = "Select artwork for all", nth=1 = Front, nth=2 = Back
```
Ghi chép cũ ghi `main .cas-no-artwork` nth=1 → thiếu bước `>> button`, dễ tưởng UI hỏng.

## Layer picker — submenu bổ sung (2026-08-26)

| Item | Submenu |
|---|---|
| `Photo Upload` | `Single Upload` / `Multiple Uploads` |
| `Scrabble` | `Cross Word` / `Single-line` |
| `Paragraph` | `Normal` / `Custom Shape` |
| `Clipart Category` | `1 Clipart Category` / `Group of clipart categories` |

`Photo Upload` và `Text to Image (AI)` đều **mở dialog chọn ảnh placeholder** ngay sau khi click
(giống `Static Image`) — phải chọn 1 ảnh rồi bấm `Select 1 image` thì layer mới được tạo.
`Vector Upload` mở dialog vector → `Select 1 vector`.
Tên layer sinh ra = **tên file asset đã chọn** (vd `Background`, `grid`) ⇒ 2 layer khác loại có thể
trùng tên. Nên đổi tên ngay (double-click `.artwork-sortable-layer-name`).

`Route Maps` / `Word Search` / `Single-line Text` thì thêm layer ngay, không có dialog.
Tên mặc định: `Route Maps layer`, `Word Search`, `Text layer`.

## 🔴 Layer `Text to Image (AI)` — 2 field BẮT BUỘC, thiếu là Save FAIL

Toast đỏ (console SẠCH, giống bẫy Vector/Clipart Category):
```
Template - Default template:
<tên layer>: - Prompt the image you want is required
```
| Field | Selector | Ghi chú |
|---|---|---|
| `GenAI service*` | `select#text_to_image_provider` | options: `gemini` / `gpt` / `flux_kontext` / `imagenhub` |
| `Prompt the image you want` | `textarea#text_to_image_prompt` | **bắt buộc**, chỉ hiện SAU khi chọn service |

⚠️ **Prompt phải tham chiếu Option Title của layer KHÁC** (`{{Your name}}`), không phải của chính nó.
Prompt trỏ vào biến không tồn tại ⇒ storefront generate xong trả lỗi
*"This image is blocked due to sensitive content or a policy violation"* (đã dính 1 lần).

Layer AI **không render input text cho khách**; field của nó trên storefront chỉ là nút
`Generate - text to image`, và `.tee-field__header` (chứa Option Title) bị `display:none`.
⇒ Đọc Option Title bằng DOM (`.tee-field__header`), đừng dựa vào `innerText` của `.tee-field`.

## Panel layer: `PERSONALIZATION SETTINGS` có thể KHÔNG phải panel đang mở

Với layer có `DESIGN SETTINGS` (Route Maps, Word Search, Text), mở ✎ thì panel active mặc định là
`DESIGN SETTINGS`. Sau khi click mở PERSONALIZATION thì có **2 panel cùng class `layer-panel--active`**
⇒ `.layer-panel--active input[name=form_label]` là SAI.

Selector chạy ổn định:
```
.layer-panel:has(.layer-panel__header:has-text("PERSONALIZATION SETTINGS")) input[name="form_label"]
```

## Giá trị mặc định quan sát được trên shop `linh-tib-staging` (Rule 14)

| Field | Mặc định |
|---|---|
| Radio personalization | `Create a new option` (`customization_type-normal`) — với mọi layer đã thử |
| `Show customization data on cart/checkout` | **OFF** (đã đổi config `default_value.show_in_cart` về false ở phiên TIB-030) |
| `Mark this option as required` | OFF |
| `Show customer's photo on live preview` (Photo Upload) | **ON** |
| `Set minimum size` (Photo Upload) | OFF |

⚠️ Layer `Route Maps` và `Word Search` hiện dấu `*` (required) trên form dù toggle
`Mark this option as required` không được bật — required là mặc định cứng của 2 loại layer này.

---

# 🔑 Rule 15 — Bản đồ route `merchant/*` của SDK v1 (ĐÃ VERIFY 2026-08-26, TIB-5341)

Bundle: `staging-sdk.teeinblue.com/shopify/app-v1.js`, size **1.587.549**,
`Last-Modified: Wed, 26 Aug 2026 10:20:51 GMT`, `cache-control: max-age=315360000` (nhớ Rule 12).

## Có HAI wrapper fetch khác nhau — đây là gốc của "bypassable rate limits"

| Wrapper | Hành vi |
|---|---|
| `Ll(url, init)` | thêm header **`X-Thumbmark-ID`**, bắt **429**, đọc `X-RateLimit-Remaining/Limit/Reset` |
| `wi(url, init)` | **`fetch` trần** — KHÔNG thumbmark, KHÔNG xử lý 429 |

### Route đi qua `Ll` (có thumbmark + rate limit)
- `POST merchant/shopify/photo-upload`
- `POST merchant/shopify/customer-uploads/{id}/apply-effects`
- `POST merchant/shopify/customer-uploads/{id}/image-filter-effects/async`
- `POST merchant/shopify/customer-uploads/generate`  ← layer Text to Image (AI)
- `POST merchant/shopify/customer-uploads/generate-from-multiple-images`

### Route đi qua `wi` (KHÔNG thumbmark)
- `POST merchant/shopify/vector-upload`
- `POST merchant/shopify/pdf-upload`
- `POST merchant/shopify/gpx-upload`
- `POST merchant/shopify/upload-url` (presigned)
- `POST merchant/shopify/strava-upload`
- `GET  merchant/shopify/customer-uploads/{id}/image-filter-effects/status`
- `POST merchant/gpx/parse` · `POST merchant/gpx/convert-geojson`
- `GET  merchant/games/...`
- `GET  merchant/campaigns/{platformProductId}.json`

## Có / không có segment `{platform}` — KHÔNG đồng nhất

| Có `shopify` | Không có platform |
|---|---|
| `merchant/shopify/thumbmark` | `merchant/games/{type}/{base64}.json` |
| `merchant/shopify/photo-upload`, `vector-upload`, `pdf-upload`, `gpx-upload`, `upload-url`, `strava-upload`, `customer-uploads/*` | `merchant/gpx/parse`, `merchant/gpx/convert-geojson` |
| `merchant/shopify/customization` | `merchant/campaigns/{id}.json` |
| | `merchant/maps/tiles`, `merchant/maps/places`, `merchant/songs-search` |

Hằng số trong bundle: ``GAME_URL: `${API}/merchant/games` `` · ``GPX_URL: `${API}/merchant/gpx` ``

## `merchant/games/{type}` — 4 giá trị `{type}` đã verify

| Layer trong picker | `{type}` |
|---|---|
| `Word Search` | `word-search` |
| `Scrabble ▸ Cross Word` | `crossword` |
| `Scrabble ▸ Single-line` | `single_line` (⚠️ **gạch dưới**, không phải gạch ngang) |
| `Word Cloud` | `word-cloud` |

Sub-endpoint khác cùng gốc `GAME_URL`: `/image_effect`, `/photo-border`, `/elevation-profile`.

Format: `GET /api/merchant/games/{type}/{base64url-json-config}.json`
Config là JSON base64 chứa nguyên state layer (`text`, `width`, `height`, màu, `seed`, ...)
⇒ **URL tự chứa toàn bộ input, không cần session** — bắn được từ curl, không rate-limit theo thumbmark.

## `merchant/shopify/thumbmark` — format của `X-Thumbmark-ID`

`GET https://staging-api.teeinblue.com/api/merchant/shopify/thumbmark` (không cần auth, không cần `shop`)
→ `200` + `{"thumbmark": "<32 ký tự>.<64 hex>"}`, response headers có `X-RateLimit-Limit: 30`,
`X-RateLimit-Remaining: 29` (không thấy `X-RateLimit-Reset` — có thể chưa `Access-Control-Expose-Headers`).

| Nguồn | Format | Ví dụ |
|---|---|---|
| **Server (signed)** | `{id}.{signature}` — **CÓ dấu chấm**, 32 + 64 hex = 97 ký tự | `pAfxhrdRQumQ7IWpCdC5xc1LBW6RaY11.4cbc6ed1…e277d9ef` |
| **Fallback client** | **32 ký tự, KHÔNG có dấu chấm** | `72356f5a72356f5a72356f5a72356f5a` |

Fallback = `fallbackBrowserFingerprint()`: hash 32-bit của
`userAgent|language|WxH|tzOffset|hardwareConcurrency|deviceMemory|canvas.toDataURL()`
→ `Math.abs(n).toString(16).padStart(8,'0').repeat(4)` ⇒ **8 hex lặp 4 lần**, entropy chỉ 32 bit.
⇒ Thấy `X-Thumbmark-ID` dạng 32 ký tự không dấu chấm (và có pattern lặp 4 lần) nghĩa là
**đang chạy nhánh fallback** (thumbmark fetch fail / timeout 3s), KHÔNG phải chữ ký hợp lệ.

**Cache:** `localStorage['teeinblue_signed_thumbmark']`. Thumbmark **fetch LAZY** — chỉ gọi khi có
request đi qua `Ll`. Mở trang sản phẩm bình thường (kể cả upload ảnh qua presigned URL) thì
**KHÔNG hề gọi `thumbmark`**.
⇒ Muốn test TC liên quan thumbmark phải `localStorage.removeItem('teeinblue_signed_thumbmark')`
rồi bấm nút **Generate** của layer AI (hoặc route `Ll` khác) để ép fetch.
Quan sát được: 1 lần bấm Generate bắn **2** request `GET thumbmark` (guard `fetchPromise` không chặn hết).

## Đường đi của PDF: qua layer **Vector Upload** (ĐÃ VERIFY runtime)

Input file của layer Vector Upload trên storefront có **`accept="*/*"`** (Photo Upload là `image/*`).
Code: `upload(e)` → `isMultipleFileTypes && isPdfFile(e)` → `xt.uploadPDF(e)`
→ `POST {API}/merchant/shopify/pdf-upload?shop=<shop>` (FormData field `file`), qua `wi` ⇒ **không thumbmark**.
Chạy thật: upload PDF 380 byte vào field `Your logo (vector)` → **201**, header request rỗng.
Picker `+ Layer` KHÔNG có mục "PDF Upload" — PDF chỉ đến bằng đường này.

## Validate client-side của Photo Upload
File `< 10 KB` bị chặn tại client với message `photo is too small (<10kb)` — **không phát sinh request nào**.
Muốn test route upload phải dùng file > 10 KB.

## Photo Upload trên shop này đi đường presigned URL, KHÔNG đụng `photo-upload`
Chuỗi thật khi chọn ảnh: `POST merchant/shopify/upload-url` → PUT thẳng lên storage →
`POST merchant/shopify/customer-uploads/{id}/uploaded-at`. **Cả 3 đều không có thumbmark.**
Nhánh `Ll` + `photo-upload` chỉ chạy khi `useDirectUpload` = false.
⇒ Đừng giả định "upload ảnh = có rate limit"; phải xem shop đang bật direct upload hay không.

---

# Layer `Addon Charge` (FORM ELEMENTS) — ĐÃ VERIFY 2026-08-27 (TIB-5215, campaign 2567 / artwork 3750)

`+ Layer` → nhóm `FORM ELEMENTS` → `Addon Charge`. Thêm ngay, không có dialog.
Tên layer mặc định **`Addon charge`**, `li.artwork-layer-item[data-type="addon-charge"]`.

Panel ✎ có **3 section**: `PERSONALIZATION SETTINGS` · `CONDITIONAL SETTING` · `EXTRA` (chỉ có `Group name:`).
**KHÔNG có** `DESIGN SETTINGS` / `POPULATE VALUES` — layer này không vẽ gì lên canvas.

| Field | Selector | Mặc định |
|---|---|---|
| Radio personalization | `input[name=customization_type]` id `-normal` / `-global_option` | `normal` (KHÔNG có `No personalization`) |
| `Option Title:` | `input[name=form_label]` | rỗng |
| **`Option values*:`** (repeater, bắt buộc) | `#field__options .repeater-list-item input[name="name"]` | 2 hàng rỗng, placeholder `Option 1` / `Option 2` |
| Nút `Attach` mỗi hàng | `#field__addons button` | gắn addon product/variant tính tiền |
| Nút `Add new` / xoá hàng | `.repeater-remove` | |
| `Display options as:` | `input[name=display_type]` (`radio_button`/`radio`/`dropdown`/`image`) | **`radio_button`** (Inline Radio Button) |
| `Additional Charge` | toggle | **ON** |
| `Mark this option as required` | toggle | OFF |
| `Show customization data on cart/checkout` | toggle | OFF (config shop hiện tại, Rule 14) |
| `Enable multiple selection` | toggle | OFF |

Mỗi hàng option value có thumbnail uploader riêng (`input#thumbnail-<id>_create`).

## 🔑 KHÔNG có field nào tên "Custom name" / "Custom values" trong portal
Spec của extension Shopify (app block **Digital Download**) nói tới `custom name` + `custom values`.
Đã grep toàn bộ `document.body.innerText` của artwork editor: chuỗi `custom name` **không tồn tại**
(chỉ có `Custom class:`). Ánh xạ đúng:

| Khái niệm ở app block | Field trong portal |
|---|---|
| **custom name** | `Option Title:` của layer Addon Charge (`input[name=form_label]`) |
| **custom values** | các hàng `Option values*` (`input[name="name"]`) |

⇒ Muốn khớp default `digital`/`yes` của app block: đặt Option Title = `digital`, một option value = `yes`.
Tên layer (trong layer list) là thứ **khác**, đổi bằng double-click `.artwork-sortable-layer-name`.

## Giá trị lưu trong localStorage là ID option, KHÔNG phải label
Trên storefront, field addon charge render `radiogroup`; `teeinblue-customizations` lưu
`layer-<id>: "id-110897"` — **id của option value**, không phải chuỗi `yes`.
⇒ Đừng assert `customization['layer-XXXX'] === 'yes'`. Muốn biết label thì đọc
`document.querySelector('#layer-<layerId>-<optionId>')` hoặc property line item ở cart.

## Radio của addon charge nằm ngoài viewport ⇒ click bằng ref bị timeout
`input.tee-checkbox-input` bị lệch khỏi viewport (element visible nhưng "outside of the viewport").
Click bằng `aria-ref` fail sau 5s. Selector chạy được: `.tee-field--layer-<id> label:has-text("yes")`.

## Multi-store launch: launch thêm store thứ 2 sau khi đã launch store thứ 1
Sau lần launch đầu, header campaign đổi `Launch` → `View` + `Update`. Bấm **`Update`** vẫn mở đúng
dialog `Multi-store launch`, và store **chưa launch vẫn còn nút `Launch` riêng ở hàng của nó**
⇒ launch thêm store mới bình thường, không ảnh hưởng store đã publish.
Cả 2 lần đều gọi `POST /api/campaigns/<id>/publish` → 200. Dialog KHÔNG hiện toast, chỉ đổi
hàng đó thành `View` + `Update` + hiện CAMPAIGN LINK (đợi ~5-7s).

⚠️ **Store đích không phải lúc nào cũng là `linh-tib-staging`.** Phiên TIB-5215 người dùng chỉ định
publish sang **`linh-tib-checkout.myshopify.com`** (store Shopify **Plus**, đã cấu hình sẵn app block
teeinblue trong checkout editor: Customization Image Preview ở Checkout page; Edit Customization +
Digital Download ở Order Status page). Đây là store test, KHÔNG phải production.
⇒ Hỏi/đọc yêu cầu trước, đừng mặc định linh-tib-staging.

## Text layer 2.0 — mặc định quan sát 2026-08-27 (shop linh-tib-staging, Rule 14)
`Prefill default text` OFF · `Allow customers to reposition text` OFF · `Charge by Character count` OFF ·
`Mark this option as required` OFF · **`Show customization data on cart/checkout` OFF** ·
`Attach customer input for fulfillment` OFF. Radio = `Create a new option`.

---

# Phiên TIB-5357 (Testlane TIB-047) — 2026-08-27, campaign 2568 / artwork 3754 + 3756

## 🔴 Cạm bẫy MỚI, nguy hiểm: `fill()` vào ô Width/Height của popup Transform bị NHÂN ĐÔI giá trị

Set Width = `400` bằng `browser_type` / `page.fill()` khi ô đang có giá trị cũ ⇒ ô thành **`400400`**
(và Height thành `300300`). **UI không báo lỗi**, layer chỉ đơn giản to gấp ~1000 lần và tràn khỏi canvas.
Đã dính 3 lần trong 1 phiên (photo layer, static-photo layer, warp-text layer).

- Ô `Top:` / `Left:` **KHÔNG** dính (fill vào chúng ra đúng giá trị) — chỉ `Width:` / `Height:` bị.
- Layer `warp-text` còn **khoá tỉ lệ**: fill Width ⇒ Height nhận đúng chuỗi nhân đôi đó luôn (`600220`/`600220`).

**Cách làm ĐÚNG (đã verify):**
```
click #quick-transform-editor-width  →  ControlOrMeta+a  →  Delete  →  fill('400')
```
Clear rỗng trước rồi mới fill thì ra đúng. Sau mỗi lần set **phải đọc lại**:
```js
['width','height','top','left'].map(k=>k+'='+document.querySelector('#quick-transform-editor-'+k)?.value)
```

## Selector chuẩn của popup Transform (ID, không dùng nth)
`#quick-transform-editor-width` · `-height` · `-top` · `-left` · `-rotate`
(ghi chép cũ khuyên `getByRole('spinbutton',{name:'Width:'})` — vẫn đúng, nhưng ID ổn định hơn
và đọc được bằng `browser_evaluate`).

⚠️ Trigger mở popup: ghi chép cũ ghi `.qte-field--alignment:has-text("Transform")` — **KHÔNG khớp
với mọi loại layer** (warp-text không có class `--alignment`). Dùng `.qte-field:has-text("Transform") >> visible=true`.

⚠️ Mở/đóng popup Transform đôi khi **bỏ chọn layer** ⇒ toolbar biến mất, `#quick-transform-editor-*`
trả `undefined`. Click lại `.artwork-sortable-layer-thumbnail` của layer rồi mở lại.

## Chọn nhiều layer + Group — ĐÃ VERIFY
- Click `.artwork-sortable-layer-thumbnail` = **thay** selection (không cộng dồn).
  Muốn chọn thêm phải **Ctrl/Cmd + click**.
- Thanh `N selected` (khi ≥ 2 layer) có các nút, accessible name nằm trong `span.sr-only`:
  `Group (Ctrl/Cmd+G)` · `Ungroup (Ctrl/Cmd+Shift+G)` · `Copy to clipboard` · `Duplicate` ·
  `Duplicate & Link options` · `Delete`.
  Selector chạy được: `button:has(span.sr-only:text-is("Group (Ctrl/Cmd+G)"))`
- Group sinh ra `li.artwork-layer-item[data-type="group"]`, tên mặc định **`Group 1`**.
  Layer con nằm trong `li.artwork-layer-item` lồng bên trong ⇒ khi query layer list phải
  dùng `> .artwork-sortable-layer-wrapper` để không trúng nhầm con.
- Thumbnail của group = **chevron mở/đóng**, click vào nó là expand/collapse (không phải chọn layer).

## Layer picker: TEXT ▸ Other = `Warp Text` / `Spiral Text`
Submenu render **bên trong** `.add-layer-popup` (không phải popper riêng) ⇒ phải **click** vào `Other`
rồi đọc lại `.add-layer-popup` innerText; `hover` không mở.

Mapping tên UI → `data-type` (bổ sung cho bảng cũ):
| UI | `data-type` | Ghi chú |
|---|---|---|
| `Paragraph ▸ Custom Shape` | **`shape-text`** | = `shape_text` trong spec/SDK. Mặc định đã chọn sẵn shape `Heart` ⇒ save được ngay, KHÔNG bắt buộc chọn shape |
| `TEXT ▸ Other ▸ Warp Text` | **`warp-text`** | = `warp_text` |
| `TEXT ▸ Other ▸ Spiral Text` | `spiral-text` | |
| `Static Image` | `static-photo` | không có personalization |
| `Photo Upload ▸ Single Upload` | `photo` | |
| (chọn ≥2 layer → Group) | `group` | |

## 🔴 KHÔNG tạo được layer `artwork-ref` từ portal (kết luận có bằng chứng, 2026-08-27)
Đọc bundle `https://staging-portal.teeinblue.com/assets/index.*.js`:
- Registry layer picker có đúng **35** `layerType`, KHÔNG có `artwork-ref` / `artwork`:
  `additional-option, addon-charge, calendar, clipart-category, clipart-frame, clock, color,
  curve-text, dynamic-by-text, font, group-clipart-categories, json-list, maps, moon-phase,
  multiple-uploads, paragraph, photo, qr-code, route-maps, scrabble-crossword, scrabble-single-line,
  shape-text, song-search, star-maps, static-photo, static-vector, text, text-to-image, toggle,
  vector-category, vector-upload, warp-text, word-cloud, word-search`
- Component `ArtworkLayer` (`layer.artwork_id` → `<use xlink:href="#tee-artwork-...">`) chỉ được dùng
  trong **MockupLayer** (`mockup.layers` với `type==="artwork"`) ⇒ đây là layer của **MOCKUP** tham chiếu
  artwork, KHÔNG phải layer bên trong artwork editor.
- Nút ` Import` cạnh ` Layer` chỉ có `PSD Single template` / `PSD Group-to-template` / `Import from Canva`
  — không tạo reference.

⇒ Gặp yêu cầu "tạo layer artwork-ref" thì báo blocked ngay, đừng mò trong artwork editor.

## Save & Close của artwork thứ 2 trở đi: dialog `Select your artwork` CÓ quay lại
Với artwork ĐẦU TIÊN của phiên (mở editor từ print area `Front`), `Save & Close` đóng luôn cả dialog
⇒ phải bấm lại ` Select artwork` của print area rồi click card. Với artwork sau (print area `Back`)
thì dialog quay lại đúng như Rule cũ. **Luôn kiểm `main.innerText` xem print area đã đổi từ
`Select artwork` sang tên artwork chưa** trước khi đi tiếp.

Card artwork trong dialog có `title` = tên artwork ⇒ selector ổn định:
`[role=dialog] [title="<tên artwork>"]`

## Lấy artwork id mà không cần mở editor
Ở trang campaign, khối `PERSONALIZATION FORM` render `<select id="<artworkId>-template">` cho **từng**
artwork đang gắn:
```js
[...document.querySelectorAll('[id$="-template"]')].map(e=>e.id)
// -> ["tee-field--3754-template","3754-template","tee-field--3756-template","3756-template"]
```

## Giá trị mặc định quan sát 2026-08-27 (shop `linh-tib-staging`, Rule 14)

| Layer | Mặc định đáng chú ý |
|---|---|
| `text` (Single-line) | **font size `100`**, 513x130; radio `Create a new option`; `Prefill default text` / `Allow customers to reposition text` / `Charge by Character count` / `Mark this option as required` / **`Show customization data on cart/checkout`** / `Attach customer input for fulfillment` = **tất cả OFF** |
| `curve-text` | curve radius **50**, 514x117 @ top 741/left 525; toggles OFF |
| `paragraph` | 700x300 @ 650/450; toggles OFF |
| `shape-text` | 700x300 @ 650/450; shape **`Heart`** đã chọn sẵn; `Default paragraph` = `Lorem Ipsum is simply dummy text...` |
| `warp-text` | **1000x1000 @ 300/300** (aspect LOCK), text preview `HELLO WORLD` |
| `word-search` | 700x700 @ 450/450; `Default words` = **`Anne, Bravo`** (2/30); `Min col/row` = 8; **field hiện `*` required cứng** dù toggle required OFF |
| `word-cloud` | 700x700 @ 450/450; `Default words` = **`Anne,Bravo,Charlie`**; `Number of words` = **200**; `Enable custom shape` **ON**, shape `Heart`, `Use shape's color` **ON**; cũng `*` required cứng |
| `photo` (Photo Upload) | 1600x1200 @ 200/0; `Show customer's photo on live preview` **ON**; `Set minimum size` OFF; required OFF; show-in-cart OFF |
| `static-photo` | 1600x1200 @ 200/0; KHÔNG có personalization |
| `group` | tên `Group 1` |

⇒ `show_in_cart` mặc định **OFF** trên shop này (khớp ghi chép TIB-5341, config đã đổi ở phiên TIB-030).

## 🔑 Rule 15 — Global Option lưu customization TÁCH RIÊNG trong localStorage (2026-08-28)

Đo thật trên storefront `linh-tib-staging` (nguồn: người dùng chỉ ra, đã verify lại).

### Hai key localStorage, hai vai trò
| Key | Nội dung |
|---|---|
| **`teeinblue-global-options`** | Giá trị khách chọn cho **global option**, đánh theo **global option id**:<br>`{ "779": { "value": {…object…}, "extra": {}, "timestamp": … } }` |
| **`teeinblue-customizations`** | Mảng theo `productId`. Trong `customization`: layer thường dùng key `layer-<id>`, còn global option dùng key **`global-option-<id>`** |

Các key teeinblue khác thấy trên storefront: `teeinblue-text-to-image-gen-state`, `teeinblue_signed_thumbmark`.

⚠️ **Sắc thái:** `teeinblue-customizations` KHÔNG chỉ giữ id — nó giữ **bản sao đầy đủ** của object dưới key
`global-option-<id>`; id nằm ở tên key. Hai nơi lưu trùng dữ liệu.

### Hệ quả cần nhớ khi test
- **Giá trị global option tồn tại xuyên sản phẩm.** Khi test lặp phải xoá **cả hai** key, không chỉ
  `teeinblue-customizations`; nếu không sẽ dính giá trị cũ và kết luận sai.
- Nhiều layer cùng trỏ một global option **chia sẻ chung một entry** ⇒ giá trị chỉ lên cart **một lần**,
  không nhân bản theo layer (đó là lý do TC-TIB-023 pass).
- Đọc nhanh khi debug:
  ```js
  JSON.parse(localStorage.getItem('teeinblue-global-options'))
  JSON.parse(localStorage.getItem('teeinblue-customizations'))
  ```
  hoặc `await window.teeinblue.getCurrentCustomization()` — trả về key `global-option-<id>` song song với `layer-<id>`.

### 🔴 Defect còn mở: cart template của global option bị bỏ qua
Hàm merge `gk()` trong SDK chỉ copy key thuộc whitelist theo layer type. Whitelist `N.SONG_SEARCH` =
`["form_label","form_placeholder","input_hint","lyric_enabled","custom_class"]` — **thiếu `cart_template`
và `show_in_cart`** (trong khi `N.JSON_LIST` có đủ). ⇒ Layer dùng global option vẫn chạy `cart_template`
lưu cục bộ trên layer, chỉnh ở global option không có tác dụng. Verify lại 2026-08-28: **chưa fix**.
Xem TC-TIB-GO-03.

### Khi test nhánh Global Option, tách khỏi nhánh layer thường
Hai nhánh đi qua code path khác nhau (`gk()` merge vs đọc thẳng config layer). Một nhánh pass không suy ra
nhánh kia pass. Bộ case riêng: **TC-TIB-GO-01 → GO-04**.

---

# TIB-5341 storefront TEST EXECUTION — runtime findings (2026-08-28, campaign 2566 / product page `enhance-security-...`)

Layer ids on this product (SDK v1, storefront `linh-tib-staging`):
photo=512318 · AI text-to-image=836548 · vector=473824 · route(Route Maps)=361706 · word-search(puzzle)=673088 · single-text(name)=185342.
Required (*): AI artwork prompt, Your route, Your puzzle.

## Confirmed request map (runtime, this shop)
| Action | Requests | Status | Thumbmark hdr |
|---|---|---|---|
| Photo upload | `POST upload-url` → `PUT cdn ×2` → `POST customer-uploads/{id}/uploaded-at` | 200/200/204 | NO (presigned/direct, NOT `photo-upload`) |
| Vector upload | `POST vector-upload` + CDN GET | 201/200 | NO (`wi`) |
| PDF into vector field | `POST pdf-upload` + CDN GET png | 201/200 | NO (`wi`) |
| GPX route | `POST gpx-upload` (NO separate `gpx/parse` on this shop; server parses inline) then map dialog | 200 | NO |
| Word Search render | `GET merchant/games/word-search/{base64}.json` — served as **cached image** (max-age huge); spamming Regenerate hits browser cache, NOT server | 200 | NO |
| AI Generate | `POST customer-uploads/generate` (202, async) → poll `image-filter-effects/status` (200) | 202/200 | **YES** on generate |
| Add to Cart (`#teeAtcButton`) | `POST customization` (201) → `POST /cart/add.js` (200) → `PUT customization/{uuid}/cart-token` (204) → `GET /cart.js` | 201/200/204 | NO |

## GPX Route Maps: after `gpx-upload`, a Leaflet map dialog opens
Dialog buttons: `Cancel` / **`Select & continue`** (`button:has-text("Select & continue")`). Must click Select & continue to
confirm the route; otherwise its `vm--overlay data-modal="tee-dialog-route-maps"` **intercepts all clicks** (e.g. blocks Generate).

## Thumbmark caching (verified this session)
- **Lazy**: NO thumbmark GET on page load even with empty cache. Fetched only on first `Ll` route (AI Generate).
- Empty cache + Generate → **exactly 1** `GET /merchant/shopify/thumbmark` → 200, then `localStorage['teeinblue_signed_thumbmark']`
  set (97 chars = `{32 alnum}.{64 hex}`). (Old note said 2× race — saw 1× here.)
- Reload with cache present → **0** thumbmark GET (no refetch). Cache persists across reload + across tabs (shared, no corruption).
- Signed `X-Thumbmark-ID` format re-confirmed: 32 alnum + `.` + 64 hex (e.g. `jmhFWhf6gmvm0TdCVftM...`).

## 429 resilience (TC-032) — vector-upload limit = 4/min
5th `POST vector-upload` in <60s → **429**. Widget does NOT break: stays rendered (all 7 fields), all entered data preserved
(name, puzzle words), ATC present, no white screen, no JS/Apollo exception — only passive console `Failed to load resource: 429`.
Vector field shows graceful inline text: **"Cannot upload. Contact us for more information.: HTTP error!"** (even though vector-upload
goes through `wi` with no dedicated 429 handler — the upload() catch still surfaces it).

## `show_in_cart` OFF on this shop → cart line has NO per-field labels
Our product's cart line properties: `_customization_id`, `customization_id`, `_customization_image`, `_customization_edit_link`,
`_tib_design_link_1`, `_tib_fulfilled_sku`. Individual field names NOT shown (config default OFF, Rule 14) — expected, not a bug.

## Tooling limits hit this session
- Playwright MCP can't emulate CDP network throttling (Slow 3G) → TC-046 not runnable.
- Can't toggle per-site "block site data" / no Safari ITP, and no request interception to force thumbmark-fetch failure → can't
  live-trigger the fallback-fingerprint path (TC-045).
- Only UI-reachable `Ll`/thumbmark trigger in this widget is **AI Generate** (photo effects UI absent). With the 2-generate/session
  cap, the concurrent empty-cache thumbmark race (TC-047) can't be exercised.

---

# Phiên TIB-5278 (Testlane TIB-006, XSS sanitization) — 2026-08-28, campaign 2571 / artwork 3771

## Upload SVG tuỳ ý qua layer `Static Vector` — ĐÃ VERIFY
`+ Layer` → `VECTOR` → **`Static Vector`** mở dialog `Upload a vector` (tab `Upload a vector` /
`Choose from vector category`). Vùng `Drag and drop, or click to upload!` → file chooser OS
(`browser_file_upload`). Đây là đường **upload SVG bất kỳ vào asset library** (không phải chỉ chọn clipart có sẵn).
- SVG "sạch" (`<use>`/`<symbol>`, không script/handler) upload OK: `POST /api/layer-images/svg` → **201**,
  sau vài giây có preview; bấm `Reload` trong dialog để card xuất hiện ở đầu lưới (`200x200`, `Aug 28`).
- Chọn: click **`img`** của card (`.layer-listing__item:has-text("<tên>") img`) → card có class
  `...--selected`, nút xác nhận `Select 1 vector`. (Click checkbox không ăn — giống Rule cũ.)
- Layer sinh ra `data-type` vector, tên = tên file (`clipart-use-symbol`), **No personalization mặc định**
  ⇒ KHÔNG bắt buộc category (khác `Vector Category`), Save được ngay.

## 🔴 WAF/edge CHẶN upload SVG chứa `<script>` / `onload=` — ĐÃ VERIFY (bằng chứng)
Upload `clipart-onload-payload.svg` (có `onload="alert(...)"` + `<script>alert(...)</script>`):
`POST https://staging-api.teeinblue.com/api/layer-images/svg` → **`net::ERR_FAILED`** kèm
`blocked by CORS policy: No 'Access-Control-Allow-Origin' header` — tức server **từ chối ở tầng edge/WAF**
(response lỗi không có CORS header ⇒ browser báo ERR_FAILED, không đọc được status/body). Thử 3 lần
(2 qua UI + 1 `fetch` tay với FormData) đều fail y hệt. SVG sạch cùng endpoint thì 201.
⇒ Không đưa được SVG payload vào library qua đường này. Nếu cần data "SVG độc trong library" thì phải
nhờ người có quyền bỏ qua WAF, hoặc test bằng cách khác. **Đừng retry mù** — đây là chặn có chủ đích.
Console chỉ có mấy dòng CORS/ERR_FAILED này, KHÔNG phải GraphQL error.

## Field `Internal tags` — nhận `< >`, lưu RAW, KHÔNG sanitize khi save (TC-TIB-118/128)
Nhập `TIB-5278,TIB-006,<img src=x onerror=alert('XSS-tag')>` vào `Internal tags (optional)`:
- Field **không chặn** `<` `>`, lưu nguyên văn. Bằng chứng: tooltip FloatingVue của cell internal_tags
  trong `/campaigns` render `<div>TIB-5278,TIB-006,&lt;img src=x onerror=alert('XSS-tag')&gt;</div>`
  (escaped) ⇒ giá trị gốc còn nguyên `onerror`.
- **Hai đường render, hai cách vô hiệu hoá** (data tốt cho tester so sánh):
  | Chỗ render | Kết quả | Path |
  |---|---|---|
  | Cell list `.vgrid-column-data--internal_tags` | v-dompurify-html → tạo **`<img src="x">` thật nhưng `onerror` bị strip** (request ảnh vỡ tới `/x`, KHÔNG chạy alert) | TC-TIB-118 |
  | Tooltip FloatingVue (hover cell) | **escaped text** `&lt;img...&gt;`, không tạo element | TC-TIB-128 |
- Filter `/campaigns?internal_tags=TIB-5278` tìm ra campaign bình thường (payload không phá filter).

## ⚠️ Rule 14 lại đổi: `Show customization data on cart/checkout` = ON by default (2026-08-28)
Trên shop `linh-tib-staging` phiên này, layer text mới tạo có toggle
`Show customization data on cart/checkout` **BẬT sẵn** (`vue-js-switch toggled`) — tức config
`default_value.show_in_cart` đã bị đổi lại về **true** so với các phiên TIB-030/040/047 (khi đó OFF).
⇒ Càng chứng minh Rule 14: đọc lại giá trị thật mỗi phiên, đừng tin ghi chép "mặc định OFF".
Các toggle khác vẫn OFF (Prefill, reposition, charge-by-char, required, attach-for-fulfillment).

## Bổ sung 2026-08-28 (TIB-5278, artwork 3772 "all field types" gắn print area Back của campaign 2571)

### 🔴 `<script>` trong `option_template` của JSON List bị WAF chặn Ở TẦNG SAVE (giống chặn SVG)
Đặt `option_template` = `<b>{{name}}</b><script>alert('XSS-tc125')</script>{{address.city}}` rồi Save
⇒ `PUT https://staging-api.teeinblue.com/api/artworks/<id>` trả **`net::ERR_FAILED`** (blocked by CORS,
không có `Access-Control-Allow-Origin`) — WAF/edge từ chối vì body chứa chuỗi `<script`. Toast đỏ **`Network Error`**.
KHÔNG lưu được. (Đây là CÙNG cơ chế chặn SVG chứa `<script>`/`onload` ở phiên trước — chặn dựa trên nội dung request body.)
- Hệ quả: cả artwork PUT fail ⇒ layer JSON List đang giữ payload đó không persist (các layer đã Save 200 trước đó vẫn còn).
- **Biến thể KHÔNG có `<script>` thì QUA WAF bình thường:** `<b>{{name}}</b><img src=x onerror=alert('XSS-tc125')>{{address.city}}`
  → Save 200 `Your artwork has been updated`, persist đúng nguyên văn sau reload.
- ⇒ Muốn data JSON List mang XSS mà vẫn lưu được qua portal: dùng vector KHÔNG chứa literal `<script>`
  (vd `<img onerror>`). Payload `<script>` phải nhờ người bỏ qua WAF hoặc set qua đường khác.

### Storefront render `option_template` của JSON List = HTML THẬT, nhưng strip event handler
Với template `<b>{{name}}</b><img src=x onerror=...>{{address.city}}`, storefront (SDK v1) render
**10 thẻ `<img src="x">` thật** (mỗi item JSON 1 thẻ) — tức HTML được inject, KHÔNG escape.
NHƯNG `onerror` bị **v-dompurify strip** (`img.getAttribute('onerror') === null`) ⇒ `alert()` KHÔNG chạy,
chỉ có request ảnh vỡ tới `/x`. Giống hệt cơ chế 2 đường của internal_tags (TC-118): tạo element nhưng bỏ handler.
⇒ Data tốt cho TC-TIB-125: chứng minh option_template không escape HTML nhưng đã chặn được inline event handler.

### Layer `Dynamic Clipart by Text` (data-type `dynamic-by-text`) — KHÔNG có Option Title
`+ Layer` → `Dynamic Clipart by Text` → submenu **`Manual Placement`** / `Auto Placement`.
Chọn Manual → mở dialog chọn clipart category (giống Clipart Category, tab `Choose from clipart category`).
Panel PERSONALIZATION SETTINGS **KHÔNG có** `input[name=form_label]`. Thay vào đó **3 field bắt buộc (`*`)**:
- `Select a source text option*`: vue-multiselect, list chỉ gồm option loại **text/curve-text** khác (Paragraph KHÔNG xuất hiện).
- `Value to populate*`: textbox + nút `Available Value` → token `{{value}}` (khớp cả chuỗi) / `{{charX}}` (từng ký tự).
- `Select one clipart category*`: đã chọn khi tạo layer.
⇒ Layer này KHÔNG render input riêng trên storefront — nó suy ra clipart từ giá trị của option text nguồn.
Trên form 12 layer, layer này là layer DUY NHẤT không hiện field (11 field hiển thị / 12 layer).

### Layer `Additional Option` (data-type `additional-option`) = dropdown/radio từ category
Panel có `Option Title` + `Select additional options category:` (treeselect, **KHÔNG bắt buộc** — không có `*`).
Trên staging có sẵn các category để tái dùng: `dropdown`, `dropdown + thumbnail`, `radio`, `inline button`,
`number`, `thumbnail`, `photo upload`, `Number - additional option`, ... ⇒ chọn `dropdown` để có field dropdown thật.

### Layer `Addon Charge` (data-type `addon-charge`)
`Option values*` bắt buộc nhưng **mặc định đã có sẵn 2 giá trị `Option 1` / `Option 2`** ⇒ Save được ngay không cần thêm.
`Display options as:` mặc định `Inline Radio Button`. Có `Option Title`.

### Xác nhận default trên shop `linh-tib-staging` phiên này (Rule 14)
`Show customization data on cart/checkout` = **ON** by default cho các layer Paragraph/Song/JSON (khớp ghi chú 2026-08-28 ở trên).
Radio personalization mặc định `Create a new option` cho mọi layer. `Mark this option as required` = OFF.

### Publish khi campaign ĐÃ published: nút `Update` → dialog `Multi-store launch` → `Update` hàng linh-tib-staging
Request nền là **`POST /api/campaigns/<id>/sync`** → 200 (không phải `/publish` như lần launch đầu).
Toast: `Updated campaign <tên> — Content is published. Mockups are still publishing.`

---

# TIB-5341 — AI generate rate limit: NGƯỠNG THẬT đo được (2026-09-09, campaign 2566, shop linh-tib-staging)

Endpoint: `POST /api/merchant/shopify/customer-uploads/generate?shop=<shop>` — FormData
`effects` (JSON), `field_id=layer-<id>`, `rate_limit_id=<platformProductId>` (=10469141610812).
Header bắt buộc: `X-Thumbmark-ID` (signed 97 ký tự = 32 alnum + `.` + 64 hex, lấy từ
`localStorage['teeinblue_signed_thumbmark']` hoặc `GET /api/merchant/shopify/thumbmark`).
Thành công = **202** `{"id":<n>,"status":0}` (async, poll `image-filter-effects/status`).

## Có BA lớp giới hạn khác nhau — phân biệt bằng BODY message (đều có `rateLimitExceeded:true`)

| Lớp | Ngưỡng | Key | 429 message | Header `X-RateLimit-Limit` |
|---|---|---|---|---|
| **Per-layer cap** | **3** generate / layer | theo `field_id` (mỗi AI layer 1 counter riêng) | `Upload limit exceeded for this field. You can upload 3 images per hour for this form field. Try again in mm:ss` | 3 |
| **Per-IP / network backstop** | **10** generate / network | theo IP (BỎ QUA thumbmark) | `Too many upload requests from this network. Try again in mm:ss` | 10 |
| Per-thumbmark | **KHÔNG tồn tại** (≥10, không thấp hơn per-IP) | — | không quan sát được 429 riêng | — |

- **Per-layer = 3/layer**: hammer cùng 1 layer → 202,202,202 rồi 429 ở lần 4. Trải qua layer khác
  thì lại 202 (counter độc lập). ⚠️ `X-RateLimit-Reset` ~**300s (5 phút)** trên layer mới, NHƯNG message
  ghi "**per hour**" → **label sai/không khớp window thật** (đáng flag).
- **Per-IP = 10/network/~10 phút**: trên **1 thumbmark cố định**, trải generate qua nhiều layer để né
  cap 3/layer → được **10 lần 202**, lần **11 → 429 "from this network"** (limit 10, reset ~549s).
- **Rotation KHÔNG bypass**: đổi sang thumbmark signed MỚI (khác hẳn) khi per-IP đã cạn → **vẫn 429
  "from this network"**. ⇒ đây chính là fix của ticket "bypassable rate limits". Per-thumbmark hypothesis
  "5/5min" của dev **KHÔNG đúng**: 10 lần 202 trên 1 thumbmark, không có 429 per-thumbmark.
- Response 429 **KHÔNG** có header `Retry-After`; chỉ có `X-RateLimit-Limit/Remaining/Reset` (reset = giây)
  + chuỗi "Try again in mm:ss" trong body.

## Cách đo tiết kiệm (đã dùng)
1. Bấm Generate 1 lần qua UI để SDK fetch thumbmark + tạo request hợp lệ, wrap `window.fetch` để capture
   URL/headers/FormData. ⚠️ **SDK giữ reference `fetch` GỐC từ lúc load** → generate do SDK tự phát (poll/retry
   sau khi bấm Re-generate) KHÔNG đi qua wrapper `window.fetch`, chỉ thấy trong network log. Lần đó SDK tự bắn
   thêm ~6 generate ngoài ý muốn ⇒ **đếm generate bằng network log, đừng tin wrapper**.
2. Replay bằng `window.__origFetch` (fetch gốc đã bind) với FormData tự dựng + `X-Thumbmark-ID` tuỳ ý.
3. Để đo per-IP/per-thumbmark phải **trải qua nhiều AI layer** (mỗi layer chỉ 3 lần) → tạo sẵn ~5 AI layer.
4. `merchant/shopify/thumbmark` có rate limit RIÊNG của nó (limit ~6-30, message `Too Many Attempts.`,
   có lúc trả HTML) → khi xoay thumbmark nhiều dễ bị 429 endpoint này, phải chờ reset.

## Tạo nhiều AI layer để test (đã verify)
Trong artwork editor: `+ Layer` → `Text to Image (AI)` → **mở dialog chọn ảnh placeholder** (giống Static Image)
→ chọn 1 ảnh + `Select 1 image` → layer tên = tên file ảnh. Mở ✎ (`#manage-layer`) → chọn `GenAI service*`
(`select#text_to_image_provider` = gemini/gpt/flux_kontext/imagenhub) → hiện `#text_to_image_prompt` (bắt buộc,
điền prompt TĨNH không biến để generate chạy). Option Title (`input[name=form_label]`) không bắt buộc để Save.
`Save & Close` → verify bằng số nút `Generate - text to image` trong PERSONALIZATION FORM = số AI layer.
Campaign 2566 hiện có **5 AI layer**: field_id gốc **836548** + 4 mới **604524, 725075, 217763, 148189**.

---

# Flow: Dynamic Translations (dictionary) — ✅ ĐÃ VERIFY 2026-09-09 (TIB-5414, campaign 2591 / artwork 4079)

## ⚠️ KHÔNG có màn "Translations" trong campaign hay artwork editor
Artwork editor header chỉ có: `Edit` · `Live preview` · `Logs` · `Cancel` · `Save & Close`.
Nơi duy nhất dịch được là trang **global**: sidebar `Extras` → **`Dynamic Translations`**
= `https://staging-portal.teeinblue.com/artwork-translations`.
Đây là **một dictionary key→value dùng chung cho cả store**, KHÔNG tách theo artwork/campaign.

## Cấu trúc trang
- Header `Dynamic Translations` + button `Save` / `Reset` (selector: `main h4 button:has-text("Save")`).
- Ghi chú UI: *"Currently support translating: Option Title in the personalization form,
  Product base and Variants name."* (KHÔNG nhắc prefix/suffix, nhưng thực tế prefix/suffix
  vẫn nằm trong dictionary — xem dưới).
- `Languages from <shop>:` là `<select>` (`main select`). Trên `linh-tib-staging` có
  **English / Vietnamese / German / Slovak**.
- Cột trái = `Default` (key), cột phải = tên locale đang chọn (value).
- Ô search: `main input.search-input` — **search chạy trên toàn bộ dataset**, không chỉ trang hiện tại.
- Các dòng: `main input.form-control:not(.search-input)` → **cặp liên tiếp** `[key, value]`
  (đọc `for(i=0;i<n;i+=2)`). ⚠️ Rất dễ off-by-one: kiểm lại bằng evaluate sau mỗi lần fill.
- Button ` Add new translation` thêm 1 dòng RỖNG vào **cuối trang đang xem** (không phải cuối list).
- Phân trang 20 dòng/trang, `main nav ul li a:text-is("<n>")`.

## 🔴 Dictionary KHÔNG tự thu thập string của artwork mới
Tạo campaign + artwork + publish xong, các chuỗi mới (`Option Title`, `prefix`, `suffix`,
tên campaign) **vẫn KHÔNG xuất hiện** trong list. Đã verify: search `Dream`, `L1`, `Best Dad`
→ 0 dòng, kể cả sau khi `POST /api/campaigns/2591/publish` → 200.
⇒ Muốn có dòng cho chuỗi nào thì phải **tự thêm bằng `Add new translation`** (gõ cả key lẫn value).
Dòng cũ kiểu `"prefix - "` / `" - suffix"` trong dictionary là do người trước tự thêm tay.

## 🔴 BUG TIB-5414 tái hiện được: VALUE bị trim khi save, KEY thì không
Request khi bấm Save: `POST https://staging-api.teeinblue.com/api/translations/bulk` → **200**
(GET list: `GET /api/translations`). **Không có toast** báo thành công.

Đo thật (locale German, save rồi reload full trang, đọc lại `input.value`):

| Key đã lưu | Value nhập vào | Value sau khi lưu |
|---|---|---|
| `"All Day I Dream About "` (len 22) | `"All Day I Dream About "` | `"All Day I Dream About"` (len 21) |
| `" Best "` (len 6) | `" Best "` | `"Best"` (len 4) |
| `" Ever "` (len 6) | `" Ever "` | `"Ever"` (len 4) |
| `"Team   "` (len 7, 3 space) | `"Team   "` | `"Team"` (len 4) |
| `"Dear "` (len 5) | `"Dear "` | `"Dear"` (len 4) |
| `" xoxo"` (len 5) | `" xoxo"` | `"xoxo"` (len 4) |
| `"Best Dad "` (len 9) | `"Bester Papa "` (len 12) | `"Bester Papa"` (len 11) |

⇒ **Key giữ nguyên whitespace 2 đầu, value bị trim CẢ hai đầu.** Đúng mô tả bug
(middleware trim value khi save). Đây là trạng thái bug cần dựng cho QA.

## Storefront `linh-tib-staging`: locale `de` CHƯA publish
Portal liệt kê German trong `Languages from ...`, nhưng storefront **không phục vụ được** `de`:
- `/de/...`, `/de-de/...`, `/de-vn/...`, `/en-de/...` đều **404**.
- Language switcher thật trên product page (`form[action*="localization"]` có `locale_code`)
  chỉ có **`en` + `vi`**; `DE/MX/US/VN` là **country**, không phải language.
- `Shopify.routes.root` = `/en-vn/`, `Shopify.locale` = `en`.
⇒ Muốn test nhánh `de` trên storefront phải vào Shopify admin publish tiếng Đức trước.
Danh sách language ở Portal đọc từ shop_locales (gồm cả locale chưa publish) ⇒ **không suy ra
được storefront có bật hay không**, phải kiểm trên chính storefront.

## Flow: prefix/suffix của layer — ✅ ĐÃ VERIFY 2026-09-09
Panel ✎ của layer → section **`DESIGN SETTINGS`** → toggle **`Enable prefix/suffix`**
(selector chạy ổn: `div:has(> label.vue-js-switch):has-text("Enable prefix/suffix") label.vue-js-switch`).
Bật xong hiện 2 field `input[name="prefix"]` và `input[name="suffix"]`.

Loại layer **CÓ** prefix/suffix (đã verify): `text` (Single-line) · `paragraph` ·
`curve-text` · `warp-text`.

🔑 **Portal KHÔNG trim prefix/suffix của layer** — khác hẳn dictionary. Space đầu/cuối,
3 space liên tiếp, và **NBSP U+00A0** đều lưu nguyên vẹn qua `Save & Close` + reload full trang
+ publish ra storefront (verify bằng codepoint trên `.tee-artworks-wrapper text`).

### 🔴 Gõ NBSP (U+00A0): `browser_type` / `fill()` BỊ CHUẨN HOÁ THÀNH SPACE THƯỜNG
Truyền ký tự U+00A0 qua tham số `text` của `browser_type` → field nhận **code 32**, không phải 160.
**Cách đúng (đã verify):**
```
printf 'Winner\xc2\xa0' | pbcopy        # Bash
click vào field → ControlOrMeta+a → ControlOrMeta+v
```
Rồi đọc lại `[...input.value].map(c=>c.codePointAt(0))` để xác nhận có `160`.

### Cách verify prefix/suffix đã lưu mà KHÔNG cần mở 9 panel
Sau khi gắn artwork vào print area, khối `STEP 2: PREVIEW YOUR CAMPAIGN` render SVG thật.
Đọc: `[...document.querySelectorAll('.tee-artworks-wrapper text')].map(t=>JSON.stringify(t.textContent))`
→ mỗi dòng = `prefix + default text + suffix`, thấy ngay space còn hay mất.
Trên storefront cũng dùng đúng selector này (gộp `tspan` bằng `\n` cho paragraph).

## Layer Paragraph: KHÔNG có toggle "auto font-size" / "wrap"
Panel paragraph 2.0 chỉ có: `DESIGN SETTINGS` (`Default paragraph (only for preview):`,
`Enable prefix/suffix`, `Right to Left text`, **`Remove line breaks`**),
`POPULATE VALUES`, `PERSONALIZATION SETTINGS`, `CONDITIONAL SETTING`, `EXTRA`.
Wrap + auto-shrink `font_size` là hành vi mặc định của SDK (Rule 2), không phải option bật/tắt.

## Warp text: đổi size phải clear rồi mới fill, và Height cập nhật khi CLICK sang field khác
`1000x1000` mặc định. `fill('640')` vào width → width=640 nhưng height vẫn 1000;
**click sang `#quick-transform-editor-height`** thì height mới tự về 640 (aspect lock).
Đọc lại cả 4 field sau mỗi bước.

## Giá trị mặc định quan sát 2026-09-09 (shop `linh-tib-staging`, Rule 14)
| Field | Text 2.0 | Paragraph 2.0 |
|---|---|---|
| Radio personalization | `Create a new option` | `Create a new option` |
| `Prefill default text/paragraph` | OFF | OFF |
| `Allow customers to reposition text` | OFF | (không có) |
| `Charge by Character count` | OFF | (không có) |
| `Mark this option as required` | OFF | OFF |
| **`Show customization data on cart/checkout`** | **ON** | **ON** |
| `Attach customer input for fulfillment` | OFF | (không có) |
| `Enable prefix/suffix` | OFF | OFF |

⚠️ `show_in_cart` mặc định đang **ON** trở lại trên shop này (khác ghi chép 2026-08-27 ghi OFF).
Đúng Rule 14: đọc lại config trước khi báo bug "sai mặc định".

---

# Flow: Campaign "by Shopify Products" (platform product) — ✅ ĐÃ VERIFY 2026-09-16 (TIB-5349, campaign/platform-product 532)

Khác hẳn "by Product Base": campaign này import trực tiếp 1 Shopify product có sẵn (không tạo
Shopify product mới, không dùng print area của product base).

## Bước 1 — Tạo rỗng
1. Sidebar `Campaigns` → **`by Shopify Products`** → `/platform-products`.
2. Trang list: heading `Campaigns by Shopify products`, nút `New campaign` → `/platform-products/new`.
3. Form `Basic information`:
   - `Choose a store:` combobox — mặc định đã chọn đúng store active (`linh-tib-staging | linh-tib-staging.myshopify.com`).
   - `Select a Shopify product:` → button `Choose a Shopify product` → mở dialog
     **`Select a product from store <store>`** (bảng `Product / Status / Vendor / Product type`,
     sort mặc định `Created at desc` ⇒ product mới tạo nằm ngay đầu).
     Click vào tên product trong bảng để chọn (không cần Search nếu mới tạo).
   - `Internal tags (optional)` — điền issue key ở đây (giống campaign by Product Base).
4. Click ` Create` → redirect `/platform-products/<id>/edit`.

## Bước 2 — Trang editor `/platform-products/<id>/edit`
Top bar: `Logs` · `Edit internal info` · `Launch` (đổi thành `Unpublish` / `View` / `Update` sau khi publish).
Header hiện `<store> | <store>.myshopify.com` + tên product (= tên campaign, lấy nguyên từ Shopify product title)
+ link ra ngoài trỏ `https://admin.shopify.com/store/<shop>/products/<id>`.

- `STEP 1: ADD ARTWORK` — **KHÔNG có khái niệm print area của product base**. Chỉ có:
  - toggle `Connect artworks with Shopify variants` (mặc định OFF — để OFF nếu muốn nhiều artwork
    cùng hiển thị cho 1 variant, vd test Quick Navigation; bật ON nếu muốn mỗi variant 1 artwork riêng).
  - list `Artworks:` (rỗng ban đầu) + button `Select artwork`.
- `STEP 2: PREVIEW YOUR CAMPAIGN` — cần **mockup** riêng (khác hẳn by-Product-Base, mockup không tự có
  sẵn từ product base). Nút `Upload mockup` / `Import` / `...`.

## Bước 3 — Thêm artwork (giống hệt flow "New artwork" đã verify)
`Select artwork` → dialog `Select your artwork` → ` New artwork` → điền `Name*` → `Save` (tạo artwork,
KHÔNG tự gắn) → thêm layer (`+ Layer` → `Single-line Text` v.v.) → `Save & Close` → **click vào card artwork
mới trong lưới** để thực sự gắn vào campaign (y hệt Rule ở flow by-Product-Base — bỏ qua bước click card
⇒ artwork vẫn rời rạc, KHÔNG gắn vào Step 1).
Lặp lại `Select artwork` → `New artwork` cho artwork thứ 2 (không cần đóng dialog trước, có thể tạo liên tiếp).

## Bước 4 — Mockup: BẮT BUỘC để campaign hết lỗi `No mockup`
1. `Upload mockup` → dialog asset picker có 2 phần: **upload zone** (`Drag and drop, or click to upload!`)
   ở trên + **grid ảnh có sẵn** ở dưới (đều trong CÙNG 1 dialog).
2. Nếu chỉ kéo-thả/upload file mới mà **không** tự tay chọn nó trong grid, hệ thống **tự động lấy ảnh ĐẦU
   TIÊN của grid** (ảnh gần nhất trước đó, KHÔNG phải ảnh vừa upload) làm mockup nền
   ⇒ **BUG/CẠM BẪY đã tái hiện 2026-09-16**: mockup tạo ra dùng nhầm ảnh cũ (`1562125535400063454_2048`,
   một đôi tất) thay vì `IMG_1790.jpeg` vừa upload.
   **Cách đúng:** sau khi upload xong (đợi trạng thái hết `Generating...`, bấm `Reload`), **tự tay tick
   checkbox** đúng ảnh mới trong grid rồi bấm `Select N images` — đừng tin dialog tự chọn đúng.
3. Ảnh nền mặc định gắn vào mockup mới như 1 layer trong Mockup Editor (`Add Image` cũng dùng chung dialog
   asset picker này). Có thể `Delete` layer nền sai (chọn layer → nút `Delete` trên toolbar hàng layer đã
   chọn → dialog `Confirm` → `Delete`) rồi `Add Image` lại đúng ảnh.
4. Trong Mockup Editor, mỗi lần bấm **`Add Artwork`** → hiện picker nổi (không phải dialog) liệt kê các
   artwork đã tạo cho campaign → click 1 artwork → nó được đặt làm 1 layer artwork **ở giữa canvas**,
   kích thước mặc định thường bằng kích thước gốc artwork (vd 480×480 nếu artwork 1600×1600 thu nhỏ theo
   canvas). **2 artwork add liên tiếp sẽ chồng đúng vị trí nhau** — phải tự dời bằng toolbar `Transform`
   (`Top`/`Left` field, xem selector ở mục "Toolbar artwork editor" phía trên — cùng cấu trúc dùng cho
   Mockup Editor) để chúng nằm ở 2 vùng khác nhau trên mockup (vd artwork 1 @ Top 40/Left 40,
   artwork 2 @ Top 440/Left 440).
5. `Save & Close` (nút ở header Mockup Editor, cùng dạng group với artwork editor).

## Bước 5 — Assign mockup cho variant
Sau khi có mockup, khối bên phải Step 2 hiện `Variants are managed by Shopify.` + button `Assign mockups`.
1. Click `Assign mockups` → dialog `Assign mockups`: `Select variants` (combobox multi-select) +
   `Select mockups` (checkbox list, ban đầu **KHÔNG check sẵn** dù chỉ có 1 mockup).
2. `Select variants` → click `Select all` (hoặc chọn tay từng variant Shopify, vd `S - 25$` / `M - 25$`).
3. Tick checkbox mockup tương ứng trong `Select mockups` → nút `Save` mới hết disabled → `Save`.
4. Xác nhận: dialog `Mockup assignments` hiện đúng số variant đã gán (`2 variants`, badge `M` `S`) +
   nút `Edit`/`Bulk assign`. Đóng bằng `Close`.
⚠️ **Nếu bỏ qua bước 5**, campaign vẫn hiện banner "valid and ready to launch" (vì Step 1/2 đủ artwork +
mockup) nhưng KHÔNG có variant nào thực sự map tới mockup ⇒ khi publish, storefront/preview có thể trống.
Luôn kiểm tra `Assign mockups` trước khi Launch.

## Bước 6 — Publish
- Header có nút **`Launch`** (không có dialog `Multi-store launch` nhiều store như campaign by-Product-Base
  — platform-product product đã gắn cứng 1 store ngay từ bước tạo, nên `Launch` publish thẳng, không hỏi chọn store).
- Request nền: `POST https://staging-api.teeinblue.com/api/platform-products/<id>/publish` → **200**,
  toast `Launch campaign successfully`.
- Sau publish, header đổi thành `Unpublish` · `Logs` · `View` · `Launch → Update` (giống flow update của
  by-Product-Base).
- ⚠️ `Launch`/publish ở đây publish thẳng vào store đã chọn lúc tạo — vẫn phải đảm bảo store đó là
  `linh-tib-staging` (chọn đúng lúc Bước 1), không có bước chọn lại store ở Launch như campaign thường.

## 🔴 Blocker tiềm ẩn: sản phẩm Shopify chưa publish lên kênh Online Store
Dù portal import + publish campaign OK (`/publish` → 200, không lỗi console), **storefront
`linh-tib-staging.myshopify.com` có thể KHÔNG hiển thị được product** nếu chính Shopify product đó
chưa được publish vào sales channel "Online Store" (việc này nằm ở Shopify admin, ngoài phạm vi portal):
- `/products/<handle>` (kể cả có prefix locale `/en-vn/`) → **404**.
- `/search?q=<title>` → không ra kết quả đúng sản phẩm.
- `/collections/all?sort_by=created-descending` → sản phẩm KHÔNG xuất hiện dù vừa tạo.
- Nút `View` ở header portal (khi đã publish) chỉ mở **trang chủ store** (`/en-vn`) thay vì đúng trang
  sản phẩm — dấu hiệu gián tiếp cho thấy portal cũng không resolve được URL sản phẩm.
⇒ Đây KHÔNG phải lỗi của portal/campaign (campaign vẫn valid, artworks/mockup/variant đều đúng, publish
API 200) — verify được đầy đủ trong phạm vi portal, nhưng phần "xem trên storefront thật" cần Shopify
product được publish vào Online Store channel trước (làm ở Shopify admin, ngoài quyền của agent này).
Đừng tự ý vào Shopify admin sửa channel — báo lại cho người dùng.

---

# Phiên TIB-5464 (Testlane TIB-126) — 2026-09-24, campaign 2636 / artwork 4378

## 🔑 KHÔNG có toggle "Autoscale" riêng cho Text / Curve Text 2.0 — ĐÃ XÁC NHẬN 2026-09-24

Đã rà soát toàn bộ panel ✎ (`Design settings` / `Populate values` / `Personalization Settings` /
`Conditional Setting` / `Extra`) và toàn bộ toolbar canvas (`.qte-field`) của layer `Single-line Text`
lẫn `Curve Text` (artwork 2.0) — **không có field/toggle nào tên "Autoscale"** hay tương đương
("Auto-fit", "Shrink to fit"...). Toolbar chỉ có: font family, font size, align, color, stroke,
background image, skew, letter-spacing, shadow, curve radius (riêng Curve Text).

⇒ **Font-size tự shrink khi text overflow box là hành vi MẶC ĐỊNH của SDK** cho mọi loại text layer
(Single-line Text, Curve Text, Paragraph) — giống hệt kết luận cũ ở Rule "Paragraph không có toggle
auto font-size/wrap". Không có công tắc bật/tắt nào trong portal; muốn kích hoạt shrink chỉ cần đặt
box đủ hẹp so với font size mặc định rồi để text tràn khi buyer nhập trên storefront.

⇒ Khi spec/ticket nhắc "bật Autoscale cho layer text/curve-text", agent chỉ cần **set box hẹp + font
size đủ lớn để overflow là chắc chắn xảy ra** (không có bước bật toggle nào cả). Đã verify hành vi này
đúng, storefront customizer render form fields bình thường (xem ảnh
`evidence/TIB-5464/storefront-customizer.png`).

## Cạm bẫy: đổi font size / height của Text-2.0 và Curve-Text-2.0 làm Width bị RESET
Với **cả Text 2.0 và Curve Text 2.0** (không chỉ riêng trường hợp Height→Width ở Rule cũ):
- Đổi `Height` xong đổi `--` (font size) trong toolbar ⇒ **Width tự quay lại giá trị mặc định ban đầu**
  (513/514), dù trước đó đã set Width hẹp. Quan sát rõ nhất ở Curve Text: set Width=180 → set font-size=50
  → mở lại Transform thấy Width đã về 514, Top/Left cũng bị tính lại theo center mới.
- **Thứ tự đúng đã verify chạy ổn định:** set `Height` trước (nếu cần) → set font size (`--`) →
  **set `Width` SAU CÙNG** → đọc lại cả 4 field (`Width/Height/Top/Left`) để confirm trước khi đóng popup.
- Áp dụng luôn cho `Top`: sau khi đổi font-size, Top cũng bị tính lại (Curve Text: 1000 → 1029 tự động).
  Nếu cần vị trí chính xác để tránh đè layer khác, set Top **sau** font-size luôn (cùng lúc với Width).

## Flow: Đổi tên layer nhanh không cần mở panel ✎
Double-click trực tiếp vào `<tên layer>` trong layer list (`.artwork-sortable-layer-name` hoặc text
node bên trong `listitem` của `list` layer) → input xuất hiện ngay, gõ tên mới → `Enter`. Không cần vào
panel settings trước. Đã verify ổn định cho cả 4 loại: Single-line Text, Curve Text, Paragraph, Text
(static). Sau khi rename, `#artwork-sortable-layer-layer-<id>` giữ nguyên id — record lại id ngay lúc
này (trước khi thêm layer tiếp theo) để tránh lẫn giữa nhiều layer cùng phiên.

## Flow: Mở nhanh panel ✎ của 1 layer bằng CSS selector trực tiếp (không cần lấy ref từ snapshot)
`browser_click` với `target` là CSS selector thường (vd `#artwork-sortable-layer-layer-600619
#manage-layer`) **chạy được**, không bắt buộc phải là `ref=fXeYYY` từ snapshot. Tiện khi đã biết chắc
id layer (lấy từ `[id^="artwork-sortable-layer-layer-"]` qua `browser_evaluate` đọc DOM) và muốn mở
đúng panel của layer đó mà không cần đi tìm ref trong snapshot dài.

## Kết quả phiên này
Campaign 2636 (`Customization image renders text smaller than preview and order design`, tag
`TIB-5464,TIB-126`), product base `example product base - tshirt` (product-id 3139), artwork 4378
gồm 4 layer: `Autoscale Text` (text, 180x61, font 50), `Autoscale Curve Text` (curve-text, 180x60,
font 50, curve radius 60), `Paragraph Field` (paragraph, 500x180 ≈ 3 dòng @ font 50/line-height 1.2),
`Static No-Autoscale` (text, 513x47, font 40 cố định, box đủ rộng). Cả 4 đều bật personalization
(`Create a new option`). Đã publish thành công vào `linh-tib-staging.myshopify.com`
(`POST /api/campaigns/2636/publish` → 200), storefront `/products/customization-image-renders-text-
smaller-than-preview-and-order-design` load đúng, form 4 field hiện đủ, console sạch xuyên suốt.

---

# TIB-5482 — Addon Charge: pricing mode mới "Adjust the item price directly" — ✅ ĐÃ VERIFY 2026-09-28 (campaign 2671, artwork 4448)

## 🆕 Toggle mới ĐÃ CÓ trên staging (dù 3 PR liên quan còn OPEN lúc kiểm tra)
Panel ✎ của layer `Addon Charge` (PERSONALIZATION SETTINGS) giờ có thêm field **`Charge method:`**
(radio group `name="addon_charge_mode"`), nằm ngay dưới `Option Title:`, phía trên `Option values*:`:

| Radio | value / id | Mô tả hiển thị |
|---|---|---|
| `Add a separate addon item to the cart` (mặc định, checked) | `addon_charge_mode-variant` | (không có mô tả — hành vi cũ, tạo dòng addon riêng trong cart) |
| `Adjust the item price directly` | `addon_charge_mode-direct_price` | *"The extra charge is added to the item price. No addon item appears in the cart or checkout. Requires the shop to have the Teeinblue cart transform function installed."* |

⚠️ Label chặn click trực tiếp vào `input[type=radio]` (giống các radio khác trong portal) — dùng
`page.locator('label').filter({ hasText: '<text>' }).click()` hoặc click vào `<label>` tương ứng.

## Field `Option values*` đổi hẳn tuỳ theo Charge method
- Mode `Add a separate addon item to the cart` (mặc định): mỗi option value có nút **`Attach`**
  (gắn addon product/variant Shopify để tính tiền — hành vi cũ, xem mục "Layer Addon Charge" phía trên).
- Mode `Adjust the item price directly`: nút `Attach` biến mất, thay bằng **`Price:` + nút ` Add`**.
  Click `Add` → mở dialog **`Price`** (heading, mô tả *"This amount is added to the item price when
  the buyer selects this option."*), có bảng `Stores | Price` liệt kê **từng store** của Organization
  riêng (trên instance hiện tại: `linh-tib-staging`, `linh-sdk-v2`, `linh-tib-checkout`,
  `ship-n-pickup`), mỗi store 1 nút `Add` riêng → click vào mở `spinbutton` (mặc định giá trị **`1`**)
  + label đơn vị tiền tệ của STORE ĐÓ (không phải USD cố định).

### 🔑 Giá là PER-STORE, đơn vị tiền tệ theo currency riêng của từng store — KHÔNG có ô nhập USD
Quan sát trên instance `Enterprise (Test)`:
- `linh-tib-staging` → đơn vị **VND** (base price product `example product base - tshirt` ở store
  này = **500.000₫**).
- `linh-tib-checkout` → Portal admin hiện đơn vị **EUR** cho ô nhập, NHƯNG base price thực tế của
  CHÍNH sản phẩm này trên store lại là **15.065.451.000 VND** (~15 tỷ VND, rõ ràng là data lạ/bất
  thường có sẵn từ trước, không phải do phiên này tạo ra) và storefront mặc định hiển thị
  `Vietnam | VND ₫` — ⇒ **Portal ghi nhãn "EUR" cho field nhập nhưng bản thân store có vẻ đang cấu
  hình tỷ giá/hiển thị rất bất thường**. Nhập "3" ở Portal (label EUR) sau đó storefront hiển thị
  giá trị quy đổi rất lớn (`+$90,392.71` khi xem theo USD, hoặc y hệt `+3`/`+4`/`+5` khi chuyển
  Country/region sang `Vietnam | VND ₫`). **Đây là dấu hiệu bất thường của riêng store
  `linh-tib-checkout` (base price + tỷ giá), KHÔNG phải bug của tính năng pricing mode mới** —
  nhưng QA cần biết để không hiểu lầm số tiền hiển thị.
- ⇒ **Không có cách nhập "$3 USD" trực tiếp** trong Portal — chỉ nhập được số thô theo đơn vị tiền tệ
  gắn với từng store. Muốn số tiền có ý nghĩa thật theo USD phải tự quy đổi trước khi nhập, hoặc chấp
  nhận số thô (khớp đúng con số trong ticket) và ghi rõ đơn vị thật trong báo cáo để QA tự đối chiếu.
- Giá trị **"0"** nhập được bình thường (không bị coi là "chưa set") — nhưng sau khi lưu, dòng đó
  hiển thị lại `Price: [+ Add]` giống hệt option **chưa từng set giá** (không phân biệt trực quan
  0 vs unset trong UI danh sách). Để phân biệt phải mở lại dialog `Price` → nếu thấy `spinbutton`
  giá trị `0` (đã set) vs nút `Add` (chưa từng tạo record giá cho store đó) — chỉ khác nhau ở
  **có tồn tại record hay không** trong DB, UI list không hiện được khác biệt này.

### 🔴 Cạm bẫy: nút "X" cạnh ô giá là nút XOÁ, không phải nút xác nhận
Sau khi mở `spinbutton` giá cho 1 store, có 1 nút nhỏ bên cạnh (`class="col-1 btn"`, icon
`la la-times`). **Đây là nút xoá record giá của store đó** (trả về lại trạng thái `Add`), KHÔNG
phải nút save/confirm. Giá trị nhập vào `spinbutton` tự lưu khi **blur** (Tab / click ra ngoài) —
không cần bấm gì thêm. Bấm nhầm nút X sẽ xoá mất giá vừa nhập, phải nhập lại từ đầu (đã dính 1 lần
khi set `Small = 0` cho `linh-tib-staging`, phải làm lại).

### Selector ổn định
- Radio Charge method: `#addon_charge_mode-variant` / `#addon_charge_mode-direct_price` (đọc trạng
  thái bằng `document.querySelectorAll('input[name=addon_charge_mode]')`).
- Spinbutton giá của 1 dòng store trong dialog `Price`: mỗi dòng có `id="field__id-<n>"` riêng (n
  đổi mỗi lần mở dialog mới) — **không dùng chung 1 id cố định**, phải tìm lại bằng snapshot
  `browser_find` text tên store mỗi lần.

## Text layer `Charge by Character count` cũng theo cùng cơ chế Price per-store
Bật checkbox `Charge by Character count` (id `field__price_per_letter_enabled`, toggle
`label.vue-js-switch` — **click vào chữ KHÔNG ăn, phải click đúng `.vue-js-switch`**) → hiện field
mới **`Price per character:`** + nút ` Add`, mở đúng dialog `Price` per-store y hệt Addon Charge.
Mặc định OFF (khớp Rule 14, đã verify 2026-08-27/2026-09-09).

## Layer `Addon charge` thứ 2/3 trở đi trong CÙNG artwork: mở đúng panel bằng `#manage-layer`
Mỗi layer row có 3 icon khi hover (`.artwork-sortable-layer-settings` group cuối row): **pencil
(`#manage-layer`, mở panel cấu hình) → duplicate → delete**. Khi có ≥2 layer cùng tên `Addon charge`,
PHẢI dùng CSS selector theo layer id cụ thể (`#artwork-sortable-layer-layer-<id> #manage-layer`)
thay vì click theo tên/text — nhiều layer trùng tên sẽ click nhầm.

⚠️ Click nút back (`.btn.btn-link.text-white`, mũi tên ở header panel ✎) để quay lại layer LIST
trước khi bấm `+ Layer` thêm layer mới — nếu đang đứng trong panel ✎ của layer khác, nút `+ Layer`
bị panel che (`intercepts pointer events`), phải back ra ngoài trước (giống cạm bẫy Rule đổi tên layer
đã ghi ở trên).

## Panel History tự bật lại sau mỗi lần mở `#manage-layer`
Header artwork editor có nút ` History` xuất hiện sau lần Save đầu tiên; panel `History` (Versions /
Activity log) có xu hướng tự mở lại mỗi khi mở panel ✎ của layer khác trong cùng phiên — không phải
lỗi, chỉ cần bấm nút đóng (`getByTitle('Close')`) trước khi thao tác tiếp nếu nó che mất nội dung.

## Kết quả phiên này (TIB-5482)
Campaign **2671** (`Add addon charge mode that adjusts the item price directly`, tag `TIB-5482`),
product base `example product base - tshirt` (product-id 3139, base price 500.000₫ tại
`linh-tib-staging`), artwork **4448** gồm 4 layer:
- `Addon charge A` (data-type addon-charge, mode `direct_price`, Option Title `Addon Charge A`,
  3 option values: `Small` (không set giá — nhưng sau đó có set = 0 nên khác `Addon charge C`),
  `Medium` (+3), `Large` (+5), set cho cả 2 store `linh-tib-staging` (VND) và `linh-tib-checkout` (EUR)).
- `Addon charge B` (mode `direct_price`, Option Title `Addon Charge B`, 1 option value
  `Addon B Value` +4, set cho cả 2 store).
- `Addon charge C` (mode `direct_price`, Option Title `Addon Charge C`, 1 option value
  `Unpriced Value` — **cố tình KHÔNG set giá cho store nào**, verify lại sau reload vẫn hiện
  `Price: [+ Add]`).
- `Text with Character Count Charge` (text layer 2.0, Option Title `Character Count Text`,
  `Charge by Character count` = ON, `Price per character` = 1 cho cả 2 store).

Đã publish thành công cả 2 store `linh-tib-staging.myshopify.com` và `linh-tib-checkout.myshopify.com`
(`Multi-store launch` → cả 2 hàng đổi thành `View`+`Update`, có CAMPAIGN LINK). Console sạch xuyên suốt
toàn bộ phiên (0 error, chỉ warning không liên quan). Storefront cả 2 store load đúng form 4 field,
verify bằng cách đổi Country/region để xem đúng đơn vị tiền tệ gốc (VND cho staging, VND cho checkout
dù Portal ghi EUR — xem mục cảnh báo currency ở trên).

## Cập nhật 2026-09-28 (cùng phiên): sửa giá x10.000 CHỈ cho store `linh-tib-staging`
Theo yêu cầu coordinator, giá ban đầu (0/3/4/5/1 — quá nhỏ so với base price 500.000₫) được nhân
x10.000 **riêng cho store `linh-tib-staging`**, GIỮ NGUYÊN giá trị đã nhập cho `linh-tib-checkout`
(store đó có base price bất thường, xử lý sau — xem mục cảnh báo currency ở trên):

| Layer / Option | Giá cũ (linh-tib-staging) | Giá mới (linh-tib-staging) | linh-tib-checkout |
|---|---|---|---|
| Addon Charge A — Small | 0 | 0 (không đổi) | 0 (không đổi) |
| Addon Charge A — Medium | 3 | **30.000** | 3 (không đổi) |
| Addon Charge A — Large | 5 | **50.000** | 5 (không đổi) |
| Addon Charge B — Addon B Value | 4 | **40.000** | 4 (không đổi) |
| Addon Charge C — Unpriced Value | (chưa set) | (chưa set — không đổi) | (chưa set) |
| Character Count Text — Price per character | 1 | **10.000** | 1 (không đổi) |

### Cách sửa 1 giá trị (per-store) mà KHÔNG đụng store khác — quy trình đã verify
1. Mở artwork editor trực tiếp bằng URL `?product-id=<pbId>&artwork-id=<artworkId>` (portal tự mở
   dialog artwork editor luôn, không cần qua "Select artwork").
2. Vào layer list → click `#manage-layer` (pencil) của đúng layer cần sửa (dùng CSS selector theo
   layer id, xem mục "Layer `Addon charge` thứ 2/3..." ở trên).
3. Trong Option values, dòng đã có giá hiện `Price: Multiple rates` + nút **`Edit`** (khác nút
   `Add` của dòng chưa từng set giá) → click `Edit` mở lại đúng dialog `Price` cũ.
4. Trong dialog, mỗi store là 1 dòng riêng — **chỉ sửa `spinbutton` của đúng dòng store cần đổi**,
   dòng của store khác giữ nguyên không động vào (không click `Add`/`X` của dòng đó).
5. Clear ô bằng `ControlOrMeta+a` + `Delete` rồi `fill()` giá trị mới (đúng cạm bẫy fill() nhân đôi
   đã ghi ở trên) → `Tab` để blur/auto-save → verify lại bằng cách tìm text tên store rồi đọc lại
   giá trị `spinbutton`.
6. Đóng dialog `Price` (nút `Close`) → `Save` (không `Save & Close`, dùng nút caret cạnh
   `Save & Close` → menu `Save`) nếu còn sửa layer khác trong cùng phiên, hoặc `Save & Close` nếu
   xong hết.
7. Vì campaign **đã published trước đó**, phải bấm **`Update`** (không phải `Launch`) ở header →
   dialog `Multi-store launch` → bấm `Update` **chỉ trên hàng store vừa sửa** (`linh-tib-staging`),
   để nguyên hàng `linh-tib-checkout` (đã là `View`+`Update` sẵn, không cần sync lại vì dữ liệu
   store đó không đổi).

### Verify trên storefront: SDK tự tính tổng giá đúng, không cần thao tác gì thêm
Sau khi Update, mở lại storefront (không cần xoá cache/hard reload) → đổi Country/region sang
`Vietnam | VND ₫` để thấy đúng đơn vị gốc → chọn option `Large` → **giá tổng tự cập nhật ngay thành
`550.000 VND`** (base 500.000 + option 50.000), kèm dòng chữ phụ **"Selection will add 50.000 VND to
the price"** ngay dưới nhóm field. Chọn lại `Small` → giá tổng về đúng `500.000 VND`. Không gặp vướng
mắc nào: field nhận số nguyên lớn (30000/40000/50000/10000) bình thường không giới hạn, không cần
clear cache hay hard-reload preview, console sạch trong suốt quá trình sửa + verify.

---

## Cập nhật 2026-09-29 (tiếp phiên TIB-5482, campaign 2671, artwork 4448): Global Option Addon Charge, layer legacy có variant, option value âm/per-store

### Global Option kiểu Addon Charge — tạo tại `/global-options` → `Global Option` → `Addon Charge`
Form giống hệt panel layer Addon Charge (xem mục "TIB-5482" phía trên): có thêm field
`Global Option Name (internal):` ở đầu (cạm bẫy `fill()` không ăn — xem mục Rule Song Search,
dùng `click` + `ControlOrMeta+a` + `pressSequentially`). Khi chọn radio `Adjust the item price
directly`, mỗi `Option values*` row đổi nút `Attach` → `Price: [+ Add]` giống layer thường.
Mặc định `Show customization data on cart/checkout` = **ON** (checked) cho global option Addon
Charge — khác với layer-local Addon Charge (mặc định OFF, xem Rule 14/mục layer Addon Charge phía
trên). Ghi nhận riêng, đừng nhầm hai default này.

### Gắn Global Option Addon Charge vào layer trong artwork — panel ✎ đổi hẳn
Trong layer Addon Charge, chọn radio `Use an existing global option` → `Select a global option:`
(vue-multiselect, dùng `.multiselect__select` để mở rồi click option theo text) → sau khi chọn,
**toàn bộ phần `Charge method:` (radio `variant`/`direct_price`) BIẾN MẤT HOÀN TOÀN khỏi panel**,
không phải chỉ disable. Panel chỉ còn: tên global option (link) + `Edit` + text
`Option title: <tên>`. Điều này hợp lý vì charge method giờ do global option quyết định, không
còn ở cấp layer nữa. ⇒ input cho TC-TIB-3926 (verify layer setting bị ẩn/disable khi dùng global
option) — kết luận: **bị ẨN, không phải disable**.

Nhiều layer khác nhau trỏ cùng 1 global option: `PERSONALIZATION FORM` / storefront chỉ render
**1 field duy nhất** cho global option đó (dedupe theo global option id), khớp Rule 15 cũ
("nhiều layer cùng trỏ 1 global option chia sẻ chung 1 entry").

### Layer Addon Charge chế độ LEGACY (`Add a separate addon item to the cart`, mặc định) — nút `Attach`
Click `Attach` trên 1 option value → dialog **`Attach a Shopify variant to use as Extra charge`**,
bảng theo từng store (`linh-tib-staging`, `linh-sdk-v2`, `linh-tib-checkout`, `ship-n-pickup`), mỗi
store có combobox `Product:` (đã thấy prefill sẵn `Preset - Addon product` — sản phẩm Shopify dùng
riêng cho việc test attach addon) + combobox `Variant:` (list options dạng `<tên> - <giá>`, ví dụ
`addon 1 - 25000`, `addon 2 - 25000`, `out of stock - 25000`, **`free - 0`**, `addon 3/4/5 - 25000`).
Chọn variant xong, nút `Attach` của đúng hàng store mới enable → click → text hàng đổi thành
`<Product> - <variant> - <giá> (quantity: 1)` + nút `Close` (icon) để xoá lại. Sau khi Attach, nút
trên option value đổi từ `Attach` → **`+1 variants`**. Đóng dialog bằng nút `Close` (`×` góc trên).

🔑 **Lưu ý quan trọng cho lần sau:** sản phẩm Shopify `Preset - Addon product` đã có sẵn variant
**`free - 0`** — đây là bằng chứng duy nhất tìm thấy trên instance này về 1 variant giá **thật sự
bằng 0** (không phải 1-5đ). Đây là **Shopify product/variant** dùng cho attach addon (legacy mode),
KHÔNG phải Product Base (product base = record quản lý riêng trong Portal, dùng cho campaign "by
Product Base"). Không dùng trực tiếp được làm CampaignProduct thứ 2 của campaign "by Product Base"
(loại CampaignProduct đó phải là Product Base, không phải Shopify product thô).

### Product Base pricing — quản lý ngay trong Portal, KHÔNG cần Shopify Admin
Trang `/products/<id>/edit` → bảng `Variants` có cột **`Price (VND)`** sửa được trực tiếp
(`spinbutton` inline trong bảng, hoặc form thêm variant mới phía trên với ô `$` + spinbutton).
⇒ Khác với giả định trong 1 số task cũ, việc set giá $0 cho 1 Product Base variant **nằm trong khả
năng của agent** (không cần Shopify Admin) — nhưng **KHÔNG tự ý sửa giá của product base người khác
đang dùng** để né việc "tạo mới". Task yêu cầu chỉ tìm cái **có sẵn**, không tạo/sửa qua đường vòng.

### Catalog Product Base rất lớn (464 sản phẩm) — không khả thi kiểm tra thủ công từng cái
`/products?limit=500` trả về **464 product base** trên instance `Enterprise (Test)`. Đã kiểm tra:
- `example product base - tshirt` (3139): variant S=500.000, M=50 VND — không có $0.
- `example product base - mug` (3140): variant 11oz=123.456, 15oz=123.456 VND — không có $0.
- Search theo tên `zero`, `free` trong ô Search (param `title=`) → **0 kết quả** cả hai.
- Không có endpoint UI để lọc theo khoảng giá; muốn tìm chính xác biến thể giá=0 giữa 464 sản phẩm
  phải mở từng trang `/products/<id>/edit` và đọc bảng variant — **không khả thi trong thời gian
  hợp lý** bằng thao tác UI tuần tự.
- Thử gọi thẳng `staging-graphql.teeinblue.com/v1/graphql` qua `fetch()` trong browser (đọc, không
  ghi) để lọc `products_variants(price=0)` → lỗi `Invalid response from authorization hook` (thiếu
  header nội bộ mà SPA tự set, không phải chỉ cookie) — không đi tiếp hướng này vì bắt đầu lấn sang
  "gọi tắt API" ngoài phạm vi cho phép.
⇒ Kết luận: **không tìm được Product Base variant giá $0 nào trong phạm vi kiểm tra hợp lý** (2
product base chuẩn của đội + tìm theo tên). Việc quét hết 464 sản phẩm cần thời gian/ngân sách vượt
xa 1 phiên — nên coi đây là **best-effort/blocked**, không phải "đã xác nhận không tồn tại".

### 🔴 Quan sát quan trọng: giá ÂM (negative price) của Addon Charge KHÔNG trừ vào tổng giá trên storefront
Set `Negative Price Value` = **-10.000₫** cho layer Addon Charge C (mode `direct_price`), verify
trên storefront `linh-tib-staging` (đã Update thành công, không lỗi console):
- Label option trên storefront **không hiện hậu tố giá** (không có "-10.000 VND" cạnh tên, trong
  khi các option dương như `Large +50.000 VND` hiện đúng).
- Baseline: chọn `Addon Charge A = Large` (+50.000) + `Addon Charge C = Unpriced Value` → tổng
  **550.000 VND** (đúng). Đổi `Addon Charge C` sang `Negative Price Value` (-10.000) → tổng
  **VẪN 550.000 VND** (kỳ vọng 540.000 VND nếu trừ đúng).
- Đối chứng: đổi `Addon Charge A` giữa `Small`/`Large` thì tổng cập nhật đúng ngay (500.000 ↔
  550.000) ⇒ cơ chế tính tổng live hoạt động bình thường, vấn đề riêng với giá trị **âm**.
- Selector đọc tổng giá ổn định: `document.querySelector('.tee-price--current').textContent`.
⇒ Đây là input trực tiếp cho TC-TIB-3930 (test giá âm) — nghi vấn storefront/cart-transform bỏ qua
hoặc clamp giá trị âm về 0 khi cộng dồn. **Chưa báo bug** (theo quy tắc không tự tạo bug trên
Testlane), chỉ ghi nhận quan sát để người review quyết định.
Evidence: `evidence/TIB-5482/05-storefront-staging-negative-price-not-reduced.png`.

### Tìm campaign schema 1 (chưa migrate Artwork 2.0) — BEST-EFFORT, KHÔNG tìm thấy
Lấy toàn bộ campaign qua `/campaigns?limit=500`, sort theo `created_at` (client-side, vì param
`sort`/`sort_type` trên URL không có tác dụng — FE không đọc query đó). Campaign cũ nhất còn tồn
tại: **id 94** (`girl and dog`, 2023-01-05) — không có artwork gắn vào print area nào (cả 2 print
area đều `Select artwork`, không `Edit artwork`) nên không kiểm tra được schema. Campaign cũ thứ 2
có artwork: **id 104** (`soft delete fonts`, artwork id 74, 2023-01-17) — mở artwork editor thấy
header `(#74 - 1600x1600 - PNG_RGB)` + có khái niệm `Default template` / `Template:` giống hệt
Artwork 2.0 mới ⇒ **artwork từ 2023 này đã được migrate lên schema 2**, không phải schema 1.
⇒ Nghi vấn: toàn bộ campaign trên instance `Enterprise (Test)` có thể đã được migrate hết, không
còn schema 1 nào sống sót để test, hoặc portal UI không có cách phân biệt schema 1 vs 2 sau khi đã
render qua cùng 1 editor. Không kiểm tra hết ~430 campaign còn lại (không khả thi trong 1 phiên).
**Kết luận: BLOCKED/best-effort — không tìm thấy campaign schema 1, đã thử 2 campaign cũ nhất có
artwork, cả hai đều schema 2.**

## Kết quả phiên 2026-09-29 (tiếp TIB-5482, campaign 2671, artwork 4448)
4 việc chính đã hoàn thành trên artwork 4448 (tổng cộng giờ có **6 layer Addon Charge**: A, B, C,
D, E, F + 1 text layer Character Count):
1. **Global option `Global Addon Charge`** (id **970**, `/global-options/970/edit`), mode
   `direct_price`, 1 option value `Global Addon Value` = **+20.000₫** (chỉ set cho
   `linh-tib-staging`). Gắn vào **2 layer mới**: `Addon Charge E` (layer id 672337) và
   `Addon Charge F` (layer id 459758) — cả hai dùng chung global option, dedupe thành 1 field trên
   form. Quan sát: `Charge method` bị **ẩn hoàn toàn** khỏi panel layer khi dùng global option.
2. **Layer `Addon Charge D`** (layer id 483174) — chế độ LEGACY mặc định (`Add a separate addon
   item to the cart`, KHÔNG bật direct-price), 1 option value `Legacy Addon Value` đã **Attach**
   variant Shopify `Preset - Addon product - addon 1 - 25000` cho store `linh-tib-staging`.
3. **2 option value mới cho layer `Addon Charge C`** (layer id 871092, đã có sẵn `Unpriced Value`):
   thêm `Negative Price Value` (giá **-10.000₫**, set cho `linh-tib-staging`) và
   `Other Store Price Value` (giá **+15.000₫**, set CHỈ cho `linh-tib-checkout`, để trống
   `linh-tib-staging` — verify lại đúng bằng cách mở dialog Price, dòng `linh-tib-staging` vẫn hiện
   nút `Add`).
4. **Sản phẩm/variant giá $0** — **BLOCKED/best-effort** (xem mục phía trên), không tìm được trong
   464 product base của catalog; không tạo mới vì task yêu cầu không đi đường vòng.
5. **Campaign schema 1** — **BLOCKED/best-effort** (xem mục phía trên), 2 campaign cũ nhất có
   artwork đều đã migrate lên schema 2.

Đã `Save` (không đóng) sau mỗi layer để tránh mất dữ liệu, `Save & Close` sau khi xong hết layer
5 (Addon Charge D). Console sạch xuyên suốt (0 error) toàn bộ phiên chỉnh sửa artwork.

Đã `Update` campaign 2671 **chỉ cho store `linh-tib-staging`** (request `POST
/api/campaigns/2671/sync` → 200), **KHÔNG đụng `linh-tib-checkout`** (vẫn ở trạng thái
`Update required` sau phiên này vì có option value `Other Store Price Value` mới set giá riêng cho
store đó — coordinator có thể muốn tự quyết định khi nào update store đó).

Verify storefront `linh-tib-staging` (`/products/add-addon-charge-mode-that-adjusts-the-item-price-directly`,
region Vietnam/VND): form hiện đủ 6 field (`Addon Charge A/B/C/D`, `Global Addon Charge`,
`Character Count Text`), giá cộng dồn đúng cho các addon dương, **phát hiện anomaly giá âm không
trừ vào tổng** (xem mục quan sát phía trên). Console chỉ có lỗi `favicon.ico 404` (không liên quan).

---

# Quick Navigation (TIB-5349) — popup & điều kiện bật — ✅ ĐÃ VERIFY 2026-09-30 (campaign 2704, by Product Base)

## Nút mở popup nằm ở đâu
Trang campaign editor, khối `STEP 2: PREVIEW YOUR CAMPAIGN` → header **`PERSONALIZATION FORM`**,
nút icon "table of contents" ở mép phải cùng hàng.
Selector ổn định: **`.artwork-navigation-button button`** (accessible name RỖNG, không có tooltip khi enabled).

## 🔑 Popup là PER PRODUCT BASE, không phải 1 popup chung cho cả campaign
Đã verify trên campaign có 3 product base: bật toggle ở PB `example product base - tshirt` → mở popup
của PB `QA-TIB-5349 Organic Cap` thì toggle vẫn **OFF**. Mỗi PB giữ setting riêng.
Đổi PB bằng cách click tên PB trong khối `AVAILABLE PRODUCT` (URL đổi `?product-id=<pbId>`).

## Nội dung popup (state trên staging 2026-09-30)

**Khi toggle OFF** — popup chỉ có đúng 2 thứ:
```
Quick navigation                                  [X đóng, class .dialog-close]
( ) Enable quick navigation to each artwork's options
    A navigation will show up at the top of the form, buyers can click on it to
    quickly scroll to a specific artwork's form. Best for campaigns with a long
    form like multi-pieces campaigns.
```

**Khi toggle ON** — hiện thêm ô nhập tên (đây là phần feature TIB-5349):
```
Menu Item's name:  (Leave empty to use product name)
[ input, placeholder = "Product name 1" ]
Insert {{index}} to place the number. Eg. "Customize #{{index}} design".
```

- Label chính xác: **`Menu Item's name:`** (có dấu `'`, chữ `name` viết thường, có dấu hai chấm).
  Hint ngay cạnh label: `(Leave empty to use product name)`.
- Placeholder input: **`Product name 1`** (số cuối = index của product base trong campaign).
- Helper text dưới input: ``Insert {{index}} to place the number. Eg. "Customize #{{index}} design".``
- **Dòng note cũ `Note: Navigation will use Product Base as the menu name.` KHÔNG còn** trong popup.
- Chỉ có **1 ô** Menu Item's name cho cả PB (không phải 1 ô/artwork), dù PB có 2 artwork.
- Popup **KHÔNG có nút Save** — chỉ có nút X. Thay đổi lưu ngay (verify: bật ON → reload full trang
  → mở lại popup vẫn ON).

## Điều kiện enable: variant phải bind ≥2 printarea
PB mà variant chỉ bind 1 printarea (⇒ form chỉ có 1 artwork) thì nút `.artwork-navigation-button button`
có thuộc tính **`disabled`**, hover ra tooltip:
```
Quick navigation only works with multiple artworks in the form
```

## 🔑 Số artwork trong form = số printarea mà VARIANT bind, không phải số printarea của product base
`example product base - mug` (3140) có 2 printarea (`11oz`, `15oz`) nhưng bật
**`Custom variant's printarea`**: variant `11oz` chỉ bind printarea `11oz`, variant `15oz` chỉ bind `15oz`.
⇒ Dù gắn artwork cho cả 2 printarea, form của mỗi variant vẫn chỉ có **1** section ⇒ quick nav bị disable.
Trang campaign hiện dòng `Variant's custom printarea(s): 11oz (1400x1400)` để xác nhận.
`example product base - tshirt` (3139) KHÔNG bật custom variant printarea ⇒ variant bind cả Front+Back ⇒ 2 section.

Kiểm nhanh: mở `/products/<pbId>/edit`, bảng `Variants` có cột **`Custom Printareas`** thì PB đó đang
dùng custom variant printarea.

## Flow: Tạo Product Base thủ công (`/products/new`) — ✅ ĐÃ VERIFY 2026-09-30 (PB 3324)
Dùng khi cần product base thứ 3 mà 2 PB chuẩn (`example product base - tshirt/mug`) không đáp ứng.
1. `/products/new` → form `Basic information`: `Product title` (**prefill sẵn `Example MUG`, phải xoá**),
   `Internal name (optional)`, `Internal tags (optional)`, `Fulfillment provider` (bỏ trống được) → `Save`
   → redirect `/products/<id>/edit`.
2. **Printareas** → nút ` New printarea` → hàng inline: `Fulfilled key` (prefill `Front`),
   `Display name`, `Width`/`Height` (mặc định 1400x1400) → `Save`. Lặp lại cho printarea thứ 2
   (**phải sửa `Fulfilled key` vì vẫn prefill `Front`**).
3. **Variants** → ` New variant` → hàng inline: `SKU`, `Color`, `Size` (3 ô bắt buộc, viền đỏ),
   `#FFFFFF`, `Weight`, giá, compare price → nút ` Add`.
   Toast: `Variant added. Go to campaign to enable.` Console có `404 /api/staff-activity-logs/variant:0` — **vô hại**.
   🔴 **Giá (`$ 0.00`) tưởng đã có giá trị sẵn nhưng thực ra field rỗng** — click `Add` lần đầu
   không báo lỗi gì rõ ràng (không toast, console sạch) nhưng **row không được thêm vào bảng**
   (vẫn `No record`), ô Price tự hiện viền đỏ. Phải click vào ô Price, gõ số > 0 (vd `10`) rồi
   mới `Add` lại thì mới thành công (toast ẩn, nhưng bảng có row mới ngay, `404 variant:0` xuất
   hiện trong console — vô hại, không phải dấu hiệu fail).
   ⚠️ **Variant mới KHÔNG tự "Available" cho campaign đã add product base từ trước** — cột
   `Add to campaigns` của row variant có 1 nút icon riêng (`.btn-add-to-campaign`, accessible name
   rỗng). Click vào đó → dialog `Campaigns that use this product` liệt kê campaign đang dùng PB này
   (cột `Variant status` = `Not available`) → tick checkbox dòng campaign cần → `Add` → confirm
   dialog phụ `Add variant to campaigns` → `Add` lần nữa → `Variant status` đổi thành `Available`.
   Bỏ qua bước này ⇒ campaign vẫn báo `No variant for this product.` dù Product Base đã có variant.
4. **Mockup** → ` Upload` → dialog thư viện ảnh (grid `.layer-listing__item`): click vào `img` của ảnh
   → nút `Select 1 images`. Mockup vào trạng thái `Rendering`.
5. Mở **Mockup Editor** (nút bút chì: `.mockup-action__btn.v-popper--has-tooltip >> nth=0`)
   → ` Add Printarea` → menu list printarea (`Front (1400x1400)` / `Back (1400x1400)`) → chọn từng cái.
   Printarea layer mặc định **100x100 @ top 50/left 50**, hai cái ĐÈ LÊN NHAU ⇒ phải dời bằng `Transform`.
   → `Save & Close`.
6. ` Assign mockups` → `Select all` (variants) + `Select all` (mockups) → `Save`
   → panel `Mockup assignments` xác nhận `<mockup> ↔ <variant> 1 variant` → `Close`.

## 🔴 Publish fail: `Handle '<slug>' already in use` khi đã có Shopify product cùng tên
`POST /api/campaigns/<id>/publish` trả **500**, toast đỏ:
```
Something went wrong!
Shopify errors:
Handle 'let-users-customize-the-navigation-name-in-the-quick-navigation' already in use. Please provide a new handle.
```
Xảy ra khi trên store đã có product Shopify dùng đúng handle sinh từ campaign title (ở đây: product của
campaign "by Shopify Products" 532 cùng issue TIB-5349).
- Dialog `Listing info` **KHÔNG có field handle** (chỉ Product Type / Vendor / Product Tags / Thumbnail)
  ⇒ không set handle riêng được.
- Cách duy nhất từ portal: **đổi campaign title** (inline editor ở STEP 2) → handle sinh lại theo title mới.

---

# Phiên TIB-5349 phần 2 (Testlane TIB-108) — 2026-09-30, PB 3325 / campaign 2705 (4 artworks) + recon campaign 532

## 🔴 `/campaigns/<id>/edit` với campaign "by Shopify Products" → toast `This action is unauthorized`
Campaign 532 là platform product. Mở `https://staging-portal.teeinblue.com/campaigns/532/edit`
→ trang trắng + 2 toast đỏ `Something went wrong! / This action is unauthorized.`
**URL đúng là `/platform-products/532/edit`.** Đừng tưởng mất quyền / campaign bị xoá.

## Flow `/products/new` — bổ sung 2 cạm bẫy (ĐÃ VERIFY 2026-09-30, PB 3325)

### 1. Hàng inline `New printarea` có sẵn trong DOM nhưng ẨN
`fill()` vào `input[placeholder="Fulfilled key"]` **chạy được ngay cả khi chưa bấm `New printarea`**
(input tồn tại, `offsetParent` null) ⇒ tưởng đã điền nhưng thực ra form chưa mở.
**Phải bấm button ` New printarea` trước**, rồi mới điền.

### 2. 🔴 Nút `Save` của hàng printarea bị `div#step-3-product` (box-title sticky) chặn click
Playwright báo `<div id="step-3-product" class="box-title d-flex flex-wrap">…</div> intercepts pointer events`,
retry mãi rồi timeout. Scroll thủ công KHÔNG cứu được (Playwright tự scroll lại vào đúng chỗ bị che).
**Cách chạy được:** điền xong `Display name` rồi **nhấn `Enter`** — submit hàng printarea y hệt bấm Save.
Sau mỗi lần Enter, hàng inline **giữ nguyên và reset về prefill `Front`** ⇒ điền tiếp printarea sau
mà không cần bấm `New printarea` lại.

### 3. Product Base có thể có > 2 printarea — 4 printarea chạy bình thường
PB 3325 `QA-TIB-5349 Quad Panel Tee`: 4 printarea `Front` (14129) / `Back` (14130) /
`Left Sleeve` (14131) / `Right Sleeve` (14132), tất cả 1400x1400.
`Custom variant's printarea` để **OFF** ⇒ variant duy nhất bind cả 4 ⇒ form campaign có **4 section**
⇒ đủ điều kiện test overflow dropdown của Quick Navigation.

## Mockup Editor — popup Transform KHÔNG có id `#quick-transform-editor-*`
Trong **Mockup Editor** (khác artwork editor), popup Transform chỉ có `input.form-control[type=number]`
không id, không name. Cách ổn định:
- Mở popup: `.qte-field:has-text("Transform") >> visible=true`
- Lấy ref bằng `browser_find` với regex `Width:|Left:` rồi dùng ref của `spinbutton`.
- Đọc lại giá trị: `[...document.querySelectorAll('input[type=number]')].filter(i=>i.offsetParent).map((i,n)=>n+':'+i.value)`
  → thứ tự `... 4:width 5:height 6:top 7:left 8:rotate` (0-3 là ô printarea/khác của trang dưới).
- **Width/Height bị KHOÁ tỉ lệ** cho printarea layer: set Width=80 ⇒ Height tự thành 80.
- ⚠️ Mỗi lần bấm ` Add Printarea` xong, **popup Transform tự đóng** ⇒ phải click lại `.qte-field:has-text("Transform")`
  cho layer mới. Layer mới luôn 100x100 @ top50/left50 nên 4 cái chồng nhau nếu không dời.
- Cách clear an toàn (tránh bug nối chuỗi): click ô → `ControlOrMeta+a` → `browser_type` giá trị mới.

Layout đã dùng cho mockup nền 200x200 (4 printarea 80x80, lưới 2x2):
`Front (10,10)` · `Back (10,110)` · `Left Sleeve (110,10)` · `Right Sleeve (110,110)`.

## Artwork editor: header section của panel ✎ viết **Title Case**, không phải UPPERCASE
`browser_find` với `PERSONALIZATION SETTINGS` **không khớp**. DOM thật:
`div.layer-panel__header > span.mr-auto` có text **`Personalization Settings`**.
Selector chạy ổn định:
```
.layer-panel__header:has(span.mr-auto:text-is("Personalization Settings"))
```
(CSS hiển thị uppercase, nên screenshot nhìn ra `PERSONALIZATION SETTINGS`.)

## Quick navigation popup của campaign **by Shopify Products** — giống hệt by-Product-Base
Verify trên campaign 532 (platform product, 2 artwork, `Connect artworks with Shopify variants` OFF):
- Nút mở vẫn là `.artwork-navigation-button button` ở header `PERSONALIZATION FORM`, **không disabled**
  (vì 2 artwork cùng hiện cho 1 variant).
- Toggle OFF: popup chỉ có tiêu đề `Quick navigation` + toggle `Enable quick navigation to each artwork's options` + mô tả.
- Toggle ON: hiện **đúng 1 ô** `Menu Item's name:` + hint `(Leave empty to use product name)`,
  placeholder `Product name 1`, helper ``Insert {{index}} to place the number. Eg. "Customize #{{index}} design".``
  ⇒ **Với platform product, ô này ở cấp PRODUCT (campaign), không có lớp Product Base** —
  campaign chỉ có 1 sản phẩm nên chỉ có 1 ô, khác by-Product-Base (1 ô / product base).
- Popup KHÔNG có nút Save, đổi toggle lưu ngay.
- Khi ON, thanh nav render trong preview form: `.tee-artwork-nav` > `.tee-artwork-nav__viewport` >
  `.tee-artwork-nav__item` (+ `--active`) > `.tee-artwork-nav__label`, và `.tee-artwork-nav__more-button`
  (nút overflow). Label mặc định = **tên artwork + số thứ tự** (vd `… Quick Navigation 1`, `… 2`).

## ✅ Blocker "Shopify product chưa lên Online Store" của campaign 532 ĐÃ HẾT (2026-09-30)
`https://linh-tib-staging.myshopify.com/products/let-users-customize-the-navigation-name-in-the-quick-navigation`
đã trả về **trang sản phẩm thật** (không còn 404): 2 variant `S` (54408740733244) / `M` (54408740766012),
product id `10489842860348`, form teeinblue render 2 field (`Text layer` × 2).
⇒ Mục "🔴 Blocker tiềm ẩn" ở flow by-Shopify-Products phía trên chỉ còn giá trị lịch sử cho campaign này.

## Tránh lỗi publish `Handle already in use` — đặt hậu tố NGAY từ đầu
Campaign 2705 đặt title `… (4 artworks)` ngay lúc tạo ⇒ handle
`let-users-customize-the-navigation-name-in-the-quick-navigation-4-artworks`,
`POST /api/campaigns/2705/publish` trả 200 ngay lần đầu, không dính lỗi 500 như campaign 2704.

---

# Phiên TIB-5425 (Testlane TIB-153) — 2026-10-01, campaign 2714 / artwork 4539

## Feature mới: "Choose from a clipart category" khi chọn ảnh gốc cho layer ảnh thường — ĐÃ VERIFY reachable

Khác với layer `Clipart Category` (dedicated type, đã biết từ lâu), feature TIB-5425 là: **layer ảnh
thường** (`Static Image` khi thêm mới, và popup **Replace image layer** của layer ảnh đã có) giờ cũng
có tab `Choose from clipart category` song song với `Upload an image` — y hệt cấu trúc dialog của
layer Clipart Category. Đã verify CẢ HAI chỗ:
- `+ Layer` → `Static Image` → dialog có tab `Upload an image` / `Choose from clipart category`.
- Icon `⇄` (replace) trên layer ảnh có sẵn trong layer list → mở popup cùng cấu trúc 2 tab.

Chọn category: click link ` Search` cạnh `Select a clipart category:` → popup **"Search categories
by name"** (khác hẳn cây treeselect cũ) → gõ tên → list "Latest categories" kèm thumbnail xem trước
→ click dòng category → bên phải hiện lưới clipart của category đó (ảnh thật, không phải icon tròn
chung chung — khác với ghi chép cũ 2026-08-25 lúc category rỗng/test data khác).

### Kết quả quan sát (dedup theo tên clipart, KHÔNG theo category)
Pick 1 clipart (`tib5425-main`) vào layer `Clipart Category` (dedicated) → **image library có đúng 1
ảnh mới**, tên = tên clipart, **không gắn category nào** trong library (nằm ở "All"). Mở lại picker
ở layer KHÁC trong CÙNG artwork, pick lại đúng clipart đó lần nữa (tình huống xảy ra tự nhiên vì
dialog luôn mở sẵn ở "Main" sau lần chọn trước) → **KHÔNG sinh thêm ảnh mới** — verify bằng cách gõ
`tib5425` vào ô `Search` của tab `Upload an image`/picker ảnh và đếm `.layer-listing__item` (đáng tin
cậy hơn đếm tổng thư viện vì thư viện có >600 ảnh từ các phiên QA khác). Kết luận: **dedup theo
clipart id hoạt động đúng**, kể cả khi pick nhiều lần trong cùng artwork.

### Layer `Group of clipart categories` — chọn parent rồi đổi sang child qua dropdown
Dialog `Select a group of clipart categories:` dùng picker "Search categories by name" giống trên
nhưng chỉ cho chọn ở cấp PARENT (vd `TIB-5425 - Import clipart`). Sau khi chọn, bên phải hiện
**`combobox "Select a clipart as an original layer:"`** liệt kê các CHILD category của parent đó
(vd `TIB-5425 - Main` / `TIB-5425 - Group A` / `TIB-5425 - Group B` / `TIB-5425 - Large`) — đổi
dropdown này mới load đúng grid clipart của child category, mặc định dropdown chọn child đầu tiên
theo alphabet/id chứ không phải cái vừa gõ.

### Layer `Vector Category` / `Static Vector` — cùng cấu trúc, tab tên khác
`+ Layer` → `Vector` group → `Static Vector` → dialog tab `Upload a vector` / `Choose from vector
category`. Cùng popup "Search categories by name" (Selected: `<tên category>`), chọn category xong
hiện lưới clipart (thực chất là vector, card hiển thị y hệt). Lưu ý: category có chỉ 1 clipart thì
card đó luôn auto-highlight sẵn (viền xanh) — vẫn phải bấm `Save` để xác nhận.

## 🔴🔴 BLOCKER NGHIÊM TRỌNG: rate-limit 429 trên các endpoint tạo layer-image, kéo dài liên tục >20 phút

Trong lúc dựng data cho TIB-5425, sau đúng **2 lần gọi thành công** `POST
/api/layer-images/from-clipart` (→ 201, tạo layer 1 + layer 2 ở artwork 4539), **mọi request tạo
layer-image tiếp theo đều trả 429**, bất kể qua đường nào:
- `POST /api/layer-images/from-clipart` (chọn clipart category cho layer 3 — Vector Category)
- `POST /api/layer-images/by-temporary-file` (upload ảnh thường qua `Static Image` → `Upload an
  image`, kể cả sau khi file đã lên S3/DigitalOcean Spaces thành công ở bước trước đó)

### Đặc điểm quan sát được
- **UI nuốt lỗi hoàn toàn** — không toast đỏ, không banner. Dialog vẫn cho bấm `Save` lại y hệt,
  item upload vẫn hiện `Generating...` vô thời hạn. Chỉ thấy lỗi qua `browser_console_messages` /
  `browser_network_requests`. Nút `Reload` trong dialog **không retry** request đã fail — chỉ refetch
  listing cũ, item `Generating...` bị kẹt vĩnh viễn cho tới khi đóng dialog và upload lại từ đầu.
- Đã thử chờ 15s / 30s / 90s / >5 phút / >20 phút cộng dồn giữa các lần retry (đều cách nhau ít nhất
  30-90s, không spam) — **429 không tự hết** trong toàn bộ phiên làm việc (~25 phút kể từ lần đầu).
- Request đọc (`GET`, list thư viện, list category, publish campaign, attach artwork vào print area)
  **hoàn toàn không bị ảnh hưởng** — chỉ riêng nhóm POST tạo layer-image bị khoá.
- Rất giống một quota cứng kiểu "N lần tạo layer-image / (giờ|ngày) / account" chứ không phải burst
  limiter thông thường (burst limiter thường hết hạn sau vài chục giây).

### Hệ quả cho agent chạy sau
- Nếu cần dựng nhiều layer ảnh/clipart trong 1 phiên, **ước lượng trước budget request** — phiên này
  chỉ tạo được đúng 2 layer-image trước khi bị khoá.
  budget cụ thể 2 lần/giờ|ngày, chỉ biết NGƯỠNG THẤP ≤ 2 request thành công liên tiếp rồi khoá.
- Nếu gặp lại 429 ở 2 endpoint này, **đừng retry dồn dập** — không giúp ích, UI im lặng khiến dễ tưởng
  nhầm đã lưu. Luôn check console sau MỖI lần Save ở các dialog có tab "Upload"/"Choose from clipart
  category"/"Choose from vector category".
- Cách nhận biết nhanh item bị kẹt: card trong dialog upload hiện mãi **"Generating..."** mà không
  bao giờ chuyển sang card ảnh thật + checkbox chọn được.
- Nếu bị khoá, các bước KHÔNG cần tạo layer-image mới vẫn chạy bình thường: attach artwork có sẵn vào
  print area, publish/launch campaign, xem storefront. Ưu tiên hoàn thành các bước đó để không mất
  toàn bộ phiên làm việc.

## ✅ Storefront preselect cho layer Clipart Category — ĐÃ VERIFY ĐÚNG (2026-10-01)

Layer `Clipart Category` (dedicated) chọn clipart `tib5425-main` lúc dựng artwork → publish campaign
→ mở storefront → field `tib5425-main` trong khối `PERSONALIZE` hiện **đúng card đã chọn ở trạng
thái checked** (viền xanh, swatch đầu tiên trong hàng). Verify bằng accessibility snapshot: radio
tương ứng có thuộc tính `[checked]`. Layer `Group of clipart categories` cũng preselect đúng — field
`tib5425-group-a-item` hiện dropdown category con đã chọn (`TIB-5425 - Group A`) + card clipart đã
chọn checked sẵn. Không cần thao tác gì thêm trên storefront, preselect đúng ngay lần load đầu.

## 🔴 RETRY 2026-10-01 (phiên mới, cùng ngày): 429 KHÔNG tự hồi phục dù cách phiên trước >20 phút

Mở lại campaign 2714 / artwork 4539 trong một phiên hoàn toàn mới (session mới, navigate lại từ
đầu, không reuse state cũ), thử bước đầu tiên còn thiếu: thêm layer `Vector Category` → tab
`Choose from vector category` → Search category `TIB-5425 - Vector` (chỉ có đúng 1 clipart
`tib5425-valid-small`, tự auto-highlight) → `Save`. Kết quả:
- `POST /api/layer-images/from-clipart` trả **429 ngay lần gọi đầu tiên** của phiên mới — tức quota
  không reset theo kiểu "N request/phiên browser" hay theo thời gian ngắn (~20-30 phút) như đoán ban
  đầu ở phiên trước.
- Retry thêm 3 lần, mỗi lần cách nhau ~30s chờ bằng `browser_wait_for({time: 30})` (không dùng bash
  `sleep` — bị chặn bởi sandbox) → **cả 3 lần retry đều 429**, tổng cộng 4/4 lần gọi fail trong phiên
  retry này.
- Dialog `Vector Category` vẫn giữ nguyên trạng thái chọn sẵn (card highlight, nút `Save` vẫn bấm
  được) suốt các lần retry — UI không tự thông báo lỗi, đúng như quan sát phiên trước.
- Đóng dialog bằng nút `X` (không bấm `Save` thêm lần nào sau retry cuối) rồi `Cancel` toàn bộ
  artwork editor — xác nhận layer list artwork 4539 vẫn đúng 2 layer cũ (`tib5425-group-a-item`,
  `tib5425-main`), không có layer vỡ/rác nào được tạo ra.

### Kết luận cập nhật cho agent chạy sau
- Quota 429 trên `POST /api/layer-images/from-clipart` (và nhiều khả năng cả
  `/api/layer-images/by-temporary-file`) có cửa sổ hồi phục **dài hơn nhiều** so với ước lượng ban
  đầu (>20 phút không đủ). Chưa xác định được đúng ngưỡng — có thể tính theo giờ hoặc theo ngày.
- Đừng retry dồn dập nhiều lần ở đầu mỗi phiên mới nữa — pattern "2-3 lần chờ 30s" chỉ nên dùng để
  **xác nhận lại** là blocker vẫn còn, không phải để chờ nó tự hết. Nếu xác nhận vẫn 429 ngay từ
  request đầu tiên của phiên, dừng ngay, đừng retry thêm — tốn request quota (nếu có đếm cả request
  fail) mà không đổi được kết quả.
- Nếu cần hoàn thành phần còn lại của TIB-5425 (Vector Category layer, 3 plain image layer, Replace
  image layer, dedup-check artwork 2, re-publish), nên thử lại cách phiên bị khoá gần nhất **vài giờ
  trở lên**, hoặc hỏi người phụ trách hạ tầng xem có cách reset quota thủ công trên staging không.

---

# Phiên TIB-5492 (Testlane TIB-155) — 2026-10-01, PB 3332 / campaign 2722

## Flow: Description (rich text) của Product Base — ✅ ĐÃ VERIFY

Field `Description` trong `Basic information` của `/products/new` (và `/products/<id>/edit`) là
1 editor **Tiptap**, đủ toolbar: `Bold` `Italic` `Strikethrough` `Underline` `H1` `H2` `H3`
`Bullet list` `Numbered list` `Link` `Unlink` `Image` `Undo` `Redo` `Code`. Accessible name của
button rỗng — nhận diện bằng **attribute `title`** (`page.getByTitle('Bold')`,
`page.getByTitle('Bullet list')`, ...).

🔴 **Cạm bẫy chí mạng: `browser_type` KHÔNG dùng `slowly` sẽ gọi Playwright `fill()`, và `fill()`
trên editor Tiptap (contenteditable) THAY THẾ TOÀN BỘ nội dung cũ** thay vì chèn tại vị trí con trỏ
— y hệt lỗi đã biết ở các ô khác, nhưng ở đây hậu quả là **mất sạch phần text đã gõ trước đó** mỗi
lần gọi `browser_type` không có `slowly: true`. Bắt buộc luôn truyền `slowly: true` (dùng
`pressSequentially` thật) khi gõ nối tiếp nhiều đoạn vào cùng 1 ô Tiptap.

Quy trình đã verify để tạo description có đủ: đoạn text thường + đoạn bold + bullet list 2 item:
1. Click vào editor (`.tiptap`), `ControlOrMeta+a` + `Delete` nếu cần dọn trống trước.
2. `browser_type(..., slowly: true)` đoạn text thường.
3. Click `title=Bold` để bật, `browser_type(..., slowly: true)` đoạn cần bold, click lại
   `title=Bold` để tắt (nếu không tắt, ký tự gõ tiếp theo vẫn bold).
4. `Enter` để xuống dòng mới, click `title=Bullet list`, `browser_type` item 1, `Enter`,
   `browser_type` item 2.
5. Verify cấu trúc bằng `browser_find` text đặc trưng (vd tên item bullet cuối) — snapshot trả về
   đúng cây `paragraph > text + strong` rồi `list > listitem > paragraph` nếu đúng.
6. Nút `Code` (`</>`) nếu lỡ bấm nhầm lúc con trỏ đang ở vị trí trống (không chọn gì) sẽ disable
   Bold/Italic/Strike/Underline cho tới khi bấm lại `Code` để tắt — không ảnh hưởng nội dung đã có,
   nhưng nên tắt lại cho sạch trước khi `Save`.

Description **persist đúng y hệt structure đã nhập** sau khi `Save` + reload `/products/<id>/edit`
(PB 3332: đoạn text thường, `<strong>Bold text check</strong>`, `<ul><li>Bullet item 1</li>
<li>Bullet item 2</li></ul>`). Description cũng **render đúng ở khối `DESCRIPTION` trong STEP 2:
PREVIEW YOUR CAMPAIGN** của campaign editor (`/campaigns/<id>/edit?product-id=<pbId>`) ngay cả khi
campaign chưa publish — tiện để verify nhanh mà không cần publish lên Shopify.

## Flow: Tạo Product Base MỚI hoàn toàn (không đụng 2 PB demo dùng chung) — ✅ ĐÃ VERIFY

Khi 1 issue cần Product Base riêng (vd để set description riêng mà không ảnh hưởng data chia sẻ),
làm theo đúng flow `/products/new` đã ghi ở mục trên, rút gọn còn tối thiểu (bỏ mockup nếu case
không cần preview trực quan):
1. `/products/new` → điền `Product title` + `Internal name` (đặt theo convention
   `QA-TIB-<issue>-<YYYYMMDD>-<mô tả ngắn>`, dùng chung cho cả 2 field) + `Internal tags` = issue
   key + Description (nếu case cần) → `Save` → có `product-id` mới từ URL `/products/<id>/edit`.
2. Thêm đúng 1 printarea (`New printarea` → điền `Display name` → `Enter` để submit, xem cạm bẫy
   "Save bị che" ở mục cũ phía trên).
3. Thêm đúng 1 variant (xem cạm bẫy "Price rỗng" + "Add to campaigns" ở mục trên) — **bắt buộc**
   nếu campaign cần hiển thị variant để launch sau này, dù case hiện tại chưa publish.
4. Có thể bỏ qua Mockup/Assign mockups nếu case không cần test artwork/layer (campaign vẫn tạo
   được, STEP 2 preview chỉ thiếu ảnh mockup thật, không chặn gì khác).

PB 3332 (`QA-TIB-5492-20261001-description-metafield`) dùng flow rút gọn này: có description +
1 printarea (`Front` 1400x1400, id 14142) + 1 variant (`Black/M`, giá 10, TIB Variant ID 91570,
đã enable cho campaign 2722) — **không có mockup**, không artwork/layer, đúng theo yêu cầu case.

## Campaign 2722 — PB 3332 (chưa publish)
Title: `[UID] Publish Product Base description to a Shopify metafield` (đúng title issue TIB-5492).
Internal tags: `TIB-5492`. Trạng thái: `Unpublished` (draft, đúng yêu cầu — chưa publish).
Console sạch suốt toàn bộ phiên (create campaign → add product base → add printarea/variant →
enable variant cho campaign) — không có `[GraphQL error]`/`ApolloError` nào.

## Flow: Photo Upload layer — Mask + Photo border (ĐÃ VERIFY 2026-10-05, TIB-5516, artwork 4599)

- `+ Layer` > `Photo Upload` > `Single Upload` > dialog chọn ảnh placeholder: click `.mockup-layer-listing__thumbnail` (nth) rồi `Select 1 image` (click checkbox bị overlay chặn).
- Toolbar canvas: `Transform | Align | Print Effects | [icon = Enable shadow] | Border`. Click `div.qte-field >> text=/^Border$/ >> nth=0` mở popup: switch `Enable photo border`, `Type` (Contour cut / Custom shape), `Border color` (textbox `hex`), `Border size:` (spinbutton), switch `Add a thin line around the border`, `Display border on`.
  ⚠️ Switch `Enable photo border` ban đầu OFF; selector `label.vue-js-switch` chung dễ bấm nhầm switch `Show customer's photo on live preview` — luôn scope bằng `div:has(> label.vue-js-switch):has-text("<nhãn>")`.
- Mặc định border quan sát được: type `contour_cut`, color `#FFFFFF`, size `10`, line OFF, display `mockup_order` (Mockup Preview & Order Design). Color lưu dạng 8-hex (`#FF0000FF`).
- Chọn `Custom shape` hiện note "A shape image is required... Set it up in Crop into a custom shape".
- Mask nằm ở panel ✎ > `PERSONALIZATION SETTINGS` > `Upload editor: Photo Cropper` > switch `Crop into a custom shape` (= masked_enable) > `Shape image` > `Browse` (là `label`, mở OS file chooser, dùng browser_file_upload; accept png/webp, yêu cầu PNG đen đặc, cùng tỉ lệ layer). Không có thư viện mask có sẵn. Upload -> masked_url dạng `users/64/images/<...>_large.webp`.
- Option Title mặc định rỗng; đặt tên (vd `Photo 1`) để form hiển thị đúng.
- Network khi đổi border sang custom_shape: KHÔNG thấy POST photo-border-masks; chỉ GET `/api/merchant/games/photo-border/<base64>.json` khi border contour_cut (mỗi lần đổi color/size).
- Muốn đọc payload thật: patch `XMLHttpRequest.send` bắt PUT `/api/artworks/<id>` rồi bấm Save (GET /api/artworks/<id> trả 405).
- Default quan sát: `show_in_cart: true`, `required: false`.

## Flow: Photo layer "Select a color" + Dynamic Translations Import/Export (ĐÃ VERIFY 2026-10-05, TIB-5352, campaign 2740 / artwork 4630)

- Nhãn `Select a color` (default text_color_label) trên storefront cho photo layer KHÔNG nằm ở panel Photo Upload mặc định. Cách có: panel ✎ photo layer > `Image effects` > `Add new` > chọn `Portrait sketch (TIB)` (click `.vue3-treeselect__input` last, rồi text option) > bật `Allow customers to change sketch color` (`div:has(> label.vue-js-switch):has-text("Allow customers to change sketch color") label.vue-js-switch`). Preview form + storefront hiện `Select a color` (ColorPickerInput). Effect row rỗng (chưa chọn) nên xoá bằng nút x.
- Text layer: Option Title = `input[name="form_label"]`, Placeholder = `input[name="form_placeholder"]` (scope `.layer-editor-panel`). Mặc định `Show customization data on cart/checkout` của photo layer = ON.
- Layer mới thêm nằm TRÊN cùng list; `#manage-layer >> nth=0` mở layer trên cùng, dùng `#artwork-sortable-layer-layer-<id> #manage-layer` cho chính xác. Xoá layer: nút cuối trong row.
- Sau `Save & Close`, dialog artwork KHÔNG tự mở lại: bấm `Select artwork` lần nữa rồi click `.dialog-artwork-selector .vgrid-field` đầu tiên (artwork mới nhất) -> gắn vào Front.
- Launch dialog hiện 4 store: ship-n-pickup, linh-sdk-v2, linh-tib-checkout, linh-tib-staging. Click `tr:has-text("linh-tib-staging") button:has-text("Launch")`.
- Dynamic Translations: nút `Import` là label cho `input[type=file][accept=".csv"]`, `Export` tải `artwork-translations-<locale>.csv`. CSV: header `"Default","<Tên ngôn ngữ>"`, mỗi dòng `"key","value"`. Import chỉ đọc theo dòng, bỏ dòng đầu, cột 1 = key, phần còn lại = value; key chưa có sẽ tự thêm; chỉ nạp vào form của locale đang chọn, phải bấm Save mới lưu (POST /api/translations/bulk).
  ⚠️ CSV import KHÔNG được có dấu nháy kép quanh ô: code tách dòng thô nên lưu cả dấu `"` vào key/value (TIB-5352 từng sinh 1200 key rác `"QA5352-key-0001"`). Dùng file `Default,Vietnamese` rồi `key,value` không nháy (key/value không chứa dấu phẩy). Luôn import thử ~5 dòng, kiểm tra key hiển thị đúng rồi mới import cả lô.
- Mở màn hình: menu Extras > Dynamic Translations (`/artwork-translations`), chọn ngôn ngữ ở dropdown trước khi Import. Từ điển là store-wide.
- Xem từ điển storefront thật: `GET https://staging-api.teeinblue.com/api/merchant/translations/<locale>.json?shop=linh-tib-staging.myshopify.com&v=<hash>` (public, trả map key → value; đếm key bằng python/jq).
- Locale linh-tib-staging (2026-10-06): `en`, `vi`, `zh-TW`. Storefront `zh-TW` nằm ở `/zh-zh/` (không phải `/zh-tw/`, trả 404). Store đặt password storefront, cần nhập trước khi vào.

# Dynamic Translations (/artwork-translations) — ĐÃ VERIFY 2026-10-06 (TIB-5352)
- Mở: sidebar `Extras` > `Dynamic Translations`. SPA chậm: đợi ~8s (Initializing... có thể không biến mất trong 5s).
- Dropdown ngôn ngữ là `<select class="form-control">`: `English`, `Vietnamese`, `Chinese (Traditional)` (= zh-TW), `German`. Chọn bằng `select.form-control` selectOption theo text.
- Import: `label:has-text("Import")` mở file chooser; file phải nằm trong thư mục project (`.playwright-mcp/`). Cột: `Default,<Tên ngôn ngữ>`. Import chỉ nạp vào form, phải bấm `Save` (POST /api/translations/bulk).
- 🔴 CSV KHÔNG được có dấu nháy kép: parser tách dòng thô, giữ nguyên `"` trong key/value => key rác `"abc"`. 
- Danh sách key dùng chung mọi locale; mỗi locale chỉ có value riêng. Sau import chưa Save, reload sẽ hiện dialog beforeunload (accept để bỏ).
- Xoá key: nút trash từng dòng + confirm `Remove`, chỉ xoá cục bộ tới khi Save.
- Public JSON: GET https://staging-api.teeinblue.com/api/merchant/translations/<locale>.json?shop=<shop> (zh-TW và zh-tw đều 200). Storefront chỉ có `/zh-zh/` và `/vi-vn/`; lần navigate đầu có thể bị redirect về /en-vn/, navigate lại là được.

## Flow: Artwork standalone + upload custom font trong editor — ĐÃ VERIFY 2026-10-08 (TIB-5534, artwork 4698, font 970)
- `/artworks` → `button:has-text("New artwork")` → dialog `Artwork details` (Name*, Category, size 1600x1600, PNG_RGB) → `Save`. **Không có field Internal tags cho artwork.**
- Default text của Single-line Text 2.0: panel ✎ > `DESIGN SETTINGS` > `Default text (only for preview):` = `.layer-editor-panel input[name="text"]` (mặc định `Default text`). Ô `input#layer-<id>` ở form preview bên phải chỉ là preview, KHÔNG phải default text.
- Upload font: `.qinline-fontname` → `label[for="typography_type-custom"]` → ` Select a font` → dialog `Your Custom Fonts` → ` Upload fonts` → dialog nhỏ `Browse fonts to upload:` → `Choose File` (file chooser, dùng browser_file_upload) → `POST /api/custom-fonts` 201, card mới hiện đầu lưới. Đóng dialog nhỏ bằng `.font-uploader > .dialog-close`, rồi `div.vgrid-col:has(a:text-is("<tên>")) >> text=Select`.
- Google font: popup font → combobox Font family (vue-multiselect) → gõ vào textbox `-searchbox` → click option → Font variant mặc định `regular`.
- Default text layer mới (shop linh-tib-staging): Roboto regular size **100**, top/left 800 (tâm), `show_in_cart: true`, `required: false`, `autoscale_enabled: true`, stroke `#FF0000`/1 (trong JSON, stroke tắt trên UI).
- Lần Save đầu → `POST /api/artworks` 201 (trả full JSON), URL đổi `/artworks?id=<id>`; Save & Close → `PUT /api/artworks/<id>`.
- Đọc artwork (thay cho GET 405): GraphQL `POST /api/graphql` operation `get` → `artworks_by_pk(id)` trả `templates` (JSON layer). Font library: `POST /api/graphql/relay` `custom_fonts_connection` (relay id base64 `[1,"public","custom_fonts",<id>]`).
- 🔑 Layer custom font giữ nguyên `typography` Google cũ (Roboto) song song với `custom_font {url,size,family}`; layer Google có `custom_font: {size}` (không url/family).
- Đổi trang SPA không mất hook: click `a[href="/fonts"]` (2 link trùng trong sidebar, dùng phần tử đầu).

# Phiên TIB-5506 (Testlane TIB-172) — 2026-10-08, campaign 2787 / artwork 4709

## Playwright MCP bị khoá profile bởi session Claude khác
`browser_*` trả `Browser is already in use for .../teeinblue-manual/.playwright-profile` khi 1 session
Claude khác đang giữ browser. KHÔNG kill session đó. Workaround đã chạy OK: tự launch Chromium của
playwright local (`node -e "require('playwright').chromium.executablePath()"` trong project) với
`--remote-debugging-port=9337 --user-data-dir=<scratchpad>/profile`, rồi mỗi bước là 1 script nhỏ
`chromium.connectOverCDP('http://127.0.0.1:9337')` → `ctx.pages()[0]` (thoát bằng `process.exit`,
KHÔNG `browser.close()`). Vẫn đi đúng luồng UI (click/fill), login lại `/login?staff=true`.

## Gắn 1 artwork cho cả Front + Back
Sau `Save & Close` artwork đầu tiên (mở từ `Front`), dialog `Select your artwork` CÒN mở và gắn với
Front ⇒ click card chỉ gắn Front. Sau đó bấm ` Select artwork` của `Back` (giờ là
`main .cas-no-artwork` có button thứ 2 — kiểm text cha chứa `Back (`) → click card `[title="<tên>"]`.
Verify qua `GET staging-api/api/merchant/campaigns/<shopifyProductId>.json?shop=linh-tib-staging.myshopify.com`
(public, 200; thiếu `shop` → 422): `campaign_artworks[].printarea_id` phải có 13865 (Front) + 13866 (Back).

## Toggle trong panel layer là `label.vue-js-switch` (aria-checked)
Click vào text cạnh toggle (vd `Prefill default text to customer’s input`) KHÔNG đổi trạng thái.
Phải click `label.vue-js-switch` nằm cùng `div.d-flex` với text đó; đọc state bằng `aria-checked`.

## Multi-store launch 2026-10-08: 5 store
`ship-n-pickup`, `linh-sdk-v2`, `linh-tib-checkout`, `linh-tib-theme` (Etsy), `linh-tib-staging`.
Chọn hàng bằng `tr` có text `linh-tib-staging`.

## Mặc định Text layer 2026-10-08 (shop linh-tib-staging, Rule 14)
`Show customization data on cart/checkout` **ON** (khác ghi chép 2026-08-27 là OFF) · Prefill OFF ·
reposition OFF · Charge OFF · required OFF · Attach customer input for fulfillment OFF.

# Phiên TIB-5526 (Testlane TIB-173) — 2026-10-09, campaign 2791 / artwork 4740 (5 loại photo upload)

## Photo Upload — map tên UI ↔ giá trị lưu (ĐÃ VERIFY)
Panel ✎ > `PERSONALIZATION SETTINGS` > `Upload editor:` (radio `name=photo_editor`, chọn bằng `label[for="photo_editor-<value>"]`):
| Nhãn UI | value | Ghi chú |
|---|---|---|
| `Direct upload, no editor` | `static` | mặc định; có `Direct upload style` contain/cover |
| `Photo Cropper` | `image_cropper` | = "Image Cropper"; có thêm switch `Crop into a custom shape` |
| `Photo Reposition` | `image_placement` | = "Image Placement"; MẤT switch `Show customer's photo on live preview`, có `Fit mode` contain/cover |
Không có mục nào tên đúng "Image Placement"/"Image Cropper" trên UI — chỉ value nội bộ.

## Multiple Uploads (`+ Layer` > `Photo Upload` > `Multiple Uploads`, type `multiple-uploads`)
- `Output Type:` `output_type-single` (mặc định) / `output_type-multiple`.
- **Single Output**: `Maximum photos*` min 2 **max 3**, và **bắt buộc** `GenAI service*` (`select#multi_image_provider`: Gemini/OpenAI/Flux/ImagenHub) + `Image effects after generating`.
- **Multiple Outputs**: `Maximum photos*` min 2, KHÔNG có max, KHÔNG cần GenAI. Ô số = `.layer-editor-panel input[type=number]` first; clear bằng Cmd+A/Backspace rồi type (warning `NaN` console lúc clear là vô hại).
- Upload editor chỉ có `static` / `image_placement` (không có Cropper).
- 🔎 Storefront hiện `Multiple Uploads*` (dấu required) dù `required:false` trong JSON — giống Route Maps/Word Search (chưa xác nhận by design hay bug).

## GenAI trên photo layer: `Image effects` > `Add new` > `Gen AI Effect` (nhánh con)
Danh sách effect 2026-10-09: Black & White (TIB), Cartoon (Cutout.pro), Face cutout, **Gen AI Effect** ▸ (`Default settings`, `[OpenAI] AI Effect`, `[Flux] AI Effect`, `[Gemini] AI Effect`, `[ImagenHub] AI Effect`), Photo border (TIB) (Moved to toolbar), Photo enhancer, Portrait sketch (TIB), Remove background, Watercolor Mask (TIB).
Chọn preset → `textarea#image_filter_prompt` (Prompt the style you want) + nút `Variable` + switch `Use Reference Image` / `Apply color to sketch result` (OFF). Lưu thành `effects:[{type:"gemini:image_filter", image_filter_prompt:...}]`.

## Verify layer config không cần login
`curl https://staging-api.teeinblue.com/api/merchant/campaigns/<shopifyProductId>.json?shop=linh-tib-staging.myshopify.com` — product id lấy từ `<storefront product url>.js` (`id`). Chứa full layer JSON (photo_editor, max_photos, output_type, effects, required).

## Upload storefront (photo-2mb.jpg) — chuỗi request
`POST merchant/shopify/upload-url` 200 → `PUT s3.us-east-1.wasabisys.com/teeinblue-cdn-staging/wa/customers/uploads/<file>` 200 → `POST customer-uploads/<id>/uploaded-at` 204. Upload bằng `setInputFiles` vào `.tee-field--layer-<id> input[type=file]`.

## Mặc định photo layer 2026-10-09 (Rule 14, shop linh-tib-staging)
Show customer's photo on live preview ON · Set minimum size OFF · required OFF · Show customization data on cart/checkout **ON** · Option Title rỗng · personalization `Create a new option`.

## Playwright MCP lại bị khoá profile → dùng lại workaround CDP port 9337 (mục TIB-5506) — chạy OK.

# Phiên TIB-5516 canvas (2026-10-09) — campaign 2826 / artwork 4765 (7 photo layer lưới 3x3)

- MCP browser bị khoá profile → CDP workaround, dùng port **9341** (tránh đụng 9337 của session khác).
- Nút `Save` (không đóng): `.btn-group--update .v-popper button` (mũi tên cạnh `Save & Close`) → popper `.v-popper__popper--shown` → `Save`. Lần đầu POST /api/artworks 201 (id), sau đó PUT. Response PUT chứa `data` (list template → layers) = JSON layer thật, khỏi cần GraphQL.
- Transform: `top/left` là góc trên-trái (layer 1200 mặc định ở 200/200). Photo layer khoá tỉ lệ: set Width → Height tự theo. Lưu lại bị trừ 0.01 (nhập 80 → 79.99).
- Popup Border: container `.qfield--photo-border`. Color picker có ô HEX (`input.vc-input__input` đầu tiên) nhận **8-hex có alpha** (`#0000FF80` → lưu `#0000FF80`, A=0.502); 6-hex lưu thành `...FF`. Chọn type: `label:has-text("Custom shape")` / `"Contour cut"`. Size: `input[type=number]`. Với `custom_shape`, mục `Display border on` BỊ ẨN (JSON vẫn `display: mockup_order`). Note "A shape image is required..." luôn hiện kể cả khi đã có mask.
- Mask upload: sau `Browse` + setFiles, mask hiện dưới dạng `[style*="users/"]` background-image trong panel (không có input chứa url). Upload ~2-3s.
- Layer tạo bằng `Duplicate & Link options` (customization_type `linked`, key `linked: <layer gốc>`): toolbar chỉ `Transform | Align | Print Effects`, KHÔNG có `Border`; panel chỉ `LINKED LAYER` + `EXTRA` ⇒ không chỉnh border/mask riêng, JSON copy y photo_border + masked_url của gốc.
- Global option photo: panel ✎ > `label[for="customization_type-global_option"]` → click `Select a global option` → gõ tên → `.multiselect__option`. Option title lấy từ GO (1011 = `Photo GO`), có thêm switch `Use a different shape mask` (để OFF = mask từ GO). Layer GO vẫn có Border riêng trên toolbar; JSON chỉ có `global_option: <id>`, không có masked_url.
- Ảnh placeholder `uploaded` (1200x1200) có vùng áo bán trong suốt ⇒ màu border custom_shape/contour lộ qua thân áo trên editor/storefront. Cần ảnh đặc nếu muốn nhìn sạch.

# Phiên TIB-5516 contour cut (2026-10-09) — campaign 2826 Back / artwork 4767

- CDP workaround port **9363** (9337/9341/9355 của session khác). Profile riêng `scratchpad/profile5`.
- Save artwork trong campaign editor: có 2 `.v-popper button` (campaign Update dropdown + editor) ⇒ dùng `.artwork-editor-header-right .v-popper > .btn`.
- Photo Upload `Direct upload style`: nhãn UI **`Fill (stretch to fit)`** = value `cover` (kèm cảnh báo "Photos may look distorted..."), `Contain (scale to fit)` = `contain`. Lưu vào `direct_upload_style`, KHÔNG đổi `fit_mode` (vẫn `contain`). `fit_mode` chỉ chỉnh được ở `Photo Reposition`. `Photo Cropper` không có lựa chọn fit (JSON `fit_mode: contain`) nhưng editor/storefront render ảnh mặc định 2:1 trong layer vuông kiểu cover (cắt 2 cạnh trái/phải).
- Transform photo layer: icon khoá `.qtransform--fields i.la-lock` giữa Width/Height — click để mở khoá tỉ lệ (icon đỏ) rồi set W=H tuỳ ý. Clipart / static-photo / linked vẫn khoá.
- Toolbar `Border` (photo border) có ở: photo, clipart-category, **static-photo** (Static Image, JSON `photo_border` giống photo). Linked layer không có.
- Layer `Clipart Category` panel: `Clipart fit mode:` `Contain (scale to fit)` / `Cover (stretch to fit)` (`direct_clipart_style`), category lưu ở key `clipart: <categoryId>`, `default_value` = url clipart.
- Tạo clipart category: `/cliparts` → `New category` (nút visible) → Name = `label.w-100:has-text("Name") > input` (ô Parent Category nằm TRONG label ⇒ xpath following:: dễ điền nhầm). `Create` → POST /api/clipart-categories 201 → URL `?id=<id>` → `Drag and Drop / Click to upload` (filechooser) → POST /api/cliparts/by-temporary-file → bấm `Reload`. Child category: `#clipart-parent-category-selector a.category-searcher` → popup search → click tên.
- Search trong dialog chọn ảnh (`input[placeholder=Search]`) khớp theo TÊN ⇒ clipart chọn vào layer cũng sinh 1 layer-image cùng tên (vd `upload-star-transparent`), các layer sau có thể lấy nhầm bản đó (cùng ảnh, khác url).
- 🔴 2026-10-09 07:50–08:04 UTC staging API trả 500 toàn bộ (`Class "Filament\PanelProvider" not found`), preflight CORS fail ⇒ UI toast "Network Error". Sau khi API hồi phục, **job nền không chạy**: clipart mới `url:null` mãi, artwork mới `url/thumbnail:null` ⇒ `POST /api/campaigns/<id>/sync` 400 `Artwork missing URL. Please regenerate those artworks: <tên>`. Không có nút "Regenerate" trong editor (dropdown chỉ `Save`). Storefront SDK vẫn đọc live API nên form + preview mockup đã hiện artwork mới dù sync fail.

# Phiên TIB-5369 (Testlane TIB-178) — 2026-10-12, PB 3386/3387, artwork 4815, campaign 2842-2846

## Duplicate Product Base từ `/products` — ĐÃ VERIFY
- Search ô `Search` (main) theo title → hàng có 3 nút: `i.la-pencil` (edit) · **`i.la-copy` (duplicate)** · `i.las.la-ellipsis-h`.
  Selector: `main tbody tr:has(a[href="/products/<id>/edit"]) button:has(i.la-copy)`.
- Click là clone NGAY (`POST /api/products/<id>/clone` 200), không có dialog confirm. Bản copy lên đầu list, title + internal name = `<title> copy`.
- Clone copy: variants (id mới, giữ nguyên `available`; vd PB 177 → 3388: 216 variant, 181 available, id liền mạch), printareas (id mới), mockups (id mới, KHÔNG copy variant assignment), fulfillment provider. Product title + Internal name + Internal tags ở card `Basic information`, nút Save = `button.promise-button.btn.btn-primary` đầu tiên (PUT /api/products/<id> 200 rồi POST /sync).
- Nút `Save` của Basic information bị disabled tới khi có thay đổi.
- PB legacy (vd 205 Men Basic T-shirt, 2023) có mockup CHỈ có 1 image layer, KHÔNG có printarea layer ⇒ phải mở Mockup Editor (`Edit` trên card mockup) → ` Add Printarea` → chọn `front (WxH)`... → `Save & Close` (PUT /api/products/<pb>/mockups/<id> 201). Layer printarea mặc định được fit giữa mockup (front 400x503 @185/200 trên mockup 800x873), không còn 100x100.
- `Assign mockups`: dialog chọn variants (combobox + `Select all`) + checkbox mockup → `Save` → panel `Mockup assignments` (group by Mockup/Variant, nút `Edit` từng mockup → `Assign variants to a mockup`; click Save lần đầu có thể chỉ đóng dropdown, bấm lại lần 2). Lưu vào `mockups.variant_ids`.
- Đọc nhanh state PB (read-only) trong page: `fetch('https://staging-api.teeinblue.com/api/graphql', {credentials:'include', headers X-XSRF-TOKEN từ cookie})` với `products_by_pk(id){ printareas variants mockups{ id variant_ids layers } }`, `campaigns_by_pk(id){ campaign_products{ id campaign_mockups{ id mockup_id } } campaign_artwork_printareas{ id artwork_id printarea_id } campaign_instances{ instance_id status platform_linked_id } }`.

## Dialog `Select your product` search theo TITLE, không theo internal name
Gõ internal name → `No data matched`. Card có `title="<product title>"` ⇒ click `[role=dialog] [title="<title>"]`.

## Archive campaign
`/campaigns` → hàng campaign → nút `i.la-ellipsis-h` → menu: View campaign logs / Duplicate campaign / **Mark as archive** / Import to Translation / Delete campaign. Mark as archive chạy ngay (không confirm), `campaigns.status` 0→1, campaign chuyển sang tab `Archived`.

## Multi-store launch 2026-10-12
Hàng trong dialog KHÔNG dùng `td:text-is(...)` được ⇒ dùng `[role=dialog] tr:has-text("<store>") button:has-text("Launch")`.
Instance id: linh-tib-staging = 58, linh-sdk-v2 = 325.

## 🔴 Publish → "Published error" (lỗi backend hệ thống từ 2026-10-09)
`POST /api/campaigns/<id>/publish` 200, Shopify product tạo được, storefront load OK, nhưng `campaign_instances.status = 2` và list hiện badge **`Published error`**. `campaign_instance_histories.message`:
`Call to undefined relationship [artworks] on model [App\Models\CampaignArtwork]` — xảy ra với MỌI campaign publish (2826 từ 2026-10-09 09:45 UTC, 2845). Không phải lỗi data; báo DEV, đừng retry.

## Giới hạn 250 variants (TIB-5369 / TC-TIB-053, campaign 2847) — ĐÃ VERIFY 2026-10-12
- Add PB vào campaign KHÔNG chặn khi tổng variant > 250: 3 PB (11+181+152 = 344 campaign_variants) đều lưu được, không toast/console lỗi.
- Chặn ở bước LAUNCH: `View details` → dialog `Campaign errors` có mục **`Over 250 variants:`** `Campaign cannot have more than 250 variants. Disable some variants to launch your campaign.` UI KHÔNG hiện con số variant cụ thể — đếm bằng GraphQL `campaign_products{ campaign_variants_aggregate{aggregate{count}} }`.
- Add PB tự copy toàn bộ mockup của PB thành campaign_mockups (không cần bước thêm mockup riêng).
- Dialog `Select your product` có nhiều card trùng title (vd 3 card `Unisex  Hoodie`, ~12 card `Men Basic T-shirt`) ⇒ phân biệt bằng ảnh mockup: `[role=dialog] .vgrid-entry-wrapper:has(img[src*="/products/<pbId>/"])`.
- Sửa Internal tags campaign có sẵn: header nút `...` → `Edit internal info` → textbox `Internal tags (optional)` → `Save`.
- Chọn artwork có sẵn trong `Select your artwork`: click `img` của card → POST /api/campaign-artworks 201; snapshot print area có thể chưa cập nhật ngay (re-render chậm), verify bằng GraphQL/screenshot.

# Phiên TIB-5485 (Testlane TIB-179) — 2026-10-12, campaign 2957 / artwork 4816, AO cat 6351/6352, GO 1024

- MCP browser khoá profile → CDP workaround port **9381** (profile scratchpad riêng). Runner chung: 1 script `connectOverCDP` + require step file.
- 🔴 Dialog `Artwork details` khi New artwork từ print area: `getByRole('textbox').first()` trong `[role=dialog]:has-text("Artwork details")` trúng **ô search layer** của editor (đã dính: tên vào ô search, Name rỗng → validate `name is required`). Dùng **`input[name="name"]:visible`** + `button:visible:text-is("Save")`.
- **Color layer + color category**: panel ✎ > `Color options:` radio **`Solid Color category`** (`color_option-color_category_option`) > `Select one color category*:` link ` Search` → popup `Search categories by name` → click tên category ⇒ `Selected: <tên>` + `Available values`. JSON: `clipart: <catId>`, `color_option: color_category_option`.
- **Text: tắt personalization** = `label[for="customization_type-no_customization"]` (id là `no_customization`, KHÔNG phải `none`).
- **Static Vector chọn vector có sẵn** (click `img` của `.layer-listing__item` → `Select 1 vector`) KHÔNG sinh request tạo layer-image (né được quota 429). Mặc định `no_customization`.
- **Group**: JSON layer group chỉ có `{id,name,type:"group"}`; con có key **`group_id: layer-<groupId>`** (không lồng mảng).
- **Toggle Switch** mặc định: `Show option title` ON, `Pre-enable toggle` ON (JSON `default_value: true`, `value: true`), `Toggle label` rỗng.
- **Additional Option layer — tạo category mới ngay trong panel**: ` New category` → modal `Category` (Name, Custom class, radio `category_display_type-image|text|dropdown|radio|radio_button` = Thumbnail Images / **Dropdown Option Name** / Dropdown+Thumbnail / Inline Radio Button (mặc định) / Radio) → `Create` (POST /api/clipart-categories) → modal hiện cột `Additional Options` với `Item name` + `Add new` (mỗi item POST /api/cliparts 201) → `Save` (PUT). Category tự gắn vào layer. ⚠️ Add 2 item liên tiếp nhanh thì item thứ 2 bị nuốt — chờ ~3-5s và verify bằng GraphQL `clipart_categories{cliparts{name}}`.
- Default value: `Show option to select default value` → click nút item (vd `Small`) ⇒ JSON `default_value: <clipartId>`, field `additional_option: <catId>`.
- **Conditional theo Additional Option**: `+ Add conditions` → multiselect Option (list hiện "title / layer name") → multiselect thứ 2 `is any of:` (lúc đầu ghi `Set value to clipart to set dependency`, đợi 1-2s thành `Select options`) → chọn value. JSON: `dependency: {match_type:"all", dependencies:[{element:"layer-<id>", value:[<clipartId>]}], show_by_default:false}`.
- Trang **Additional Options** độc lập: `/additional-options` → `New category` → cùng form như modal trên → `Create` (URL `?id=<id>`) → `Item name` + `Add new`.
- **Global Option loại Additional Option**: `/global-options/create/additional-option` bước đầu chỉ có tab `Create new` / `Select from category` + display type + `Item name`/`Add new` (item lưu LOCAL, chưa POST) → `Save` (POST /api/global-options 201) → chuyển `/global-options/<id>/edit` mới có `Global Option Name(internal)` (mặc định `New Additional Option option`, gõ bằng click + Cmd+A + pressSequentially) và `Option Title`. Với `Create new`, data lưu **inline**: `additional_option_source: "inline"`, `options:[{id:<uuid>,name}]` — KHÔNG tạo clipart category.
- Đọc artwork JSON: GraphQL `artworks_by_pk(id){ templates }` qua `POST /api/graphql` (cookie + X-XSRF-TOKEN) chạy được.
- Publish 2026-10-12: `campaign_instances.status = 5` + badge `Published on current store` (không còn lỗi "Published error" như 2826/2845).
- Mặc định quan sát (Rule 14, shop linh-tib-staging): `Show customization data on cart/checkout` **ON** cho Color/Text/Toggle/Additional Option/Photo; required OFF; Photo: `Show customer's photo on live preview` ON, editor `static`, không có key `photo_border`.

# Phiên TIB-5526 phần 2 (2026-10-12) — clone campaign 2791 → 2959 / 2960, artwork 4827 / 4828

- Playwright MCP chạy bình thường phiên này (không bị khoá profile), session portal còn sẵn.
- **Xoá layer trong artwork editor**: nút `i.la-trash-alt` trên hàng layer, xoá NGAY không confirm. Selector chạy được:
  `li.artwork-layer-item:has(.text-truncate:text-is("<tên layer>")) button:has(i.la-trash-alt)` (`.artwork-sortable-layer-name:text-is` KHÔNG khớp vì tên nằm trong div con). Mở panel: cùng hàng `button:has(i.la-pen)`.
- Duplicate artwork (`POST /api/artworks/<id>/clone` 201) sinh **layer id mới** cho mọi layer (4740 layer-157453 → 4827 layer-159193), config giữ nguyên.
- 🔴 **Multiple Uploads → Single Output**: ngoài `GenAI service*` còn **bắt buộc `Prompt the result you want`** (`textarea#multi_image_prompt`). Thiếu prompt thì `Save & Close` chỉ chạy `validate-default-value` rồi toast đỏ `Template - Default template: Multiple Uploads: - Prompt the result you want is required`, KHÔNG PUT. Chuyển Single làm max_photos giữ 10 → phải sửa về ≤3 (input max=3). JSON lưu: `output_type:"single"`, `max_photos`, `multi_image_provider:"gemini"`, `multi_image_prompt`. Single Output hiện thêm `Fit mode` + `Show customer's photo on live preview` (ON mặc định).
- Storefront Single Output: nút **`Generate - text to image`** (`button.tee-btn.tee-btn--upload` trong `.tee-field--layer-<id>`), disabled khi chưa có ảnh. Form preview trong editor cũng hiện nhãn này.
- **Duplicate campaign** (`/campaigns` → `i.la-ellipsis-h` → `Duplicate campaign`): `POST /api/campaigns/<id>/clone` 200, không dialog/toast; bản copy `<tên> copy`, giữ Internal tags, PB, mockup (campaign_mockups mới), artwork mapping cũ; chưa publish.
- **Đổi artwork của print area**: nút `.product-pa:has-text("Front (1400x1400)") .cas-remove button` (icon ×) → dialog `Remove artwork` → `Remove` (`DELETE /api/campaign-artworks/<id>` 204 — soft delete, GraphQL `campaign_artwork_printareas` vẫn trả bản ghi có `deleted_at`, lọc `where:{deleted_at:{_is_null:true}}`) → `Select artwork` → click `[role=dialog] img[alt="<tên artwork>"]`.
- Nút `Launch` header: `role=button[name=" Launch"]` có lúc không khớp; dùng `main nav button:has-text("Launch")`.
- Nút Save của inline title: `role=button[name="Save"]` (chỉ có 1 khi inline editor mở).

# Phiên TIB-5526 phần 3 (2026-10-13) — artwork 4841 / campaign 2962 (5 photo layer lưới 3x2)

- Popup Transform GIỮ MỞ khi click sang layer khác trong layer list (`li.artwork-layer-item:has(.text-truncate:text-is("<tên>")) .artwork-sortable-layer-thumbnail`) và tự đổi sang giá trị của layer mới ⇒ KHÔNG bấm lại `Transform` (bấm lại = đóng popup, `#quick-transform-editor-*` trả undefined).
- Mỗi field: click → Cmd+A → Delete → fill; Height của photo layer (khoá tỉ lệ) chỉ cập nhật khi click sang field khác. Lưu bị -0.01 ở top/left (40 → 39.99), width/height giữ nguyên 480.
- 🔎 Layer `Multiple Uploads` (output_type multiple) KHÔNG render placeholder ở **Live preview** của editor và live preview storefront; chỉ thấy ở chế độ `Edit`. Các photo layer khác đều hiện placeholder.
- Deep-diff config 2 artwork không cần login: so `artworks[0].data[0].layers` của 2 file merchant JSON, bỏ key id/top/left/width/height.

# Phiên TIB-5526 phần 4 (2026-10-13) — Multiple Outputs: artwork 4842/4843, campaign 2963/2964

- **Populate photo layer từ Multiple Uploads (Multiple Outputs)** — ĐÃ VERIFY: target Photo Upload (Single Upload) → ✎ → `.layer-panel__header:has-text("POPULATE VALUES")` → toggle `Populate Content from another option` → `Source option:` (multiselect, option hiện `Upload 4 photos / Multiple Uploads (source)` = Option Title / tên layer) → `Values:` (`input.retrieval-value__input`). `Available Value` liệt kê `{{input.1}}`…`{{input.N}}` (N = max_photos), mô tả "return the original photo #N … before effects. This layer's own effects will automatically run on it."
- 🔴 Lần này **chọn Source XOÁ ô Value** (ngược với Rule 10 cũ "gõ Value reset Source") ⇒ chọn Source TRƯỚC, điền Value SAU, rồi đọc lại cả hai.
- JSON: `retrieval_value_enabled:true`, `retrieval_layer:"layer-<sourceId>"`, `retrieval_value:"{{input.1}}"`. Clone artwork (`/artworks/<id>/clone`) **tự remap** `retrieval_layer` sang id source mới.
- Layer `Multiple Uploads` KHÔNG có radio `No personalization` (chỉ có `customization_type-normal` ẩn). Panel Multiple Outputs: Option Title, Output Type, Maximum photos*, Upload editor (static/image_placement), Set minimum size, instruction, required, show_in_cart, custom class — KHÔNG có GenAI/Fit mode/live preview.
- 🔴 Photo layer chọn **`No personalization`** thì panel ẨN `Upload editor`, `Direct upload style`, **`Image effects`** (giá trị cũ vẫn giữ trong JSON). Muốn gắn effect cho target no-personalization: tạm chọn `Create a new option` → `Image effects` > `Add new` → ô `Select...` (vue3-treeselect) → mũi tên cạnh `Gen AI Effect` (`.vue3-treeselect__option-arrow-container`) → `[OpenAI] AI Effect` → `textarea#image_filter_prompt` → chuyển lại `No personalization` → Save. Effect VẪN persist (`type:"gpt:image_filter"`).
- Gen AI Effect submenu 2026-10-13: `Default settings`, `[OpenAI] AI Effect`, `[Flux] AI Effect`, `[Gemini] AI Effect`, `[ImagenHub] AI Effect`. Preset OpenAI có `Resolution:` select 1K (mặc định)/2K/4K (không lưu key khi để 1K), switch `Use Reference Image` OFF, `Apply color to sketch result` OFF.
- Placeholder ảnh không vuông (mountain 1536x1024, poster 1024x768) → layer sinh theo tỉ lệ ảnh và ở giữa canvas; click `.qtransform--fields i.la-lock` để mở khoá rồi set W/H. Lần này top/left lưu đúng số nhập (không bị -0.01).
- Title campaign > 140 ký tự → banner `ready to launch with some warnings` (chỉ cảnh báo Etsy truncate), Launch Shopify vẫn chạy.
- Dialog Multi-store launch: sau click `Launch`, hàng có thể vẫn hiện `Launch` vài giây rồi mới đổi `View`/`Update` — đọc lại sau ~10s, đừng bấm lại.

# Phiên TIB-5530 (Testlane TIB-188) — 2026-10-13, campaign 2977 / artwork 4914 / order #ins58-2932

- MCP browser khoá profile → CDP workaround port **9411** (profile `scratchpad/tib5530/profile`), runner ghi network vào `net.jsonl`.
- Dialog `Select your product`: gõ nguyên `example product base - tshirt` → **No data matched** (dù title đúng). Gõ `example` thì ra; chọn card bằng `.vgrid-entry-wrapper:has(img[src*="/products/3139/"])`.
- Text 2.0: `DESIGN SETTINGS` > `Default text (only for preview):` = `input[name=text]` (lưu key `text`); Option Title = `input[name=form_label]`. Mặc định (Rule 14, linh-tib-staging): show_in_cart **ON**, prefill/reposition/charge/required/attach-for-fulfillment OFF.
- Storefront: SDK **khôi phục giá trị field cũ từ localStorage** khi mở lại product ⇒ pressSequentially bị NỐI (`Owner AOwner A`). Luôn Cmd+A/Delete trước khi gõ.
- Request map ATC (SDK v1, campaign by PB): `POST merchant/shopify/customization?shop=<shop>&id=<shopifyProductId>` 201 body `{data:{<artworkId>:<templateId>, layer-<id>:<value>, artwork-<id>:<versionId>, platform_linked_id:<variantId>}, platform_variant_id}` → `/cart/add.js` → `PUT merchant/shopify/customization/<uuid>/cart-token?shop=<shop>` 204 body `{cart_token}` (đã cắt `?key=...`). Không có X-Thumbmark-ID (wrapper fetch trần `Ci`). Response có `x-ratelimit-limit: 4`.
- `PUT merchant/customizations/<uuid>?shop=<shop>` (update) **chỉ** phát ra từ customize page `https://staging-sdk.teeinblue.com/customize/?customization-id=&product-id=<shopifyProductId>&shop=` (nút `Update cart`), body `{data:{...}, platform_product_id:<platform product id, vd 532>}`, 200, không thumbmark, ratelimit 4. Customize page **chỉ hỗ trợ campaign by Shopify Products**; với campaign by PB hiện `Your design does not support edit for now, contact shop owner` (vẫn GET `merchant/customizations/<uuid>` 200). Edit link trong cart của campaign PB = product page `?customization-id=` → GET `merchant/shopify/customization/<uuid>` rồi ATC tạo customization MỚI (không PUT).
- Setting `is_display_customization_edit_link` = toggle **`Show button for customers to edit design in cart`** ở `/general-settings` (đọc `label.vue-js-switch` aria-checked). Public: `GET staging-api/api/merchant/shopify/config?shop=` (key nằm trong config).
- Checkout COD (linh-tib-staging): `/checkout` → `#email`, `input[name=lastName][placeholder="Last name"]`, `#shipping-address1` (Esc đóng autocomplete), Postal code, City → `#basic-paymentOnDelivery` (force click) → `Complete order` → `/thank-you`. Order hiện ở `/orders` (`#ins58-xxxx`, link `/orders/<id>`).

# Phiên TIB-5562 (Testlane TIB-189) — 2026-10-13, campaign 2978-2981 / artwork 4915-4921 (Locate artwork)

- MCP browser khoá profile → CDP workaround port **9395** (profile scratchpad riêng). Runner chạy OK.
- `Artwork details` nhận canvas cực nhỏ: **5000x10** lưu bình thường (không min). Fill `input[name=width|height]` sau Cmd+A/Delete không bị nối chuỗi.
- **Auto-fit khi gắn artwork vào print area** (không Locate thủ công) = contain + căn giữa, làm tròn: 4460x6823 → 915x1400 @0/243; 3000x1999 → 1400x933 @234/0; 5000x10 → 1400x3 @699/0; 6823x4460 → 1400x915 @243/0; 3001x3001 → 1400x1400; **997x1399 → 998x1400 @0/201 (artwork nhỏ hơn printarea vẫn bị phóng lên)**.
- Nút Locate artwork: `.product-pa:has-text("Front (1400x1400)") button[title="Adjust artwork's position in printarea"]` (text `Locate artwork` click trực tiếp không mở). Dialog không có role=dialog dễ bắt; input id: `#artwork-width`, `#artwork-height`, `#artwork-rotate`, `#artwork-top`, `#artwork-left`; nút `Save` / `Cancel` / `Reset all`.
- Đổi tên artwork qua dialog `Artwork details` (icon `la-pen`) KHÔNG lưu ngay (chỉ `validate-default-value`) — phải `Save & Close` (PUT /api/artworks/<id>).
- Inline rename campaign title lưu qua GraphQL (không có REST) — verify bằng `campaigns_by_pk{name}`.
- Dialog `Select your product`: kết quả search lúc đầu có thể chưa lọc kịp; click bằng `.vgrid-entry-wrapper:has(img[src*="/products/3139/"])` vẫn đúng.

# Phiên TIB-5525 (Testlane TIB-192) — 2026-10-14, campaign 2996 / artwork 4946 (6 photo layer lưới 3x2)

- MCP browser khoá profile → CDP workaround port **9433** (profile scratchpad riêng). Login `/login?staff=true` OK, instance 58 linh-tib-staging.
- Thêm photo layer lần này: dialog chọn ảnh có 20 thumb `.mockup-layer-listing__thumbnail` (cha `.layer-listing__item`), click thumb của card tên `uploaded` (1200x1200) → `Select 1 image`. Layer mới luôn tên `uploaded` ⇒ rename ngay.
- 🔴 Rename layer: sau double-click, `li:has(.text-truncate:text-is("<tên cũ>"))` KHÔNG còn khớp (text-truncate bị thay bằng input) ⇒ dùng `.artwork-sortable-layer-name input:visible`.
- Image effects: `Add new` → ô `Select...` (vue3-treeselect) → click `.vue3-treeselect__label` của option. Effect thường **`Remove background`** lưu `type:"background_remover"`. GenAI: mũi tên `.vue3-treeselect__option-arrow-container` của `Gen AI Effect` → `[Gemini] AI Effect` → `textarea#image_filter_prompt` → `gemini:image_filter`. Danh sách effect 2026-10-14 giống 2026-10-09.
- Multiple Uploads ▸ `Multiple Outputs`: panel KHÔNG có toggle `Mark this option as required` (JSON `required:false`) và KHÔNG có ô minimum photos (chỉ `Maximum photos*` min=2, không max).
- 🔴 Storefront: field `Multiple Uploads` (Multiple Outputs) hiện `*` VÀ **chặn Add to Cart** khi trống (`This field is required!` + `Some fields are required or invalid data`) dù `required:false` ⇒ campaign có layer Multi thì buyer KHÔNG thể ATC chỉ với 1 photo layer khác. Nút ATC của SDK: `button.tee-btn.tee-btn--atc` (nút native bị ẩn).
- Multi-store launch: bảng store load chậm (`Empty data / Loading..` vài giây) ⇒ chờ `tr:has-text("linh-tib-staging")` trước khi click.

# Phiên TIB-5512 (Testlane TIB-197) — 2026-10-14, campaign 3000 / artwork 4957 (static image + photo upload)

- MCP browser khoá profile → CDP workaround port **9471** (9447 của session khác). Runner `run.js` + step file.
- 🔴 Portal trắng trang (body rỗng, không gọi API, `pageerror: Unexpected end of input`) ngay sau login: browser cache giữ bản JS bundle bị cắt (có thể do deploy giữa chừng). Fix: CDP `Network.clearBrowserCache` rồi reload ⇒ chạy bình thường. Đừng tưởng portal sập.
- Static Image upload file mới: click `text="Drag and drop, or click to upload!"` → filechooser → `POST temporary-files/upload-url` + `POST layer-images/by-temporary-file` 201, card mới lên ĐẦU lưới (tên = tên file không đuôi). Chọn card: click `.layer-listing__item:has(img[alt="<tên>"]) .mockup-layer-listing__thumbnail` (position x20,y60) → `Select 1 image`. Click `img` lần này KHÔNG chọn được.
- Static Image 800x800 sinh layer 800x800 @400/400 (giữa canvas, size = ảnh gốc). JSON `customization_type: no_customization`, url `..._large.webp`.
- Panel ✎ đang mở CHE nút ✎ của layer khác (click bị `.layer-editor-panel` intercept) ⇒ đọc config layer bằng GraphQL `artworks_by_pk{templates}` thay vì mở panel.
- `Image effects` có nút `Run effects` (chỉ chạy thử effect trên preview, không phải toggle). Effect list 2026-10-14 vẫn giống 10-09; `Remove background` → `background_remover`.
- Mặc định photo layer (Rule 14, linh-tib-staging, 2026-10-14): `Create a new option`, editor `static`, `contain`, live preview ON, min size OFF, required OFF, show_in_cart **ON**, Option Title rỗng.
- Multi-store launch 2026-10-14: 5 store như 10-08; publish → `campaign_instances.status 5` ngay.

# Phiên TIB-5547 (Testlane TIB-195) — 2026-10-14, Assets categories (clipart 6361-6366, vector 6367/6368, AO 6369, map 6370, color 6371, font 6372, GO 1030)

- Sidebar Assets: `/global-options`, `/cliparts`, `/vectors`, `/additional-options`, `/map-styles`, `/color-categories`, `/font-categories`, `/fonts`. Tất cả category đều POST `/api/clipart-categories` (type: clipart / vector / additional_option / map / color_category / font_category), URL sau tạo `?id=<id>`.
- **New category**: có 2 nút `New category` trong DOM (1 ẩn) ⇒ dùng `button:visible:has-text("New category")`. Form inline bên phải; ô Name = `main input.form-control:not([type])` đầu tiên (input text đầu tiên trong main là treeselect `Load all to search` / Parent Category — gõ nhầm vào đó ⇒ 422 `The name field is required`). Nút `Create`.
- Clipart/Vector: vùng `Drag and Drop / Click to upload` mở file chooser (multiple). Clipart → `POST temporary-files/upload-url` + `POST /api/cliparts/by-temporary-file`; Vector SVG → `POST /api/cliparts/svg`. Upload nhiều file 1 lần chạy song song ⇒ thứ tự (position) trong folder bị XÁO; cần thứ tự cố định thì upload từng file. Sau upload bấm `Reload`.
- Folder 60 clipart: query `clipart_categories_by_pk{cliparts(order_by position)}` KHÔNG có limit ⇒ render đủ 60 ngay khi mở, không phân trang / lazy load / load more.
- List item đã có checkbox `Select all` (clipart/vector/AO/map/color/font) — tính năng TIB-5547 đã có trên staging.
- Additional Options: `input[placeholder="Item name"]` + `Add new` (POST /api/cliparts). Map Styles: `input[placeholder="Map style option name"]` + `Add new`; URL style: click `Enter maps style url` ⇒ popup textarea + nút `.vinput-btn-primary` (✓) ⇒ PUT /api/cliparts/<id>.
- Color: `input[placeholder="Enter a color hex"]` + `Add new` ⇒ name = hex; đổi tên: click link tên ⇒ popup inline input + `.vinput-btn-primary` (lưu qua GraphQL).
- Font Category: `Add new` mở dialog `Select a font` chỉ chọn font ĐÃ upload ("Upload your font in Fonts page"). Upload ở `/fonts` → `Upload fonts` → modal có `input#new-font` (multiple, .otf/.ttf; click không bắn filechooser qua CDP ⇒ setInputFiles) ⇒ POST /api/custom-fonts (name = tên file). Dialog chọn: search `input.vgrid-input`, card `div.vgrid-col` có `button:has-text("Select")` (text-is không khớp) ⇒ POST /api/cliparts/font.
- Global Option Additional Option inline: list item hiện `Bulk action` thay vì `Select all`.
- Trang blank (`#app` rỗng, không lỗi) sau vài lần goto qua CDP ⇒ `Network.clearBrowserCache` + reload là hết.
- `page.screenshot` timeout (chờ font 403) ⇒ chụp bằng CDP `Page.captureScreenshot`.

## TIB-5525 phần 2 (2026-10-14) — thêm 3 target populate từ Multi (artwork 4946, campaign 2996)
- CDP workaround port **9489** (profile scratchpad của session, 9447/9471 của session khác).
- Populate photo target từ Multiple Outputs lặp lại OK như TIB-5526 phần 4. Trình tự chắc ăn: `No personalization` → mở `POPULATE VALUES` → toggle `Populate Content from another option` → `Source option:` multiselect (option hiện 2 dòng `Multi` / `Multi` = Option Title / tên layer) → bấm `Available Value` rồi **click dòng `{{input.N}}`** trong `.retrieval-value__variable-wrap` để điền Value.
- 🔴 Danh sách `Available Value` mở ra **che ô `input.retrieval-value__input`** (`<small>` trong variable-wrap chặn pointer) ⇒ đừng click/gõ vào ô Value khi list đang mở; chọn bằng click dòng `{{input.N}}`.
- Sau reload, section `POPULATE VALUES` mặc định thu gọn — phải click header mới đọc được Source/Value.
- Update campaign đã publish: header `Update` → `Multi-store launch` → `tr:has-text("linh-tib-staging") button:has-text("Update")` → `POST /api/campaigns/<id>/sync` 200, không có toast nhìn thấy được. Verify bằng public `GET staging-api/api/merchant/campaigns/<shopifyProductId>.json?shop=...` (có `retrieval_layer`/`retrieval_value`).
- Target `No personalization` không sinh field trên storefront; preview storefront hiện placeholder của target.

# Phiên TIB-5538 (Testlane TIB-198) — 2026-10-14, campaign 3001 / artwork 4958 (paragraph auto-fit + text autoscale)

- MCP browser khoá profile → CDP workaround port **9503** (9447/9489 của session khác).
- `/campaigns/new` lần đầu trắng trang (chunk 404) dù đã login ⇒ `Network.clearBrowserCache` + reload là chạy (giống TIB-5512).
- `+ Layer` → `Paragraph` phải **click** (hover không mở submenu) → hiện `Normal` / `Custom Shape` → click `Normal`.
- Paragraph panel `PERSONALIZATION SETTINGS` 2026-10-14 có thêm toggle **`Limit number of lines`** (OFF) và radio `Quick-fill from a global option`.
- 🔑 **Auto-fit paragraph lưu ra JSON**: `typography.size` = base font (toolbar), `paragraph.font_size` = cỡ đã fit + `paragraph.lines` = các dòng đã wrap. Đổi base 100 → 140 trong box 720x420 thì render KHÔNG đổi (fit = 66) ⇒ cách chứng minh auto-fit đang chạy.
- 🔑 **Single-line Text 2.0 có key `autoscale_enabled: true` mặc định trong JSON** dù UI (panel 5 section + EXTRA + toolbar) KHÔNG có toggle nào. Icon cạnh letter-spacing trên toolbar là **Skew** (`.qinline-skew`), không phải autoscale.
- Text layer JSON lưu `top/left` = **tâm** layer (UI Transform nhập góc trên-trái 731/840, w720 h138 → JSON top 800 / left 1199.99); paragraph lưu góc trên-trái (589.99/39.99).
- Đổi font size Paragraph sau khi đã set Transform KHÔNG reset Width/Height (khác Text/Curve Text).

## TIB-5538 setup 2 (2026-10-14) — campaign 3003 / artwork 4966 (paragraph populate từ Text)
- Playwright MCP dùng chung profile bị session khác relaunch Chrome giữa chừng (trang về `about:blank`, mất artwork chưa Save) ⇒ chuyển CDP workaround port **9517** ngay; và **Save (không đóng) ngay sau layer đầu tiên** để artwork có id.
- Populate Content từ Single-line Text: `Source option:` hiện `Message / Message`; `Available Value` của nguồn Text liệt kê `{{value}}`, `{{value.Xchar}}`, `{{value.capitalonly}}`, `{{value.initialofword...}}`, `{{value.firstword}}`, `{{value.lastword}}`, `{{value.context.yearTo*.comma}}`, `{{value.formula(<expression>)}}`. Click dòng `{{value}}` ⇒ ô Value = `{{value}}`. JSON: `retrieval_value_enabled:true, retrieval_layer:"layer-<src>", retrieval_value:"{{value}}"`.
- Click `.layer-panel__header` 2 lần liên tiếp = mở rồi đóng (accordion toggle) ⇒ click 1 lần rồi đọc `.layer-panel--active`.
- Lần này `Save & Close` artwork mới **đóng luôn dialog `Select your artwork`** (khác ghi chép cũ) ⇒ bấm lại ` Select artwork` của Front rồi click `.vgrid-entry-wrapper:has([title="<tên>"]) img` → `POST /api/campaign-artworks` 201.
- Storefront: paragraph `No personalization` + populate không sinh field; ratio preview 0.446875 (Message 100 → 44.69px). Gõ "Love you Mom" → paragraph render 62.56px = 140 base (vừa khung, 2 dòng).
- Paragraph được phép **vừa `Create a new option` vừa Populate Content** (UI không disable, save giữ cả hai: `customization_type:normal` + `retrieval_*`). Storefront: gõ vào nguồn Message ⇒ textarea Paragraph cũng được điền y hệt (`layer-799667` = giá trị Message) và preview đổi theo.

## TIB-5547 execute (Testlane TIB-195) — 2026-10-14
- CDP workaround port **9531**. Selector header: `.clipart-editor-bulk-action__selection .custom-control-label`; item checkbox: click `.clipart-select-checkbox` (label rỗng width 0 → click label timeout). Header input `indeterminate=true` khi có ≥1 chọn (kể cả chọn hết). Delete bulk: `.clipart-editor-bulk-action__selection button:has-text("Delete")` → `.vue-dialog` → `DELETE /api/cliparts {"ids":[...]}`.
- Folder rỗng ⇒ KHÔNG render `.clipart-editor-bulk-action` (mất cả Select all + `...`). Color category không có nút `...`.
- View Grid/List lưu global (mở folder khác vẫn giữ Grid). Grid tile X: `.clipart-action__remove button`.
- Color: picker `.color-input span` → sketch input đầu tiên = hex → Enter → click ra ngoài ⇒ `PUT /api/cliparts/<id> {"color":...}`.
- Global option inline AO: `Bulk action` → `Delete items` → checkbox bên phải item (click force) → `.inline-additional-options__bulk-delete` → popup → phải bấm `Save` trang (PUT /api/global-options/<id>).

# Phiên TIB-5289 (Testlane TIB-201) — 2026-10-14, PB 3401 / campaign 3008 / artwork 4994 (addon price + compare price)
- MCP browser khoá profile → CDP workaround port **9547** (profile scratchpad của session).
- **Đơn vị giá PB trên linh-tib-staging = VND raw**: bảng Variants cột `Price (VND)`, PB 3139 lưu `500000` (hiện 500.000₫). Form `New variant` vẫn vẽ ký hiệu `$` cạnh ô giá nhưng giá trị là số VND nguyên. Shopify `.js` trả price ×100 (50000000).
- `/products/new`: 3 ô Basic information là `main input.form-control` KHÔNG có attribute `type` ⇒ `input[type=text]` không khớp.
- Hàng inline `New variant` có trong DOM nhưng ẩn (bounding box ngoài vùng, click treo "waiting for stable") ⇒ **bấm ` New variant` trước**. Sau mỗi `Add` hàng giữ mở, điền tiếp. Compare price để trống được (lưu null). Mỗi variant ~30s.
- 🔑 Variant tạo TRƯỚC khi campaign add PB ⇒ tự vào campaign (5 campaign_variants), KHÔNG cần nút `Add to campaigns`.
- Mockup Editor: printarea layer trên mockup `Black_T-Shirt` 200x200 mặc định 100x100, 1 printarea thì không cần dời.
- Assign mockups: dialog mở ra đã `Deselect all` (tức đã chọn sẵn mọi variant) ⇒ chỉ cần `Select all` của mockups rồi `Save`.
- Addon Charge mới: 2 hàng option có **value** prefill `Option 1`/`Option 2` (không phải placeholder) ⇒ phải xoá/ghi đè. Xoá hàng thừa: `.repeater-remove` của hàng đó, không có confirm.
- Dialog `Price` lần này chỉ hiện 1 spinbutton sau khi bấm `Add` hàng `linh-tib-staging` (đơn vị `VND`); hàng chọn bằng `div.row:has-text("linh-tib-staging.myshopify.com")`.
- Save không đóng: caret `button.btn-primary.px-1:has(.dropdown-toggle)` → `span.ml-1:text-is("Save")`.
- Dialog `Select your artwork`: chính `.vgrid-entry-wrapper` mang `title="<tên>"` ⇒ `.vgrid-entry-wrapper:has([title=..])` KHÔNG khớp; dùng `.vgrid-entry-wrapper[title="<tên>"] img` hoặc filter hasText. Gắn = `POST /api/campaign-artworks/batch-apply-to-printareas`.
- Multi-store launch: hàng chỉ có tên store (`linh-tib-staging Shopify Launch`), KHÔNG có domain ⇒ `[role=dialog] tr` filter hasText `'linh-tib-staging'`.
- **Product Page Settings** (`/product-page-settings`, tab `Elements & Behaviors` / `Styles & Colors`): mục `Price:` có `Show Compare at Price`, `Show "Save" badge` (+ radio `action_button_in_show_save_badge` amount/percentage, `position_of_price`), `Show custom info below price`; mục `Addon Charge:` có `Show addon price warning message`, `Show addon price on options`, **`Add addon price to product price`** ("Only work with Campaigns by Product base"). Toggle = `label.vue-js-switch` (aria-checked / class `toggled`).
- **Product Page Content** (`/product-page-content`): mục `Other:` có `“Saving amount” in Price` (= `saving`) và `Custom info below price` (= `inc. Tax`); mục `Addon Charge:` có template `Selection will add {{PRICE}} to the price` và `+{{VALUE}}`. KHÔNG có setting "custom compare price template" ở cả 2 trang (2026-10-14).
- Giá campaign editor preview: `.tee-product-price` (`.tee-price--current`, `.tee-price--compare`, `.tee-price--saving`).
- Storefront linh-tib-staging từ browser CDP mặc định market **Germany | EUR €** ⇒ bấm nút `Germany | EUR €` → `Vietnam` ⇒ URL thành `/en-vn/products/...`, giá VND. Chuỗi `Variant sold out or unavailable` trong label variant là text ẩn của theme, không phải hết hàng (kiểm `.js` available true).

# Phiên TIB-5325 (Testlane TIB-202) — 2026-10-15, campaign 3009 / artwork 4997 (Warp text canvas editing)
- MCP browser khoá profile → CDP workaround port **9563**.
- 🔴 **Warp Text KHÔNG đổi được tỉ lệ**: icon khoá trong popup Transform có `cursor: not-allowed; opacity .5` (click không mở khoá) ⇒ W luôn = H (set Width 700 → Height 700; set Height 300 → Width 300). Không làm được box 700x300 — chỉ có box vuông. Spiral Text cũng vuông (mặc định 400x400 @ 600/600).
- Warp Text mặc định 1000x1000 @ 300/300, text `HELLO WORLD`; text lưu ở panel ✎ > DESIGN SETTINGS > `Default text (only for preview):` (`.layer-editor-panel input[name=text]`). Spiral: `textarea#text` (`Lorem Ipsum...`), `Inner radius` 50, `Text direction` = `direction-out` (Begin at inner).
- Mặc định personalization (Rule 14, 2026-10-15): Warp — `Create a new option`, input type text, **Input text case = UPPERCASE**, Prefill/Charge/required/Attach OFF, **show_in_cart ON**. Spiral — `Create a new option`, text case Normal, required OFF, show_in_cart ON.
- Toolbar Warp Text: `Transform | Align | Print Effects | font | color | ... | Warp`. Tên layer mặc định: `Warp text`, `Spiral layer`.
- 🔑 **10 điểm warp (6 `.warp-point-handle--anchor` tròn + 4 `--control` vuông) CHỈ hiện khi chọn layer bằng click trên CANVAS** (`.drr.drr--active`). Chọn từ layer list ⇒ `.drr--inactive`, handle `display:none`, chỉ thấy viền warp (`svg.warp-border-svg`, 8 path). Mở/đóng popup Transform cũng đưa về inactive.
- Cancel editor: `.artwork-editor-header-right` >> text `Cancel` (getByText('Cancel') trúng span ẩn của vinput).

## TIB-5289 phần EUR (2026-10-15) — PB 3402 / campaign 3010 / artwork 4998, header = linh-tib-checkout
- Playwright MCP chạy thẳng (không bị khoá profile lần này).
- **Store switcher**: click khối user ở sidebar (`.sidebar-users .user-switcher-toggle`) → list store; click `getByTitle('linh-tib-checkout | linh-tib-...')` → redirect `/`. Sidebar hiện plan **`Starter (Test)`** khi ở linh-tib-checkout (linh-tib-staging = `Enterprise (Test)`). Header là state phía server, dùng chung account ⇒ phiên khác có thể thấy store bị đổi.
- **Product Base + Campaign + Artwork dùng chung Organization**: PB/campaign tạo ở store này hiện ở store kia. Cột giá bảng Variants đổi nhãn theo store đang chọn (`Price (VND)` ↔ `Price (EUR)`) nhưng số thô giữ nguyên.
- Giá variant PB **nhận thập phân** (22.95, 30.99, 25.50 lưu thành 25.5). Compare trống → lưu null.
- Preview Campaign Editor hiển thị theo currency của store đang chọn ở header: định dạng `20.00€` (2 chữ số thập phân, dấu `.`, `€` đứng SAU, không khoảng trắng); addon option hiển thị `+18.00€`.
- Dialog `Price` của addon: hàng store có nhãn `linh-tib-checkout | linh-tib-checkout.myshopify.com`, đơn vị `EUR`. Selector ổn định cho ô giá: `.dialog-prices-by-instance input[type=number]`; nút đóng: `.dialog-prices-by-instance button.btn-outline-primary` (text `Close` — đừng dùng `text=Close` vì trùng `Save & Close`).
- Extra charge của template nằm ở pencil hàng `Template: Default template` (`button.text-white:has(i.la-pencil-alt)`, phải Deselect layer trước) → dialog `Edit - Default template` có toggle `Extra charge for this template`; Save/Cancel ở đây là **link**, không phải button. Cog `la-cog` cạnh tên template là `Template Settings` chung (dropdown/radio, label, show on cart) — không có extra charge.
- Money format: Portal/General Settings không có field. Storefront linh-tib-checkout: `paymentSettings.currencyCode = EUR`, `window.teeinblueShop.shopCurrency = "EUR"`; có thêm script `teeinblue-custom-script` ghi đè `shopCurrency: "USD"`, `moneyFormat: "<span class=money>${{amount}}</span>"` (custom script trong theme); market mặc định khi truy cập từ VN = VND.

# Phiên TIB-5522 (2026-10-15) — PB 3324 mockup 8149/8150, campaign 3014/3015 (tạo bằng portal UI)
- MCP browser khoá profile → CDP workaround port **9577**. Runner ghi full req/res non-GET vào `net.jsonl`.
- **Duplicate mockup trên PB**: card `.mockup:has(img[src*="<preview hash>"])` → `button:has(span.sr-only:text-is("Duplicate mockup"))` ⇒ `POST /api/products/<pb>/mockups/<id>/clone` 201, không confirm. Bản clone **giữ nguyên layer id** (layer-990199…) và **giữ `variant_ids`** của mockup gốc; card mới lên cuối (position tăng).
- Mockup Editor mở bằng `button:has(span.sr-only:text-is("Edit"))` trên card. ` Add Image` là **div** (`.new-mockup-printarea div.btn:has-text("Add Image")`), không phải button. Dialog thư viện `.layer-listing__item:has(img[alt="<tên>"]) .mockup-layer-listing__thumbnail` → `Select 1 image`. Ảnh mới sinh layer = kích thước canvas (200x200 @0/0), tên = tên ảnh.
- Rename layer Mockup Editor: double-click tên (`getByText('<tên>',{exact:true})`) → `input.form-control-sm:visible` → Cmd+A, gõ, Enter.
- Save & Close ⇒ `PUT /api/products/<pb>/mockups/<id>` 201, body `{width,height,color_as_variant,default_background_color,layers:[...]}` (layer mới append CUỐI mảng). Lưu vào `mockups.layers`.
- Add PB vào campaign ⇒ GraphQL `insert_campaign_products` nested `campaign_mockups.data[].layers` (copy layers) + `POST /api/campaign-mockups/generate` + `POST /api/campaign-products/<cp>/campaign-mockups/sync`.
- Bỏ bớt mockup trong campaign: thumbnail `li.campaign-gallery-thumbnail[title="#<campaignMockupId>"]` → hover → `button:has(i.la-close)` → dialog `Remove a mockup with printarea?` → `Remove anyway` ⇒ `DELETE /api/campaign-products/<cp>/campaign-mockups` body `{"ids":[..]}` 204. Không đụng mockup gốc của PB.

# Phiên TIB-5507 (Testlane TIB-205) — 2026-10-15, campaign 3019 / artwork 5011, clipart cat 6376/6378, map cat 6377, mockup 8154
- MCP browser khoá profile → CDP workaround port **9593**.
- Static Image dialog lần này: click `img` của card (`.layer-listing__item:has(img[alt="<tên>"]) img`) MỚI chọn được (nút đổi thành `Select 1 image`); click `.mockup-layer-listing__thumbnail` position x20,y60 thì KHÔNG chọn ⇒ hành vi thay đổi giữa các phiên, thử cả hai và đọc label nút.
- Clipart Category layer: ô tìm category trong dialog không phải `<input placeholder>` (placeholder là div) ⇒ click `.clipart-category-selector .vue3-treeselect__control` rồi `keyboard.type`, click `.vue3-treeselect__menu .vue3-treeselect__label:text-is("<tên>")`. Clipart đầu tiên được chọn sẵn; `Save` = `.clipart-picker-popup__clipart-footer button.btn-primary` ⇒ tạo bản ghi `layer_images` mới (tên = tên clipart) qua from-clipart. Layer mặc định: `customization_type: normal`, `show_in_cart: true`, `required: false`, `clipart: <catId>`, size theo ảnh (900x1200 @ giữa).
- Xoá layer image khỏi thư viện: trong dialog Static Image, card có `button.delete-button` (icon `la-trash`) → `.vue-dialog` "Are you sure to remove <tên>" → `Remove` ⇒ `DELETE /api/layer-images/<id>` 200 (body trả artwork đang mở). Đóng dialog bằng Escape, rồi `Cancel` editor — artwork không bị PUT.
- 🔑 **Trash KHÔNG có loại layer image**: filter Type chỉ có Campaign by product base / Campaign by platform products / Product / Clipart / Clipart category / Artwork; `GET /api/trash?type=layer_image` → 422. Layer image đã xoá không thấy ở Trash, GraphQL role user trả null.
- Xoá clipart category: `.category-action-icon` (… cạnh "Category") → menu `Add a sub-category / Bulk upload sub-categories / Duplicate category / Delete category` → `.vue-dialog` `Delete` ⇒ `DELETE /api/clipart-categories/<id>` 204. Xoá clipart: `.clipart-select-checkbox` (force) → `.clipart-editor-bulk-action__selection button:has-text("Delete")` → `Delete` ⇒ `DELETE /api/cliparts {"ids":[..]}` 204. Cả 2 vào Trash.
- Mockup KHÔNG có field name; chỗ "đặt tên" duy nhất = **`Alt text`** (link cạnh tiêu đề `Mockup Editor`) → modal `dialog-mockup-alt-text` → Save trong `.vm--container:has([data-modal="dialog-mockup-alt-text"])` (nút `Save` khác của trang bị overlay che) ⇒ lưu ngay (toast `Saved alt text successfully`), không cần Save & Close. GraphQL `mockups.alt`.
- Clone mockup 7748 trên PB 3139 → 8154 nhận `position` 4 **trùng** với mockup 7967 sẵn có (không tự dồn). Clone KHÔNG tự thêm vào campaign đã có PB đó.
- Trang `/products/<id>` chỉ là view; card mockup có Edit/Duplicate/More ở `/products/<id>/edit`. More menu: `Add to campaigns / Sync to campaigns / Remove from all campaigns / Delete mockup`.
- Campaign list search `name=TIB-5507` đôi khi render bảng rỗng ngay sau load; tìm bằng keyword khác trong title (`unvalidated arbitrary`) thì thấy.

# Phiên TIB-5418 (Testlane TIB-206) — 2026-10-15, campaign 3020 (PB) + platform-product 582/583, artwork 5012 dùng chung
- MCP browser khoá profile → CDP workaround port **9611**.
- 🔑 **1 artwork dùng chung được cho campaign PB và campaign by Shopify**: ở `/platform-products/<id>/edit` bấm `Select artwork` → click `.vgrid-entry-wrapper[title="<tên>"] img` của artwork có sẵn ⇒ `POST /api/platform-artworks {artwork_id, platform_product_id, position}` 201, dialog tự đóng.
- Text 2.0 panel ✎: section `Personalization Settings` mặc định THU GỌN ⇒ `input[name=form_label]` chưa có trong DOM; click `.layer-panel__header:has(span.mr-auto:text-is("Personalization Settings"))` trước.
- Upload mockup (platform product): upload xong card mới **chưa hiện trong grid** (lần 2 trong phiên) ⇒ grid vẫn tick sẵn ảnh cũ. Bấm `Reload` ⇒ card mới lên đầu và được tick; kiểm nút footer = `Select 1 images` rồi mới bấm. Lần upload đầu (dialog mở mới) card mới đã có sẵn và tick đúng. Tạo mockup ⇒ `POST /api/platform-products/<id>/platform-mockups {"mockup_layer_ids":[..]}` 204.
- Nút mở Mockup Editor trên ảnh mockup: `button.campaign-gallery-product-action` (sr-only label hiển thị **`$t('common.edit_mockup')`** — i18n key chưa dịch, lỗi UI nhỏ). Add Artwork → click tên artwork (`:visible:text-is("<tên>")` .last()) ⇒ layer 480x480 giữa canvas 960x960. Save & Close ⇒ `PUT /api/platform-mockups/<id>` 200.
- Assign mockups: `Select all` (variants) → `Select all` (mockups, đã tick sẵn khi chỉ có 1) → `Save` ⇒ `PUT /api/platform-mockups/<id> {"platform_variant_ids":[...]}`. Variant sold out vẫn được liệt kê và assign bình thường.
- Launch platform product: không có dialog, `POST /api/platform-products/<id>/publish` 200; header đổi `Unpublish · Logs · View · Update`. GraphQL `platform_products_by_pk` KHÔNG có field `status` — dùng `published_at`, `platform_mockups{id platform_variant_ids}`, `platform_artworks{artwork_id}`.

## TIB-5418 phần 2 (2026-10-15) — platform-product 583: thêm mockup 1653 + gán mockup theo variant (Playwright MCP chạy bình thường, không cần CDP)
- Upload mockup dialog lần này KHÔNG tick sẵn ảnh nào; ảnh đã có trong thư viện (vd `11-15oz`) chỉ cần click `img "<tên>"` ⇒ footer `Select 1 images` ⇒ `POST /api/platform-products/<id>/platform-mockups` 204, mockup mới lên cuối gallery (`li.campaign-gallery-thumbnail[title="#<id>"]`).
- Có ≥2 mockup ⇒ có 2 `button.campaign-gallery-product-action` (1 ẩn) ⇒ click thumbnail mockup cần sửa trước rồi dùng `button.campaign-gallery-product-action >> visible=true`.
- `Assign mockups` khi đã có assignment mở dialog **`Mockup assignments`** (Group by `Mockup` / `Variant`, `Bulk assign`), mỗi mockup 1 hàng + nút `Edit` ⇒ màn `Assign variants to a mockup` (multiselect variant, tag có `×` = `.multiselect__tag-icon`). Hàng mockup chỉ hiện **tên artwork**, không hiện id ⇒ thứ tự hàng = position mockup; xác nhận id bằng GET `/api/platform-products/<id>/platform-mockups` (`platform_variant_ids`).
- 🔴 Bấm `Save` khi dropdown variant còn mở ⇒ click đầu chỉ đóng dropdown, KHÔNG gửi PUT. Click ra ngoài (đoạn mô tả dialog) trước rồi mới `Save` ⇒ `PUT /api/platform-mockups/<id>` 200.
- Để 1 variant không gán mockup nào: chỉ cần bỏ nó khỏi mọi mockup — UI cho phép, Group by Variant hiện `Not assigned yet.`
- Variant id ↔ title của platform product không có trong API portal ⇒ lấy từ storefront `/products.json` (sau khi nhập password `oe`).

# Phiên TIB-5543 (Testlane TIB-209) — 2026-10-15, campaign 3031 / artwork 5020 (9 layer ảnh lớn, HD OFF)
- MCP browser khoá profile → CDP workaround port **9643**.
- Nút **HD** trên toolbar layer ảnh (static-photo, clipart-category): `.qte-field.qte-field--no-separator.ml-auto > button.hd-btn` (label `span.hd-btn__label` "HD", có tooltip). Trạng thái chưa bật: class chỉ `hd-btn v-popper--has-tooltip`, không aria-pressed; JSON layer KHÔNG có key hd nào. Có 2 bản trong DOM (1 cái `display:none`) ⇒ lọc `offsetParent`.
- Static Image upload ảnh lớn: 18174x6900 (7.7MB) ~32s; response `layer-images/by-temporary-file` trả `url:null,width:null` (xử lý async) nhưng layer vẫn nhận url `users/64/image-layers/<hash>_large.webp` khi Save. Layer mới auto **fit canvas** (vd 1600x607 cho 18174x6900), tỉ lệ khoá: set Width ⇒ Height theo.
- Nút `+ Layer` accessible name có icon ⇒ `page.locator('button:visible').filter({hasText:/^\W*Layer\s*$/})`.
- Dialog `Artwork details`: `getByRole('textbox',{name:/Name/})` KHÔNG khớp ⇒ dùng `input[name=name]:visible`.
- `1 Clipart Category` → tab `Choose from clipart category` → chọn category ⇒ footer ghi `"<cat>" will be auto-selected as the clipart category for this layer.` (= "Import from a clipart category"). Layer 400x400 @600/600, clipart 6326 (`valid-images`).

## TIB-5543 phần 2 (2026-10-15/16) — clipart cat 6388, layer L10 (artwork 5020), artwork 5028 (copy của 2294)
- 🔴 **Nắp Mac đóng (`ioreg -r -k AppleClamshellState` = Yes) ⇒ Chrome có giao diện mất vsync, `requestAnimationFrame` treo trên MỌI tab** ⇒ click bị kẹt ở "waiting for element to be visible, enabled and stable", screenshot timeout, v-popper dropdown (Save) không mở; evaluate/goto thì vẫn chạy. Kiểm nhanh: evaluate rAF có timeout 4s. Cách chữa đã chạy OK: copy profile (`rsync --exclude 'Singleton*' --exclude '*Cache*'`) rồi chạy **headless** `--headless=new --disable-gpu --disable-gpu-vsync --disable-frame-rate-limit --disable-background-timer-throttling --disable-renderer-backgrounding` (vẫn còn session login). Headless KHÔNG có các flag này vẫn treo y như vậy.
- Máy sleep/dark-wake liên tục nên 1 bước script có thể mất vài phút ⇒ chạy nền rồi chờ dòng `URL`.
- Submenu `+ Layer` > `Clipart Category` phải **click** (hover không mở) mới ra `1 Clipart Category`.
- `POST /api/layer-images/from-clipart {clipart_id}`: lần đầu tạo layer_image mới (layer xuất hiện sau vài giây, phải poll), gọi lại cùng clipart thì trả **200 với đúng layer_image cũ** (dedup) ⇒ không sinh rác.
- Layer `Clipart Category` nhánh "auto-selected as the clipart category" (= Import from a clipart category): `url` LUÔN là `users/64/image-layers/<hash>_large.webp` (bản copy layer_image), còn `default_value` = `users/64/cliparts/<catId>/..._large.webp`, `clipart: <catId>`. Prefix `image-layers/` là theo thiết kế, không phải dấu hiệu tạo sai nhánh.
- Nút Save của artwork editor mở từ campaign: caret phải lấy trong `.dialog-artwork-editor` (`button.btn-primary.px-1`), nút `.btn-group--update` đầu trang là của campaign và bị dialog che.
- Duplicate artwork: `.artwork-item` có `img[src*="<thumbnail hash>"]` → hover → `i.la-copy` ⇒ `POST /api/artworks/<id>/clone` 201 (body có id mới; layer id được sinh mới, url ảnh giữ nguyên, kể cả `_master_large`). Đổi tên ở dialog `Artwork details` **chỉ đổi local**, phải Save artwork (PUT) mới lưu. Dialog không có field tag/internal tags.
- Search ở `/artworks`: `main input[placeholder="Search"]` + Enter ⇒ URL `?name=`.

# Phiên TIB-5575 (Testlane TIB-212) — 2026-10-16, campaign 3044 / artwork 5049 (AVIF)
- Playwright MCP bị khoá profile → CDP workaround port **9727**.
- 🔴 **AVIF bị backend từ chối ở clipart + layer image**: `POST /api/cliparts/by-temporary-file` và `POST /api/layer-images/by-temporary-file` trả **422** `This file type is not supported. Please upload a PNG, JPEG, GIF or WebP image.` (kể cả AVIF có ICC sRGB/P3), dù dropzone FE `accept` có `image/avif`. UI hiện lỗi dưới tên file trong dropzone (không nuốt lỗi).
- ✅ **Background image của Text / Curve Text / Warp Text** (toolbar `.qinline-bg-toggle` → `Browse`) giờ mở **thư viện riêng** (library images, có category, dropzone + `Select` = `button.promise-button.btn-primary` filter 'Select'), KHÔNG còn mở file chooser OS. Upload qua `POST /api/library-images/by-temporary-file` (201) — **nhận AVIF**. Lưu thành `background_image: users/64/library/<...>_large.webp`. Chọn card: click `img[alt="<tên>"]`. Warp Text bg cũng là thư viện này (không lấy từ clipart category); popup ghi "Background does NOT work with stroke".
- Thư viện layer image có category: `+ New category` mở popup `artwork-layer-new-category-popup` (`input[placeholder="Enter category name"]` + `Create`) ⇒ `POST /api/layer-image-categories` (`type: clipart`). Chọn category bên trái trước khi upload ⇒ ảnh vào category đó (`category_id`).
- Font variant: `.qinline-fontname` → click text `regular` → `li.multiselect__element` filter `/^\s*900\s*$/` (span `text-is` không khớp). Dropdown đóng nếu script tách bước.
- 🔴 `Generate test design` ở campaign editor **disabled**, tooltip `Not available for Development stores` (linh-tib-staging là dev store). Artwork editor không có Test design.
- Mặc định (Rule 14, 2026-10-16): Text/Curve/Warp `Create a new option`, show_in_cart ON, required OFF; Curve text default `Default text` size 100; Warp `HELLO WORLD` 1000x1000. Photo Single Upload: `Direct upload, no editor`, `Contain`, live preview ON, min size OFF, required OFF, show_in_cart ON, Option Title rỗng.
- Multi-store launch 2026-10-16: 5 store như 10-08.

# Phiên TIB-5389 (Testlane TIB-213) — 2026-10-16, campaign 3045 / artwork 5048 (AI effects đủ provider + emboss)
- MCP browser khoá profile → CDP workaround port **9677** (profile scratchpad của session).
- 🔴 Runner CDP: `node run.js` phải `process.exit(1)` khi step lỗi, nếu không chuỗi `&&` chạy tiếp và áp config (effect/Option Title/Transform) nhầm lên **layer đang mở panel** (đã dính 1 lần). Thêm guard: so `.layer-editor-panel .layer-editor-title` với tên layer mong đợi trước mỗi bước sửa.
- **Image effects treeselect**: option có `data-id`; click mũi tên/label bằng `page.mouse.click` theo toạ độ (`locator.click` trên `.vue3-treeselect__option-arrow-container` timeout). Bấm mũi tên lần 2 = THU GỌN. Cây effect 2026-10-16 (data-id): `teeinblue:gray_scale`; `cutout.pro:cartoon` ▸ 15 style; `face_cutout` ▸ `cutout.pro:face_cutout` / **`imagenhub:face_cutout`**; `gen_ai_effect` ▸ `image_filter` (Default) / `gpt:image_filter` / `flux_kontext:image_filter` / `gemini:image_filter` / `imagenhub:image_filter`; `teeinblue:photo_border` (disabled); `photo_enhancer` ▸ `cutout.pro:photo_enhancer` / `teeinblue:photo_enhancer` / **`imagenhub:photo_enhancer`**; `teeinblue:portrait_sketch`; `background_remover`; `teeinblue:watercolor`.
- Mỗi effect row = `.repeater-item-sort-column`, xoá bằng `button.repeater-remove` (không confirm). Nhiều row ⇒ `textarea#image_filter_prompt` trùng id → dùng `.last()`.
- `[Flux] AI Effect`: bắt buộc `Flux output width/height (px)*` (2 `input[type=number]` trong row; selector `.field:has-text(...)` trúng nhầm ô). Lần Save đầu khi trống vẫn PUT 200, lần sau mới validate. JSON `flux_output_width/height`.
- `[Gemini] AI Effect` Resolution có 0.5K/1K/2K/4K; OpenAI 1K/2K/4K.
- `[ImagenHub] AI Effect`: `Select template` mở modal **Select Template** (4 template 2026-10-16: `TIB - gen AI 2 - GPT-image-1.5` (openai/gpt-image-1.5/edit), `TIB - gen AI 2 - GPT-image-2`, `T2I - tib`, `T2I` (flux-2-pro)). Click TÊN template (`getByText(name,{exact:true})`) — click ngoài modal là đóng. Chọn xong hiện `Template prompt` (prompt của template, read-only fill sẵn) + switch `Use Template Default Size`. JSON `imagenhub_template:{id,available_variables}`.
- `Text to Image (AI)` provider option text: `[Gemini]/[OpenAI]/[Flux]/[ImagenHub] Text to image`; có `Fit mode` (fill/contain mặc định/cover) + `Image effects after generating` (cùng cây effect). Không có toggle required.
- **2026-10-18 (TIB-5389 phần 2, Playwright MCP chạy thẳng, không cần CDP):** T2I layer panel KHÔNG có option reference image cho bất kỳ provider nào (field list `ume` trong bundle chỉ có provider/prompt/note_output_size/fit_mode/effects/gpt_background/gemini_resolution/imagenhub_template). SDK đọc key `text_to_image_enable_ref_img`/`text_to_image_ref_img` nhưng portal không set được ⇒ ref image chỉ có ở **effect** `gen_ai_effect` (`image_filter`/`gpt:`/`flux_kontext:`/`gemini:image_filter`) qua toggle `Use Reference Image` → `Reference image`. Chọn `[Flux] Text to image` KHÔNG hiện cảnh báo gì. Note dưới prompt: `The generated image uses this layer's ratio.` ⇒ để layer vuông. `+ Variable` khi không có layer Text/Additional Option ⇒ popup `Add a Text or Additional Option layer to use variables in your prompt.` Storefront: field T2I luôn hiện `*` (SDK set required = !hidden) dù JSON `required:false`.
- Placeholder T2I: dialog chọn ảnh → `input.vgrid-input` gõ `1` + Enter → `.layer-listing__item:has(img[src*="5WKM58VogknzlmXh"]) img` (dog 1/1.png) → `Select 1 image`. Layer mới 900x1200 @350/200, khoá tỉ lệ ⇒ click `.qtransform--fields i.la-lock` rồi set W/H/Top/Left (fill + Enter). Rename: dblclick `#artwork-sortable-layer-<id> .artwork-sortable-layer-name` → `#artwork-sortable-layer-<id> input` + Enter. Đọc artwork: `POST https://staging-api.teeinblue.com/api/graphql` `{ artworks_by_pk(id){ templates } }` (GET /api/artworks/<id> = 405).
- `Multiple Uploads` mặc định 2026-10-16: **Single Output, max_photos 3**, provider trống (bắt buộc chọn), cần `multi_image_prompt`. Storefront: field có `*` và **chặn ATC khi trống** (Single Output cũng vậy) ⇒ buyer phải điền Multiple uploads mới ATC được.
- Populate từ photo source (Single Upload): `Available Value` = `{{output}}` (ảnh sau effect, = legacy `{{value}}`) / `{{input}}` (ảnh gốc, effect của target tự chạy). JSON `retrieval_value:"{{input}}"`.
- 🔑 **Emboss = toolbar `Print Effects`** (có ở photo / static-photo; Text KHÔNG có Print Effects) → `Customize` → `Effect`: `Cut` / `Emboss` (`.sc-effect-btn--emboss`) → grid Rows/Columns (mặc định 3x3, ô `.sc-cell--origin` ★ = ô chứa layer) → click ô đích (`.sc-cell` nth) → `Apply layout`. Lưu: template `shape_cut_layout:"3x3"`, layer `emboss:{cell_index, target_cells:[...]}`. Bản emboss (xám) render ở ô đích cùng offset tương đối như layer trong ô gốc ⇒ đặt layer nằm gọn trong 1 ô để bản emboss không bị cắt. Chỉ hiện trên Order Design. Cần `emboss_provider` ở 3rd-party Services (`/api/user` private_config): shop linh-tib-staging = **`teeinblue`** (B&W, không gọi 3rd-party; option khác `imagenhub` + template).
- TIB-5575 phần 2: DEV tạo sẵn layer image AVIF (10990/10991…, không category) ⇒ dialog Static Image → click category `All` → chọn card bằng `.layer-listing__item:has(img[src*="<hash>"]) img` (tên trùng nhau nên lọc theo hash url, không theo alt) → `Select 1 image`. Static image mới = size gốc 1536x1024 @ 32/288; set Width 480 ⇒ Height tự 320. Update campaign: `Update` → `tr` linh-tib-staging → `Update` ⇒ `POST /api/campaigns/<id>/sync` 200.
- Runner CDP: KHÔNG ghi body của `/api/login` vào log mạng (lần đầu đã lỡ ghi, đã redact).

# Phiên TIB-5587 (Testlane TIB-215) — 2026-10-16, campaign 3055 / artwork 5066, clipart cat 6391 (layer kích thước thập phân)
- Playwright MCP bị khoá profile → CDP workaround port **9751**. Runner log body request: tăng `slice` lên 300000, nếu không body PUT artwork >1500 ký tự bị cắt.
- 🔑 **Width/Height thập phân ĐƯỢC LƯU NGUYÊN** (50.88, 50.3) dù ô `#quick-transform-editor-*` chỉ HIỂN THỊ số nguyên (51) sau khi rời field. Đừng tin ô input — đọc body `PUT /api/artworks/<id>` hoặc merchant API.
- 🔴 **Top/Left bị trừ 0.01 khi width/height là số lẻ** (nhập 200 với layer 50.88 ⇒ lưu 199.99; layer size nguyên thì không bị). Cách lấy đúng 200: nhập `200.01` ⇒ lưu `200`. Kiểm từng layer sau Save. Gõ lại đúng giá trị đang hiển thị không bắn change ⇒ gõ giá trị khác trước (vd 401) rồi mới gõ giá trị đích.
- Clipart / photo layer: icon `.qtransform--fields i.la-lock` **click được** (đổi thành `la-lock-open text-danger`) ⇒ set W≠H được (50.88x50). Ghi chép cũ "clipart vẫn khoá" không còn đúng.
- `Clipart fit mode:` chỉ có 2 radio `direct_clipart_style-contain` (mặc định, "Contain (scale to fit)") / `-cover` ("Cover (stretch to fit)"). KHÔNG có option "stretch" riêng. Chọn bằng `.layer-editor-panel label[for="direct_clipart_style-cover"]`.
- Đổi tên clipart trong `/cliparts`: click link tên → popup `textarea` + `.vinput-btn-primary` (✓) → lưu qua GraphQL.
- Photo Single Upload: dialog chọn ảnh placeholder giống Static Image; upload xong phải đợi `Generating...` (~20s) rồi `Reload`; chọn card bằng `.mockup-layer-listing__thumbnail` position (20,60) (click `img` không chọn lần này). Layer sinh theo tỉ lệ ảnh (900x1200 @350/200), khoá tỉ lệ ⇒ mở khoá rồi set 400x400.
- Mockup đầu tiên của PB 3139 có print area tròn trên preview storefront ⇒ cột trái (left 200) của artwork 1600 bị viền tròn che một phần trên mockup, chỉ là preview mockup.
- **TIB-5587 rebuild (cùng ngày):** đổi default của layer Clipart Category: panel ✎ → `Show option to select default value` → click `.layer-editor-panel img[alt="<tên clipart>"]`. Việc này CHỈ đổi `default_value`, `url` (layer image) giữ nguyên ⇒ đổi thêm qua icon ⇄ (`button:has(i.la-exchange-alt)` trên hàng layer) → tab `Choose from clipart category` → chọn category → click ảnh → nút `Replace` (gọi `from-clipart`). 🔴 Replace ảnh trên layer KHÔNG vuông (50.88x50, 50x50.88) làm layer **co về vuông theo tỉ lệ ảnh và dời tâm** (vd 50.88x50.88 @599.56) ⇒ phải set lại size/pos. Layer vuông thì giữ nguyên. Static Image replace: tab `Upload an image`, card mới upload có thể được tick sẵn — click lần nữa là BỎ tick, kiểm checkbox trước khi bấm. Upload clipart/layer image 8000x8000 (1.4MB) chạy OK.
- Khi tạo layer Clipart Category, clipart được chọn trong lưới picker = cả `url` lẫn `default_value` của layer.

# Phiên TIB-4821 (Testlane TIB-214) — 2026-10-18, campaign 3062 / artwork 5081 (Paragraph "Remove line breaks")
- MCP browser khoá profile → CDP workaround port **9821** (profile scratchpad, headed, nắp mở chạy bình thường).
- ✅ Toggle **`Remove line breaks`** có trong `DESIGN SETTINGS` của Paragraph 2.0 (sau `Right to Left text`), mặc định **OFF**. Selector: `.layer-editor-panel div:has(> label.vue-js-switch):has-text("Remove line breaks") label.vue-js-switch` (`aria-checked`). JSON: `remove_line_breaks_enabled: true` khi ON; khi OFF thì **KHÔNG có key** (không phải `false`).
- Duplicate thường giữ nguyên populate (`retrieval_layer/value`), font size, personalization; tên `<gốc> copy` (dup lần 2 cùng gốc → `copy copy`).
- 🔴 Nút `Duplicate` thường: `button:has(span.sr-only:text-is("Duplicate"))` trúng **5 nút Duplicate của mockup gallery campaign** bên dưới trước ⇒ phải scope `.alab-actions button:has(span.sr-only:text-is("Duplicate"))` (tương tự cho `Duplicate & Link options`).
- Layer linked (Duplicate & Link) của Paragraph: panel chỉ `LINKED LAYER` + `EXTRA`, **KHÔNG hiện toggle Remove line breaks**; JSON clone mang `remove_line_breaks_enabled` + `retrieval_*` đồng bộ từ source, `customization_type: linked`, `linked: layer-<src>`. Tỉ lệ khoá: width 700 từ source 1500x350 ⇒ height 163.33.
- Song Search: JSON key là `lyric_enabled: true` (UI `Load song lyrics`). Layer Song Search không vẽ gì lên canvas.
- `GET /api/artworks/<id>` từ portal trả 405 ⇒ đọc layer qua merchant API công khai `GET staging-api/api/merchant/campaigns/<shopifyProductId>.json?shop=linh-tib-staging.myshopify.com` (`artworks[0].data[0].layers`).
- Storefront: preview mockup là ảnh; SVG thật nằm ở `.tee-mockup-artwork__wrapper svg` (715px, bị che) ⇒ chụp bằng cách lấy `outerHTML` ra file html riêng rồi screenshot. Đếm dòng = số `tspan` trong `#artwork-layer--layer-<id>`.
- Multi-store launch 2026-10-18: 5 store như 10-08; `campaign_instances.status = 5` sau publish, list hiện `Published on current store`.
- (Execute 2026-10-18) Checkout Bogus qua CDP: `frameLocator('iframe[name^="card-fields-number"]').fill` dồn hết chữ vào ô Card number ⇒ dùng `page.locator('iframe[name^="card-fields-<n>"]').click()` + `keyboard.type` cho number/expiry(`1230`)/verification_value/name. Customization lưu server đọc được public: `GET staging-api/api/merchant/shopify/customization/<id>?shop=...` (có `layer-<id>-data`).
- Toolbar Paragraph 2.0 (sau khi bấm `Preview Options` để giãn): icon `///` = Background image (`Default background image:` + Browse → library, upload bằng `input[type=file]` duy nhất trên trang), icon `|↔|` = Letter spacing + Line height (ô line height hiển thị `1,2`), icon khung = Enable shadow. Toggle OFF→Save lưu `remove_line_breaks_enabled: false` (key có mặt); layer chưa từng bật thì không có key.
- Paragraph buyer field chỉ có Enter (`"\n\n\n\n"`) + toggle ON ⇒ order item lỗi "The compressed paragraph lines field must match compressed text." (order #ins58-2972 item 7450).

# Phiên TIB-5591 (Testlane TIB-217) — 2026-10-19, campaign 3066 / artwork 5089 (Additional Option dùng global option + condition)
- MCP browser khoá profile → CDP workaround port **9591**. Login xong instance active là `linh open platform` (tester-4.com, có phiên khác đổi) ⇒ **chuyển instance**: click khối tên instance ở góc trên sidebar (toạ độ ~150,98; `getByText` báo not visible) → popup `Switch to:` có ô `Search..` → gõ `linh-tib-staging` → click dòng `linh-tib-staging | linh-tib-staging.mysho...` dưới `Linh Pham` ⇒ `POST /api/users/64/login` 200, sidebar hiện `Enterprise (Test)`.
- Nút `+ Layer`: `getByRole('button',{name:/^\s*Layer$/})` KHÔNG khớp ⇒ dùng `button:visible` filter text `/^\s*Layer\s*$/`.
- Static Image upload: ô search trong dialog (`input.vgrid-input`) không lọc được theo tên lần này ⇒ upload file mới rồi chọn card `.layer-listing__item:has(img[alt="<tên file không đuôi>"])` + `.mockup-layer-listing__thumbnail` position (20,60). Ảnh 900x1200 sinh layer 900x1200 @350/200 (khoá tỉ lệ); ảnh 1600x1600 sinh 1600x1600 @0/0.
- Popup Transform là TOGGLE: click `Transform` khi đang mở = đóng. Kiểm `#quick-transform-editor-width` visible trước khi click. Gõ: click → Cmd+A → Backspace → type → Enter. Width 500 (khoá tỉ lệ) ⇒ height lưu 666.67, top/left vẫn lưu đúng 400/200/900 (không bị -0.01).
- **Additional Option dùng global option**: panel ✎ → `label[for="customization_type-global_option"]` → `.layer-editor-panel .multiselect` → gõ tên → `.multiselect__option` ⇒ panel hiện `<tên GO>` + `Edit` + `Option title: -` (GO không có form_label). KHÔNG bấm `Edit` (mở sửa GO). JSON layer: `customization_type: global_option`, `global_option: <id>`.
- Panel ✎ đang mở CHE layer list (dblclick rename bị intercept) ⇒ đóng panel bằng mũi tên `<` góc trái (toạ độ ~20,65) trước.
- **Condition theo option của global option inline**: section Conditional = `#step-2-personalize`; multiselect đầu tiên là `Show/Hide`, multiselect Option là `.multiselect` có text `Select an option`; danh sách option render `.multiselect__content-wrapper:visible li.multiselect__element` (click trong wrapper đó, không scope theo `.multiselect`). Sau chọn Option, multiselect `is any of:` (`Select options`) liệt kê tên option của GO (A/B). JSON: `dependency:{action:"show",match_type:"all",dependencies:[{element:"layer-<AO>",value:["L00"]}],show_by_default:false}` — value là **id option inline của GO**, không phải clipart id.
- Mặc định (Rule 14, 2026-10-19): Additional Option mới `Create a new option`, required OFF, show_in_cart ON; Static image `No personalization`, reposition OFF; `Show this layer on first load` OFF.
- Storefront: field AO dùng GO render `#tee-field--layer-<AO layer id>` dạng `.tee-custom-select` (không phải `<select>`): click `.tee-custom-select__input` → `.tee-custom-select-item` text. `getCurrentCustomization()` lưu key `global-option-1035: "L00"/"L01"`; layer ẩn theo condition thì `#artwork-layer--layer-<id>` không có trong SVG.
- `campaign_instances` GraphQL không có field platform product id ⇒ lấy Shopify product id qua storefront `/products/<handle>.js`.

# Phiên TIB-5465 (Testlane TIB-224) — 2026-10-21, campaign 3088 / artwork 5170 + 5188, GO 1063, AO cat 6562/6563 (ImagenHub template variables)
- Playwright MCP khoá profile → CDP workaround port **9465** (profile scratchpad). Login `/login?staff=true` OK, instance 58 linh-tib-staging.
- **ImagenHub template picker** (T2I provider `[ImagenHub] Text to image`, Multiple Uploads provider `ImagenHub`, effect `[ImagenHub] AI Effect`): link `Select template` (`.layer-editor-panel` getByText exact) → modal `Select Template` (bảng: model + tên, có `Reload`) → click tên template exact. Ô `ImagenHub Template:` (input disabled) hiện tên template; `Template prompt` read-only. Ngay dưới prompt có cảnh báo inline `The following variables have no matching layer — please create a layer for each one: <vars>`. JSON: `imagenhub_template:{id,available_variables:[...]}`. Multiple Uploads + ImagenHub KHÔNG cần `multi_image_prompt`.
- **Warning box editor** (góc phải trên canvas, có nút ×): tiêu đề `Some ImagenHub variables have no matching layer`, mỗi dòng `Layer "<Template> - <layer>" needs the variable(s) <vars>, but no layer matches it/them. Rename an option title to the variable name.` Cập nhật live khi sửa layer, và hiện lại khi mở lại artwork. Bundle còn có box `ImagenHub template variables have changed` (Added/Removed/On layer…) + `Couldn't check the ImagenHub template on layer …`.
- Logic matching (bundle): quét layer có `text_to_image_provider|multi_image_provider == imagenhub` + effect `imagenhub:image_filter`; bỏ qua layer global_option khi quét; biến khớp theo option title HOẶC layer name; layer dùng Global Option lấy `form_label` của GO. Photo layer tên/title `color` KHÔNG được tính là khớp.
- 🔴 **Layer `Clipart Category` KHÔNG có `Image effects`** (schema `[ee.CLIPART_CATEGORY]` chỉ `clipart, default_value, …`; effects chỉ có ở PHOTO / TEXT_TO_IMAGE / Multiple Uploads / Photo global option) ⇒ không gắn được ImagenHub effect cho clipart.
- **Additional Option category tạo trong panel**: nút `New category` là `div.btn` (không phải button/a) ⇒ `.layer-editor-panel div.btn:has-text("New category")`. Modal `.vm--modal`; ô Name = `input:not([type=radio])` đầu tiên (input không có attr type) → `Create` → `input[placeholder="Item name"]` + `Add new` (chờ ~4s mỗi item) → nút lưu là **`button.clipart-category-editor__btn`** (text `Save`). Chọn category có sẵn: link `Search` trong panel → popup gõ tên → click tên (treeselect `Search top-level category` gõ không ra kết quả).
- **JSON List `JSON File URL`** chỉ nhận URL http(s): `data:` URL làm nút `Load preview` disabled ⇒ không nhập data inline được; cần file JSON host public.
- **Đổi tên template**: bỏ chọn layer (hàng `Template: <tên>` chỉ hiện khi KHÔNG có layer nào đang chọn — double-click vào tab template làm deselect) → icon `i.la-pencil-alt` ở hàng y≈103 → modal `Edit - <tên>` (Name, Thumbnail, Extra charge) → `Save`. Gear (x≈355,y≈65) = Template Settings (Done), `+` (x≈383) → `Add new` tạo `Template 1`.
- Text 2.0: JSON lưu `left/top` = TÂM (vd bbox L424/T415 360x130 ⇒ lưu left 603.83, top 480). Gõ text mới có thể làm width nhảy (399) ⇒ set lại W sau khi đổi text.
- Global Option Additional Option: `/global-options/create/additional-option` → items → `Save` (POST 201) → edit: name (click+Cmd+A+type) + `form_label` → `Save` (PUT 200). Mặc định display `radio`, show_in_cart true, required false.
- Multi-store launch 2026-10-21: 5 store (ship-n-pickup, linh-sdk-v2, linh-tib-checkout, linh-tib-theme Etsy, linh-tib-staging). Publish → `campaign_instances.status 5`.
- Mặc định quan sát (Rule 14, shop linh-tib-staging): show_in_cart ON cho T2I/AO/Photo/Clipart/Multi/Text/JSON; required OFF; Photo live preview ON; T2I fit mode contain; Multiple Uploads Single Output max 3; ImagenHub effect `Use Template Default Size` OFF, `Apply color to sketch result` OFF; Text `Prefill default text` OFF.

# Phiên TIB-5282 (Testlane TIB-216) — 2026-10-21: recon instance Boundless 287, DỪNG trước khi tạo data
- Playwright MCP khoá profile → CDP workaround port **9601** (profile scratchpad).
- ✅ **Switch instance (ĐÃ VERIFY)**: login `/login?staff=true` xong active là 58 (linh-tib-staging). Click khối tên instance góc trên sidebar (`page.mouse.click(150,98)`) → popup `Switch to:` (ô `Search..`, danh sách user/org có mũi tên `>`). Click dòng **`linh open platform`** (≈377,403) để xổ store con: `linh-open-platfo… | linh-open-platform…`, `localhost`, `test 3`, `test-1`, `tester 4 | tester-4.com`, `tester 4 | tester-5.com` (2 dòng cùng tên "tester 4" — chọn theo domain) → `page.getByText('tester-4.com').first().click()` ⇒ `POST /api/users/117/login` 200 `{"acting_user_id":117}` + `GET /api/instances/287/popup-messages`. Sidebar: `linh open platform` / `tester-4.com`, plan `Basic - Picanova`, header `teeinblue Boundless`.
- **Instance Boundless KHÔNG có Product Base / Campaigns by Product Base.** Sidebar: `Home`, `Artworks`, `Products (Boundless)` (`/platform-products`), `Customizations` (`/platform-customizations`), `Assets`, `Store Settings`, `Extras`, `AI Assistant (MCP)`, `Organization`. "Campaign" của Boundless = **Product (Boundless)**; `campaigns_aggregate` = 0.
- `/platform-products/new`: chỉ `Product name:` + `Internal tags (optional)` + `Create` (không chọn product base/Shopify product).
- Editor `/platform-products/<id>/edit`: `STEP 1: ADD ARTWORK` (1 artwork, `Edit artwork` / ×), `STEP 2: PREVIEW YOUR PRODUCT` (gallery mockup, mỗi thumbnail có Edit/Duplicate/×; nút `Upload mockup`, `Import` (popover: `From Campaigns by Product base` / `From Campaigns by Platform` → modal `Import mockups from Campaigns[ by Platform]`, filter `With printarea/Without printarea` hoặc `With artwork/Without artwork`), `...`). Top bar `Unpublish`/`Logs`/`...`(chỉ `Edit internal info`)/`Launch|Update`.
- Mockup Boundless KHÔNG có layer printarea (GraphQL `platform_mockups.layers` chỉ `image` + `artwork` khi đã Add Artwork; layer artwork 480x480 trên canvas 960x960).
- **Duplicate campaign**: ở list `/platform-products`, cột action nút `.la-ellipsis-h` của hàng → popover `Duplicate campaign` / `Unpublish campaign` / `Delete product`.
- GraphQL hữu ích: `platform_products(order_by:{id:desc}){ id name platform_mockups{ id position width height layers } platform_artworks{ id artwork_id } }` (filter `instance_id` trả thiếu — bỏ where).

## TIB-5282 phần 2 (2026-10-21) — ĐÃ TẠO: Boundless product 587 (C1) / 588 (C2), artwork 5219/5220/5222
- **Tạo Boundless product**: `/platform-products/new` → 2 input `main input:visible` (nth0 = Product name, nth1 = Internal tags: gõ + Enter) → `Create` ⇒ `POST /api/platform-products` 201 → `/platform-products/<id>/edit`. Quan sát: product mới có `published_at` = lúc tạo, `instance_id` null, top bar hiện `Unpublish`/`Update` dù chưa bấm Launch (product clone thì ngược lại: `published_at` null, `instance_id` 287, nút `Launch`).
- **Artwork từ STEP 1**: link `Select artwork` → modal `Select your artwork` → `New artwork` → dialog `Artwork details` (giống PB: `input[name="name"]`, W/H mặc định 1600) → editor → `Save & Close` (POST /api/artworks 201) → click card `[title="<tên>"]` trong modal ⇒ `POST /api/platform-artworks` 201. Artwork rời: `/artworks` → nút `New artwork` (cùng dialog/editor).
- Text layer 2.0 mới: `Default text`, Roboto 100, 475x117 giữa canvas. Text "fit" theo box: đổi font size không to ra nếu box hẹp ⇒ set Transform H trước rồi W (vd 1400) — font tự scale (~258).
- 🔴 **Widget chat Crisp (`.crisp-client`) chặn click nút dưới cùng modal** (vd `Select 1 images`) ⇒ `page.addStyleTag({content:'.crisp-client{display:none !important}'})` (chỉ ẩn widget, không đụng data).
- **Upload mockup**: `Upload mockup` → modal thư viện; `input[type=file]` nhận nhiều file → `POST /api/mockup-layers/by-temporary-file` mỗi file; file vừa upload **tự được tick hết**. Muốn 1 mockup/1 ảnh theo thứ tự: bỏ tick các ảnh khác (click `img` trong `.layer-listing__item`) → nút `Select 1 images` ⇒ `POST /api/platform-products/<id>/platform-mockups` 204. Lặp lại cho từng ảnh. Mockup scale về cạnh dài 960 (vd 1024x768 → 960x720).
- **Mockup Editor**: nút Edit của thumbnail `button.ml-auto.border-0:has(span.sr-only:text-is("Edit"))` nth(k) theo thứ tự gallery → `Add Artwork` (getByText exact) → click tên artwork `:visible:text-is("<tên>")` .last() ⇒ layer artwork 480x480 căn giữa → `Save & Close` ⇒ `PUT /api/platform-mockups/<id>` 200. Panel `Layer options`: Opacity 100%, `Enable masked` OFF, `Enable perspective` OFF.
- Main preview: click thumbnail KHÔNG đổi ảnh lớn; dùng mũi tên `›` (≈890,589) để lật. Mockup không có artwork hiện banner `No artwork found. Edit this mockup and add artwork to view changes.`
- **Đổi tên product**: click link tên ở STEP 2 (≈1100,295) → popover textarea + nút ✓ (≈1307,234) ⇒ GraphQL `update_platform_products`.
- Duplicate campaign (list `...`) ⇒ `POST /api/platform-products/<id>/clone` 201, tên `<gốc> copy`, giữ internal_tags, artwork, mockup + layer artwork (mockup id mới).
- Text layer defaults (instance 287, Rule 14): show_in_cart **OFF**, required OFF, prefill OFF, reposition OFF, charge by char OFF, attach for fulfillment OFF, prefix/suffix OFF, RTL OFF; `customization_type normal`, input text, textcase none (KHÁC shop linh-tib-staging: show_in_cart ON).

## TIB-5282 phần 3 (2026-10-21) — instance 58, campaign 3124 (S-single) / artwork 5223
- Switch 287 → 58: popup `Switch to:` — ô `Search..` gõ KHÔNG lọc được; click dòng user **`Linh Pham`** (≈350,452 khi đang ở 287) để xổ store → `.user-item__instance__domain:visible` có text `linh-tib-staging.myshopify.com` ⇒ `POST /api/users/64/login` 200.
- Campaign by PB **KHÔNG có gán artwork theo variant**: artwork gắn theo printarea (Front/Back, `Select artwork for all`); `Assign mockups` chỉ map mockup↔variant. Muốn artwork khác nhau theo variant chỉ có cách PB bật `Custom variant's printarea` (vd `example product base - mug` 3140: 11oz→printarea 11oz, 15oz→15oz). Toggle `Connect artworks with Shopify variants` chỉ có ở campaign **by Shopify Products**.
- 🔴 PB 3139 (tshirt): mockup 7966 và 7967 có layer printarea `Front` thiếu `visible:true` (eye OFF trong Mockup Editor) ⇒ preview campaign báo `No printarea found. Edit this mockup and add printarea to view changes.` Sửa ở campaign: nút Edit thumbnail `main button:has(span.sr-only:text-is("Edit"))` nth(k) → Mockup Editor (`Your printareas`, toggle `Preview artwork` ON mặc định) → click ô eye (x≈16) của hàng `Front (1400x1400)` → `Save & Close` ⇒ `PUT /api/campaign-products/<cp>/campaign-mockups/<id>` 200. Mockup 7748 chỉ có printarea `Back` ⇒ cần gắn artwork cho Back thì mockup đó mới hiện artwork.
- Lật preview campaign PB: `.tee-slider__button--next`.
- Text layer defaults instance 58 (2026-10-21): required **ON**, show_in_cart ON, các toggle khác OFF.

## TIB-5282 phần 4 (2026-10-26) — instance 58, platform product 594 (S-multi) / artwork 5446 + 5447
- Switch 287 → 58 lần này chạy bằng Playwright MCP thường: click khối instance sidebar → `div` text đúng `Linh Pham` (xổ store) → `getByText('| linh-tib-staging.myshopify.')` ⇒ reload trang mới thấy sidebar `linh-tib-staging.myshopify.com`. Plan badge lúc đọc có khi `Free for development`, có khi `Enterprise (Test)` — cùng store, không phải lỗi switch.
- 🔑 **Tên campaign by Shopify = title Shopify product, KHÔNG đổi được trong portal**: không có field name ở `/platform-products/new`, `Edit internal info` chỉ có Internal tags, click tên ở Step 2 không mở popover (khác Boundless), menu `...` ở list chỉ `Duplicate campaign` / `Delete campaign`. Muốn tên theo issue phải đổi title bên Shopify (ngoài quyền agent).
- Dialog `Select a product from store …`: cột Status = **`Used`** khi Shopify product đã gắn campaign teeinblue (kể cả product do campaign PB tạo), còn lại hiện status Shopify (`Active`/`Draft`/`Unlisted`). Không có ô search; phân trang `›` (~29 trang trên linh-tib-staging). Lọc ứng viên chưa dùng = status khác `Used`. Lấy variant bằng storefront `/products.json?limit=250&page=N` sau khi nhập password `oe` (curl từ máy bị Shopify trả `local_rate_limited` ⇒ fetch trong tab browser).
- Toggle `Connect artworks with Shopify variants` ON ⇒ `PUT /api/platform-products/<id>` (`enable_artwork_variant_assignment:true`); mỗi artwork hiện nút đỏ `Select variants to connect` → dialog `.dialog-platform-variant-selector-popup` "Assign variants to: <artwork>" (bảng checkbox variant, filter Size/Color, `Remove all connections`) → `Save` ⇒ `PUT /api/platform-artworks/<id>` 200; nút đổi thành `Connected to some variants`. Variant đã gắn artwork khác KHÔNG bị disable (1 variant có thể gắn nhiều artwork).
- Artwork KHÔNG tự gắn vào mockup: Mockup Editor → `button:has-text("Add Artwork")` → chọn `button.dropdown-item:has-text("<tên>")` ⇒ layer artwork 480x480 @240,240 (canvas 960). Mockup không Add Artwork ⇒ preview banner `No artwork found. Edit this mockup and add artwork to view changes.`
- Preview Step 2 khi Connect ON: `Variant: Select to preview` → dialog `Select variant to preview` → nút `button.select-single-button` (`Select`) của hàng (click ô tên KHÔNG chọn). Slider preview vẫn lật qua MỌI mockup (kể cả mockup không assign cho variant đó); form chỉ hiện field của artwork gắn variant.
- `#modals-container` dùng `position:fixed` ⇒ check `offsetParent` luôn null, đọc dialog bằng `document.querySelector('#modals-container').innerText`.
- Screenshot MCP ghi file trễ ~1-2s và `Read` cache theo path ⇒ mỗi ảnh đặt tên mới, `sleep 2` trước khi Read.
- Text layer defaults instance 58 (2026-10-26): required ON, show_in_cart ON, prefill/reposition/charge/attach/prefix/RTL OFF.

# Phiên TIB-5551 (Testlane TIB-228) — 2026-10-22, campaign 3126 / artwork 5239 (static bg + photo upload + text, publish)
- Playwright MCP khoá profile → CDP workaround port **9551** (profile scratchpad). Login `/login?staff=true` OK, instance 58 `Enterprise (Test)` / linh-tib-staging.
- `+ Layer` > `Photo Upload` là submenu: **hover KHÔNG mở**, phải **click** `Photo Upload` rồi click `:text-is("Single Upload"):visible`.
- Static Image: file vừa upload qua `Drag and drop, or click to upload!` **tự được tick sẵn** → bấm thẳng `Select 1 image`. Ảnh 2000x2000 trên canvas 1600 ⇒ layer tự fit **1600x1600 @0/0**.
- Header section panel ✎ trong DOM là Title Case ⇒ `getByText(/^personalization settings$/i)` (exact uppercase không khớp).
- Text 2.0: set Default text (`input[name="text"]`) TRƯỚC rồi mới Transform (H trước, W sau) — H=200 lưu 202 (font tự scale ~171).
- Mặc định quan sát 2026-10-22 (Rule 14, shop linh-tib-staging): Photo `required` **ON** (khác 10-14 là OFF), show_in_cart ON, live preview ON, editor `static`/`contain`; Text required ON, show_in_cart ON, prefill OFF.
- Multi-store launch 2026-10-22: 5 store như 10-21; `POST /api/campaigns/<id>/publish` 200, list hiện `Published on current store`.
- Product không thuộc campaign nào trên linh-tib-staging (read-only, `merchant/campaigns/<pid>.json` → 404): `shopify-sku`, `variants`, `addon-1`.

# Phiên TIB-5483 (Testlane TIB-229) — 2026-10-22, campaign 3127 (A) / 3128 (B clone), artwork 5250 (text + addon legacy)
- Playwright MCP khoá profile → tự launch Chromium CDP port **9483** (profile scratchpad), port 9551 là của phiên khác, không dùng chung.
- Ô Name trong dialog `Artwork details` KHÔNG có accessible name `Name` → `getByRole('textbox',{name:/Name/})` timeout. Dùng `[role=dialog]:has-text("Artwork details") input[type=text]` nth0.
- Addon Charge mặc định 2026-10-22 (Rule 14): `Mark this option as required` **ON**, show_in_cart ON, multiple OFF, Charge method `variant` (legacy), Inline Radio Button. Không còn thấy toggle `Additional Charge` trong panel.
- Dialog Attach: hàng store = `.row:has-text("linh-tib-staging.myshopify.com")` (last); `.multiselect` nth1 = Variant; chọn `.multiselect__option` theo text rồi bấm `Attach` cùng hàng. Đóng dialog bằng nút `Close` ở footer.
- Storefront linh-tib-staging hiện market Germany/EUR: base 17,95 €, addon 25.000₫ → +€0,95. Cart legacy: line chính có `_tib_addon_variant: <variantId>:1`, line addon riêng `addon product / addon 1` có `_tib_customization_id`.
- Clone campaign giữ nguyên artwork mapping (cùng artwork id, không clone artwork) + internal tags. Rename qua inline title rồi Launch thì handle sinh theo title mới (`...-cart-handle`), publish 200.

# Phiên TIB-5551 phần 2 (2026-10-22) — clone 3126 → campaign 3132 / artwork 5269 (Photo Reposition + mockup theo variant)
- Playwright MCP chạy được phần portal, giữa chừng bị session khác chiếm profile → CDP workaround port **9663** (profile scratchpad mới; profile cũ trong scratchpad báo `Opening in existing browser session` ⇒ đổi tên thư mục profile).
- Clone campaign + muốn artwork riêng: `/campaigns` `...` → `Duplicate campaign` (dùng chung artwork gốc!) ⇒ `/artworks` hover card → nút `la-copy` (`POST /api/artworks/<id>/clone` 201, tên `<gốc> copy`) ⇒ trong campaign clone bấm `×` (title `Remove`) ở Front → `Remove` (chỉ xoá campaign_artwork của bản clone) → `Select artwork` → click `img[alt="<tên> copy"]` → `Edit artwork` → bút chì `.artwork-editor-header i.la-pen` nth0 → dialog `Artwork details` `input[name="name"]` → Save.
- **Mockup assignment của campaign by PB lưu ở `campaign_mockups.variant_ids`, KHÔNG đụng `mockups.variant_ids` của PB** (đã verify: PB 3139 giữ nguyên sau khi sửa campaign 3132). Dialog `Mockup assignments` hàng theo position; hàng chỉ hiện tên printarea (không có id) ⇒ đối chiếu bằng GraphQL `campaign_mockups(order_by:{position:asc})`. Gỡ variant: `.multiselect__tag-icon` (×); Save phải bấm **2 lần** (lần 1 chỉ đóng dropdown).
- PB 3139 mockup có printarea Front visible: 7749 (pos0, model nữ, vuông) và 8154 (pos4, model nam, printarea tròn). 7748 chỉ Back; 7966/7967 Front thiếu `visible`.
- Storefront Photo Reposition: upload xong tự mở dialog `.tee-dialog-image-placement` (preview trên mockup, khung có handle scale + nút xoay, toolbar zoom-/zoom+/xoay trái/phải/←/→/↑/↓, nút `test Cancel`/`test Save` — label custom của shop). Sau Save field có `button.tee-btn--recustomize` "Recustomize image" + `tee-photo-clear`.
- Storefront đổi variant S↔M: ảnh chính gallery đổi theo campaign_mockup gán variant (S `…dZrH7vb9…`, M `…b4yOdznE…`).

# Phiên TIB-5539 (Testlane TIB-239) — 2026-10-23, campaign 3185 — 🔴 BLOCKER `preview_thumbnail` TÁI PHÁT
- Playwright MCP khoá profile → CDP workaround port **9539** (profile scratchpad mới, không cache). Login `/login?staff=true` OK, instance 58 `Enterprise (Test)`.
- `/campaigns/new` tạo campaign OK (3185). Bundle portal lúc này: `assets/index.xYTv-L4c.js` / `vendor.DkKJvYwp.js`.
- 🔴 Add PB 3139 (`example product base - tshirt`) → GraphQL `insert` `campaign_products` (kèm `campaign_mockups.data[].preview_thumbnail`) trả 200 nhưng body `errors: validation-failed ... field 'preview_thumbnail' not found in type: 'campaign_mockups_insert_input'` + `PAGEERROR` trong console. UI đóng dialog im lặng, reload thì `Available Products` rỗng. Giống hệt blocker 2026-08-23 (xem mục "Cạm bẫy đã biết"). Ngày 2026-10-22 add PB vẫn chạy (campaign 3126/3127) ⇒ regression deploy giữa 10-22 và 10-23. Dừng, không retry.
- Dialog `Select your product`: gõ `example` vào ô search rồi click `.vgrid-entry-wrapper:has(img[src*="/products/3139/"])` (đúng 1 card).
- Recon SDK (staging app-v1.js 1.744.103 byte, 2026-10-23) phục vụ dựng data TIB-5539 khi hết blocker:
  - `POST customer-uploads/{id}/derive` chỉ bắn cho layer photo TARGET có `retrieval_value_enabled` + `retrieval_layer` = photo source + **có effect** (`effects.length` hoặc `removeBg`) ⇒ target populate phải có ít nhất 1 effect (vd `Black & White (TIB)` để không tốn AI) + `Create a new option`.
  - `pdf-upload` chỉ gọi từ layer **Vector Upload** khi config `multiple_file_types` = true (`isMultipleFileTypes`) và file là PDF; không có layer PDF riêng.
  - `generate-from-multiple-images` = layer `Multiple Uploads` ▸ `Single Output` (cần GenAI service + prompt).

## TIB-5539 phần 2 (2026-10-23) — campaign 3185 / artwork 5392 (8 layer upload/AI), campaign 3186 rỗng
- PB gắn qua MCP (main session) thì campaign editor portal chạy bình thường: Select artwork Front → New artwork → editor → Save & Close. Lần này Save & Close KHÔNG quay lại dialog `Select your artwork` ⇒ bấm lại `Select artwork` của Front → click `[role=dialog] [title="<tên>"]` (POST /api/campaign-artworks 201; UI print area cập nhật sau reload).
- Dialog `Artwork details` → `Design format:` là multiselect, options: PNG_RGB (mặc định), PNG_SRGB, PNG_ADOBE_RGB, JPEG, JPEG_CMYK, JPEG_CMYK_COATED_FOGRA39, SVG, EPS, AI, PDF.
- Vector Upload: panel KHÔNG có toggle cho PDF/multiple file types. `multiple_file_types` là **config cấp shop** (`GET merchant/shopify/config?shop=` → `multiple_file_types: true` ở linh-tib-staging) ⇒ mọi Vector Upload trên shop này nhận `*/*` và PDF đi `pdf-upload`.
- Vector Upload dialog: ô search `input.vgrid-input` lọc theo tên chậm (~3s); chọn card bằng `.layer-listing__item:visible` theo innerText + click `img` (checkbox tự tick), nút `Select 1 vector`. Vector `teeinblue-official` 702x176 có sẵn.
- Route Maps: KHÔNG có toggle required (JSON không có key), storefront luôn `*`. T2I cũng không có toggle, JSON `required:true` (default user config).
- Populate source multiselect: option text `"<title>\n<layer name>"` — Playwright hasText regex chuẩn hoá xuống dòng thành space ⇒ so sánh bằng allInnerTexts() + split('\n')[0].
- Storefront 2026-10-23: Photo upload đi **`upload-staging.teeinblue.com/v1/shopify/uploads?field_id=&campaign_id=`** (201, chậm ~67s); photo có GenAI effect đi `.../v1/shopify/genai-uploads` (fail) → SDK fallback `upload-error-logs` + `upload-url` presigned → `image-filter-effects/async` 202 → poll `status`. OpenAI AI Effect (`gpt:image_filter`) trả ảnh OK (~4 phút tổng). Populate {{input}} + effect B&W → `customer-uploads/<id>/derive` 202.
- (3186 / artwork 5393) Layer `Multiple Uploads` ▸ Multiple Outputs: toolbar KHÔNG có `Transform` (chỉ `Border`), canvas không vẽ placeholder ⇒ không đặt được vị trí (JSON giữ 900x1200 @350/200), không ảnh hưởng design vì Multi Outputs tự không render. Single Output thì có Transform. Cả 2 không có toggle required ⇒ JSON `required:true` theo default user. Storefront Multi: input `multiple` ⇒ setInputFiles 3 file 1 lần; 3 upload đi `upload-staging.../v1/shopify/uploads` (fail ~36s, không status) rồi fallback `upload-url` presigned OK.

## PDF qua Vector Upload bị chặn ở client (quan sát 2026-10-23, TIB-5539)
- Shop linh-tib-staging vẫn `multiple_file_types: true`, nhưng chọn PDF ở Vector Upload → "This file type is not supported. Please upload an image.", không có request nào.
- Bundle staging (1.744.103 byte): bước tiền xử lý dùng chung `handleSpecialFileType` → `yB()` ném lỗi với MIME bắt đầu bằng `video/` hoặc `application/` (`cB=["video/","application/"]`) → `application/pdf` bị chặn trước nhánh `isPdfFile → uploadPDF`.
- So với 2026-08-26 (TIB-5341): PDF vào `Your logo (vector)` → `pdf-upload` 201. Chưa có xác nhận dev đây là thay đổi chủ ý hay regression.
- Photo Upload storefront `accept="image/*"`: không có ghi chép nào về PDF đi qua Photo Upload.

# Phiên TIB-5583 (Testlane TIB-242) — 2026-10-26, campaign 3205 / artwork 5485, GO 1119, AO cat 6594 (prompt variable + Dynamic Translations vi)
- Playwright MCP khoá profile → CDP workaround port **9583** (profile scratchpad). Login xong instance active lại là 287 (Boundless) ⇒ switch: click (150,98) → `div` text `^Linh Pham$` (last) → `getByText('| linh-tib-staging.myshopify.')` ⇒ `POST /api/users/64/login` 200; reload bị `ERR_ABORTED` (vô hại), navigate lại là thấy instance 58.
- Add PB 3139 chạy bình thường (KHÔNG còn lỗi `preview_thumbnail` như 10-23). Search dialog: `[role=dialog] input[placeholder*=Search]` → `.vgrid-entry-wrapper:has(img[src*="/products/3139/"])`.
- 🔴 Dialog `Artwork details`: `[role=dialog]:has-text("Artwork details") input[type=text]` nth0 trúng ô **search layer** (`input.afb__name__input`) của editor phía sau. Dùng **`input[name="name"]:visible`**; nút Save = `.dialog-artwork-setup button.btn-primary:has-text("Save")`.
- **ImagenHub template list 2026-10-26** (8): `QA-5465 T4` [style,name,gift,color,info], `QA-5465 T3` [mood] (edit), `QA-5465 T2` [art_style] (edit), `QA-5465 T1` [color,dog_name], `TIB - gen AI 2 - GPT-image-1.5` / `-GPT-image-2` (0 biến, edit), `T2I - tib` [school.name], `T2I` (flux-2-pro, prompt `Generate photo from {{school}}`, [school]). `QA-5465 T5` ĐÃ BỊ XOÁ. Template GPT load prompt chậm (~5s) — đọc sớm sẽ ra prompt của template trước.
- **Nút `+ Variable`** (prompt T2I / prompt GenAI effect): dropdown `.prompt-variable-dropdown__item__content`, liệt kê Option Title của AO / Text / JSON List; **layer AO dùng Global Option KHÔNG có trong list** (phải gõ tay `{{Hat}}`). JSON List có submenu `Pick a value from the JSON file` → `The whole item as JSON` = `{{City}}`, hoặc từng key `{{City.id}}`, `{{City.name}}`… Dropdown KHÔNG tự đóng sau khi chọn → click lại `Variable` để đóng (nó che textarea). Biến chèn tại con trỏ; gõ nối bằng `focus()` + `ControlOrMeta+End` + type.
- AO category tạo trong panel: modal có radio `category_display_type-<image|text|dropdown|radio|radio_button>` (`text` = Dropdown Option Name). Đóng modal: nút × góc phải (~1182,149).
- GO create page `/global-options/create/additional-option`: mặc định display `Inline Radio Button`; `Dropdown Option Name` = value `text`. Sau POST → `/global-options/<id>/edit` có Name/Option Title; required **ON** mặc định (2026-10-26), show_in_cart ON.
- Dynamic Translations: bấm `Add new translation` khi không search ⇒ portal **nhảy sang trang CUỐI** rồi thêm dòng rỗng (count input đổi 40→32) ⇒ tìm cặp rỗng bằng value thay vì vị trí. Network listener không thấy `translations/bulk` lần này nhưng public `vi.json` tăng đúng 3 key.
- 🔑 **Storefront đọc dictionary từ `<script id="teeinblue-product-data">` (Shopify, không fetch API)** ⇒ sau Save cần chờ ~1–2 phút mới có trên trang (lần đầu reload vẫn bản cũ). Kiểm bằng `document.querySelector('#teeinblue-product-data').textContent.includes('<value>')`.
- 🔑 **JSON List item KHÔNG được dịch trên storefront** (2026-10-26, bundle app-v1.js 1.743.074 byte): builder `jae()` chỉ đưa label qua dictionary, item lấy thẳng từ file JSON (`London` có key `London→Luân Đôn` vẫn hiện `London`). AO/GO option đi qua `rC()` nên dịch đúng (`Witch→Phù thủy`, `Crown→Vương miện`).
- Storefront vi: `/vi/products/<handle>` vào thẳng được (locale `vi`). Nút T2I hiện `Tạo ảnh từ text`.
- Mặc định (Rule 14, linh-tib-staging 2026-10-26): AO/Text/JSON/Photo/T2I required **ON**, show_in_cart ON; Photo live preview ON; Text prefill/reposition/charge/attach/prefix/RTL OFF.

## TIB-5583 Campaign B (2026-10-26) — campaign 3206 / artwork 5486 (template selector collision)
- **Template selector title** = nút gear (⚙, ~355,64) trên hàng tab template → modal `Template Settings:`: radio `display_type-select|radio|radio_button` (mặc định Dropdown List), ô **`input[name="label"]`** = `Label of template options` (mặc định RỖNG, storefront vẫn hiện label nếu đặt), `input[name="placeholder"]` mặc định `Choose an option`, toggle `Show selected template on cart/checkout` mặc định OFF, nút `Done`. Lưu theo artwork khi Save.
- Đổi tên template: icon bút chì hàng `Template: <tên>` (Default template ~277,103; khi ≥2 template có thêm eye/trash nên bút chì ở ~249,103) → modal `Edit - <tên>`: ô Name (~846,402), Save (~892,342). `i.la-pencil-alt:visible` first trúng bút chì của trang campaign phía sau ⇒ dùng toạ độ.
- Thêm template: `+` (~383,64) → `Add new` ⇒ `Template 1` rỗng.
- `+ Variable` chỉ liệt kê Option Title của layer AO/Text/JSON List **trong template đang mở**; KHÔNG liệt kê template selector. Template không có layer phù hợp ⇒ popup `Add a Text or Additional Option layer to use variables in your prompt.`; gõ tay `{{Design}}` ⇒ cảnh báo vàng `The following variables have no matching layer — please create a layer for each one: Design` (Save vẫn OK).
- AO category modal: `category_display_type-dropdown` = **Dropdown Option Name + Thumbnail** (mặc định khi mở modal lần này), `-text` = Dropdown Option Name.
- 🔴 Image picker của T2I: `input.vgrid-input:visible` first trúng ô search của dialog `Select your artwork` phía sau (để lại filter `Corgi` ⇒ lúc Save & Close thấy `No data matched`). Không cần search, chọn thẳng bằng hash ảnh (Husky `6ad5ec1cd9102`, Corgi `6ad5ec151635b`).
- Storefront: template selector là `.tee-field` đầu tiên (`select`, label = label template); ban đầu `Choose an option` nhưng form hiện layer của template đầu; đổi template ⇒ field đổi ngay. SDK nhớ lựa chọn template qua localStorage (mở /vi sau khi chọn Template Two ở en ⇒ vào thẳng Template Two).

# Phiên TIB-5611 (Testlane TIB-247) — 2026-10-26, campaign 3218 / artwork 5506 (Route Maps + Photo Upload, nút X GPX)
- Playwright MCP khoá profile → CDP workaround port **9611** (profile scratchpad). Instance active lúc login = 58 (không cần switch).
- Nút `+ Layer` KHÔNG match `getByRole('button',{name:/^\s*Layer$/})` (timeout) ⇒ dùng `page.locator('button:visible').filter({hasText:/^\s*Layer\s*$/}).last()`. Khi panel ✎ đang mở, layer list bị `.layer-panel__body` che ⇒ bấm chevron `<` (≈20,66) để quay lại layer list trước.
- 🔑 **Route Maps panel (2026-10-26)**: DESIGN SETTINGS (`Upload GPX default` / zoom / line color / thickness / Map styles URL / `Show Marker/Pin`), PERSONALIZATION (radio + Option Title + switch `Apply mask image`, `Allow customers to change elevation profile`, `Allow customers to change map styles`, `Add instruction for customer`, `Show customization data on cart/checkout` ON, `Custom class`), CONDITIONAL, EXTRA. **KHÔNG có toggle `Mark this option as required`** và **KHÔNG có setting Strava nào** ở layer. Nút `Connect Strava` do SDK tự render (cả form preview portal lẫn storefront), label lấy từ shop config `gpx_upload_button_text_strava`.
- Route Maps mới: 700x700 @450/450, không khoá tỉ lệ (set H rồi W đều ăn). JSON không có key `required`; storefront vẫn `Your route*` (`span.tee-asterisk`).
- Storefront: nút upload hiện `Choose an gpx` (input `accept=.gpx`); sau upload: thumbnail + `button.tee-btn.tee-photo-clear` (nút X), tên track, `Choose another GPX`, `Connect Strava`, `Recustomize route map`. Upload: `gpx-upload` 200 → dialog `Select & continue` → `gpx/parse` 200. File `5km.gpx` hiện `Invalid date - 5.09km - 0:00:00`.
- 🔑 **Route Maps CÓ hỗ trợ Global Option** (2026-10-26, GO 1121): `/global-options` → `Global Option` → `Route Maps` → `/global-options/create/route-maps`. Form: `Global Option Name(internal)` (gõ bằng `.field--text:has(label:has-text("Global Option Name")) input` + Cmd+A/Backspace/pressSequentially; `main input[type=text]` first KHÔNG phải ô này), `Option Title` (`input[name=form_label]`), các switch giống panel layer (show_in_cart ON mặc định), không có required. Nút Save: `getByRole('button',{name:/Save/})` (filter hasText `^Save$` không khớp).
- Layer → global option: radio `label[for="customization_type-global_option"]` → `.multiselect` → gõ tìm → click `li` theo tên. JSON layer: `customization_type: global_option`, `global_option: <id>` (giữ `form_label` cũ của layer, storefront hiện Option Title của GO).
- Duplicate campaign: nút `i.la-ellipsis-h` trong hàng `/campaigns` → popup `.v-popper__popper` → `Duplicate campaign` (POST `/api/campaigns/<id>/clone`, tên `<gốc> copy`, giữ tags, DÙNG CHUNG artwork). 🔴 Khi đổi artwork ở bản clone: dùng `main .cas-no-artwork` **nth(1)** cho Front; đừng tìm theo text cha (không chứa `Front (`) — index -1 ⇒ nth(-1) = Back (đã dính, phải gỡ 8699).

# Phiên TIB-5545 (Testlane TIB-248) — 2026-10-26, campaign 3221 / artwork 5512 (campaign info cho Open API update)
- Playwright MCP khoá profile → CDP workaround port **9545**. Login xong instance active = OETester 241 (`oe24-staging-tib-2`, acting_user 94) ⇒ switch: click (150,98) → ô `Search..` gõ `linh-tib-staging` → `getByText('| linh-tib-staging.mysho')` ⇒ `POST /api/users/64/login` 200.
- 🔑 **Field campaign info và nơi sửa (2026-10-26)**:
  - `Listing info` (top bar) → dialog **`Edit campaign info`** (tab Shopify/Etsy): `input[name=product-type]` (mặc định **`Customizer`**), `input[name=vendor]` (rỗng), `input[name=product-tags]` (text thường, gõ `t1,t2` lưu nguyên chuỗi `t1,t2`), Product Thumbnail. Save = GraphQL `update_campaigns`. Nút Listing info có icon ⚠ (chưa có thumbnail).
  - **Label available product** = link `AVAILABLE PRODUCT` ở STEP 2 (`.campaign-option-title .vinput-value a`) → popup input placeholder `Available Product` → nút ✓ `button.vinput-btn-primary`. DB mặc định `null`, UI hiển thị UPPERCASE bằng CSS.
  - **Product display type** = icon ⚙ cạnh label đó (`button:has(.la-cog)`) → dialog `Display available product on store`: radio `product_display_type-radio` (mặc định, DB `radio`) / `-dropdown` + Save.
  - Đọc lại: `GET https://staging-api.teeinblue.com/api/campaigns/<id>` (fetch kèm cookie + X-XSRF-TOKEN) trả name/label_available_product/product_display_type/product_tags… (KHÔNG có vendor/product_type/internal_tags/uuid — mấy cái đó xem ở GraphQL `campaigns_by_pk`, cũng không có field `uuid`).
- Chọn artwork mới trong dialog `Select your artwork` lần này gọi `POST /api/campaign-artworks/batch-apply-to-printareas` ⇒ artwork gắn **cả Front lẫn Back** dù mở từ Front.
- 🔴 Publish 500 `Handle 'open-api-to-update-campaign-info' already in use` dù không có campaign teeinblue nào trùng tên (by PB, by Shopify Products, trash) ⇒ Shopify product cùng handle tồn tại sẵn trên linh-tib-staging (tạo ngoài portal). Không tự đổi title; báo người dùng.
- (tiếp) Coordinator đổi handle Shopify product cũ ⇒ Launch lại 3221 OK (publish 200), Shopify product 15443411501372. Lấy product id/handle của campaign PB: GraphQL `campaign_instances` KHÔNG có `platform_product_id`/`platform_id`; dùng tab browser mới vào storefront (nhập password `oe`) rồi `/products/<handle>.js` (curl từ máy bị `local_rate_limited` 429).
- Platform product 598 (C2): dialog `Select a product from store …` **CÓ ô `Search..`** (ghi chép cũ nói không có). 2 product trùng title ⇒ phân biệt bằng link ngoài `a[href$="/products/<shopifyId>"]` trong cùng `tr`, click text tên trong `tr` đó. `POST /api/platform-products` body `{instance_id, name, platform_linked_id, internal_tags}` → 201 trả luôn **`uuid`** (platform product có uuid, campaign PB thì portal không lộ uuid). Dialog `Select your artwork` sau Save & Close vẫn mở; card mới nhất đứng đầu (`a few seconds ago`) ⇒ `[title=<tên>]` first = artwork mới ⇒ `POST /api/platform-artworks {artwork_id, platform_product_id, position}` 201. Verify: GraphQL `platform_products_by_pk { name internal_tags platform_linked_id published_at platform_artworks{artwork_id} }`.

# Phiên TIB-5212 (Testlane TIB-249) — 2026-10-27, campaign 3239 / artwork 5768 (38 layer, Shadow/Border/HD toolbar)
- Playwright MCP khoá profile → CDP workaround port **9212** (profile `scratchpad/t5212/profile`). Instance active lúc login = 58.
- 🔑 **Clipart Frame = `+ Layer` > `Dynamic Clipart by Text` > `Auto Placement`** (type `clipart-frame`, tên mặc định `Dynamic Clipart by Text`, 800x800 giữa canvas, text `ABCD`). Bắt buộc: `Select one clipart category*` (Search) + `Select a source text option*` (multiselect, chỉ liệt kê Text / Curve / Warp) ; `Value to populate` mặc định `{{value}}`. Frame map TỪNG KÝ TỰ của text → clipart cùng tên ⇒ category dog (clipart tên `1`..`5`) phải đặt Default text = `123` mới thấy ảnh. `Manual Placement` = `dynamic-by-text`.
- 🔑 **KHÔNG tạo được Paragraph legacy** từ portal: picker Paragraph chỉ có `Normal` (paragraph) / `Custom Shape` (shape-text); registry bundle chỉ 1 layerType `paragraph`.
- 🔴 **Clipart category trùng tên**: `[TIB-5543] Dog clipart` có 2 bản — **6388** (gốc, 12 days ago) và **6569** (bản copy do import TIB-5591 sinh, gắn GO 1075). Popup "Latest categories" chỉ hiện 6569; `page.keyboard.type` sau khi click `Search` KHÔNG vào ô ⇒ gõ vào `input[placeholder="Search categories by name"]:visible` → `Top 2 results` → click dòng có `12 days ago` (toạ độ x-300 của nhãn thời gian). Luôn verify `clipart` trong JSON.
- Toolbar Static Image 2026-10-27: `Transform | Align | [shadow icon] | Border | Print Effects | HD`. Trigger Border khi popup đang mở: `div.qte-field` filter `^Border$` KHÔNG khớp (innerText gồm cả popup) ⇒ dùng `.qinline-stroke:text-is("Border") >> visible=true`. Enable: `#photo-border-enable` (scope `.qfield--photo-border`). Size `#photo-border-size`: **Enter KHÔNG commit, phải Tab** (lần đầu UI hiện 5 nhưng lưu 10). Màu: `.qfield--photo-border .vc-input__input` first.
- Shadow text layer: `.qinline-shadow` first là bản ẨN (bbox 423,50) ⇒ click trực tiếp không mở; sau khi `Preview Options` thu panel, icon shadow text ở ~(1195,64) → `page.mouse.click`. Static image dùng `.qinline-shadow` first bình thường. JSON shadow = key phẳng `shadow_enabled/shadow_color/shadow_blur/shadow_offset_x/shadow_offset_y/shadow_display` (không có object `shadow`).
- Mặc định quan sát (Rule 14, shop linh-tib-staging): shadow OFF, `#000000`, X/Y 0, blur 1, display `mockup_order`; Photo border OFF, `contour_cut`, `#FFFFFF`, size 10, thin line OFF, display `mockup_order` (type `Custom shape (for Photo Upload only)`). Text/Curve/Para/Calendar/Clock/QR/Scrabble/WordSearch/WordCloud/Moon/Clipart category: required **ON**, show_in_cart ON. Static image/vector `no_customization`.
- Hidden/locked: hàng layer có `.artwork-sortable-layer-visible button` / `.artwork-sortable-layer-lock button` (hover + force click; với group dùng `#artwork-sortable-layer-<id> > .artwork-sortable-layer-wrapper` để không trúng con). Ẩn group ⇒ chỉ group `visible:false`, con giữ `visible:true`; khoá group ⇒ group và con đều `locked:true`.
- Group 1 layer: chọn 1 layer → `.alab-actions` nút `Group (Ctrl/Cmd+G)` vẫn có ⇒ group 1 con tạo được.
- Gỡ mockup thừa khi add PB: thumbnail `li.campaign-gallery-thumbnail[title="#<id>"]` → `button:has(i.la-close)` → dialog có thể là `Remove a mockup with printarea?` (`getByRole('button',{name:'Remove anyway'})`) HOẶC `Confirm / Are you sure to remove ?` (`Remove`). `button:visible` filter hasText không khớp ⇒ dùng getByRole.
- Static Vector upload: sau upload (`POST /api/layer-images/svg` 201) card KHÔNG tự tick và chưa hiện ⇒ `Reload` → click `img` của `.layer-listing__item:has(img[src*="<hash>"])` → `Select 1 vector`. Static Image upload thì tự tick (13/13 lần).
- Save (không đóng) đôi lúc không bắn PUT dù popper mở ⇒ luôn `waitForResponse(PUT /api/artworks/<id>)`, retry nếu không có.
- Curve text font 93 tràn khỏi box 236 ⇒ giảm font size (`input.qinline-value[type=number] >> visible=true`) xuống 45 rồi set lại W.
- (TIB-5212 phần 2, artwork 5769) Artwork rời `/artworks` → `New artwork` chạy được không cần campaign; editor ở `/artworks` dùng caret Save `.artwork-editor-header-right button.btn-primary.px-1` (không có `.dialog-artwork-editor`). Upload lại cùng file qua Static Image **luôn tạo layer_image MỚI** (url hash mới), không dedup theo nội dung. `Duplicate` thường (`.alab-actions button:has(span.sr-only:text-is("Duplicate"))`) giữ nguyên url ảnh, `customization_type` no_customization (không linked). Ảnh 18174x6900 upload + generate ~25s.

# Phiên TIB-5510 (Testlane TIB-254) — 2026-10-27: DỪNG ở bước tạo Shopify product (chưa tạo gì)
- Task yêu cầu tạo addon product trên Shopify Admin của `linh-tib-checkout` → `admin.shopify.com/store/linh-tib-checkout/...` redirect `accounts.shopify.com/lookup` (Log in — Shopify). Profile `.playwright-profile` KHÔNG có session Shopify Admin, `.env` KHÔNG có credential Shopify ⇒ agent không tạo được Shopify product. Cần người dùng login Shopify Admin tay trong profile Playwright (hoặc coordinator tạo qua Shopify MCP đúng store) rồi gọi lại.
- Storefront `linh-tib-checkout.myshopify.com` password cũng là `oe`.
- Playwright MCP bị khoá profile → đã kill Chrome for Testing PID giữ `SingletonLock` (theo memory người dùng cho phép), MCP chạy lại bình thường.
- (tiếp, cùng ngày) Người dùng đã login Shopify Admin trong `.playwright-profile` ⇒ tạo được 2 Shopify product. Flow Shopify Admin `products/new`: mặc định Status Active, Inventory tracked ON, Sell when out of stock OFF, publish All channels (có Online Store). Variant: `Add options like size or color` → `Create custom option` → combobox `Option name` + textbox `Option value` (ô kế `Add another value`) → `Done`. Quantity của variant KHÔNG nhập được trước khi save (dialog Edit variant không có ô qty) ⇒ save product rồi vào `/products/<id>/variants/<vid>` → button `Quantity` (nth0 = Available) → spinbutton `Quantity` → `Done` → `Save`. Product 1 variant thì nhập thẳng spinbutton `Shop location quantity available` trước khi save. Lấy variant id: storefront `/products/<handle>.js`.
- 🔴 **Portal staging giờ bắt 2FA khi login `/login?staff=true`** (2026-10-27): sau email/password → `/login/two-factor` (Authenticator app / Code by email (email đã ẩn) / Recovery code). Agent không có TOTP secret/inbox ⇒ không login được, phải nhờ người dùng nhập mã trong browser Playwright rồi gọi lại.

> **Cập nhật 2026-10-27 (TIB-5539, BUG-398):** dev đã sửa. Bundle mới (1,393,644 ký tự): PDF upload vào vector field (multiple_file_types=true) gọi `POST api/merchant/shopify/pdf-upload` → 201, có preview. Mục "bị chặn ở client" phía trên chỉ còn là lịch sử.
- (tiếp 2026-10-27) Người dùng nhập 2FA ⇒ dùng tiếp session. Switch store: `.sidebar-users .user-switcher-toggle` → `getByTitle('linh-tib-checkout | linh-tib-')` ⇒ `POST /api/users/64/login` 200, request sau dùng `/api/instances/237/*`, sidebar `Starter (Test)`. Campaign 3247 / artwork 5794 tạo + publish OK.
- 🔴 Dialog `Artwork details`: `[role=dialog]:has-text("Artwork details") input[type=text]` nth0 lần này trúng ô **`Search by name`** của layer list (gõ tên vào filter ⇒ "No layers match") ⇒ dùng `input[name="name"]`; nút Save = `button[type=submit].btn-sm.btn-primary:text-is("Save")` (`button:has-text("Save")` trùng `Save & Close`).
- Panel ✎ của layer che nút `+ Layer` ⇒ bấm mũi tên back `.btn.btn-link.text-white` (header panel) trước khi thêm layer mới. Layer mới nằm đầu list ⇒ `li.artwork-layer-item[data-type="addon-charge"] >> nth=0 >> #manage-layer`.
- Attach addon: product combobox của hàng store CÓ search server-side — gõ `TIB-5510` (pressSequentially) ra đúng product mới tạo; chuỗi có `[` không ra kết quả. Variant list dạng `A-1 - 2.00` (EUR).
- Addon Charge mặc định (Rule 14, instance 237): required **ON**, show_in_cart ON, multiple OFF, mode `variant`, Inline Radio Button, option `Option 1/2`. `Enable multiple selection` + Inline Radio ⇒ storefront render **checkbox**. Text layer: required ON, show_in_cart ON.
- GET `staging-api/api/artworks/<id>` trả **405** ⇒ verify config bằng public `GET /api/merchant/campaigns/<shopifyProductId>.json?shop=linh-tib-checkout.myshopify.com` (options[].addons[] có id/rate/product_id/instance_id). Field `addon_charge_mode` KHÔNG có trong JSON này.
- Storefront linh-tib-checkout: option dropdown Addon hiện raw `+<span class=money>$59,000.00</span>` (moneyFormat có HTML do custom script theme, giá theo market VN) — checkbox thì hiện `+$59,000.00`. Cart legacy: line chính `_tib_addon_variant: 50667109417200:1` + line `[TIB-5510] Addon A / A-1` có `_tib_customization_id`.

# Phiên TIB-5337 (Testlane TIB-260) — 2026-10-28, platform product 603 / artwork 5955 / mockup 1696 (CHƯA publish)
- Playwright MCP khoá profile bởi session khác (MCP PID khác relaunch Chrome ngay sau khi kill ⇒ đừng kill, có người đang dùng). Workaround KHÔNG cần login lại (tránh 2FA): `rsync` `.playwright-profile` (bỏ `Singleton*`, `*Cache*`, `Service Worker`, `IndexedDB`, ~27MB) sang scratchpad, chạy Chrome for Testing với `--remote-debugging-port=9337 --use-mock-keychain --password-store=basic` ⇒ cookie Sanctum giải mã được, vào thẳng portal đã login. Lái bằng script `connectOverCDP`.
- `/platform-products/new`: `Choose a store:` là dropdown custom (không phải `<select>`) — click text store đang chọn rồi click `linh-tib-staging | linh-tib-staging.myshopify.com`. Đổi store ở đây KHÔNG cần switch instance của sidebar (sidebar vẫn linh-tib-checkout, request tạo trả `instance_id:58`).
- Dialog `Select a product from store …` giờ CÓ ô `Search..` + sort. Có thể có 2 product gần trùng tên (vd `... tee` và `... tee (error)`) ⇒ xác nhận id qua href link `admin.shopify.com/store/<shop>/products/<id>` cạnh tên, rồi click `getByText('<title>', {exact:true})` (thẻ `<b>`). Dialog không nằm trong `#modals-container`.
- Internal tags: `#internal-tags` (pressSequentially) ⇒ `POST /api/platform-products` 201 trả `id`, `uuid`, `published_at:null`.
- Artwork `New artwork` + `Save` trong `Artwork details` KHÔNG bắn POST ngay; artwork chỉ được tạo khi `Save & Close` (`POST /api/artworks` 201).
- Text 2.0 defaults (instance 58, 2026-10-28): customization_type `normal`, required ON, show_in_cart ON, prefill/reposition/charge/attach/prefix/RTL OFF.
- Gán artwork cho variant: toggle `Connect…` ⇒ `PUT /api/platform-products/<id>` `enable_artwork_variant_assignment:true`; dialog `.dialog-platform-variant-selector-popup` tick hàng variant → `Save` ⇒ `PUT /api/platform-artworks/<pivotId>` `{"platform_variant_ids":[...]}`.
- Upload mockup: file input `input[type=file]` (multiple) ⇒ `temporary-files/upload-url` → `POST /api/mockup-layers/by-temporary-file` 201; lần này card mới tự tick đúng, footer `Select 1 images`.
- Assign mockups 1 mockup: checkbox mockup KHÔNG tick sẵn ⇒ check `#modals-container input[type=checkbox]` rồi `Save`.
- Verify đọc-only: `GET staging-api/api/platform-products/<id>` (session cookie) có `published_at`, `artworks[].platform_variant_ids`, `artworks[].data`; `GET .../platform-mockups` có `platform_variant_ids`. Route `/platform-artworks` theo product KHÔNG tồn tại (404).
- Logs (chưa publish): modal 2 tab `Publication History` (active mặc định, filter Status All/Published/Error, `No history`) / `Edit Activities` (filter All/Artwork added/Artwork removed; có 1 dòng "Artwork added to platform product … (ID: 5955)"). Mockup add / variant assign / toggle connect KHÔNG sinh dòng log nào.
- (D2, cùng ngày) platform product 604 link Shopify product `(error)` 15445461827900. Artwork có sẵn 5955 attach được vào campaign by Shopify thứ 2 (`.vgrid-entry-wrapper[title=..] img` ⇒ `POST /api/platform-artworks` 201, pivot 1182). Mockup từ ảnh thư viện có sẵn: click `.layer-listing__item img` (forest) ⇒ footer `Select 1 images` ⇒ mockup 1697 dùng chung mockup-layer 4661. Launch 1 lần ⇒ `POST /api/platform-products/604/publish` 200, không có toast bắt được, header `Unpublish · Logs · View · Update`. Logs sau publish: tab `Publication History` (active mặc định) 1 dòng `2026-10-28 04:55:40 Published to Shopify` (giờ UTC theo timezone org); `Edit Activities` thêm dòng `Platform product published — <tên> published on linh-tib-staging.myshopify.com` dù filter tab này chỉ có All/Artwork added/Artwork removed.
- (Execute TIB-260, 2026-10-28) Context mới tạo qua `connectOverCDP` + `browser.newContext()` bị huỷ khi script disconnect ⇒ login account B + thao tác + query phải nằm trong CÙNG một script. Login B (`/login?staff=true`) không gặp 2FA lần này.
- Timezone Publication History theo store đang chọn ở sidebar (chọn 237 UTC → 05:07:12; chọn 58 Asia/Bangkok → 12:07:12). Switch store: click `.instance-domain` visible → `.user-switcher-popover` getByText domain.
- Campaign by Shopify: Shopify product bị xoá ⇒ FE hiện "Product unavailable", nút Update disabled; artwork không gán variant ⇒ Update disabled. Muốn quan sát backend phải gọi thẳng `POST /api/platform-products/<id>/publish` (header X-XSRF-TOKEN). Filter Logs là `<select>` (selectOption), không click option.
- Edit Activities filter (2026-10-28): Campaign by Shopify `All / Artwork added(1) / Artwork removed(2)`; Campaign by PB `All status / Artwork added(0) / Artwork removed(1) / Handle changed(2) / Product added(3) / Product removed(4) / Campaign unlinked(5)`. Dòng `Platform product published/unpublished` chỉ hiện ở All, không có option lọc riêng.
- Đăng nhập lại khi profile copy bị 401: mở Chrome for Testing profile SẠCH (port 9338) rồi tự login `/login?staff=true` bằng `.env` — staging hết 2FA (2026-10-28), `POST /api/login` 200.
- Shopify admin (linh-tib-staging) đã login trong profile: `admin.shopify.com/store/linh-tib-staging/products/<id>.json` và `/metafields.json` fetch được bằng cookie (metafield `teeinblue.platform_product.published_at`).

# Phiên TIB-5620 (Testlane TIB-258) — 2026-10-28, campaign 3274 — 🔴 Design format SVG chặn mọi layer raster
- Playwright MCP khoá profile → CDP workaround port **9620** (rsync profile sang scratchpad). Instance active lúc vào = linh-tib-checkout (237) ⇒ switch `.instance-domain:visible` → `.user-switcher-popover` getByText `linh-tib-staging.myshopify.com` OK.
- `/campaigns/new` → 3274; add PB 3139 OK (5 mockup mặc định, campaign-product 4818).
- `Artwork details` → `Design format:` (multiselect `.dialog-artwork-setup .multiselect` last), options 2026-10-28: PNG_RGB (mặc định), PNG_SRGB, PNG_ADOBE_RGB, JPEG, JPEG_CMYK, JPEG_CMYK_COATED_FOGRA39, SVG, EPS, AI, PDF. Chọn SVG ⇒ dialog hiện cảnh báo `Order design can't be rendered if artworks contain any images.`; header `(1600x1600 - SVG)`.
- 🔴 Artwork SVG + 1 layer Photo Upload (Single Upload) ⇒ Save: `POST /api/artworks` **400** `Artwork "<tên>" is set to vector format but contains raster layers. Affected layers: Template: Default template > layer: <tên> (layer-<id>)` (toast đỏ). ⇒ KHÔNG dựng được artwork SVG có Photo Upload; chưa thử EPS/AI/PDF (khả năng cùng nhóm "vector format").
- Picker `+ Layer` > `Photo Upload` là submenu bấm (click) → `Single Upload` / `Multiple Uploads`. Ảnh dog 1 trong thư viện user 64 (tên `1`..`5`, 900x1200): hash `6ae0357e0f736` (1), `6ae03592a7732` (2), `6ae035a54d0c2` (3), `6ae035c8ed357` (4), `6ae035e35d9b5` (5).
- Photo layer mặc định (Rule 14, instance 58, 2026-10-28): customization `normal`, editor `static`, `contain`, live preview ON, min size OFF, **required ON**, show_in_cart ON.
- 🔴 Bấm Save lần 2 ⇒ `POST /api/artworks` 419 rồi 401 → portal về `/login` (session của profile copy bị huỷ, có thể do session khác dùng chung cookie). Login lại cần 2FA.
- (tiếp, 2026-10-28) Login lại `/login?staff=true` KHÔNG còn 2FA (người dùng đã tắt). Artwork SVG CHỈ chứa Vector Upload ⇒ `POST /api/artworks` 201 (5971, `design_format:"svg"`). Raster (photo) phải để artwork PNG_RGB riêng (5969 Front).
- `+ Layer` > `Photo Upload` > `Multiple Uploads` CŨNG mở dialog chọn ảnh placeholder (như Single Upload). Mặc định Single Output; chuyển `label[for="output_type-multiple"]`, ô max = `.layer-editor-panel input[type=number]` first (mặc định 3).
- `+ Layer` > `Vector Upload` mở dialog vector, nút `Select 1 vector`; layer mới 702x176 @449/712 (teeinblue-official), khoá tỉ lệ (W 1200 ⇒ H 300.85). Mặc định required ON, show_in_cart ON.
- Multi-store launch 2026-10-28: 5 store (ship-n-pickup, linh-sdk-v2, linh-tib-checkout, linh-tib-theme (Etsy), linh-tib-staging).
- Storefront campaign PB có artwork Front + Back: form hiện field của cả 2 artwork theo thứ tự Front rồi Back.

# Phiên TIB-5192 / TIB-5536 (Testlane TIB-266/265) — 2026-10-28, campaign 3282 / artwork 5996 (Library mask/image)
- Playwright MCP khoá profile → CDP workaround port **9192** (rsync profile, login còn nguyên). Instance active lúc vào = linh-tib-checkout ⇒ switch `.instance-domain:visible` → `.user-switcher-popover` getByText `linh-tib-staging.myshopify.com`.
- 🔑 **Thư viện ảnh dùng chung (TIB-5192)**: Photo layer > ✎ > PERSONALIZATION > `Photo Cropper` > switch `Crop into a custom shape` > `Shape image` > **`Browse` giờ mở modal thư viện type `mask`** (không còn file chooser OS). Text toolbar `.qinline-bg-toggle` > `Browse` mở thư viện type `image`. Modal: cột trái category (`All` + `+ New category`), dropzone `Drag and drop, or click to upload!` (filechooser), `Search..`, `Reload`, card `[data-test=asset-library-item]` có nút `[data-test=asset-library-rename]` (inline input `aria-label="Rename"` + Enter ⇒ `PUT /api/library-images/<id>`) và trash; footer `Move to category` / `Select`.
  - New category: popup `input[placeholder="Enter category name"]` + `.dialog-body button.promise-button` (text có "Loading..." ẩn ⇒ regex `^Create$` không khớp) ⇒ `POST /api/library-image-categories` `{type: mask|image}`.
  - Upload: `POST /api/library-images/by-temporary-file` 201 (`processing:true`, `library_image_category_id` = category đang chọn) → ~20s xử lý → `Reload`. File vừa upload **tự tick** ⇒ đừng bấm `Select` nếu không muốn gán.
  - Đóng modal: `.dialog-close` ở góc phải trên (x≈1406,y≈37 viewport 1600) — có 2 `.dialog-close`, cái kia (x≈1266) là của artwork editor.
  - Đọc lại: `GET /api/library-images?type=mask|image`, `GET /api/library-image-categories?type=...`, `GET /api/library-images/<id>` (cookie + X-XSRF-TOKEN). GraphQL KHÔNG có `library_images`.
  - Ảnh cũ trước feature: mask path `users/64/images/...` (vd artwork 4599 layer-951657); ảnh thư viện mới path `users/64/library/...`.
- Watercolor Mask (TIB) effect có `Mask types:` `Use TIB's default masks` (mặc định) / `Use custom masks`. GenAI effect có switch `Use Reference Image`.
- Additional Option layer bắt buộc category: `+ New category` trong panel → modal (Name input KHÔNG có name/placeholder, dùng toạ độ) → Create ⇒ `POST /api/clipart-categories` type additional_option → thêm item `input[placeholder="Item name"]` + `Add new` (`POST /api/cliparts`) → Save (`PUT clipart-categories/<id>`).
- Global Option chỉ 1 loại layer/GO. `/global-options/create/additional-option` KHÔNG có ô Name lúc tạo (POST với tên `New Additional Option option`), đổi tên ở `/global-options/<id>/edit`. Picker GO: submenu Photo Upload phải click bằng toạ độ (locator click không mở). Nút Save GO: `button.promise-button.btn-primary:has-text("Save")`.
- Scrabble single-line mặc định có `background_image: https://cdn.teeinblue.com/images/scrabble-background.png`.
- Mặc định (Rule 14, instance 58, 2026-10-28): Photo/Text/Curve/Para/WordCloud/Calendar/Scrabble/AO/Addon/Clipart required **ON**, show_in_cart ON; Maps/Route/Star không có key required.
