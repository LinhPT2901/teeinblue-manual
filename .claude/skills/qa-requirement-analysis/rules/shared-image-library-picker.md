# Rule: Shared image library thay cho upload rời từng field (teeinblue portal)

## Khi nào áp dụng
Issue gom nhiều điểm "upload ảnh từ máy" rải rác (thumbnail, mask, background, marker, reference image...) vào **một library dùng chung** để upload 1 lần, dùng lại nhiều nơi. Keyword: "image library", "mask library", "Misc", "re-use image", "upload once", "library for thumbnail/mask/background". Ví dụ gốc: TIB-5192. Bổ trợ [[asset-copy-on-pick-dedup-key]], [[image-field-upload-only]], [[category-management-parity]], [[asset-library-bulk-thumbnail]], [[access-control-idor]].

## Context cần nhận diện
- Library = **nguồn**, các field = **consumer**. Ticket thường liệt kê consumer kèm "and others" → scope mở, QA phải ép ra danh sách đóng.
- Chia **type** (vd Mask vs Misc) quyết định field nào thấy ảnh nào → cần ma trận field × type.
- Field cũ đang lưu URL/file upload trực tiếp. "Không migrate ảnh cũ" ≠ "ảnh cũ ngừng hoạt động" → luôn hỏi data cũ còn render/sửa được không.
- Reference giữa field và ảnh library: **copy URL** (xoá library không ảnh hưởng) hay **reference id** (xoá library làm vỡ consumer). Đây là câu quyết định mọi case delete.
- Có thể có issue vệ tinh: category hệ thống read-only (vd `TIB Assets`), Open API upload vào library.

## Requirement cần kiểm tra
- Danh sách consumer chính xác theo từng type; field nào vẫn giữ upload trực tiếp song song với library.
- Upload ngay trong picker có tự vào library không, vào type/category nào.
- CRUD category per type: trùng tên, xoá category còn ảnh, ảnh không category, scope per account hay per store.
- Xoá/đổi tên/replace ảnh đang được dùng: chặn, cảnh báo, hay consumer vỡ.
- Định dạng/size/kích thước theo type (mask cần alpha/đen trắng? SVG?), validate theo nội dung file.
- Quyền staff/role với library; ownership cross-tenant (id, path, URL CDN tuyệt đối).

## Risks
- Mỗi consumer render theo cách riêng (editor SDK, buyer preview, print API, mockup) → ảnh chọn từ library phải ra kết quả giống hệt upload trực tiếp trước đây.
- Type filter sai → mask hiện ảnh Misc hoặc ngược lại.
- Xoá ảnh library làm vỡ artwork/campaign/storefront đang live.
- Library phình (upload trùng không dedup), không có search/pagination.
- File CDN public + ownership check thiếu → dùng ảnh merchant khác.

## Suggested test focus
1. Ma trận consumer × (chọn từ library / upload mới / data cũ) → lưu + render đủ editor, preview, print/order.
2. Type isolation: picker của field Mask chỉ hiện Mask, của Misc chỉ hiện Misc.
3. Category CRUD + filter trong picker.
4. Xoá/replace ảnh đang dùng → hành vi consumer theo confirm.
5. Backward compat: field cũ có ảnh upload trước feature vẫn render, mở/save không mất ảnh.
6. Security: asset merchant khác qua id/path/URL CDN.

## Đã chốt với PO (TIB-5192, trungld 2026-10-28)
- Field **copy URL**, không lưu library id. Xoá ảnh đang dùng → **chặn**, lỗi liệt kê nơi dùng (product, campaign + Etsy featured, clipart category, mockup, campaign mockup, artwork, global option); ảnh đang `processing` cũng không xoá được. Rename chỉ đổi tên library; không có Replace.
- Click vùng upload của field → mở library; upload trong dropzone tự vào library với type của field + category đang chọn ("All" → uncategorised). Product base / clipart category / campaign featured image chỉ set từ library (API từ chối file trực tiếp).
- Ảnh cũ giữ URL, vẫn render/save; không hiện trong picker.
- File: Mask = PNG/APNG/WebP; Image = PNG/APNG/JPEG/GIF/WebP; SVG + AVIF bị từ chối cả 2 type; check theo nội dung. Portal 128 MB/file, 10 file/batch, không giới hạn dimension; MCP 20 MB.
- Category per account (organisation), tách theo type, cho trùng tên; xoá category → ảnh về uncategorised. Limit 1.000 upload/24h/account (admin nâng được), không cap tổng.
- Clone trong account dùng chung URL; import sang account khác copy file, bản copy không vào library bên nhận.
- Clipart item thumbnail vẫn upload trực tiếp (ngoài scope). MCP library-image tools thuộc scope.
