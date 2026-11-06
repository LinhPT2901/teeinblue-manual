# Rule: SSRF via server-side URL fetch

## Khi nào áp dụng
Issue/tool có param kiểu `url`/`image_url`/`webhook_url`/`source_url` mà **server tự fetch** (không phải client upload file trực tiếp) — keyword: "fetchable URL", "import from URL", "upload from URL", "download and store", integration webhook nhận URL rồi gọi ngược.

## Context cần nhận diện
- Khác với upload file trực tiếp (client → server nhận bytes), fetch-by-URL nghĩa là **server đóng vai trò HTTP client** gọi tới địa chỉ do user cung cấp — đây là SSRF surface kinh điển.
- Rủi ro không chỉ là "tải nhầm ảnh xấu" mà là server có thể bị dùng làm proxy để: quét/gọi tới internal network (`127.0.0.1`, `169.254.169.254` cloud metadata, service nội bộ không public), hoặc exfiltrate qua DNS/redirect.
- Redirect chain: URL công khai hợp lệ nhưng redirect (3xx) sang địa chỉ nội bộ — nhiều thư viện HTTP client follow redirect mặc định, bypass allowlist domain kiểm tra ở bước đầu.
- Response-based leak: nếu tool trả lại nội dung/kích thước/metadata của URL fetch được (dù fetch thất bại), attacker có thể dùng để dò cổng/service nội bộ (side-channel).

## Requirement cần kiểm tra
- Domain/IP đích có được allowlist hoặc chặn theo range private (RFC1918, loopback, link-local `169.254.0.0/16` bao gồm cloud metadata) không?
- Redirect có được follow không — nếu có, có re-validate đích sau redirect không?
- Content-Type / kích thước response có được validate trước khi lưu (không chỉ dựa vào extension trong URL)?
- Timeout hợp lý để tránh treo request khi trỏ tới địa chỉ không phản hồi.
- Response lỗi có leak thông tin về việc port có mở/service nội bộ có tồn tại không (khác biệt giữa "connection refused" vs "timeout" vs "200 nhưng không phải ảnh" là side-channel).

## Impacted areas
- Chính tool/endpoint nhận URL.
- Bất kỳ nơi nào hiển thị lại asset đã fetch (nếu SSRF thành công lưu được nội dung nội bộ dưới dạng "ảnh").

## Risks
- **Critical nếu thành công**: đọc được cloud metadata (credentials tạm), hoặc gọi được service nội bộ không public.
- **Medium**: dùng server làm proxy quét cổng nội bộ qua side-channel response time/error message, kể cả khi không lấy được nội dung.
- Đây là test **chỉ nên thực hiện trên Dev/Staging**, dùng địa chỉ vô hại để chứng minh khái niệm (ví dụ `http://169.254.169.254/`, `http://localhost:<port nội bộ nghi ngờ>`) — không thử tấn công hạ tầng thật của bên thứ ba.

## Suggested test focus
1. URL trỏ `http://127.0.0.1/` hoặc `http://localhost/` → kỳ vọng bị từ chối, không fetch.
2. URL trỏ `http://169.254.169.254/` (cloud metadata endpoint chuẩn) → kỳ vọng bị từ chối.
3. URL hợp lệ public nhưng redirect (302) sang địa chỉ nội bộ → kỳ vọng vẫn bị chặn sau khi resolve redirect.
4. URL trỏ tới file không phải ảnh (html/json/binary lớn) → kỳ vọng reject theo content-type, không lưu như ảnh.
5. URL không resolve được / timeout → lỗi rõ ràng, không treo lâu, không leak chi tiết hạ tầng.

## Open questions template
- Có domain/IP allowlist hoặc blocklist private-range cho tool fetch-by-URL này không?
- Thư viện HTTP client dùng để fetch có follow redirect mặc định không? Có re-validate đích sau redirect không?
- Response lỗi (refused/timeout/wrong content-type) có được chuẩn hoá để không leak trạng thái network nội bộ không?
