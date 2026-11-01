# Rule: XSS / Script Injection prevention (HTML sanitization)

## Khi nào áp dụng
Issue có keyword: `XSS`, `script injection`, `v-html`, `innerHTML`, `dangerouslySetInnerHTML`, `sanitize`, `DOMPurify`, `dompurify`, `strip_tags`, `stored XSS`, `escape`, `HTML injection`, `vue-dompurify-html`, tooltip `html: true`.

## Context cần nhận diện
- Frontend Vue: `v-html` render raw HTML → sink XSS. Fix thường migrate sang `v-dompurify-html` (DOMPurify). Cả `.vue` lẫn `.pug` template.
- Direct DOM sink không bị grep `v-html` bắt: `element.innerHTML =`, `directives` custom, `v-tooltip` với `html: true` (FloatingVue), `linkify()`.
- Backend: input được lưu (stored) cần `strip_tags()` / validate ở request layer (vd `custom_style`). Phân biệt stored (lưu DB rồi render sau) vs reflected.
- **DOMPurify named config**: SVG clipart cần profile `svg` (dễ drop `<use>`/`<symbol>`), theme/font CSS cần profile `css` (giữ `<style>`). Sanitize quá tay → mất tính năng render hợp lệ.
- **Nullish-binding quirk**: `vue-dompurify-html` stringify `null`/`undefined` thành literal text "null"/"undefined" thay vì blank như native `v-html`. Cần directive normalize về `''`.
- Error message / notification: global interceptor (axios) sanitize `error.response.data.message` tại nguồn; blob response bypass interceptor → sanitize riêng.

## Requirement cần kiểm tra
- Payload script (`<script>`, `<img onerror>`, `<svg onload>`, `javascript:` href) nhập vào field text/note/tag/style KHÔNG được execute — bị strip/escape.
- Sau sanitize, nội dung hợp lệ VẪN render đúng: SVG/vector clipart (đặc biệt `<use>`/`<symbol>`), theme CSS/`<style>`, custom font-face, linkify URL thật, contenteditable round-trip.
- Nullish binding render blank, KHÔNG hiện chữ "null"/"undefined".
- Tooltip/label bound tới merchant data (tags, product name) hiển thị đúng khi `html:true` bị tắt (text thường không cần markup).

## Impacted areas
- Mọi sink `v-html`/`innerHTML` đã migrate (storefront widget + admin portal): số lượng lớn (~55 sdk, ~166 portal) → regression rộng, ưu tiên visual spot-check các trang hay dùng.
- Storefront (sdk): clipart SVG render trên nhiều platform entry (Shopify v1/v2/headless/embed, Open, Make, Picanova, Customize).
- Portal: FontViewer, JsonOptionTemplate preview, Order detail note linkify, TextEditable contenteditable, tooltip toàn app, campaign & artwork editor theme CSS/font.
- Backend request layer (vd `InstanceCustomStyleUpdateRequest`): validate `present|string`, `strip_tags`.

## Risks
- **Over-sanitization (rủi ro #1)**: DOMPurify drop element hợp lệ → clipart SVG vỡ, theme CSS/font mất, contenteditable hỏng. Đây thường là blocker merge, cần QA visual người thật.
- Sink bị bỏ sót (không match grep `v-html`): `innerHTML=`, tooltip `html:true`, blob error path.
- Nullish binding hiện "null"/"undefined" cho user.
- Validation đổi (`present|string`) làm request thiếu key `content` bị reject thay vì clear style → có thể phá luồng update hợp lệ.
- Sequencing: portal submodule trỏ branch sdk chưa merge → build/regression sai nếu chưa re-bump.

## Suggested test focus
1. **Negative (injection)**: nhập payload XSS phổ biến (`<script>`, `<img src=x onerror=alert(1)>`, `<svg onload=...>`, `javascript:` link, `<a onclick>`) vào từng field render qua HTML → confirm KHÔNG execute, script bị strip.
2. **Positive (không over-sanitize)**: clipart SVG có `<use>`/`<symbol>` vẫn render; theme CSS/`<style>` + custom font-face vẫn áp dụng; linkify URL thật thành link click được; TextEditable nhập→lưu→load lại giữ nguyên format.
3. **Nullish**: field rỗng/null render blank, không ra chữ "null"/"undefined".
4. **Tooltip**: hover element bound merchant data (internal_tags, product name) → text đúng, không vỡ layout, không execute markup.
5. **Backend**: PUT custom_style với `<script>`/tag → strip_tags loại; thiếu key `content` → reject (không silently clear); style hợp lệ vẫn lưu & render.
6. **Cross-platform**: spot-check render sau sanitize trên các storefront entry chính, không chỉ 1.
7. **Error notification**: trigger lỗi API có message chứa HTML → notification hiển thị escape, không execute.

## Open questions template
- Danh sách field/entry-point nào là bắt buộc phải test (scope), cái nào out-of-scope?
- Expected behavior khi payload injection: strip toàn bộ tag, escape hiển thị dạng text, hay chỉ chặn execute? (ảnh hưởng assertion)
- DOMPurify `svg`/`css` config allow-list cụ thể gồm gì (element/attr nào được giữ)?
- Field custom_style thiếu key `content`: expected 422 hay behavior gì ở UI?
- Có cần test trên tất cả 9 platform entry của sdk hay chỉ Shopify chính?
