# Archive — phần đã loại khỏi sổ tay flow

Nội dung dưới đây chép NGUYÊN VĂN từ `.claude/tib-portal-flows.md` (bản 3376 dòng, tách ngày 2026-10-31).
Mỗi khối ghi số dòng gốc, tiêu đề gốc và lý do loại. Không dùng làm hướng dẫn hiện hành.
Hướng dẫn hiện hành nằm ở các file khác trong `.claude/flows/` (xem `README.md`).

---

## [Gốc L82-83] Instance đang active — ghi chép cũ Basic - Picanova

> Lý do lưu trữ: Ghi chép cũ đã được chính file ghi là KHÔNG còn đúng.

> Ghi chép cũ nói instance là `Basic - Picanova` / `linh-boundless.com` — KHÔNG còn đúng.
> Agent phải đọc tên instance từ sidebar mỗi phiên thay vì tin ghi chép cũ.

---

## [Gốc L130-140] Bước 3 — Thêm product base — ĐÃ VERIFY 2026-08-25 (blocker preview_thumbnail ĐÃ HẾT)

> Lý do lưu trữ: Trạng thái 'ĐÃ HẾT' bị thay bởi lần tái phát 2026-10-23. Các bước đã chép sang campaign-product-base.md.

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

---

## [Gốc L331-335] Background image của text layer — Browse mở file chooser OS

> Lý do lưu trữ: Bị thay bởi 2026-10-16 (TIB-5575) và 2026-10-28 (TIB-5192): Browse giờ mở thư viện ảnh.

### Background image của text layer = ảnh fill (không phải màu nền)
`.qinline-bg-toggle` → `Default background image:` + input url + nút `Browse`.
`Browse` mở **file chooser của OS** (dùng `browser_file_upload`), KHÔNG phải asset library.
Upload `IMG_1790.jpeg` (4 MB) mất **~50 giây** — input vẫn rỗng và nút Browse còn spinner suốt lúc đó,
đừng tưởng treo. Xong thì input có value dạng `users/64/images/<...>_large.webp`.

---

## [Gốc L352-356] Thêm layer Vector / Clipart — chọn bằng checkbox

> Lý do lưu trữ: Bị thay bởi 2026-08-26 trở đi: checkbox không ăn, click img / thumbnail.

## Flow: Thêm layer Vector / Clipart — cạm bẫy validate (ĐÃ VERIFY 2026-08-25)
`+ Layer` → `Vector Category` / `Clipart Category ▸ 1 Clipart Category` → mở dialog grid ảnh.
- Chọn bằng **checkbox** `input.layer-listing__checkbox`, KHÔNG click vào tên (mở rename).
- Nút xác nhận có label động: `Select 1 vector` / `Select 1 image`.
- Escape đóng nguyên dialog và **không thêm layer nào**.

---

## [Gốc L384-384] Flow: Personalization fields — CHƯA VERIFY (bị chặn cùng lý do)

> Lý do lưu trữ: Mục rỗng, lý do chặn (preview_thumbnail 2026-08-23) đã hết; personalization đã verify ở các mục khác.

## Flow: Personalization fields — CHƯA VERIFY (bị chặn cùng lý do)

---

## [Gốc L386-424] Cạm bẫy đã biết / ĐÃ HẾT (2026-08-25): blocker không thêm được product base + Lịch sử lỗi 2026-08-23

> Lý do lưu trữ: Blocker ghi ĐÃ HẾT; lịch sử chi tiết. Lỗi tái phát 2026-10-23 được giữ ở trạng thái hiện hành trong campaign-product-base.md.

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

---

## [Gốc L627-635] Rule 10 — BLOCKER POPULATE VALUES không lưu + TC-TIB-820 gõ Value reset Source

> Lý do lưu trữ: Blocker đã hết (2026-08-26). Khuyến nghị 'set Value trước' bị thay bởi quan sát 2026-08-26 và 2026-10-13: chọn Source TRƯỚC.

- 🔴 **BLOCKER: cấu hình POPULATE VALUES KHÔNG lưu được qua `Save & Close`** (verify 2026-08-25,
  tái hiện 3 lần kể cả với click thật của Playwright). Bật `Populate Content` + set Source option
  + Value, verify đúng ngay trước khi Save, Save thành công không lỗi → mở lại thì **cả 4 toggle
  populate về OFF**, Source/Value biến mất. Layer thì vẫn persist, chỉ config populate bị drop im lặng.
  ⇒ **Chặn hoàn toàn nhóm P8**, kéo theo TC-TIB-007 / TC-TIB-009 tiếp tục blocked.
  Xem TC-TIB-819 và `test-results/evidence/tib-001-p8-populate-not-persisted.md`.
  Gặp lỗi này thì DỪNG, đừng retry mù — cần DEV xác nhận.
- **Trong POPULATE VALUES, gõ vào ô `Value` làm reset `Source option`** về "Select an option"
  (TC-TIB-820). ⇒ Set Value trước, chọn Source option sau, rồi verify lại CẢ HAI trước khi Save.

---

## [Gốc L738-742] POPULATE VALUES ĐÃ PERSIST (blocker 2026-08-25 KHÔNG còn tái hiện)

> Lý do lưu trữ: Ghi chú xác nhận blocker hết; nội dung hiện hành ở personalization-populate-conditional.md.

## ✅ POPULATE VALUES ĐÃ PERSIST (blocker 2026-08-25 KHÔNG còn tái hiện)
Verify 2026-08-26 trên artwork 3733: bật `Populate Font` + `Populate Color`, chọn source option,
Save → **reload full trang** → mở lại: cả 2 toggle vẫn ON, source option vẫn đúng.
⇒ Mục Rule 10 "BLOCKER: cấu hình POPULATE VALUES KHÔNG lưu được" đã hết hiệu lực với **Font/Color**.
(Chưa retest riêng `Populate Content` — nếu cần thì test lại trước khi kết luận.)

---

## [Gốc L804-809] Anomaly quan sát được 2026-08-26 — global_options not found

> Lý do lưu trữ: Không còn tái hiện từ 2026-08-26 (mục Song Search).

## Anomaly quan sát được 2026-08-26 (không chặn)
`ApolloError: field 'global_options' not found in type: 'query_root'` — bắn khi **mở section
`PERSONALIZATION SETTINGS`** (query đọc danh sách global option cho radio `Use an existing global option`).
Là lỗi **read-only**, không ảnh hưởng nhánh `Create a new option`; Save vẫn thành công và data vẫn persist.
Nếu QA cần test `Use an existing global option` thì nhánh đó khả năng đang hỏng trên staging.


---

## [Gốc L1047-1051] Nhánh Use an existing global option — CHẠY ĐƯỢC (anomaly cũ KHÔNG tái hiện)

> Lý do lưu trữ: Phần nhắc anomaly cũ. Selector hiện hành đã chép sang global-options.md.

### Nhánh `Use an existing global option` — ✅ CHẠY ĐƯỢC (anomaly cũ KHÔNG tái hiện)
Ghi chép cũ nói `ApolloError: field 'global_options' not found in type: 'query_root'` khi mở
`PERSONALIZATION SETTINGS`. **2026-08-26 KHÔNG còn tái hiện**: mở panel console sạch,
chọn radio `Use an existing global option` → hiện `Select a global option*:` (vue-multiselect)
→ list load đủ, chọn xong panel hiện `<tên global option>` + link `Edit` + `Option title: <...>`.

---

## [Gốc L1090-1094] POPULATE VALUES — Populate Content ĐÃ PERSIST (blocker hết hiệu lực hoàn toàn)

> Lý do lưu trữ: Ghi chú xác nhận blocker hết.

## ✅ POPULATE VALUES — `Populate Content` ĐÃ PERSIST (blocker 2026-08-25 hết hiệu lực hoàn toàn)
Verify 2026-08-26 trên artwork 3748, cả **Paragraph** (`Lyrics target`, value `{{lyrics}}`) lẫn
**Single-line Text** (`Song url target`, value `{{url}}`), source = layer Song Search `Song A - main`:
Save → **reload full trang** → toggle vẫn ON, Source option + Value còn nguyên.
⇒ Mục Rule 10 "BLOCKER: cấu hình POPULATE VALUES KHÔNG lưu được" **không còn đúng** cho Content/Font/Color.

---

## [Gốc L1224-1233] Giá trị mặc định quan sát được trên shop linh-tib-staging (2026-08-26)

> Lý do lưu trữ: Mặc định cũ, đã đổi nhiều lần (Rule 14). Xem shop-config-defaults.md.

## Giá trị mặc định quan sát được trên shop `linh-tib-staging` (Rule 14)

| Field | Mặc định |
|---|---|
| Radio personalization | `Create a new option` (`customization_type-normal`) — với mọi layer đã thử |
| `Show customization data on cart/checkout` | **OFF** (đã đổi config `default_value.show_in_cart` về false ở phiên TIB-030) |
| `Mark this option as required` | OFF |
| `Show customer's photo on live preview` (Photo Upload) | **ON** |
| `Set minimum size` (Photo Upload) | OFF |


---

## [Gốc L1398-1401] Text layer 2.0 — mặc định quan sát 2026-08-27

> Lý do lưu trữ: Mặc định cũ (Rule 14).

## Text layer 2.0 — mặc định quan sát 2026-08-27 (shop linh-tib-staging, Rule 14)
`Prefill default text` OFF · `Allow customers to reposition text` OFF · `Charge by Character count` OFF ·
`Mark this option as required` OFF · **`Show customization data on cart/checkout` OFF** ·
`Attach customer input for fulfillment` OFF. Radio = `Create a new option`.

---

## [Gốc L1495-1510] Giá trị mặc định quan sát 2026-08-27

> Lý do lưu trữ: Mặc định cũ (Rule 14). Kích thước/vị trí mặc định của từng loại layer đã chép sang các file layer.

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

---

## [Gốc L1634-1639] Rule 14 lại đổi: show_in_cart ON by default (2026-08-28)

> Lý do lưu trữ: Mặc định cũ (Rule 14).

## ⚠️ Rule 14 lại đổi: `Show customization data on cart/checkout` = ON by default (2026-08-28)
Trên shop `linh-tib-staging` phiên này, layer text mới tạo có toggle
`Show customization data on cart/checkout` **BẬT sẵn** (`vue-js-switch toggled`) — tức config
`default_value.show_in_cart` đã bị đổi lại về **true** so với các phiên TIB-030/040/047 (khi đó OFF).
⇒ Càng chứng minh Rule 14: đọc lại giá trị thật mỗi phiên, đừng tin ghi chép "mặc định OFF".
Các toggle khác vẫn OFF (Prefill, reposition, charge-by-char, required, attach-for-fulfillment).

---

## [Gốc L1680-1682] Xác nhận default trên shop linh-tib-staging phiên này (2026-08-28)

> Lý do lưu trữ: Mặc định cũ (Rule 14).

### Xác nhận default trên shop `linh-tib-staging` phiên này (Rule 14)
`Show customization data on cart/checkout` = **ON** by default cho các layer Paragraph/Song/JSON (khớp ghi chú 2026-08-28 ở trên).
Radio personalization mặc định `Create a new option` cho mọi layer. `Mark this option as required` = OFF.

---

## [Gốc L1785-1793] Storefront linh-tib-staging: locale de CHƯA publish (2026-09-09)

> Lý do lưu trữ: Danh sách locale bị thay bởi quan sát 2026-10-29. Nguyên tắc 'kiểm trên storefront' đã giữ ở dynamic-translations.md.

## Storefront `linh-tib-staging`: locale `de` CHƯA publish
Portal liệt kê German trong `Languages from ...`, nhưng storefront **không phục vụ được** `de`:
- `/de/...`, `/de-de/...`, `/de-vn/...`, `/en-de/...` đều **404**.
- Language switcher thật trên product page (`form[action*="localization"]` có `locale_code`)
  chỉ có **`en` + `vi`**; `DE/MX/US/VN` là **country**, không phải language.
- `Shopify.routes.root` = `/en-vn/`, `Shopify.locale` = `en`.
⇒ Muốn test nhánh `de` trên storefront phải vào Shopify admin publish tiếng Đức trước.
Danh sách language ở Portal đọc từ shop_locales (gồm cả locale chưa publish) ⇒ **không suy ra
được storefront có bật hay không**, phải kiểm trên chính storefront.

---

## [Gốc L1833-1846] Giá trị mặc định quan sát 2026-09-09

> Lý do lưu trữ: Mặc định cũ (Rule 14).

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

## [Gốc L1929-1941] Blocker tiềm ẩn: sản phẩm Shopify chưa publish lên kênh Online Store

> Lý do lưu trữ: Blocker của campaign 532 đã hết 2026-09-30. Cảnh báo chung còn giữ ngắn gọn ở campaign-by-shopify-products.md.

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

## [Gốc L1988-1996] Kết quả phiên này (TIB-5464)

> Lý do lưu trữ: Nhật ký phiên (data đã tạo).

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

## [Gốc L2082-2116] Kết quả phiên này (TIB-5482) + Cập nhật 2026-09-28 sửa giá x10.000

> Lý do lưu trữ: Nhật ký phiên (data đã tạo, bảng giá đã đổi). Quy trình sửa giá per-store còn hiệu lực ở layers-form-elements.md.

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


---

## [Gốc L2195-2209] Catalog Product Base rất lớn (464 sản phẩm) — tìm variant giá 0

> Lý do lưu trữ: Nhật ký tìm kiếm best-effort. Tóm tắt kết quả giữ ở product-base.md.

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

---

## [Gốc L2227-2273] Tìm campaign schema 1 + Kết quả phiên 2026-09-29 (TIB-5482)

> Lý do lưu trữ: Nhật ký phiên. Tóm tắt kết quả schema 1 giữ ở artwork-editor.md.

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

## [Gốc L2444-2448] Blocker Shopify product chưa lên Online Store của campaign 532 ĐÃ HẾT

> Lý do lưu trữ: Blocker đã hết.

## ✅ Blocker "Shopify product chưa lên Online Store" của campaign 532 ĐÃ HẾT (2026-09-30)
`https://linh-tib-staging.myshopify.com/products/let-users-customize-the-navigation-name-in-the-quick-navigation`
đã trả về **trang sản phẩm thật** (không còn 404): 2 variant `S` (54408740733244) / `M` (54408740766012),
product id `10489842860348`, form teeinblue render 2 field (`Text layer` × 2).
⇒ Mục "🔴 Blocker tiềm ẩn" ở flow by-Shopify-Products phía trên chỉ còn giá trị lịch sử cho campaign này.

---

## [Gốc L2496-2528] BLOCKER NGHIÊM TRỌNG: rate-limit 429 trên endpoint tạo layer-image (2026-10-01)

> Lý do lưu trữ: Bản đầy đủ của nhật ký 429. Tóm tắt hiện hành ở assets-library.md (chưa có ghi chép nào nói đã hết).

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

---

## [Gốc L2539-2567] RETRY 2026-10-01: 429 KHÔNG tự hồi phục

> Lý do lưu trữ: Bản đầy đủ của nhật ký retry. Tóm tắt hiện hành ở assets-library.md.

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

## [Gốc L2621-2629] PB 3332 / Campaign 2722 (TIB-5492)

> Lý do lưu trữ: Nhật ký phiên (data đã tạo).

PB 3332 (`QA-TIB-5492-20261001-description-metafield`) dùng flow rút gọn này: có description +
1 printarea (`Front` 1400x1400, id 14142) + 1 variant (`Black/M`, giá 10, TIB Variant ID 91570,
đã enable cho campaign 2722) — **không có mockup**, không artwork/layer, đúng theo yêu cầu case.

## Campaign 2722 — PB 3332 (chưa publish)
Title: `[UID] Publish Product Base description to a Shopify metafield` (đúng title issue TIB-5492).
Internal tags: `TIB-5492`. Trạng thái: `Unpublished` (draft, đúng yêu cầu — chưa publish).
Console sạch suốt toàn bộ phiên (create campaign → add product base → add printarea/variant →
enable variant cho campaign) — không có `[GraphQL error]`/`ApolloError` nào.

---

## [Gốc L2638-2638] Photo Upload — Mask: Browse mở OS file chooser (2026-10-05)

> Lý do lưu trữ: Bị thay bởi 2026-10-28 (TIB-5192): Browse mở modal thư viện type mask.

- Mask nằm ở panel ✎ > `PERSONALIZATION SETTINGS` > `Upload editor: Photo Cropper` > switch `Crop into a custom shape` (= masked_enable) > `Shape image` > `Browse` (là `label`, mở OS file chooser, dùng browser_file_upload; accept png/webp, yêu cầu PNG đen đặc, cùng tỉ lệ layer). Không có thư viện mask có sẵn. Upload -> masked_url dạng `users/64/images/<...>_large.webp`.

---

## [Gốc L2655-2655] Locale linh-tib-staging (2026-10-06)

> Lý do lưu trữ: Bị thay bởi quan sát 2026-10-29.

- Locale linh-tib-staging (2026-10-06): `en`, `vi`, `zh-TW`. Storefront `zh-TW` nằm ở `/zh-zh/` (không phải `/zh-tw/`, trả 404). Store đặt password storefront, cần nhập trước khi vào.

---

## [Gốc L2659-2659] Dynamic Translations — dropdown ngôn ngữ 2026-10-06

> Lý do lưu trữ: Danh sách ngôn ngữ bị thay bởi 2026-10-29.

- Dropdown ngôn ngữ là `<select class="form-control">`: `English`, `Vietnamese`, `Chinese (Traditional)` (= zh-TW), `German`. Chọn bằng `select.form-control` selectOption theo text.

---

## [Gốc L2702-2704] Mặc định Text layer 2026-10-08

> Lý do lưu trữ: Mặc định cũ (Rule 14).

## Mặc định Text layer 2026-10-08 (shop linh-tib-staging, Rule 14)
`Show customization data on cart/checkout` **ON** (khác ghi chép 2026-08-27 là OFF) · Prefill OFF ·
reposition OFF · Charge OFF · required OFF · Attach customer input for fulfillment OFF.

---

## [Gốc L2734-2735] Mặc định photo layer 2026-10-09

> Lý do lưu trữ: Mặc định cũ (Rule 14).

## Mặc định photo layer 2026-10-09 (Rule 14, shop linh-tib-staging)
Show customer's photo on live preview ON · Set minimum size OFF · required OFF · Show customization data on cart/checkout **ON** · Option Title rỗng · personalization `Create a new option`.

---

## [Gốc L2755-2755] Transform photo layer — clipart/static-photo/linked vẫn khoá (2026-10-09)

> Lý do lưu trữ: Phần 'clipart vẫn khoá' bị thay bởi 2026-10-16 (TIB-5587): clipart mở khoá được.

- Transform photo layer: icon khoá `.qtransform--fields i.la-lock` giữa Width/Height — click để mở khoá tỉ lệ (icon đỏ) rồi set W=H tuỳ ý. Clipart / static-photo / linked vẫn khoá.

---

## [Gốc L2784-2786] Publish → Published error (lỗi backend từ 2026-10-09)

> Lý do lưu trữ: Hết từ 2026-10-12 (TIB-5485: status 5, không còn Published error).

## 🔴 Publish → "Published error" (lỗi backend hệ thống từ 2026-10-09)
`POST /api/campaigns/<id>/publish` 200, Shopify product tạo được, storefront load OK, nhưng `campaign_instances.status = 2` và list hiện badge **`Published error`**. `campaign_instance_histories.message`:
`Call to undefined relationship [artworks] on model [App\Models\CampaignArtwork]` — xảy ra với MỌI campaign publish (2826 từ 2026-10-09 09:45 UTC, 2845). Không phải lỗi data; báo DEV, đừng retry.

---

## [Gốc L3140-3140] Dialog Select a product from store — không có ô search (2026-10-26)

> Lý do lưu trữ: Bị thay bởi 2026-10-26 (TIB-5545) và 2026-10-28: dialog CÓ ô Search.. Phần trạng thái Used đã chép sang campaign-by-shopify-products.md.

- Dialog `Select a product from store …`: cột Status = **`Used`** khi Shopify product đã gắn campaign teeinblue (kể cả product do campaign PB tạo), còn lại hiện status Shopify (`Active`/`Draft`/`Unlisted`). Không có ô search; phân trang `›` (~29 trang trên linh-tib-staging). Lọc ứng viên chưa dùng = status khác `Used`. Lấy variant bằng storefront `/products.json?limit=250&page=N` sau khi nhập password `oe` (curl từ máy bị Shopify trả `local_rate_limited` ⇒ fetch trong tab browser).

---

## [Gốc L3194-3198] PDF qua Vector Upload bị chặn ở client (2026-10-23)

> Lý do lưu trữ: Dev đã sửa 2026-10-27 (BUG-398).

## PDF qua Vector Upload bị chặn ở client (quan sát 2026-10-23, TIB-5539)
- Shop linh-tib-staging vẫn `multiple_file_types: true`, nhưng chọn PDF ở Vector Upload → "This file type is not supported. Please upload an image.", không có request nào.
- Bundle staging (1.744.103 byte): bước tiền xử lý dùng chung `handleSpecialFileType` → `yB()` ném lỗi với MIME bắt đầu bằng `video/` hoặc `application/` (`cB=["video/","application/"]`) → `application/pdf` bị chặn trước nhánh `isPdfFile → uploadPDF`.
- So với 2026-08-26 (TIB-5341): PDF vào `Your logo (vector)` → `pdf-upload` 201. Chưa có xác nhận dev đây là thay đổi chủ ý hay regression.
- Photo Upload storefront `accept="image/*"`: không có ghi chép nào về PDF đi qua Photo Upload.

---

## [Gốc L3261-3262] Phiên TIB-5510 — DỪNG ở bước tạo Shopify product

> Lý do lưu trữ: Nhật ký phiên; cùng ngày người dùng đã login Shopify Admin trong profile.

# Phiên TIB-5510 (Testlane TIB-254) — 2026-10-27: DỪNG ở bước tạo Shopify product (chưa tạo gì)
- Task yêu cầu tạo addon product trên Shopify Admin của `linh-tib-checkout` → `admin.shopify.com/store/linh-tib-checkout/...` redirect `accounts.shopify.com/lookup` (Log in — Shopify). Profile `.playwright-profile` KHÔNG có session Shopify Admin, `.env` KHÔNG có credential Shopify ⇒ agent không tạo được Shopify product. Cần người dùng login Shopify Admin tay trong profile Playwright (hoặc coordinator tạo qua Shopify MCP đúng store) rồi gọi lại.

---

## [Gốc L3266-3266] Portal staging bắt 2FA (2026-10-27)

> Lý do lưu trữ: 2FA đã tắt 2026-10-28.

- 🔴 **Portal staging giờ bắt 2FA khi login `/login?staff=true`** (2026-10-27): sau email/password → `/login/two-factor` (Authenticator app / Code by email `li***@gmail.com` / Recovery code). Agent không có TOTP secret/inbox ⇒ không login được, phải nhờ người dùng nhập mã trong browser Playwright rồi gọi lại.

---

## [Gốc L3304-3304] Save lần 2 ⇒ 419/401, login lại cần 2FA (2026-10-28)

> Lý do lưu trữ: Phần 2FA đã hết (tắt cùng ngày). Cảnh báo session profile copy bị huỷ còn giữ ở playwright-tooling.md.

- 🔴 Bấm Save lần 2 ⇒ `POST /api/artworks` 419 rồi 401 → portal về `/login` (session của profile copy bị huỷ, có thể do session khác dùng chung cookie). Login lại cần 2FA.

---

## [Gốc L1671-1674] Layer Additional Option — category KHÔNG bắt buộc (2026-08-28)

> Lý do lưu trữ: Mâu thuẫn với ghi nhận 2026-10-28 (TIB-5192): 'Additional Option layer bắt buộc category'. Giữ bản mới.

### Layer `Additional Option` (data-type `additional-option`) = dropdown/radio từ category
Panel có `Option Title` + `Select additional options category:` (treeselect, **KHÔNG bắt buộc** — không có `*`).
Trên staging có sẵn các category để tái dùng: `dropdown`, `dropdown + thumbnail`, `radio`, `inline button`,
`number`, `thumbnail`, `photo upload`, `Number - additional option`, ... ⇒ chọn `dropdown` để có field dropdown thật.

---

## [Gốc L1175-1191] Layer picker — submenu bổ sung (2026-08-26)

> Lý do lưu trữ: Nội dung đã gộp vào bảng picker trong artwork-editor.md; giữ nguyên văn vì có chi tiết tên layer mặc định theo phiên.

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

---

## [Gốc L2760-2760] Sự cố staging API 500 2026-10-09 (Filament PanelProvider) + job nền không chạy

> Lý do lưu trữ: Sự cố một lần (nhật ký). Hệ quả 'sync 400 Artwork missing URL' giữ ở publish-sync.md.

- 🔴 2026-10-09 07:50–08:04 UTC staging API trả 500 toàn bộ (`Class "Filament\PanelProvider" not found`), preflight CORS fail ⇒ UI toast "Network Error". Sau khi API hồi phục, **job nền không chạy**: clipart mới `url:null` mãi, artwork mới `url/thumbnail:null` ⇒ `POST /api/campaigns/<id>/sync` 400 `Artwork missing URL. Please regenerate those artworks: <tên>`. Không có nút "Regenerate" trong editor (dropdown chỉ `Save`). Storefront SDK vẫn đọc live API nên form + preview mockup đã hiện artwork mới dù sync fail.

---

## [Gốc L3046-3046] ImagenHub AI Effect — danh sách 4 template 2026-10-16

> Lý do lưu trữ: Danh sách template bị thay bởi danh sách 2026-10-26 (layers-image-photo.md).

- `[ImagenHub] AI Effect`: `Select template` mở modal **Select Template** (4 template 2026-10-16: `TIB - gen AI 2 - GPT-image-1.5` (openai/gpt-image-1.5/edit), `TIB - gen AI 2 - GPT-image-2`, `T2I - tib`, `T2I` (flux-2-pro)). Click TÊN template (`getByText(name,{exact:true})`) — click ngoài modal là đóng. Chọn xong hiện `Template prompt` (prompt của template, read-only fill sẵn) + switch `Use Template Default Size`. JSON `imagenhub_template:{id,available_variables}`.
