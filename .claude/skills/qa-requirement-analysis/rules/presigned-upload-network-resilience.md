# Rule: Presigned upload — timeout, network failure & fallback (teeinblue SDK)

## Khi nào áp dụng
Issue đụng tới luồng upload ảnh của buyer trên storefront qua presigned URL (Wasabi / Cloudflare R2) hoặc fallback `photo-upload`. Keyword: `uploadToPresignedURL`, `fetchWithTimeout`, presigned PUT, `UPLOAD_PRESIGNED_TIMEOUT`, "Fetch is aborted", "Failed to fetch", "Load failed", stall timeout, slow network, upload progress, retry upload, R2/Wasabi, edge upload.

## Context cần nhận diện
- Luồng chuẩn: SDK xin presigned URL từ API (presign request) → PUT file thẳng lên storage → nếu fail/abort thì **fallback** upload lại qua API `photo-upload` (chậm hơn, thường im lặng với buyer).
- Có cơ chế **timeout strike/flag**: timeout lặp lại có thể làm SDK bỏ qua presigned cho các lần sau → ảnh hưởng tính lặp lại của test. Luôn hỏi cách reset (localStorage/session/flag server).
- Upload photo có **2 layer type**: Upload photo và Multiple upload photo. Layer Upload photo có 3 kiểu: **Direct Upload / Image Placement / Image Cropper** — mỗi kiểu phải test riêng khi đổi luồng upload (QA xác nhận ở TIB-5525). Ngoại lệ: field có effect GenAI image-filter dùng GenAI edge upload riêng. Mỗi kiểu có UX khác nhau (notice, retry, progress bar GenAI).
- QA phân biệt route qua Network tab: PUT tới host storage (wasabi/r2) vs POST `photo-upload` tới API.
- 3 loại lỗi mạng cần tách: **stall** (kết nối còn nhưng không có byte nào đi), **network error** (offline/mất kết nối → request lỗi ngay), **HTTP error từ storage** (403/5xx). Mỗi loại có xử lý khác nhau.

## Requirement cần kiểm tra
- Ngưỡng cụ thể: stall N giây, hard cap, ngưỡng tốc độ cho slow notice, thời điểm bắt đầu đánh giá. Ngưỡng phụ thuộc điều kiện (vd presign RTT cao) phải có định nghĩa "cao" là bao nhiêu.
- Message nào hiện ở layer nào; có Retry không; Retry chạy lại từ bước nào (presign lại? dùng lại ảnh đã xử lý?).
- Fallback sau abort: im lặng hay có message; nếu fallback cũng fail thì message nào.
- Text mới có translation key trong portal không; default theo locale.
- Log fields mới: tên field, nơi QA xem được (Sentry/Graylog/API log).
- AC gốc trong description có thể bị dev comment thu hẹp (vd bỏ progress bar) → cần PO xác nhận chấp nhận.

## Impacted areas
- SDK storefront: các photo layer kể trên, Add to Cart gating khi upload đang chạy/lỗi.
- API presign + `photo-upload` + rate limit upload (Retry có tính thêm lượt không).
- Portal translations (key mới).
- Logging/monitoring upload error.
- Đa trình duyệt: Chrome/Firefox vs Safari macOS/iOS (message lỗi native khác nhau).

## Risks
- Không tái hiện được stall bằng DevTools (Offline = network error, không phải stall) → cần proxy (Charles/mitmproxy pause) hoặc debug flag từ Dev.
- DevTools/CDP throttling upload có thể không chính xác với XHR body lớn → kết quả đo ngưỡng sai lệch.
- Strike flag bật sau vài lần test → các lần sau đi thẳng fallback, QA tưởng presigned không chạy.
- Đổi điều kiện "success" (vd HTTP 4xx giờ là fail) → regression ở case trước đây "thành công giả".
- Upload song song (main + large) chia băng thông → stall detection sai.

## Suggested test focus
1. Upload chậm nhưng liên tục (throttle thấp) với file lớn → không abort trước hard cap, slow notice hiện/ẩn đúng.
2. Stall giữa chừng → abort đúng N giây → fallback im lặng, ảnh vẫn lên.
3. Offline giữa chừng → network message + Retry → online lại, Retry thành công cùng ảnh.
4. Storage trả 403/5xx → fallback, không coi là thành công.
5. Hard cap với upload rất chậm nhưng không stall.
6. Từng layer type: notice/Retry đúng theo scope, layer ngoài scope giữ message cũ.
7. Translation key mới; Safari iOS/macOS; log fields.

## Biến thể: Edge upload Worker → R2 (một request, bật theo store config) — từ TIB-5525
- Luồng mới thay 3 bước (xin upload-url → PUT Wasabi → uploaded-at) bằng **1 request** tới Worker (`upload.teeinblue.com` / staging `upload-staging.teeinblue.com`), URL trả về dạng `cdnx(-staging).teeinblue.com/r2/...`.
- Gating bằng **store config** (vd `edge_upload`, mặc định off) → luôn test 2 nhánh on/off. Config bị cache (Redis ~1h + browser) → hỏi cách flush cache trên staging, nếu không sẽ tưởng toggle không ăn.
- Loại file xác định theo **nội dung (magic bytes)**, không theo extension → test file đổi đuôi, file giả mạo, HEIC (ngoài danh sách → fallback).
- Fallback im lặng + log step riêng (vd `upload-via-edge-photo`) → QA phải check log để biết đã fallback, vì UI không khác gì.
- Rate limit riêng của Worker (per network + per device) → vượt ngưỡng phải fallback, không báo lỗi buyer; cẩn thận test này làm hỏng state các test khác.
- Kiểm consumer ảnh R2 ở downstream: effect (bg remover), AI provider đọc original, cart, order, generate design/production, cleanup job.
- Ticket loại "[Investigate]" có AC là decision doc nhưng dev comment lại mô tả implementation → hỏi PO phạm vi QA thực sự (test implementation sau flag hay chỉ review số liệu).

## Cập nhật: edge upload thành mặc định cho mọi photo upload — từ TIB-5620
- Edge Worker → R2 **mặc định bật** trên mọi platform cho Photo / Image Cropper / Multiple Photo / Image Placement / Vector Upload; opt-out bằng store config `edge_upload: false` (khác TIB-5525: mặc định off).
- Chuỗi fallback: Worker từ chối/lỗi → presigned (`upload-url`); riêng **timeout** → `photo-upload` (API). Presigned lên R2 trước đây 403, nay phải thành công.
- Các nhánh vẫn qua API lưu theo env `FILESYSTEM_STORE_FRONT_DISK` (Wasabi `ws:` hay R2 `r2:`): in-app browser Facebook/TikTok, device vừa dính presigned timeout, GPX/Strava, GenAI khi `gen_ai_edge_upload: false`, kết quả server sinh (text-to-image, multi-image). Luôn hỏi env này trên staging đang là gì trước khi viết expected về prefix path.
- Downstream cần regression: vectorize render (SVG/EPS/AI/PDF) với path `r2:`, GenAI provider fetch ảnh (Gemini tải về base64, OpenAI fetch URL), cart/order/design.
- AC dạng "Sentry failure rate giảm" và "ảnh cũ trên Wasabi có backfill không" thường QA không verify được trên staging → hỏi PO tách ra khỏi phạm vi QA.
- **Vector Upload KHÔNG đi Worker** (Dev xác nhận TIB-5620, 2026-10-28): field Vector Upload upload qua API `vector-upload`; chỉ khi store bật multiple file types và khách upload file không phải vector thì mới đi Worker. Vẫn lên R2 vì env storage chung = R2 (staging đã set). Đừng viết expected "via Worker" cho Vector Upload; dev comment ghi "affects … Vector Upload" ≠ "đi Worker".
