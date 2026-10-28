# Rule: Màu ảnh lệch giữa preview và design render (colorspace / ICC / alpha — teeinblue)

## Khi nào áp dụng
Issue nói "Test design / order design khác màu Live preview", màu bị ám (trắng → hồng/salmon, đen → teal), Imagick đọc sai colorspace, `transformImageColorspace`/sRGB, ICC profile, CMYK, AVIF/HEIC/JPG CMYK master, mất alpha khi convert. Bổ trợ [[image-encode-format-fallback]], [[warp-text-clipart-background]], [[curve-text-render]].

## Context cần nhận diện
- Có nhiều bản của 1 asset: **original/master**, **large**, **preview/thumbnail**. Live preview (browser/SDK) thường dùng bản `large`/preview do browser decode; design render (server, Imagick) dùng **master**. Lệch màu thường do 2 decoder khác nhau, không phải do campaign.
- "Đúng màu" phải so với **file gốc** (mở bằng viewer chuẩn), không chỉ so design vs Live preview — nếu preview cũng sai thì "khớp nhau" vẫn có thể sai.
- File **không có ICC profile** vs **có ICC profile (sRGB, Display P3)** vs **CMYK** đi nhánh khác nhau → fix "convert sang sRGB" có thể đổi màu file vốn đúng (double-convert).
- Fix màu hay đánh đổi alpha (transparent → nền đen/trắng). Phải biết limitation có được PO chấp nhận và preview có thể hiện giống không.
- Một asset được dùng ở nhiều chỗ render: image layer, clipart (single/bulk), text background, curve/warp text background, mask, mockup, buyer upload. Fix có thể chỉ chạm 1 code path.
- Design cũ đã generate sai không tự sửa → chỉ regenerate mới đúng; không tính là regression.

## Requirement cần kiểm tra
- Phạm vi format bị fix (chỉ AVIF? HEIC? JPG CMYK?) và loại file (có/không ICC).
- Danh sách entry point render dùng master (layer image, clipart, text bg, curve/warp, mask, mockup, buyer upload).
- Hành vi alpha sau fix: giữ / nền đen / nền trắng; preview có khớp không.
- Output format (PNG/JPG/PDF/SVG) có giữ màu không; PDF/CMYK print có convert lại không.
- Dữ liệu cũ: cần regenerate không, có backfill không.

## Risks
- "Design khớp preview" nhưng cả 2 cùng sai so với file gốc.
- Double colorspace conversion làm lệch màu file có ICC/P3.
- Regression PNG/JPG/WebP: mất transparency, đổi màu nhẹ.
- Fix chỉ ở 1 path (vd image layer) còn path khác (text bg, mockup, buyer upload) vẫn sai.
- Hiệu năng: convert colorspace trên ảnh lớn → chậm/timeout render đơn hàng.
- So màu bằng mắt dễ sai → nên đo pixel (color picker / `magick ... -format %[pixel:p{x,y}]`).

## Suggested test focus
1. File gốc có vùng trắng/đen/màu mạnh, không ICC → design == preview == file gốc (đo pixel).
2. Cùng ảnh có ICC sRGB / P3 → không bị đổi màu sau fix.
3. Mỗi entry point render × mỗi output format.
4. Transparent file → đúng limitation đã chốt, không lỗi job.
5. Regression PNG/JPG/WebP (kể cả transparent), regenerate design cũ, ảnh lớn.
