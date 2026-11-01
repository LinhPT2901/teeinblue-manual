# Layer chữ: Single-line Text, Paragraph, Curve, Warp, Spiral, prefix/suffix, Duplicate & Link

Panel ✎ chung của text 2.0: `DESIGN SETTINGS` · `POPULATE VALUES` · `PERSONALIZATION SETTINGS` · `CONDITIONAL SETTING` · `EXTRA` (chi tiết personalization/populate: `personalization-populate-conditional.md`). Mặc định toggle: `shop-config-defaults.md`.

## Single-line Text 2.0

- `+ Layer` → `Single-line Text` → thêm ngay, tên `Text layer`, form preview có textbox `#layer-<id>` (chỉ là preview).
- Kích thước/vị trí mặc định đã thấy: font size 100, 513x130 (2026-08-27); Roboto regular 100, top/left 800 (tâm) (2026-10-08); 475x117 giữa canvas (instance 287). Text preview `Default text`.
- **Default text**: panel ✎ > `DESIGN SETTINGS` > `Default text (only for preview):` = `.layer-editor-panel input[name="text"]` (key `text`).
- JSON mặc định có `autoscale_enabled: true`, stroke `#FF0000`/1 (stroke tắt trên UI).
- 🔑 **Không có toggle Autoscale** (2026-09-24, 2026-10-14) trong panel lẫn toolbar. Shrink font khi tràn box là hành vi mặc định của SDK cho mọi text layer. Muốn tạo case autoscale: box hẹp + font size đủ lớn.
- PERSONALIZATION có thêm: `Prefill default text to customer’s input`, `Allow customers to reposition text`, `Charge by Character count` (`layers-form-elements.md`), `Attach customer input for fulfillment`, `Input type`, `Input text case`.

## Paragraph 2.0

- `+ Layer` → click `Paragraph` → `Normal` (data-type paragraph) / `Custom Shape` (`shape-text`, shape `Heart` chọn sẵn ⇒ save được ngay).
- Mặc định: 700x300 @ (top 650, left 450), Roboto regular 50, `#000000`, stroke OFF, **line height 1.2**, letter spacing 0, text `Lorem Ipsum is simply dummy text of the printing and typesetting industry.`
- `DESIGN SETTINGS`: `Default paragraph (only for preview):`, `Enable prefix/suffix`, `Right to Left text`, **`Remove line breaks`**.
- PERSONALIZATION: radio `No personalization` / `Create a new option` / `Use an existing global option` (+ `Quick-fill from a global option`), `Option Title:` (`input[name="form_label"]`), `Placeholder paragraph:`, `Prefill default paragraph to customers input`, `Input type`, `Input text case`, `Text character limit`, **`Limit number of lines`** (OFF), `Add instruction for customer`, `Mark this option as required`, `Show customization data on cart/checkout`, `Custom class`.
- Không có toggle auto font-size / wrap — wrap + auto-shrink là mặc định SDK.
- 🔑 JSON auto-fit: `typography.size` = base font (toolbar), `paragraph.font_size` = cỡ đã fit, `paragraph.lines` = dòng đã wrap. Đổi base 100 → 140 trong box 720x420 mà render không đổi (fit 66) ⇒ chứng minh auto-fit chạy.
- **Remove line breaks**: `.layer-editor-panel div:has(> label.vue-js-switch):has-text("Remove line breaks") label.vue-js-switch` (`aria-checked`), mặc định OFF. JSON `remove_line_breaks_enabled: true` khi ON; layer chưa từng bật thì **không có key**; bật rồi tắt + Save thì `false`.
  - Buyer chỉ nhập Enter (`"\n\n\n\n"`) + toggle ON ⇒ order item lỗi "The compressed paragraph lines field must match compressed text." (order #ins58-2972 item 7450).
- Toolbar (sau `Preview Options`): `///` = Background image, `|↔|` = Letter spacing + Line height (ô line height hiển thị `1,2`), icon khung = shadow.
- Paragraph được phép vừa `Create a new option` vừa Populate Content (`customization_type:normal` + `retrieval_*`); storefront gõ vào nguồn ⇒ textarea paragraph điền y hệt (`layer-<id>` = giá trị nguồn), preview đổi theo.
- Paragraph `No personalization` + populate: không sinh field trên storefront, chỉ render theo nguồn (2026-10-14: ratio preview 0.446875; "Love you Mom" → 62.56px = base 140, 2 dòng).

## Curve Text

- Mặc định: radius 50, 514x117 @ top 741/left 525; text `Default text` size 100. Nằm giữa canvas ⇒ dễ đè Text layer, dời Top.
- Độ cong: `toolbar-transform.md`.

## Warp Text / Spiral Text

- `TEXT ▸ Other ▸ Warp Text` / `Spiral Text`. Tên mặc định `Warp text`, `Spiral layer`.
- Warp: 1000x1000 @ 300/300, text `HELLO WORLD` (`.layer-editor-panel input[name=text]`). Spiral: 400x400 @ 600/600, `textarea#text` (`Lorem Ipsum...`), `Inner radius` 50, `Text direction` = `direction-out` (Begin at inner).
- 🔴 Tỉ lệ khoá cứng ⇒ chỉ box vuông (set Width 700 ⇒ Height 700). Fill Width: clear trước; Height cập nhật khi click sang field khác.
- 🔑 10 điểm warp (6 `.warp-point-handle--anchor` + 4 `--control`) **chỉ hiện khi chọn layer bằng click trên CANVAS** (`.drr.drr--active`). Chọn từ layer list ⇒ `.drr--inactive`, chỉ thấy viền `svg.warp-border-svg`. Mở/đóng Transform cũng về inactive.
- Mặc định personalization (2026-10-15): Warp `Input text case = UPPERCASE`; Spiral text case Normal.

## Prefix / suffix

- Panel ✎ → `DESIGN SETTINGS` → toggle `Enable prefix/suffix` (`div:has(> label.vue-js-switch):has-text("Enable prefix/suffix") label.vue-js-switch`) → `input[name="prefix"]`, `input[name="suffix"]`.
- Có ở: `text`, `paragraph`, `curve-text`, `warp-text`.
- 🔑 Portal **không trim** prefix/suffix: space đầu/cuối, nhiều space, NBSP U+00A0 lưu nguyên qua Save + reload + publish.
- 🔴 Gõ NBSP: `browser_type`/`fill()` chuẩn hoá thành space thường. Cách đúng: `printf 'Winner\xc2\xa0' | pbcopy` → click field → Cmd+A → Cmd+V → kiểm `[...input.value].map(c=>c.codePointAt(0))` có 160.
- Verify không mở panel: sau khi gắn artwork, STEP 2 render SVG: `[...document.querySelectorAll('.tee-artworks-wrapper text')].map(t=>JSON.stringify(t.textContent))` → mỗi dòng = prefix + default + suffix. Storefront cùng selector.

## Duplicate & Link options

- Chọn layer → thanh `N selected` → `Duplicate & Link options` (`.alab-actions button:has(span.sr-only:text-is("Duplicate & Link options"))`).
- Layer link tên `<gốc> copy`, icon 🔗, được chọn ngay sau đó ⇒ tạo nhiều link từ cùng gốc phải chọn lại gốc mỗi lần.
- Chạy với Paragraph / Text / Curve Text / Clipart / Photo Upload.
- Panel ✎ của layer link: chỉ `LINKED LAYER` (banner *"This layer is linked to another layer. Design and personalization are synced from it."* + `Source layer:` + nút target) + `EXTRA`. Không có DESIGN/POPULATE/PERSONALIZATION, không toggle Remove line breaks.
- Toolbar layer link chỉ `Transform` / `Align` / `Shape Cut` — không font/size/color/stroke/background/letter spacing (mâu thuẫn spec TIB-4889 "sửa Font size = original × scale"; bằng chứng `evidence/TIB-4889/anomaly-linked-toolbar-fontsize.png`).
- Transform layer link khoá tỉ lệ (800×300 → 400 ⇒ 150; source 1500x350, width 700 ⇒ 163.33), chỉ 4 handle góc.
- JSON: `customization_type: linked`, `linked: layer-<src>`; copy đồng bộ `remove_line_breaks_enabled`, `retrieval_*`, `photo_border`, `masked_url` từ gốc.
