# Rule: Shopify UI Extension / Checkout App Blocks (teeinblue)

## Khi nào áp dụng
Issue nhắc tới: `checkout-ui-extensions`, `ui-extensions`, app block ở Checkout / Thank You / Order Status,
Preact ↔ React migration, bump `api_version` trong `shopify.extension.toml`, Polaris **web components**,
Customer Account page, hoặc 3 extension của teeinblue:
`customization-image-preview`, `digital-download`, `edit-customization`.

Reference doc đầy đủ về hành vi sản phẩm: `docs/checkout-extensions-app-blocks.md` trong repo
`teeinblue-manual`. Rule này là bản rút gọn dành cho phân tích yêu cầu.

---

## PHẦN A — Product knowledge đã xác nhận

> Xác nhận từ team 27/08/2026. Đây là **fact**, không phải assumption — dùng trực tiếp khi phân tích.

### A1. Ma trận surface × extension (⚠️ không đối xứng)

| Extension | Checkout page | Thank You page | Order Status page |
|---|:---:|:---:|:---:|
| Customization Image Preview | ✅ | ✅ | ✅ |
| Edit Customization | ❌ | ✅ | ✅ |
| Digital Download | ❌ | ✅ | ✅ |
| **Shopify plan yêu cầu** | ⚠️ **Plus** | Mọi plan | Mọi plan |

**Checkout page CHỈ support Customization Image Preview.** Đây là lỗi nhận định phổ biến nhất —
đừng viết requirement/test case cho Edit Customization hay Digital Download trên Checkout page.
Lý do nghiệp vụ: Edit Customization **chỉ tồn tại sau khi đã đặt hàng**; trên Checkout đơn chưa tồn tại.

Merchant tự thêm từng extension vào trang dưới dạng **app block** (checkout editor).

### A1a. ⚠️ Checkout page yêu cầu Shopify **Plus**

- Add app block vào **Checkout page** → **bắt buộc store Shopify Plus**.
- **Thank You page** và **Order Status page** → **không require plan**, mọi store đều add được.

> ⚠️ Đây là **giới hạn nền tảng Shopify**, **không phải logic app**. App không kiểm soát việc này.
> → **Không viết test case** cho "non-Plus không add được app block" — ngoài phạm vi test của app.

Hệ quả duy nhất: đây là **precondition môi trường**, không phải test point.
- Không có store Plus thì không dựng được setup để test Checkout page → xác nhận môi trường trước.
- Phần lớn coverage (Thank You + Order Status, cả 3 extension) chạy được trên dev store thường
  → ưu tiên làm trước, phần Checkout tách riêng theo điều kiện môi trường.

### A1c. ⚠️ Preview trong editor KHÔNG có data teeinblue

Theme/checkout editor preview chỉ render placeholder — không có line item attributes thật.
Extension luôn trông như không hoạt động ở đó, kể cả khi chạy đúng.

> Luồng verify đúng: **sửa trong editor → Save → đặt order THẬT trên storefront → kiểm tra trên
> Thank You / Order Status thật**. Mọi test case phải ghi precondition này.

Không viết test case dựa trên preview, và không log bug khi extension vắng mặt trong preview.

### A1b. ⚠️ Shopify dùng chung một bộ UI — quyết định scope regression

Shopify dùng **chung một bộ UI** cho toàn bộ extension. Khi có update lớp UI/runtime
(migrate Preact, bump `api_version`, chuyển Polaris web components…):

> **TẤT CẢ extension trên TẤT CẢ các trang đều bị ảnh hưởng đồng loạt**,
> **không liên quan** đến việc merchant add app block ở trang nào.

Hệ quả khi phân tích yêu cầu:
- **Không** được thu hẹp scope theo trang hay theo extension. Regression scope mặc định = **toàn bộ
  ma trận A1** (3 extension × các trang chúng được support).
- Ma trận A1 là **logic nghiệp vụ của app block**, độc lập với lớp UI dùng chung.
  Update UI **không** làm đổi ma trận này → nếu sau update mà ma trận đổi, đó là **bug hoặc scope creep**,
  phải hỏi lại dev.

### A2. Customization Image Preview
- 3 chế độ preview: **popup (default)**, **popover**, **expansible**.
- Hỗ trợ **cả 2** loại campaign: **by Product base** và **by Shopify**.
- App block config: sửa **button label**, **translate** label.

### A3. Edit Customization
- **Chỉ tồn tại sau khi đặt hàng** (order đã được tạo) → đó là lý do không có trên Checkout page.
- **Edit xong sẽ GHI ĐÈ artwork** — không tạo bản mới, không giữ lịch sử version.
  ⚠️ Rủi ro nghiệp vụ: đơn đã gửi production có thể in ra file khác với artwork đang lưu.
- Chỉ **edit được** với campaign **by Shopify**.
- Với campaign **by Product base**: link **vẫn hiển thị** (đúng thiết kế), click → sang trang customize →
  hiện message `Your design does not support edit for now, contact shop owner`.
- Redirect URL:
  `https://customize.teeinblue.com/customize?customization-id=xxx&product-id=yyy&shop=zzz`
- ⚠️ **Trên staging host vẫn là production** → mở thẳng sẽ 404. **Chấp nhận được, không log bug.**
  QA tự đổi sang `https://staging-sdk.teeinblue.com/customize/?...` (giữ nguyên query string) rồi verify.
- App block config: **label** (trống → default `Customization edit link`), **translate label**,
  **button style** (`Underline`/`Outline`/`Primary`).
  ⚠️ **button size và button emphasis đã bị bỏ** (dev xác nhận 28/08/2026) — Shopify không còn support
  style `large`, thay bằng khái niệm *button appearance* (`normal`/`small`/`strong`/`emphasis`).
  Panel chỉ còn 3 setting. Tài liệu yêu cầu nào còn mô tả size/emphasis là đã lỗi thời.

### A4. Digital Download
- **Prerequisite**: merchant phải tạo **addon charge layer** có **title chứa `"digital"`**,
  **custom name** tự đặt, **custom values chứa `"yes"`**.
- App block phải nhập lại đúng **custom name** + **custom values** đó.
  Để trống → default `digital` / `yes`.
- Hiển thị dạng **button** → click → redirect sang **design link của teeinblue**.
  **Không yêu cầu đăng nhập** — chỉ mở link. Đây là thiết kế có chủ đích, không log bug security.
- **Design render lâu là hành vi đã biết** — mở link phải đợi một lúc file mới hiện. Không phải bug.

---

## PHẦN B — Rule cho issue dạng migration / upgrade platform

### Bản chất rủi ro
Migration do Shopify ép (vd React→Preact, bump api_version) là **platform-forced**, không phải feature mới.
Hành vi nghiệp vụ *không đổi*, nhưng runtime, rendering layer và data-access API đổi hoàn toàn
→ rủi ro nằm ở **regression thầm lặng** (extension không render, render rỗng, sai style, data `undefined`),
không ở logic mới. Thường **không có AC** dạng "khi X thì Y" → QA phải tự dựng baseline từ production.

### Nội dung mandate gốc của Shopify (email 20/07/2026) — dùng làm chuẩn

| Điểm | Thực tế theo email |
|---|---|
| **Version tối thiểu** | **2026-01 hoặc mới hơn** — KHÔNG phải một version cụ thể nào |
| **Deadline** | 01/10/2026 |
| **Nguyên nhân** | Mọi surface chuyển sang **Polaris web components**, thay lớp React component cũ |
| **Đối tượng** | Extension đang chạy **API version 2025-07 trở về trước** |
| **Hậu quả nếu trễ hạn** | ⚠️ Extension **VẪN CHẠY BÌNH THƯỜNG**. Chỉ **Shopify CLI chặn deploy app version mới** cho tới khi mọi UI extension của app lên ≥ 2026-01 |

⚠️ **Đừng đánh giá quá nặng rủi ro trễ hạn.** Đây **không** phải sự cố runtime: buyer không bị ảnh hưởng,
merchant không mất tính năng. Rủi ro thật là **team bị khoá khả năng ship bất kỳ thay đổi nào khác**
của app cho tới khi upgrade xong. Rủi ro tiến độ/kỹ thuật, không phải rủi ro doanh thu.

Email đếm extension **theo surface**: "3 checkout extensions and 3 customer account extensions" với
teeinblue là **cùng 3 extension handle đăng ký trên 2 surface**, không phải 6 extension riêng biệt.
Kiểm chứng bằng network log: cùng bundle URL phục vụ cả checkout sandbox lẫn `customer-account-web`.

Email cũng khuyến nghị đọc performance guide cho checkout và customer account UI extensions.

### Requirement cần kiểm tra / hỏi rõ
- Danh sách extension bị ảnh hưởng + **target** (extension point) từng cái, **trước và sau** upgrade.
- API version đích và version cũ. **Bar tối thiểu là 2026-01**; đi cao hơn (vd 2026-07) là được, nhưng
  AC phải viết là `>= 2026-01` chứ không chốt cứng một con số.
- Extension nào **mới xuất hiện** trên surface nào (surface mới = test toàn bộ, không phải regression).
- Có thay đổi scopes / app config / deployment version không (deploy extension = tạo app version mới;
  merchant phải approve nếu scope đổi).
- Backward compat với **đơn hàng cũ** (line item attributes format cũ).

---

## PHẦN C — Impacted areas mặc định

- **Checkout page**: information → shipping → payment; extension phải sống qua cả 3 step và qua reload.
- **Thank You page** và **Order Status page**.
- **Customer Account**: New customer accounts vs Classic/legacy — hai hệ khác nhau, test riêng.
- **Line item attributes / cart attributes** là nguồn dữ liệu chính → mọi thay đổi cách đọc attributes
  đều ảnh hưởng cả 3 extension.
- **Campaign type**: mọi test phải phủ **cả by Product base và by Shopify** — hành vi Edit Customization
  khác nhau giữa hai loại (xem A3).
- **Addon charge layer** (cho Digital Download) — thuộc campaign setup, không thuộc extension.
- Draft order / order tạo bằng API, order nhiều line item, order mix personalized + normal item.
- Mobile Shop app checkout & responsive checkout.
- Checkout branding / style settings của merchant → ảnh hưởng render Polaris web components.
- Multi-language store (label translate).

---

## PHẦN D — Risks đặc thù

1. **Silent no-render**: extension lỗi runtime → Shopify ẩn luôn block, không báo lỗi.
   Phải kiểm tra bằng mắt **+ console**, không tin "trang load OK".
2. **Data `undefined` ở Order Status**: API surface ở order status khác checkout (không có `cartLine`).
   Hook đọc sai → button hiện nhưng bấm không ra gì, hoặc preview hỏng ảnh.
3. **Polaris web component style drift**: button variant render khác React component cũ → lệch UI dù đúng chức năng.
4. **Version pinning**: TOML bump version nhưng code còn dùng API cũ → build pass, runtime fail.
5. **Digital Download không cần auth** — đã xác nhận là thiết kế có chủ đích, **không log bug security**.
   Nhưng vẫn verify link không lộ dữ liệu của **đơn/khách khác** (xem [[access-control-idor]]).
6. **Edit Customization GHI ĐÈ artwork sau khi đã đặt hàng** — rủi ro nghiệp vụ **cao nhất** của cụm này:
   artwork đem in ở production có thể lệch với artwork đang lưu. Test kỹ theo trạng thái fulfillment.
7. **Digital Download mismatch config**: custom name/values ở app block khác addon charge layer → button
   không hiện. Dễ bị QA log nhầm thành bug của extension.
8. **Thiếu store Plus → không dựng được setup cho Checkout page**. Thuần rủi ro **tiến độ/môi trường**,
   không phải rủi ro sản phẩm. Phát hiện sớm để không sát deadline mới biết chưa có store.
9. **False positive trên campaign by Product base**: thấy link Edit Customization hiện → tưởng bug.
   Đúng thiết kế; phải verify **message**, không phải verify link bị ẩn.

---

## PHẦN E — Open questions

### Đã có đáp án (không hỏi lại)
| Câu hỏi | Đáp án đã xác nhận |
|---|---|
| Update UI ảnh hưởng phạm vi nào? | Shopify dùng chung bộ UI → **toàn bộ extension, toàn bộ trang**, không phụ thuộc app block |
| Edit Customization có ghi đè artwork không? | **Có**, ghi đè hoàn toàn |
| Edit Customization có ở Checkout không? | **Không** — chỉ tồn tại sau khi đặt hàng |
| Digital Download có cần đăng nhập không? | **Không** — chỉ mở link |
| Checkout page có thêm Edit Customization / Digital Download không? | **Không** |

### Vẫn cần hỏi
- Extension có phải hoạt động trên **cả** Classic customer accounts lẫn New customer accounts?
- Edit Customization có bị chặn theo **trạng thái fulfillment** không (unfulfilled/fulfilled/cancelled)?
  → Vì đã xác nhận là ghi đè, câu này thành **rủi ro nghiệp vụ**, không chỉ là edge case.
- Sau khi ghi đè artwork, có notify merchant / có log lại artwork cũ ở đâu không?
- Có cần backward-compat cho các đơn hàng **cũ** (attributes format cũ) không?
- Store chưa upgrade checkout extensibility có còn được hỗ trợ không?

---

## PHẦN F — Suggested test focus

- **Baseline-vs-after**: chụp lại hành vi extension trước migration, so từng điểm.
- **Quét toàn bộ ma trận** khi issue là update UI — vì bộ UI dùng chung (A1b), không được thu hẹp scope.
- **Ma trận surface × extension** (A1) — verify cả trường hợp **không được phép hiện** trên Checkout page.
- **Precondition môi trường** (không phải test point): cần store **Shopify Plus** mới dựng được setup
  Checkout page; nhóm Thank You / Order Status chạy trên store thường.
- **Edit Customization ghi đè artwork**: verify artwork mới thay artwork cũ (không tạo bản song song);
  test ở nhiều trạng thái fulfillment; đối chiếu artwork ở portal vs design link sau khi ghi đè.
- **Digital Download không auth**: verify mở link ở incognito / session khác vẫn ra file (đúng thiết kế),
  đồng thời verify không truy cập được file của **đơn khác**.
- **Campaign matrix**: mỗi extension × by Product base × by Shopify.
- Customization Image Preview: cả 3 mode popup / popover / expansible.
- Edit Customization: verify đủ 3 query param trong redirect URL, đúng giá trị của **chính** line item đó
  (đơn nhiều sản phẩm dễ lấy nhầm); verify message với campaign by Product base.
- Digital Download: setup đúng → hiện button; setup sai/mismatch → không hiện; để trống app block → dùng
  default `digital`/`yes`; chờ đủ lâu cho design render trước khi kết luận lỗi.
- App block config: label, translate (ngôn ngữ non-English, ký tự có dấu), button style/size/emphasis.
- Negative: item không personalization, order chỉ có sản phẩm thường, attribute thiếu/rỗng, ảnh preview 404.
- Multi-line-item order, quantity > 1, mix personalized + non-personalized.
- Guest checkout vs logged-in customer.
- Console error / network 4xx-5xx trong lúc extension render.
- Cross-device: desktop, mobile web, Shop app.
