# Rule: Block URL input on image fields — upload-only (teeinblue portal)

## Khi nào áp dụng
Issue nói về việc **bỏ ô dán URL** ở các trường chèn ảnh (image insert field) và chỉ cho **upload file**; keyword: "block URL link", "allow file upload only", "paste link", "Browse", "image URL field", "text background image", "reference image", "marker icon", "custom mask", "default background image". Cũng áp dụng cho bất kỳ thay đổi nào biến một input tự do (URL/link) thành input có kiểm soát (upload/picker).

## Context cần nhận diện
- Trường ảnh dạng URL nghĩa là **backend sẽ tự fetch file từ link đó** khi validate artwork và khi generate design lúc có order → xem thêm [ssrf-url-fetch.md](ssrf-url-fetch.md) cho mặt security.
- Hai failure mode đã gặp thực tế:
  1. File link quá lớn → fetch vượt **timeout 15s** của backend khi generate order → design fail, không render.
  2. Site chứa link down/maintenance → validate artwork trả `Server error`, không lưu được artwork.
- Fix kiểu này thường là **FE-only** (ẩn/bỏ input URL trong portal). Điều đó KHÔNG chặn được:
  - artwork cũ đã lưu link ngoài (data legacy vẫn tồn tại và vẫn được fetch),
  - client khác gọi trực tiếp API/GraphQL với payload chứa URL,
  - import/clone/duplicate artwork, global template propagate, mang theo link cũ.
- Vì vậy phải luôn tách rõ: **UI đã chặn** ≠ **server đã chặn**.

## Requirement cần kiểm tra
- Danh sách **đầy đủ** các trường ảnh bị ảnh hưởng — "all image insert fields" là câu chữ rủi ro nhất của loại ticket này. Bắt PO/Dev liệt kê chính xác, rồi QA đối chiếu bằng cách rà từng layer type trong editor. Ứng viên thường bị bỏ sót: clipart/asset picker, mockup upload, artwork background, shape/pattern fill image, frame image, store logo, layer image library.
- Sau khi bỏ URL, các thứ còn lại của trường phải **giữ nguyên**: upload, preview thumbnail, nút remove/clear, link mở library/picker, validate định dạng (png/jpg/webp/svg?) và max size.
- Trường bắt buộc: nếu layer yêu cầu có ảnh, việc bỏ URL không được làm mất khả năng thoả mãn điều kiện đó (vẫn upload được).
- Backward compatibility: artwork cũ dùng link ngoài phải **vẫn hiển thị và vẫn lưu được** (không bị validate mới chặn, không bị xoá ảnh khi mở rồi save).
- Server-side: có ticket/kế hoạch chặn URL ở API chưa? Nếu chưa, đây là known limitation cần ghi rõ, không phải bug.

## Impacted areas
- Portal artwork editor (v2 layer editor + quick toolbar của text/paragraph/curve text/warp text/scrabble).
- Layer types có trường ảnh: photo (default background image, AI reference image, watercolor custom mask), Street Maps / Route Maps / Calendar (marker icon).
- Artwork save/validate API (đường fetch URL phía server vẫn tồn tại).
- Order generate / render pipeline (nguồn gốc lỗi timeout 15s).
- Clone/duplicate artwork, global template & replica layer (mang theo link cũ).
- Các khu vực upload khác không thuộc artwork editor (vd store settings logo) — phải **không** bị ảnh hưởng.

## Risks
- Regression: bỏ URL làm hỏng luôn luồng upload/preview/remove của cùng trường đó.
- Bỏ sót trường: một vài trường ảnh vẫn còn ô URL → mục tiêu ticket không đạt.
- Over-block: chặn cả trường ảnh ngoài phạm vi (mockup, store logo, clipart library).
- Artwork legacy dùng link ngoài bị lỗi khi mở/lưu, hoặc ảnh biến mất.
- False sense of security: chỉ chặn ở UI, API vẫn nhận URL → lỗi generate order vẫn xảy ra với client khác/data cũ.
- Nếu Dev không verify được một trường trên UI local (thường là custom mask của watercolor) → QA phải coi trường đó là **chưa được verify**, test tay bắt buộc.

## Open questions template
- Danh sách chính xác các trường ảnh trong scope? Trường nào cố tình để ngoài scope và vì sao?
- Có chặn URL ở phía server (API/GraphQL) không, hay chỉ FE? Nếu chỉ FE thì ticket backend đi kèm là gì?
- Artwork cũ đang lưu link ngoài: xử lý thế nào — giữ nguyên, migrate sang file upload, hay cảnh báo cho seller?
- Định dạng và max file size cho phép ở từng trường sau thay đổi (có thống nhất không)?
- Có cần thông báo/empty-state mới cho seller đang quen dán link không?

## Suggested test focus
1. Rà từng trường ảnh trong danh sách scope: chỉ còn nút upload/Browse, không còn input URL (kể cả không paste được vào đâu).
2. Upload happy path từng trường: ảnh áp dụng đúng vị trí (nền chữ, reference, marker, mask...), preview đúng, remove được.
3. Validate định dạng/size sai → thông báo lỗi rõ ràng, không crash.
4. Artwork legacy có link ngoài: mở → ảnh vẫn render; save → không lỗi; generate order → hành vi như trước (hoặc vẫn lỗi nếu link xấu → đúng known limitation).
5. Out-of-scope regression: store logo, mockup upload, clipart library vẫn upload/paste như cũ.
6. Save artwork qua API với payload chứa URL → xác nhận server còn nhận hay đã chặn (phân định UI-only vs full fix).
7. Clone/duplicate artwork + global template propagate: link cũ đi theo thế nào.
