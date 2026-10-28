# Resource hints (preconnect / preload / dns-prefetch) trên storefront

## Nhận diện
Issue nhắc `preconnect`, `preload`, `dns-prefetch`, `crossorigin`, Lighthouse/PageSpeed "unused preconnect", page speed, connection reuse.

## Kiến thức nền cần kiểm tra
- Browser giữ 2 connection pool tách biệt: CORS (anonymous/no-credentials) và non-CORS. Preconnect **có** `crossorigin` chỉ được dùng lại cho request CORS (`fetch()`, `<script type="module">`, `<script crossorigin>`, `@font-face`, `img.crossOrigin='anonymous'`/canvas). Preconnect **không** `crossorigin` chỉ dùng lại cho `<script>` thường, `<img>`, CSS `background`.
- Một origin dùng cả 2 kiểu request (vd CDN vừa serve `<img>` vừa serve ảnh canvas CORS/font) thì một preconnect chỉ phục vụ được một pool → hỏi Dev có cần 2 thẻ không.
- `preload` phải khớp mode với request thật (`as`, `crossorigin`), lệch là tải 2 lần.
- Lighthouse báo unused cả khi origin không được request trong lúc load trang (vd API chỉ gọi sau tương tác) — không phải lỗi `crossorigin`. Lighthouse cũng cảnh báo khi có >2 preconnect.

## Impacted areas hay gặp
- Mọi đường render thẻ: theme app extension block + snippet cài tay (snippet cần merchant tự update).
- Biến thể theo setting store (vd photo endpoint photo-api vs snap-api), theo môi trường (staging host vs production host).
- Chỉ render trên trang cần (product page có campaign) — trang khác không có thẻ.
- Regression: script SDK load, ảnh CDN, canvas/mockup (CORS image), font, upload API.

## Rủi ro test
- Dev store có password → PSI không vào được; dùng DevTools Lighthouse (incognito, đã nhập password) và ghi rõ công cụ.
- Lighthouse/PSI dao động → chạy nhiều lần, lấy kết quả warning chứ không lấy điểm.
- "Initial connection = 0" có thể do reuse từ request trước, không chứng minh preconnect; dùng cột Connection ID, flush socket (`chrome://net-internals/#sockets`) trước khi đo.
- HTTP/2 connection coalescing giữa các subdomain cùng CDN có thể làm nhiễu kết quả.

## Câu hỏi mẫu cho PO/Dev
- Origin nào còn được phép bị báo unused và đó có phải acceptance không?
- Origin có request CORS (font/canvas/preload JSON) có cần thêm preconnect `crossorigin` riêng không?
- Staging render href host nào? Snippet cài tay rollout ra sao?
