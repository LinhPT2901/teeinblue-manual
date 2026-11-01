# Dynamic Translations (`/artwork-translations`) + Import to Translation

## Vị trí

- Không có màn "Translations" trong campaign hay artwork editor. Sidebar `Extras` → **`Dynamic Translations`** = `https://staging-portal.teeinblue.com/artwork-translations`. SPA chậm: đợi ~8s.
- Dictionary key→value **dùng chung**, không tách theo artwork/campaign. Dictionary (`/api/translations`) là theo USER, dùng chung mọi instance của user. Danh sách key chung mọi locale; mỗi locale có value riêng.

## Cấu trúc trang

- Header `Dynamic Translations` + `Save` / `Reset` (`main h4 button:has-text("Save")`).
- Ghi chú UI: *"Currently support translating: Option Title in the personalization form, Product base and Variants name."* (thực tế prefix/suffix cũng có thể là key).
- `Languages from <shop>:` = `<select class="form-control">` (`main select`), chọn bằng selectOption theo text. Chọn ngôn ngữ trước khi Import.
- Cột trái `Default` (key), phải = locale đang chọn (value).
- Search `main input.search-input` (gõ slowly) — chạy trên toàn dataset.
- Dòng: `main input.form-control:not(.search-input)` → cặp liên tiếp `[key, value]` (`for(i=0;i<n;i+=2)`); dễ off-by-one, đọc lại sau mỗi fill.
- ` Add new translation`: thêm dòng rỗng; khi không search portal **nhảy sang trang CUỐI** rồi mới thêm ⇒ tìm cặp rỗng theo value, không theo vị trí.
- Phân trang 20 dòng/trang: `main nav ul li a:text-is("<n>")`.
- Xoá key: trash từng dòng + confirm `Remove` — chỉ cục bộ tới khi Save.
- Save: `POST https://staging-api.teeinblue.com/api/translations/bulk` 200, **không có toast**. List: `GET /api/translations`.
- Rời trang khi form dirty ⇒ dialog `beforeunload` (accept = bỏ thay đổi).

## Hành vi đã xác nhận

- 🔴 Dictionary **không tự thu thập** string của artwork mới (Option Title, prefix, suffix, tên campaign) kể cả sau publish. Thêm bằng `Add new translation` hoặc `Import to Translation`.
- 🔴 Bug TIB-5414 (2026-09-09): **value bị trim 2 đầu khi save, key thì không** (`"Dear "` → `"Dear"`, `" Best "` → `"Best"`, `"Team   "` → `"Team"`).
- Portal liệt kê ngôn ngữ từ shop_locales (+ locale có record trong `/api/translations`, vd `German`) ⇒ không suy ra storefront có bật; kiểm trên storefront.

## Import / Export CSV

- `Import` là label cho `input[type=file][accept=".csv"]` (`label:has-text("Import")`); file phải nằm trong thư mục project (`.playwright-mcp/`). `Export` tải `artwork-translations-<locale>.csv`.
- Import đọc theo dòng, bỏ dòng đầu, cột 1 = key, phần còn lại = value; key chưa có tự thêm; chỉ nạp vào form locale đang chọn — **phải Save** mới lưu.
- 🔴 CSV **không được có dấu nháy kép**: parser tách dòng thô, giữ `"` ⇒ key rác (`"QA5352-key-0001"`, TIB-5352 từng sinh 1200 key). Dùng header `Default,<Tên ngôn ngữ>` rồi `key,value` không nháy (không chứa dấu phẩy). Import thử ~5 dòng trước.

## Import to Translation (gom key từ campaign / artwork)

- `/campaigns` → `...` → `Import to Translation`: **không lấy Option Title**; chỉ gom `label_available_product`, `artwork_navigation_name`, `platform_title`, product `title/size_custom_label/color_custom_label`, variant `color/size`. Nếu đã có hết thì popup không hiện.
- `/artworks` → `...` của artwork (`.artwork-item:has(img[src*="<thumbnail hash>"]) .la-ellipsis-h`) → `Import to Translation`: gom `form_label`, `form_placeholder`, `photo_hint`, … và **cả `name` của layer + tên template**. Chuyển sang `/artwork-translations`, popup `Add to translation` liệt kê key còn thiếu (input disabled); bấm `Add to translation` chỉ thêm vào form (phải Save); `Cancel` đóng không đổi. Mở `/artworks` trần (không `?id=`).
- Đọc store FE: `#app.__vue_app__.config.globalProperties.$store.state.translation.dataFromArtwork`.

## Storefront

- Public JSON: `GET https://staging-api.teeinblue.com/api/merchant/translations/<locale>.json?shop=<shop>&v=<hash>` (map key → value; `zh-TW` và `zh-tw` đều 200).
- 🔑 Storefront đọc dictionary từ `<script id="teeinblue-product-data">` (Shopify, không fetch API) ⇒ sau Save chờ ~1–2 phút. Kiểm: `document.querySelector('#teeinblue-product-data').textContent.includes('<value>')`.
- 🔑 JSON List item **không được dịch** (builder chỉ dịch label; item lấy thẳng file JSON). AO/GO option được dịch.
- linh-tib-staging (2026-10-29): shop locales (`GET /api/instances/58/shop-locales`) en (primary), vi, zh-TW — đều published. Storefront: `/en-vn/` (en), `/vi-vn/` + `/vi/` (vi), `/zh-zh/` (zh-TW); `/de`, `/de-de`, `/en-de`, `/zh-tw`, `/zh` 404. Product page không có `form[action*=localization]`; lấy locale từ `link[rel=alternate][hreflang]`. Lần navigate đầu có thể bị redirect về `/en-vn/`, navigate lại.
- Nhãn chưa dịch giữ nguyên dấu cách cuối (`.tee-field__heading span` = `Photo 10300950 `); có 1 span ẩn của template selector `<tên artwork> template`.
- Instance 287: shop-locales chỉ `en`; user 117 có 5 record de/fr/zh/af/lo (80 key mỗi cái). Storefront Boundless 561: xem `boundless.md`.
