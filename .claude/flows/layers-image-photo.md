# Layer ảnh / vector: Static Image, Clipart, Vector, Photo Upload, Multiple Uploads, Text to Image (AI), Image effects

Thư viện/asset (category, upload, xoá, 429): `assets-library.md`. Border/HD/Print Effects: `toolbar-transform.md`.

## Chọn ảnh trong dialog (Static Image / Photo / T2I / Vector)

Hành vi đổi giữa các phiên — thử lần lượt, **luôn đọc label nút xác nhận** (`Select 1 image` / `Select 1 vector`) trước khi bấm:
- Click `img` của card: `.layer-listing__item:has(img[alt="<tên>"]) img` (hoặc lọc theo hash url `img[src*="<hash>"]` khi tên trùng).
- Click thumbnail theo vị trí: `.layer-listing__item:has(img[alt="<tên>"]) .mockup-layer-listing__thumbnail` position (20,60).
- Click `input.layer-listing__checkbox` trực tiếp **không ăn**.
- File vừa upload thường **tự tick sẵn** (Static Image) — click lần nữa là BỎ tick. Static Vector upload thì không tự tick.
- Ô search dialog `input.vgrid-input` (gõ + Enter) có lúc không lọc / lọc chậm ~3s. `input.vgrid-input:visible` first có thể trúng ô search của dialog `Select your artwork` phía sau.
- Escape đóng dialog và không thêm layer.
- Search trong dialog chọn ảnh khớp theo TÊN ⇒ clipart đã chọn vào layer sinh 1 layer-image cùng tên (vd `upload-star-transparent`); layer sau có thể lấy nhầm bản đó (cùng ảnh, khác url).

Ảnh mẫu trong thư viện user 64: dog `1`..`5` (900x1200) hash `6ae0357e0f736` (1), `6ae03592a7732` (2), `6ae035a54d0c2` (3), `6ae035c8ed357` (4), `6ae035e35d9b5` (5); dog 1 cũng tìm bằng `img[src*="5WKM58VogknzlmXh"]`; Husky `6ad5ec1cd9102`, Corgi `6ad5ec151635b`; placeholder `uploaded` (1200x1200, có vùng bán trong suốt); `IMG_1790.jpeg` (4 MB, 4032x3024).

## Static Image (`static-photo`)

- `+ Layer` → `Static Image` → dialog tab `Upload an image` / `Choose from clipart category`.
- Upload: click `text="Drag and drop, or click to upload!"` → file chooser → `POST temporary-files/upload-url` + `POST layer-images/by-temporary-file` 201 (ảnh lớn: response `url:null` xử lý async, ~25-50s). Card mới lên ĐẦU lưới, tên = tên file không đuôi.
- Layer mới = size ảnh gốc, giữa canvas (800x800 → @400/400; 1536x1024 → @32/288; 900x1200 → @350/200); ảnh lớn hơn canvas tự fit (2000x2000 → 1600x1600 @0/0; 18174x6900 → 1600x607). Khoá tỉ lệ.
- JSON `customization_type: no_customization`, url `users/64/image-layers/<hash>_large.webp`.
- Upload lại cùng file luôn tạo layer_image MỚI (không dedup theo nội dung).
- Replace ảnh: icon ⇄ (`button:has(i.la-exchange-alt)`) trên hàng layer → popup 2 tab giống trên → nút `Replace`.

## Clipart Category (`clipart-category`) / Group of clipart categories

- `+ Layer` → click `Clipart Category` → `1 Clipart Category` / `Group of clipart categories`.
- Dialog mở ở tab `Upload an image` ⇒ chuyển tab **`Choose from clipart category`**.
- Chọn category (2 kiểu UI đã gặp):
  - Treeselect: `.clipart-category-selector .vue3-treeselect__control` → `keyboard.type` (placeholder là div) → `.vue3-treeselect__menu .vue3-treeselect__label:text-is("<tên>")`. Có 2 `.vue3-treeselect` (cái `.category-listing.only-root` ẩn).
  - Link ` Search` cạnh `Select a clipart category:` → popup **"Search categories by name"** → gõ vào `input[placeholder="Search categories by name"]:visible` → list "Latest categories"/`Top N results` có thumbnail → click dòng.
- Clipart: click `.clipart-category-picker__grid img` (card `.vue-select-image__thumbnail--selected`); clipart đầu được chọn sẵn; category 1 clipart thì auto-highlight, vẫn phải `Save`.
- Xác nhận: `.clipart-picker-popup__clipart-footer button.btn-primary` (`Save`) ⇒ `POST /api/layer-images/from-clipart {clipart_id}`: tạo layer_image mới (tên = tên clipart, không category, nằm "All"; layer xuất hiện sau vài giây). Gọi lại cùng clipart ⇒ 200 trả layer_image cũ (**dedup theo clipart id**).
- Footer khi chọn category: `"<cat>" will be auto-selected as the clipart category for this layer.`
- Category rỗng: `No items in this category`. `Girl` rỗng; `valid-images` (id 6326) có 5 clipart (ghi nhận 2026-08-26).
- Layer tên mặc định = tên file clipart. Mặc định `customization_type: normal`, `clipart: <catId>`, size theo ảnh (900x1200 giữa; 400x400 @600/600).
- JSON: `url` luôn `users/64/image-layers/<hash>_large.webp` (bản copy layer_image), `default_value` = `users/64/cliparts/<catId>/..._large.webp`. Prefix `image-layers/` là thiết kế.
- 🔴 Mặc định `Create a new option` và **BẮT BUỘC category**, thiếu thì Save FAIL toast `<tên layer>: - Select one clipart category is required` (console sạch). Chỉ cần layer tồn tại ⇒ `PERSONALIZATION SETTINGS` → `No personalization`.
- `Clipart fit mode:` `direct_clipart_style-contain` (mặc định, "Contain (scale to fit)") / `-cover` ("Cover (stretch to fit)"); `.layer-editor-panel label[for="direct_clipart_style-cover"]`.
- Đổi default: panel ✎ → `Show option to select default value` → click `.layer-editor-panel img[alt="<tên clipart>"]` — chỉ đổi `default_value`; đổi cả `url` phải qua ⇄ Replace (gọi `from-clipart`). 🔴 Replace trên layer KHÔNG vuông làm layer co về vuông theo tỉ lệ ảnh và dời tâm ⇒ set lại size/pos.
- Layer Clipart Category **không có `Image effects`**.
- Clipart category trùng tên: `[TIB-5543] Dog clipart` có 6388 (gốc) và 6569 (bản copy do import TIB-5591, gắn GO 1075); popup Latest có thể chỉ hiện bản copy ⇒ search, chọn dòng đúng (thời gian), verify `clipart` trong JSON.
- **Group of clipart categories**: picker chỉ chọn cấp PARENT; bên phải combobox `Select a clipart as an original layer:` liệt kê CHILD — đổi dropdown mới load grid child; mặc định child đầu theo alphabet/id.
- Storefront preselect đúng clipart đã chọn (radio `[checked]`), group preselect cả child category + card.

## Layer ảnh thường chọn từ clipart category (TIB-5425)

Static Image (thêm mới) và popup Replace image của layer ảnh có tab `Choose from clipart category`. Pick clipart ⇒ 1 ảnh mới trong library (tên = tên clipart); pick lại cùng clipart không sinh thêm. Đếm bằng search tên trong tab `Upload an image` (`.layer-listing__item`) thay vì đếm cả thư viện (>600 ảnh).

## Vector

- **Static Vector**: `VECTOR` → `Static Vector` → dialog `Upload a vector` / `Choose from vector category`. Upload SVG bất kỳ: `POST /api/layer-images/svg` 201; card không tự tick ⇒ `Reload` → click `img` (`.layer-listing__item:has(img[src*="<hash>"])`) → `Select 1 vector`. Layer tên = tên file, **No personalization** mặc định (không bắt buộc category). Chọn vector có sẵn không sinh request tạo layer-image.
- 🔴 WAF/edge chặn upload SVG chứa `<script>` / `onload=`: `POST /api/layer-images/svg` → `net::ERR_FAILED` + CORS error (không đọc được status). Chặn có chủ đích, đừng retry.
- **Vector Category**: giống Clipart Category, bắt buộc category (`- Select one vector category is required`). Grid hiện y hệt clipart.
- **Vector Upload**: dialog vector → `Select 1 vector`; `teeinblue-official` 702x176 có sẵn (layer 702x176 @449/712, khoá tỉ lệ). Panel không có toggle PDF. Shop config `multiple_file_types: true` (linh-tib-staging) ⇒ storefront `accept="*/*"`, PDF đi `POST api/merchant/shopify/pdf-upload` 201 có preview (dev sửa 2026-10-27, BUG-398). Picker không có "PDF Upload" riêng.

## Photo Upload — Single Upload (`photo`)

- `+ Layer` → click `Photo Upload` → `:text-is("Single Upload"):visible`.
- Từ 2026-10-29: mở **modal thư viện ảnh** (category trái, `[data-test=asset-library-item]`): click `role=img[name="<tên>"]` → `role=button[name="Select 1 image"]`. Lần mở đầu có thể bật `alert` rỗng (category tên `<img src=x onerror=alert(1)>` của người khác) → `browser_handle_dialog accept`. (Trước đó là dialog placeholder: thumbnail `.mockup-layer-listing__thumbnail` + `Select 1 image`.)
- Layer sinh theo tỉ lệ ảnh (1600x1200 @200/0; 900x1200 @350/200); khoá tỉ lệ, mở khoá được.
- Option Title mặc định rỗng — đặt tên để form hiển thị đúng.
- `Upload editor:` (radio `name=photo_editor`, `label[for="photo_editor-<value>"]`):

| Nhãn UI | value | Ghi chú |
|---|---|---|
| `Direct upload, no editor` | `static` | mặc định; `Direct upload style`: `Contain (scale to fit)` = `contain`, **`Fill (stretch to fit)`** = `cover` (cảnh báo "Photos may look distorted..."), lưu `direct_upload_style`, không đổi `fit_mode` |
| `Photo Cropper` | `image_cropper` | có switch `Crop into a custom shape`; không có lựa chọn fit (JSON `fit_mode: contain`, render ảnh 2:1 kiểu cover) |
| `Photo Reposition` | `image_placement` | mất switch `Show customer's photo on live preview`; có `Fit mode` contain/cover |

- **Mask**: `Photo Cropper` → switch `Crop into a custom shape` (= `masked_enable`) → `Shape image` → `Browse` mở **modal thư viện type `mask`** (`assets-library.md`). Yêu cầu PNG đen đặc, cùng tỉ lệ layer. Ảnh cũ: path `users/64/images/...`; thư viện mới `users/64/library/...`. Mask hiện ở panel dạng `[style*="users/"]` background-image.
- `No personalization` ⇒ panel ẩn `Upload editor`, `Direct upload style`, `Image effects` (giá trị cũ vẫn giữ). Gắn effect cho target no-personalization: tạm `Create a new option` → thêm effect → chuyển lại `No personalization` → Save (effect persist).
- Layer dùng Global Option photo: `label[for="customization_type-global_option"]` → `Select a global option` → gõ → `.multiselect__option`; option title lấy từ GO (vd GO 1011 `Photo GO`); có switch `Use a different shape mask` (OFF = mask từ GO). Layer GO vẫn có Border riêng; JSON chỉ `global_option: <id>`.
- "Select a color" trên storefront: `Image effects` → `Add new` → `Portrait sketch (TIB)` → bật `Allow customers to change sketch color` ⇒ hiện `Select a color` (ColorPickerInput).
- Storefront Photo Reposition: upload xong mở dialog `.tee-dialog-image-placement` (handle scale, xoay, toolbar zoom/xoay/mũi tên, nút Cancel/Save label custom của shop); sau Save có `button.tee-btn--recustomize` "Recustomize image" + `tee-photo-clear`.

## Multiple Uploads (`multiple-uploads`)

- `+ Layer` → `Photo Upload` → `Multiple Uploads` (cũng mở dialog chọn ảnh placeholder). Không có radio `No personalization`.
- `Output Type:` `output_type-single` (mặc định) / `output_type-multiple` (`label[for="output_type-multiple"]`).
- **Single Output**: `Maximum photos*` min 2 **max 3** (mặc định 3); **bắt buộc** `GenAI service*` (`select#multi_image_provider`: Gemini/OpenAI/Flux/ImagenHub, mặc định trống) + **`Prompt the result you want`** (`textarea#multi_image_prompt`, không cần khi ImagenHub) + `Image effects after generating`; có `Fit mode` + `Show customer's photo on live preview` (ON); có Transform. Thiếu prompt ⇒ toast `Multiple Uploads: - Prompt the result you want is required`, không PUT. JSON `output_type:"single"`, `max_photos`, `multi_image_provider`, `multi_image_prompt`. Storefront: nút `Generate - text to image` (`button.tee-btn.tee-btn--upload`), disabled khi chưa có ảnh; route `generate-from-multiple-images`.
- **Multiple Outputs**: `Maximum photos*` min 2, không max, không GenAI. Ô số `.layer-editor-panel input[type=number]` first (Cmd+A/Backspace rồi type). Panel: Option Title, Output Type, Maximum photos, Upload editor (static/image_placement), Set minimum size, instruction, show_in_cart, custom class — không có GenAI/Fit mode/live preview, **không có toggle required** (JSON theo default user). Toolbar không có Transform; canvas/live preview không vẽ placeholder (chỉ thấy ở chế độ `Edit`). Không tự ra design — cần layer khác populate (`personalization-populate-conditional.md`).
- 🔴 Storefront: field Multiple Uploads (cả Single và Multiple Outputs) hiện `*` và **chặn Add to Cart khi trống** (`This field is required!`) dù JSON `required:false`. Input `multiple` ⇒ `setInputFiles` nhiều file một lần.

## Text to Image (AI) (`text-to-image`)

- `+ Layer` → `Text to Image (AI)` → dialog chọn ảnh placeholder → `Select 1 image`; layer tên = tên file (vd 900x1200 @350/200, khoá tỉ lệ).
- 🔴 2 field bắt buộc, thiếu thì toast `<tên>: - Prompt the image you want is required`: `GenAI service*` (`select#text_to_image_provider`: `gemini` / `gpt` / `flux_kontext` / `imagenhub`; text `[Gemini]/[OpenAI]/[Flux]/[ImagenHub] Text to image`) và `Prompt the image you want` (`textarea#text_to_image_prompt`, hiện sau khi chọn service).
- Prompt tham chiếu **Option Title của layer KHÁC** (`{{Your name}}`); biến không tồn tại ⇒ storefront trả *"This image is blocked due to sensitive content or a policy violation"*. Prompt tĩnh để generate chắc chạy.
- Có `Fit mode` (fill/contain mặc định/cover) + `Image effects after generating`. Note `The generated image uses this layer's ratio.` ⇒ để layer vuông. Không có toggle required; storefront luôn `*` (SDK set required = !hidden).
- Không có option reference image cho T2I (SDK đọc `text_to_image_enable_ref_img`/`text_to_image_ref_img` nhưng portal không set). Ref image chỉ có ở effect Gen AI (`Use Reference Image`).
- Storefront: không có input text, chỉ nút `Generate - text to image` (vi: `Tạo ảnh từ text`); `.tee-field__header` (Option Title) `display:none` ⇒ đọc DOM.
- Verify số AI layer: số nút `Generate - text to image` trong PERSONALIZATION FORM.

## Biến prompt (`+ Variable`)

- Có ở prompt T2I và prompt GenAI effect. Dropdown `.prompt-variable-dropdown__item__content` liệt kê Option Title của AO / Text / JSON List **trong template đang mở**; AO dùng Global Option KHÔNG có trong list (gõ tay `{{Hat}}`); không liệt kê template selector.
- JSON List: submenu `Pick a value from the JSON file` → `The whole item as JSON` = `{{City}}` hoặc từng key `{{City.id}}`, `{{City.name}}`.
- Dropdown không tự đóng ⇒ click lại `Variable` (nó che textarea). Biến chèn tại con trỏ; gõ nối bằng `focus()` + `ControlOrMeta+End` + type.
- Không có layer phù hợp ⇒ popup `Add a Text or Additional Option layer to use variables in your prompt.` Gõ tay biến không khớp ⇒ cảnh báo vàng `The following variables have no matching layer — please create a layer for each one: <vars>` (Save vẫn OK).

## Image effects

- Panel photo → `Image effects` → `Add new` → ô `Select...` (vue3-treeselect) → click `.vue3-treeselect__label` của option. Nhánh con: mũi tên `.vue3-treeselect__option-arrow-container` (locator click có thể timeout ⇒ `page.mouse.click` toạ độ; bấm lần 2 = thu gọn). Option có `data-id`.
- Cây effect (2026-10-16): `teeinblue:gray_scale` (Black & White (TIB)); `cutout.pro:cartoon` ▸ 15 style; `face_cutout` ▸ `cutout.pro:face_cutout` / `imagenhub:face_cutout`; `gen_ai_effect` ▸ `image_filter` (Default settings) / `gpt:image_filter` ([OpenAI] AI Effect) / `flux_kontext:image_filter` ([Flux]) / `gemini:image_filter` ([Gemini]) / `imagenhub:image_filter` ([ImagenHub]); `teeinblue:photo_border` (disabled, "Moved to toolbar"); `photo_enhancer` ▸ `cutout.pro:photo_enhancer` / `teeinblue:photo_enhancer` / `imagenhub:photo_enhancer`; `teeinblue:portrait_sketch`; `background_remover` (Remove background); `teeinblue:watercolor` (Watercolor Mask (TIB), `Mask types:` `Use TIB's default masks` / `Use custom masks`).
- Preset GenAI: `textarea#image_filter_prompt` (nhiều row ⇒ trùng id, dùng `.last()`), nút `Variable`, switch `Use Reference Image` (OFF) / `Apply color to sketch result` (OFF). Resolution: OpenAI 1K (mặc định, không lưu key)/2K/4K; Gemini 0.5K/1K/2K/4K. `[Flux]` bắt buộc `Flux output width/height (px)*` (JSON `flux_output_width/height`; lần Save đầu khi trống vẫn PUT 200).
- Row effect = `.repeater-item-sort-column`, xoá `button.repeater-remove` (không confirm). Nút `Run effects` chỉ chạy thử trên preview.
- JSON: `effects:[{type:"gemini:image_filter", image_filter_prompt:...}]`.

### ImagenHub template
- Link `Select template` (`.layer-editor-panel` getByText exact) → modal `Select Template` (model + tên, `Reload`) → click TÊN template exact (click ngoài modal = đóng). Ô `ImagenHub Template:` (disabled) hiện tên; `Template prompt` read-only (template GPT load chậm ~5s); switch `Use Template Default Size` (OFF).
- Template (2026-10-26): `QA-5465 T4` [style,name,gift,color,info], `QA-5465 T3` [mood], `QA-5465 T2` [art_style], `QA-5465 T1` [color,dog_name], `TIB - gen AI 2 - GPT-image-1.5` / `-GPT-image-2` (0 biến), `T2I - tib` [school.name], `T2I` (flux-2-pro, `Generate photo from {{school}}`, [school]). `QA-5465 T5` đã xoá.
- JSON `imagenhub_template:{id,available_variables:[...]}`.
- Cảnh báo inline dưới prompt khi biến không khớp layer; warning box góc phải canvas `Some ImagenHub variables have no matching layer` (`Layer "<Template> - <layer>" needs the variable(s) <vars>...`), cập nhật live. Bundle còn box `ImagenHub template variables have changed` và `Couldn't check the ImagenHub template on layer …`.
- Matching: quét layer có provider imagenhub + effect `imagenhub:image_filter`; bỏ qua layer global_option khi quét; biến khớp theo option title HOẶC layer name; layer dùng GO lấy `form_label` của GO. Photo layer tên/title `color` không tính là khớp.

## Dynamic Clipart by Text

- `+ Layer` → `Dynamic Clipart by Text` → `Manual Placement` (`dynamic-by-text`) / `Auto Placement` (`clipart-frame`).
- **Manual**: dialog chọn clipart category; panel không có Option Title; 3 field bắt buộc: `Select a source text option*` (chỉ text/curve-text, không Paragraph), `Value to populate*` (`{{value}}` cả chuỗi / `{{charX}}` từng ký tự), `Select one clipart category*`. Không render field riêng trên storefront.
- **Auto (Clipart Frame)**: tên `Dynamic Clipart by Text`, 800x800 giữa, text `ABCD`. Bắt buộc `Select one clipart category*` (Search) + `Select a source text option*` (Text / Curve / Warp); `Value to populate` mặc định `{{value}}`. Map TỪNG KÝ TỰ → clipart cùng tên (category dog `1`..`5` ⇒ Default text `123`).
