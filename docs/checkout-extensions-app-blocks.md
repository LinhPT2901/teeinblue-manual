# TeeInBlue — Checkout / Thank You / Order Status App Blocks (UI Extensions)

> Reference doc cho QA. Mô tả **hành vi sản phẩm đã xác nhận** của 3 UI extension mà merchant thêm
> vào checkout flow dưới dạng **app block**.
> Nguồn: xác nhận từ team (27/08/2026) trong quá trình phân tích [TIB-5215](https://ownego.atlassian.net/browse/TIB-5215).
> Rule QA đi kèm: `~/.claude/skills/qa-requirement-analysis/rules/shopify-ui-extension-upgrade.md`

---

## 1. Tổng quan

Merchant tự thêm app block vào 3 trang trong checkout flow qua Shopify checkout editor.
**Không phải extension nào cũng available trên mọi trang.**

### Ma trận surface × extension

| Extension | Checkout page | Thank You page | Order Status page |
|---|:---:|:---:|:---:|
| **Customization Image Preview** | ✅ | ✅ | ✅ |
| **Edit Customization** | ❌ | ✅ | ✅ |
| **Digital Download** | ❌ | ✅ | ✅ |
| **Shopify plan yêu cầu** | ⚠️ **Plus** | Mọi plan | Mọi plan |

> ⚠️ Điểm QA hay sai: **Checkout page chỉ support Customization Image Preview.**
> Edit Customization và Digital Download **không** có trên Checkout page.
> Lý do nghiệp vụ: Edit Customization **chỉ tồn tại sau khi đã đặt hàng** — trên Checkout thì đơn chưa
> tồn tại nên không có gì để edit.

### ⚠️ Checkout page yêu cầu Shopify **Plus**

| Trang | Yêu cầu plan | Ghi chú |
|---|---|---|
| **Checkout page** | **Shopify Plus** | Chỉ store Plus mới add được app block vào Checkout |
| **Thank You page** | Mọi plan | Không require plan |
| **Order Status page** | Mọi plan | Không require plan |

> ⚠️ Đây là **giới hạn nền tảng của Shopify**, **không phải logic của app**.
> App không kiểm soát và không chịu trách nhiệm về việc merchant có add được app block hay không.
> → **Không viết test case** cho việc "non-Plus store không add được app block". Đó không phải phạm vi test.

Hệ quả duy nhất với QA: đây là **precondition môi trường**.

- Muốn chạm tới **Customization Image Preview trên Checkout page** thì cần **store Shopify Plus** —
  đơn giản vì không có Plus thì không add được block để mà test.
- **Thank You / Order Status** không require plan → phần lớn coverage của cả 3 extension chạy được trên
  dev store thường.
- Xác nhận môi trường có store Plus trước khi lên lịch phần Checkout page.

---

### ⚠️ Preview trong editor KHÔNG có data teeinblue

Preview bên trong **theme editor / checkout editor** chỉ render placeholder, không có line item
attributes thật (customization id, design URL) mà extension đọc. Ví dụ ở checkout editor nó hiện:

> `"Preview design" button will show up here when an item contains a customization`

Vì vậy extension **luôn trông như không hoạt động** trong preview, kể cả khi chạy đúng hoàn toàn.

**Luồng verify đúng:**

```
Chỉnh sửa trong editor → Save → đặt order THẬT trên storefront
→ kiểm tra trên Thank You page / Order Status page thật
```

> ❌ Không bao giờ kết luận extension hỏng dựa trên preview trong editor.
> ✅ Mọi test case của 3 extension phải ghi precondition là verify trên **storefront thật**.

---

### ⚠️ Shopify dùng chung một bộ UI cho mọi extension

Shopify dùng **chung một bộ UI** cho toàn bộ extension. Hệ quả với QA:

> Khi có update phần UI/runtime (vd migrate Preact, bump `api_version`, đổi sang Polaris web components),
> **TẤT CẢ extension trên TẤT CẢ các trang đều bị ảnh hưởng đồng loạt** —
> **không liên quan** đến việc merchant add app block ở trang nào.

- Không thể coi "chỉ update extension X" hay "chỉ ảnh hưởng trang Y". Scope regression luôn là **toàn bộ**.
- Ngược lại, ma trận surface ở trên là **logic nghiệp vụ của app block**, độc lập với lớp UI dùng chung.
  Update UI **không** làm thay đổi ma trận này.

---

## 2. Customization Image Preview

Cho buyer xem lại ảnh thiết kế đã cá nhân hoá của line item.

### Chế độ hiển thị (3 kiểu)

| Mode | Ghi chú |
|---|---|
| **Popup** | **Default** |
| **Popover** | |
| **Expansible** | Mở rộng inline |

### Loại campaign được hỗ trợ

| Campaign type | Hỗ trợ |
|---|:---:|
| Campaign by **Product base** | ✅ |
| Campaign by **Shopify** | ✅ |

→ Cả 2 loại campaign đều work bình thường với extension này.

### Cấu hình trong app block

- Sửa **button label**
- **Translate** label

### Surface

Checkout page · Thank You page · Order Status page.

---

## 3. Edit Customization

Cho buyer quay lại chỉnh sửa thiết kế sau khi đã đặt hàng.

### Surface

Thank You page · Order Status page. **Không có trên Checkout page.**

### Quy tắc nghiệp vụ cốt lõi

| Rule | Nội dung |
|---|---|
| **Chỉ sau khi đặt hàng** | Edit Customization **chỉ tồn tại sau khi order đã được tạo**. Đây là lý do nó không có mặt trên Checkout page. |
| **Ghi đè artwork** | Buyer sửa xong thì **artwork cũ bị GHI ĐÈ** — không tạo bản mới, không giữ lịch sử. |

> ⚠️ **Rủi ro nghiệp vụ đã xác nhận**: vì artwork bị ghi đè sau khi đơn đã đặt, nếu đơn đã được gửi đi
> production/fulfillment thì file thực tế đem in có thể **khác** với artwork đang lưu trong hệ thống.
> QA cần test kỹ: edit ở các trạng thái fulfillment khác nhau và verify artwork sau khi ghi đè.

### Hành vi theo loại campaign — ⚠️ khác nhau

| Campaign type | Button/link hiển thị | Kết quả khi click |
|---|:---:|---|
| Campaign by **Shopify** | ✅ Có | Redirect sang trang customize, **edit được bình thường** |
| Campaign by **Product base** | ✅ **Vẫn hiện** | Redirect sang trang customize nhưng hiện message:<br>`Your design does not support edit for now, contact shop owner` |

> ⚠️ Điểm QA quan trọng: link **vẫn hiện** với campaign by Product base — đây là **hành vi đúng theo thiết kế**,
> không phải bug. Bug là khi link **không** hiện, hoặc khi click ra message sai / trang trắng.

### Redirect URL

```
https://customize.teeinblue.com/customize?customization-id=xxx&product-id=yyy&shop=zzz
```

Query params bắt buộc:

| Param | Ý nghĩa |
|---|---|
| `customization-id` | ID bản customization của line item |
| `product-id` | ID sản phẩm |
| `shop` | Shop domain |

### ⚠️ Trên staging: host trong link là production — đây là hành vi chấp nhận được

Extension luôn sinh link với host **production** `customize.teeinblue.com`, kể cả khi store đang chạy
SDK staging. Mở thẳng link đó trên staging sẽ ra **404** vì production không có customization của staging.

> **Không log bug.** Đây là hành vi được chấp nhận trên staging.

Quy ước QA khi verify trên staging — tự đổi host, giữ nguyên query string:

```
Extension sinh ra:  https://customize.teeinblue.com/customize?customization-id=…&product-id=…&shop=…
QA đổi thành:       https://staging-sdk.teeinblue.com/customize/?customization-id=…&product-id=…&shop=…
```

Nhận biết store đang ở môi trường nào: xem script SDK trên storefront —
`staging-sdk.teeinblue.com` là staging, `sdk.teeinblue.com` là production.

### Cấu hình trong app block

- Sửa **label** (để trống → default `Customization edit link`)
- **Translate** label — format `language_code: text`, vd `en: Customization edit link, de: Link bearbeiten`
- **Button style**: `Underline` · `Outline` · `Primary`

- **Button appearance**: `Normal` · `Small` · `Strong` · `Emphasis`

> ⚠️ **Button size và Button emphasis (cũ) đã bị BỎ** (xác nhận với dev 28/08/2026).
> Shopify không còn support style `large`, nên 2 nhóm đó được thay bằng **Button appearance**.
> Panel hiện có **4 setting**: Button label · Translations · Button style · Button appearance.
> Đừng viết test case cho size (small/normal/medium/large) hay emphasis (Italic/Normal/Bold) cũ.

#### CSS thực đo của Button style (đo 28/08/2026, appearance = Normal)

| Property | Underline | Outline | Primary |
|---|---|---|---|
| `color` | `rgb(0,91,209)` | `rgb(0,91,209)` | `rgb(255,255,255)` |
| `background-color` | transparent | transparent | `rgb(0,91,209)` |
| `border-width/style` | `0px / none` | `0px / none` | `0px / none` |
| `box-shadow` | `none` | `rgb(223,223,223) 0 0 0 1px inset` | `none` |
| `border-radius` | `1.88906px` | `12px` | `12px` |
| `text-decoration-line` | **`underline`** | `none` | `none` |
| `font-weight` | `400` | `600` | `600` |
| `padding` | `0px` | `14px` | `14px` |
| markup con | text thuần | `<span>` | `<span>` |

> ⚠️ **Outline vẽ viền bằng `box-shadow`, KHÔNG phải `border`.** Cả 3 variant đều có
> `border-width: 0px`. Nếu chỉ kiểm tra `border` sẽ kết luận nhầm là Outline mất viền.

#### Button appearance đổi element con, không đổi khung

| Appearance | Markup con | font-size | font-weight | font-style |
|---|---|---|---|---|
| `Normal` | `<span>` | 14px | 600 | normal |
| `Small` | `<span>` > `<small>` | **12px** | 600 | normal |
| `Strong` | `<span>` > `<strong>` | 14px | 600 | normal |
| `Emphasis` | `<span>` > `<em>` | 14px | 600 | **italic** |

Khung ngoài (`padding: 14px`, `border-radius: 12px`, `box-shadow`, `line-height: 18.9px`)
**không đổi** theo appearance — chỉ element con thay đổi.

> ⚠️ **`Strong` không khác `Normal` về mặt thị giác.** Markup là `<strong>` nhưng computed
> `font-weight` vẫn `600`, y hệt Normal — Polaris set weight cho button bất kể tag, nên bold mặc định
> của browser không có tác dụng. Cần PO/Dev xác nhận có chủ đích hay không.
>
> ⚠️ **Cạm bẫy khi đo:** `querySelector('em,strong,small,span')` trả về `<span>` bọc ngoài trước,
> che mất element lồng bên trong → dễ kết luận nhầm `Small` giống `Normal`.
> Query đúng tag cụ thể, hoặc liệt kê toàn bộ descendant.

---

## 4. Digital Download

Cho buyer tải file design kỹ thuật số sau khi mua.

### Surface

Thank You page · Order Status page. **Không có trên Checkout page.**

### Điều kiện tiên quyết (merchant phải setup trước)

Extension **chỉ hoạt động** khi merchant đã tạo một **addon charge layer** trong campaign với:

| Thành phần | Yêu cầu |
|---|---|
| **Title** của addon charge layer | Phải **chứa** chuỗi `"digital"` |
| **Custom name** | Giá trị merchant tự đặt |
| **Custom values** | Phải **chứa** `"yes"` |

### Cấu hình trong app block

Merchant phải nhập lại vào app block đúng **custom name** và **custom values** đã setup ở addon charge layer.

| Field | Default khi để trống |
|---|---|
| Custom name | `digital` |
| Custom values | `yes` |

- Sửa **label**
- **Translate** label

### Hành vi

1. Extension hiển thị dưới dạng **button**.
2. Click button → **redirect sang design link của teeinblue**.
   **Không yêu cầu đăng nhập** — chỉ mở link, ai có link đều xem được.
3. ⚠️ **Design có thể render lâu** — mở link thường phải **đợi một khoảng thời gian** file design mới hiện.
   Đây là hành vi đã biết, **không phải bug** nếu file cuối cùng vẫn hiện ra.

---

## 5. QA notes — các điểm dễ sai

1. **Nhầm surface**: đi tìm Edit Customization / Digital Download trên Checkout page → không có, và đó là đúng.
2. **Edit Customization trên campaign by Product base**: thấy link hiện → tưởng bug. Sai. Phải click vào và
   verify **đúng message** `Your design does not support edit for now, contact shop owner`.
3. **Digital Download không hiện**: kiểm tra 3 chỗ trước khi log bug —
   (a) addon charge layer title có chứa `digital` không, (b) custom values có `yes` không,
   (c) app block có nhập đúng custom name/values không (hoặc để trống để dùng default `digital`/`yes`).
4. **Digital Download load lâu**: chờ đủ lâu trước khi kết luận lỗi. Log bug kèm thời gian chờ thực tế.
5. **Mismatch custom name/values** giữa addon charge layer và app block → extension không nhận diện được
   line item là digital → không hiện button. Đây là case negative cần test có chủ đích.
6. **Redirect URL của Edit Customization**: verify đủ 3 query param, đúng giá trị của **chính** line item
   đang thao tác (không lấy nhầm của line item khác trong đơn nhiều sản phẩm).
7. **Translate label**: test với ít nhất 1 ngôn ngữ non-English, kiểm tra cả ký tự có dấu / ký tự đặc biệt.
8. **Button style / Button appearance** (chỉ Edit Customization): 3 style × 4 appearance.
   Smoke từng giá trị mỗi nhóm. Size/emphasis cũ đã bị bỏ, không test.
   Khi verify viền của Outline phải đọc `box-shadow`, không phải `border`.
9. **Update UI = regression toàn bộ**: đừng giới hạn scope theo trang hay theo extension khi issue là
   update lớp UI/runtime. Shopify dùng chung bộ UI → phải quét lại cả 3 extension × cả 3 trang.
10. **Edit Customization ghi đè artwork**: sau khi edit phải verify artwork **mới** đã thay artwork **cũ**
   (không tạo bản song song). Kiểm tra ở cả portal lẫn design link.
11. **Digital Download không cần auth**: đây là hành vi **đúng theo thiết kế**, không log bug security.
   Nhưng vẫn nên verify link không lộ dữ liệu của đơn/khách khác.
12. **Không add được app block vào Checkout trên store non-Plus**: đây là giới hạn của **Shopify**,
   không phải app. Không log bug, không viết test case — chỉ là precondition môi trường.
13. **Extension không hiện trong preview của editor**: đúng hành vi, preview không có data teeinblue.
   Phải đặt order thật rồi kiểm tra trên storefront.
14. **Edit Customization link 404 trên staging**: do host là production. Đổi sang
   `staging-sdk.teeinblue.com/customize/` rồi verify. Không log bug.
15. **Đọc line item properties trong admin order**: phải bấm **`Show more`** — admin cắt bớt danh sách.
   Kết luận "thiếu property" khi chưa bung là sai. Chuẩn nhất là đọc `/cart.js` trước khi đặt order.
16. **Block phải nằm trong container `Items`** mới hiện ở cấp line item. Block đặt ở `Main` hay section
   khác sẽ không xuất hiện cạnh từng sản phẩm — kiểm tra vị trí trong cây editor trước khi báo không render.
