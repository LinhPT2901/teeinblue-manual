# Rule: Resize ảnh input gửi provider AI theo loại model (generative vs processing-only) — teeinblue

Dùng khi issue nói về việc ảnh buyer upload bị resize (vd 1024px) trước khi gửi sang GPT/Flux/Gemini/ImagenHub, `image_filter` effect, template ImagenHub chỉ xử lý ảnh (remove background, upscale, filter), chất lượng output thấp do input bị thu nhỏ (từ TIB-5652). Bổ trợ [[genai-provider-timeout-regression]], [[imagenhub-template-variable-sync]], [[hd-preview-size-cap]].

## Context cần nhận diện
- Rule resize áp theo **nhóm effect** (GenAI) chứ không theo **model** → template ImagenHub dạng processing bị capping oan.
- Cách hệ thống phân loại "generative vs processing" là điểm mấu chốt: field từ ImagenHub API, danh sách hardcode, hay config portal? Template nhiều bước (pipeline trộn processing + generative) thuộc nhánh nào?
- Kích thước ảnh gửi đi nằm ở **server → provider**, buyer/QA không thấy trên network trình duyệt. Chỉ quan sát gián tiếp qua kích thước output, hoặc cần log/dashboard của dev / ImagenHub.
- Output của effect thường được lưu lại và dùng cho cả preview storefront lẫn print file → phải biết bản nào dùng khi render order.

## Requirement cần kiểm tra
- Tiêu chí phân loại model + nguồn dữ liệu phân loại; template đổi model sau khi đã gắn vào artwork thì có cập nhật không (cache?).
- "Original" là bản nào (file gốc upload, `master`, bản đã convert HEIC/AVIF…)? Có giới hạn trên (dung lượng/pixel) để tránh provider từ chối/timeout không?
- Rule 1024 là cạnh dài, giữ tỉ lệ, không upscale ảnh nhỏ hơn?
- Phạm vi: chỉ `image_filter` hay cả Text to Image / Multiple Uploads / Global Option dùng ImagenHub, face cutout/upscaler nội bộ.
- Dữ liệu cũ (upload đã xử lý trước fix) có xử lý lại không.

## Risks
- Phân loại sai → template generative nhận ảnh full size (chậm, tốn chi phí, có thể lỗi) hoặc processing vẫn bị 1024.
- Ảnh lớn (≥ 4000px, upscale ×4) → vượt giới hạn provider, timeout, payload quá lớn, thời gian xử lý tăng mạnh.
- Mất alpha / sai colorspace khi gửi bản gốc thay vì bản đã resize-encode lại.
- Regression GPT/Flux/Gemini và template ImagenHub generative vẫn phải giữ 1024.

## Suggested test focus
1. Template processing (remove bg / upscale / filter) với ảnh lớn hơn 1024 → output giữ độ phân giải tương ứng ảnh gốc (đo pixel thật của file output).
2. Template generative → hành vi cũ (input 1024).
3. Ảnh ≤ 1024, ảnh rất lớn, ảnh dọc/ngang/vuông, PNG trong suốt, HEIC/WebP.
4. Preview storefront + order design/print file dùng output chất lượng cao.
5. Regression provider khác + thời gian xử lý.
