# Assets: category, clipart, vector, font, thư viện ảnh (library), layer image, trash

## Sidebar Assets

`/global-options`, `/cliparts`, `/vectors`, `/additional-options`, `/map-styles`, `/color-categories`, `/font-categories`, `/fonts`.
Mọi category đều `POST /api/clipart-categories` (type: clipart / vector / additional_option / map / color_category / font_category), URL sau tạo `?id=<id>`.

## Tạo category

- 2 nút `New category` trong DOM (1 ẩn) ⇒ `button:visible:has-text("New category")`. Form inline bên phải.
- Ô Name: `main input.form-control:not([type])` đầu tiên, hoặc `label.w-100:has-text("Name") > input`. Input text đầu tiên trong main là treeselect `Load all to search` / Parent Category — gõ nhầm ⇒ 422 `The name field is required`. Nút `Create` ⇒ 201.
- Child category: `#clipart-parent-category-selector a.category-searcher` → popup search → click tên.
- Menu `.category-action-icon` (… cạnh "Category"): `Add a sub-category / Bulk upload sub-categories / Duplicate category / Delete category` → `.vue-dialog` `Delete` ⇒ `DELETE /api/clipart-categories/<id>` 204 (vào Trash).

## Item theo loại

- Clipart / Vector: vùng `Drag and Drop / Click to upload` (file chooser, multiple). Clipart → `POST temporary-files/upload-url` + `POST /api/cliparts/by-temporary-file`; Vector SVG → `POST /api/cliparts/svg`. Upload nhiều file 1 lần chạy song song ⇒ thứ tự (position) bị XÁO; cần thứ tự cố định thì upload từng file. Sau upload bấm `Reload`. Clipart mới có thể `url:null` tới khi job nền chạy.
- Đổi tên clipart: click link tên → popup `textarea` + `.vinput-btn-primary` (✓) → GraphQL.
- Additional Options: `input[placeholder="Item name"]` + `Add new` (`POST /api/cliparts`).
- Map Styles: `input[placeholder="Map style option name"]` + `Add new`; URL style: click `Enter maps style url` → textarea + `.vinput-btn-primary` ⇒ `PUT /api/cliparts/<id>`.
- Color: `input[placeholder="Enter a color hex"]` + `Add new` ⇒ name = hex; đổi tên: click link tên → input + ✓ (GraphQL). Đổi màu: `.color-input span` → sketch input đầu = hex → Enter → click ra ngoài ⇒ `PUT /api/cliparts/<id> {"color":...}`.
- Font Category: `Add new` mở dialog `Select a font` chỉ chọn font đã upload. Upload ở `/fonts` → `Upload fonts` → modal `input#new-font` (multiple, .otf/.ttf; qua CDP click không bắn filechooser ⇒ `setInputFiles`) ⇒ `POST /api/custom-fonts` (name = tên file). Dialog chọn: search `input.vgrid-input`, card `div.vgrid-col` có `button:has-text("Select")` ⇒ `POST /api/cliparts/font`.
- Folder 60 clipart render đủ ngay (query không limit, không phân trang).

## Bulk select / delete (TIB-5547)

- Checkbox `Select all` ở clipart/vector/AO/map/color/font. Header: `.clipart-editor-bulk-action__selection .custom-control-label`; item: `.clipart-select-checkbox` (force; label rỗng width 0). Header `indeterminate=true` khi có ≥1 chọn (kể cả chọn hết).
- Delete: `.clipart-editor-bulk-action__selection button:has-text("Delete")` → `.vue-dialog` ⇒ `DELETE /api/cliparts {"ids":[...]}` 204 (vào Trash).
- Folder rỗng ⇒ không render `.clipart-editor-bulk-action`. Color category không có nút `...`.
- View Grid/List lưu global. Grid tile X: `.clipart-action__remove button`.

## Thư viện ảnh dùng chung (library images, TIB-5192)

- Mở từ: Photo `Photo Cropper` → `Crop into a custom shape` → `Shape image` → `Browse` (type **`mask`**); toolbar text `.qinline-bg-toggle` → `Browse` (type **`image`**).
- Modal: cột trái category (`All` + `+ New category`), dropzone `Drag and drop, or click to upload!`, `Search..`, `Reload`, card `[data-test=asset-library-item]` (rename `[data-test=asset-library-rename]` → input `aria-label="Rename"` + Enter ⇒ `PUT /api/library-images/<id>`; trash), footer `Move to category` / `Select`.
- New category: popup `input[placeholder="Enter category name"]` + `.dialog-body button.promise-button` (regex `^Create$` không khớp do "Loading..." ẩn) ⇒ `POST /api/library-image-categories` `{type: mask|image}`.
- Upload: `POST /api/library-images/by-temporary-file` 201 (`processing:true`, `library_image_category_id` = category đang chọn) → ~20s → `Reload`. Nhận AVIF. File vừa upload **tự tick** ⇒ đừng bấm `Select` nếu không muốn gán.
- Đóng modal: `.dialog-close` góc phải trên (x≈1406,y≈37 ở viewport 1600); `.dialog-close` kia (x≈1266) là của artwork editor.
- Đọc: `GET /api/library-images?type=mask|image`, `GET /api/library-image-categories?type=...`, `GET /api/library-images/<id>`. GraphQL không có `library_images`.

## Layer image (thư viện ảnh của layer Static Image / Clipart)

- Category: `+ New category` → popup `artwork-layer-new-category-popup` (`input[placeholder="Enter category name"]` + `Create`) ⇒ `POST /api/layer-image-categories` (`type: clipart`). Chọn category trái trước khi upload ⇒ ảnh vào category đó.
- Xoá: trong dialog Static Image, card có `button.delete-button` (`la-trash`) → `.vue-dialog` "Are you sure to remove <tên>" → `Remove` ⇒ `DELETE /api/layer-images/<id>` 200. Đóng dialog bằng Escape rồi `Cancel` editor (artwork không bị PUT).
- 🔑 Trash **không có loại layer image** (filter Type: Campaign by product base / Campaign by platform products / Product / Clipart / Clipart category / Artwork; `GET /api/trash?type=layer_image` 422).
- 🔴 AVIF bị từ chối ở clipart + layer image: `POST /api/cliparts/by-temporary-file` và `POST /api/layer-images/by-temporary-file` → 422 `This file type is not supported. Please upload a PNG, JPEG, GIF or WebP image.` (dropzone `accept` có `image/avif`; UI hiện lỗi dưới tên file). Thư viện library images thì nhận AVIF. DEV từng tạo sẵn layer image AVIF (10990/10991…, không category) — chọn trong category `All`, lọc theo hash url.
- Upload 8000x8000 (1.4MB) OK; 18174x6900 (7.7MB) ~32s.

## Quota 429 khi tạo layer-image (2026-10-01; đã tự hết cùng ngày — `from-clipart` trả 201, theo `runs/TIB-5425/ledger.md`; cách xử lý: L-001 trong `.claude/tib-operational-lessons.md`)

- Sau 2 lần `POST /api/layer-images/from-clipart` 201, mọi request tạo layer-image tiếp theo (`from-clipart`, `by-temporary-file`) trả 429, kéo dài >20 phút, phiên mới cùng ngày vẫn 429 ngay request đầu.
- **UI nuốt lỗi**: không toast; item kẹt `Generating...` mãi; `Reload` không retry. Chỉ thấy qua console/network ⇒ check network sau MỖI Save ở dialog có tab Upload / Choose from clipart / vector category.
- Request đọc, publish, attach artwork không bị ảnh hưởng.
- Gặp lại: xác nhận 1-2 lần rồi dừng, đừng retry dồn dập; làm trước các bước không cần tạo layer-image; hỏi người phụ trách hạ tầng nếu cần reset.
- Né: Static Vector chọn vector có sẵn không sinh request tạo layer-image; `from-clipart` cùng clipart trả lại bản cũ (dedup).
- Nhật ký đầy đủ: `_archive.md`.
