# Rule: Image encode — định dạng không hỗ trợ & fallback (teeinblue backend image pipeline)

## Khi nào áp dụng
Issue nói về job/service xử lý ảnh phía server lỗi vì định dạng file: `NotSupportedException`, `NotReadableException`, "Encoding format (X) is not supported", Intervention Image `encode()`/`stream()`, `MakeLayerMasterImage`, `PreviewableImageMaker`, `MakePreviewableImages`, `convertImageWithExtensionNotSupport`, apply-effects, svg/pdf/heic/avif/ai/eps/bin/jpe. Bổ trợ [[upload-false-success-temporary-file]], [[presigned-upload-network-resilience]].

## Context cần nhận diện
- Pipeline ảnh có 2 pha: **decode (đọc)** và **encode (ghi)**. Fix "allowlist ext → fallback png" chỉ sửa pha encode. Với svg/pdf/heic/avif/ai/eps, pha decode phụ thuộc driver (GD không đọc được svg/pdf/heic; Imagick cần librsvg/Ghostscript/libheif) → lỗi có thể chỉ **dời** từ encode sang decode. Luôn hỏi driver + delegate trên staging/prod có giống nhau không.
- "Detected extension" lấy từ đâu (tên file / mime / magic bytes) quyết định case `bin`, file đổi đuôi, file không đuôi.
- Alias của định dạng hỗ trợ (`jpe`, `jfif`, `tiff`) nên map về định dạng gốc, không ép sang png (png phình dung lượng, mất ý nghĩa jpg).
- Vector (svg/pdf/ai/eps): raster hoá sang png = mất độ nét khi in → ảnh hưởng **production/print file**, không chỉ thumbnail. Phải biết bản nào (original / master / preview) được dùng khi generate design.
- Lỗi job chạy ngầm → merchant/buyer thấy gì? (thumbnail hỏng, layer trống, design thiếu ảnh). Đây là cái QA quan sát được, không phải Sentry.
- Sentry/"không tái phát sau deploy" là tiêu chí **monitor production**, QA staging không verify được → tách ra khỏi phạm vi test.
- Dữ liệu cũ đã fail trước fix: có backfill/re-run job không? Không thì đừng tính là regression.

## Requirement cần kiểm tra
- Danh sách extension trong scope và cách xử lý **từng** loại (convert png / map alias / passthrough / reject có thông báo).
- Danh sách **entry point** dùng chung service (portal upload, MCP/API upload, buyer upload SDK, apply-effects, clipart, mockup).
- Kết quả đầu ra: định dạng, kích thước, transparency, dung lượng, URL/extension của file master/preview.
- Hành vi khi decode cũng không được: job fail có kiểm soát? item có trạng thái lỗi? message cho user?
- Upload-side validation (accept list ở FE/API) có thay đổi không.

## Risks
- Fallback chỉ đổi lỗi từ encode sang decode → Sentry đổi tên issue nhưng vẫn fail.
- Raster hoá vector → print mờ, kích thước sai (svg không có px size cố định / viewBox).
- Security khi decode svg/pdf: SSRF/LFI qua `xlink:href`/`<image href>` ngoài, XXE, Ghostscript; passthrough svg lưu nguyên → stored XSS khi mở trực tiếp URL. Xem [[ssrf-url-fetch]], [[xss-sanitization]].
- Regression định dạng phổ biến (png/jpg/webp/gif): mất trong suốt, gif động thành tĩnh, đổi extension URL làm cache/CDN lệch.
- Nhầm extension URL (lưu `.svg` nhưng nội dung png) → downstream (render, Content-Type) sai.

## Suggested test focus
1. Mỗi extension trong scope × mỗi entry point: job hoàn tất, master/preview tạo được, hiển thị đúng ở portal/storefront.
2. Dùng ảnh vào artwork → preview design + generate order design: ảnh đúng, chất lượng vector ổn (nếu passthrough).
3. File đổi đuôi / không đuôi / `bin` thật là ảnh / `bin` không phải ảnh → xử lý có kiểm soát, không crash im lặng.
4. Định dạng ngoài scope (avif, ai, eps, gpx) → ghi nhận hành vi thực tế, hỏi PO expected.
5. Regression png/jpg/webp/gif: transparency, dung lượng, extension giữ nguyên.
6. SVG độc hại (script, external href, XXE) → không fetch nội bộ, không thực thi script.
