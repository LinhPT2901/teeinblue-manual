# Rule: Upload "thành công giả" — temporary file chưa tới storage (teeinblue portal/API)

## Khi nào áp dụng
Issue nói về asset upload phía merchant qua temporary file: `temporary-files/upload-url`, `PUT temporary-files/{id}/file` (fallback), các endpoint `*/by-temporary-file` (clipart, layer-images, mockup-layers), MCP `create-*-upload` → `confirm-*-upload`, job `MakePreviewableImages` / `RegenerateClipartImage` / `MakeLayerPreviewableImages` / `MakeMockupPreviewableImages`, `Storage::put()` trả false, `S3DropzoneMixin`, `failedFiles` / `retryFailedFiles`. Bổ trợ [[asset-library-bulk-thumbnail]], [[presigned-upload-network-resilience]].

## Context cần nhận diện
- Luồng 3 bước: xin signed URL (tạo record temporary file) → PUT thẳng S3 (fail mạng thì fallback PUT qua API) → gọi `by-temporary-file` để tạo item + dispatch job xử lý ảnh. Lỗi ở bước 2 mà bước 3 vẫn chạy = item hỏng (không ảnh/thumbnail), merchant không biết.
- Không tái hiện được "S3 ghi thất bại" từ UI → API test bằng cách **bỏ qua bước PUT**; portal test bằng chặn request (Playwright `route.abort` / `route.fulfill`), không dùng Claude in Chrome.
- Chặn request = **network error**, khác với API trả **422** → hai nhánh hiển thị lỗi khác nhau ở portal (message từ API vs message mạng). Test cả hai nếu được.
- Clipart uploader có retry (`failedFiles` → "Retry failed"); layer image / mockup layer uploader thường **không** có retry.
- Mỗi endpoint by-temporary-file có thể có path phụ (clipart: create vs replace / replace keep thumbnail).

## Requirement cần kiểm tra
- Mã lỗi + message chính xác cho từng endpoint, kể cả MCP tool (MCP thường bị bỏ khỏi QA plan).
- Kiểm tồn tại phải chạy **trước** khi tạo record/dispatch job (không item mới, item replace không đổi, không job failed).
- Fallback `uploadFile` khi `Storage::put()` false: status/message trả về và portal xử lý ra sao.
- Retry: dùng temporary file mới (signed URL mới), giữ lựa chọn Replace/Keep thumbnail, không tạo duplicate.
- Phân biệt temporary_file_id không tồn tại trong DB / của user khác / tồn tại DB nhưng thiếu file trong storage.

## Risks
- Request đã tới server nhưng response mất (timeout) → retry tạo duplicate.
- Batch lớn lẫn file lỗi/thành công → đếm failed sai, file thành công bị đánh dấu lỗi hoặc ngược lại.
- Message lỗi chưa có translation; hiển thị raw text API.
- Không quan sát được job queue trên staging (Horizon) → khó verify "không có job failed".
- Item hỏng tạo trước fix không được sửa — không nhầm với regression.

## Suggested test focus
1. API từng endpoint (create / replace / layer / mockup / MCP confirm) với temp file chưa PUT → 422 + không side effect.
2. Portal: chặn by-temporary-file → error state, failed bar, retry thành công, không duplicate; giả 422 bằng `route.fulfill` để xem message API.
3. Fallback qua API vẫn hoạt động khi chặn S3 PUT.
4. Batch lẫn lộn thành công/thất bại; replace + retry; giới hạn category.
5. Regression upload bình thường từng loại asset.

## Đã chốt (TIB-5544, 2026-10-14)
- Dropzone portal không hiện icon check xanh / dấu lỗi đỏ (CSS ẩn) → expected viết theo text trạng thái/lỗi.
- Clipart category không giới hạn số clipart → không viết case "category đầy".
- QA không truy cập Horizon staging → không đưa "không có job failed" vào expected bắt buộc; verify UI + API là đủ.
- MCP confirm tool trả message riêng ("File has not been uploaded yet…"), chấp nhận được.
