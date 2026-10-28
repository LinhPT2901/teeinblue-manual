# Asset Library & Bulk Thumbnail Operations (teeinblue portal)

Dùng rule này khi issue nhắc tới: Clipart / Vector / Additional options / Map styles / Font / Color **category**, `Bulk action`, upload nhiều file, `Upload options` modal (Keep all items / Replace existing items), thumbnail của asset item, `RegenerateClipartImage`, `PreviewableImageMaker`, endpoint `POST /cliparts/{id}/thumbnail`, hoặc dropzone trong Editor asset library.

## Context cần nhận diện

- Asset library trong portal dùng **chung một component base** (`EditorBasic`) cho nhiều category: Clipart, Vector, Additional option, Map style, Font, **và Color**. Bất kỳ thay đổi nào ở thanh action/bulk action đều có nguy cơ **rò rỉ sang category ngoài scope** (đặc biệt Color, vốn không có file ảnh theo nghĩa thông thường).
- Mỗi asset item có ít nhất 3 biến thể ảnh: `original`, `large`, `thumbnail`. Thumbnail có thể là ảnh tự sinh **hoặc** ảnh custom do seller upload riêng.
- Vector (SVG) và Font đi **luồng upload khác** với raster (Clipart / Additional option / Map style). Đừng giả định một behavior áp dụng đồng đều cho mọi category — luôn hỏi/verify từng category.
- Thumbnail được phục vụ qua CDN/Cloudflare có cache + purge theo từng biến thể ảnh.

## Requirement cần kiểm tra

- **Quy tắc match theo tên file**: xác nhận rõ với PO — có bỏ phần mở rộng không, case-sensitive hay không, có trim khoảng trắng không, có normalize dấu/ký tự đặc biệt không. Đây là điểm gần như luôn bị bỏ trống trong ticket nhưng quyết định phần lớn kết quả bulk match.
- **Trùng tên**: (a) nhiều asset item cùng tên trong 1 category, (b) nhiều file cùng tên trong 1 lô upload. Cần rule xử lý rõ ràng (apply tất cả / chỉ item đầu / báo lỗi) và phải nhất quán với con số "matched" hiển thị cho seller.
- **Phạm vi category**: ticket liệt kê category nào thì entry point chỉ được xuất hiện ở đúng category đó. Kiểm tra cả category KHÔNG nằm trong scope.
- **Số đếm hiển thị phải bằng số thực sự được xử lý**: nếu UI báo "X files matched" nhưng backend chỉ apply cho một phần thì đó là defect về tính trung thực của thông báo, không phải chuyện nhỏ.
- **Item chưa từng có thumbnail** khi chọn option "giữ thumbnail": kết quả cuối là không có thumbnail hay fallback về ảnh gốc — phải confirm, không tự giả định.
- **Giới hạn file**: số lượng file tối đa, dung lượng tối đa, định dạng chấp nhận (`accept="image/*"` không chặn được file hỏng / SVG / HEIC). Confirm error message cho file không hợp lệ.
- **Default option**: khi đổi label/thêm option trong `Upload options` modal, xác nhận option nào là default và default có đổi so với trước không (đổi default = thay đổi hành vi của seller cũ).

## Impacted Areas

- Editor asset library của **tất cả** category dùng chung base component (kể cả category ngoài scope).
- Luồng upload asset hiện có (drag & drop dropzone, retry, progress, replace theo tên).
- `Upload options` modal — đổi label option cũ ảnh hưởng seller đang quen UI cũ + ảnh hưởng bản dịch/lang file.
- Bulk delete (mục cũ của `Bulk action`) — bị đổi từ button sang dropdown item.
- Job xử lý ảnh backend (regenerate original / large / thumbnail) + CDN purge theo biến thể.
- Hiển thị asset ở nơi tiêu thụ: artwork editor layer picker, storefront personalization form, mockup — thumbnail sai/không cập nhật sẽ lộ ở đây.

## Risk Patterns

- **Cache CDN**: purge thiếu biến thể → seller vẫn thấy ảnh cũ, dễ bị QA/khách hiểu nhầm là bug logic. Luôn hard refresh + kiểm tra URL/version của ảnh trước khi kết luận.
- **Partial failure không rõ ràng**: lô upload lớn, một số item lỗi, toast chỉ báo số lượng mà không nói file nào → seller không biết phải làm lại cái gì.
- **Không cancel / điều hướng giữa chừng**: đổi category, đóng modal, reload trang khi batch đang chạy → state UI và dữ liệu thật lệch nhau cho tới khi reload.
- **Concurrency**: upload song song nhiều luồng → thứ tự ghi không xác định khi 2 file cùng trỏ về 1 item.
- **Regression âm thầm ở luồng upload asset cũ** khi thêm option mới vào cùng modal.
- **Không có retry** ở luồng mới trong khi luồng cũ có retry → tỉ lệ fail cao hơn với mạng chậm.

## Open Questions thường phải hỏi

- Rule match tên file chính xác là gì (case, extension, whitespace, dấu)?
- Xử lý trùng tên (cả 2 chiều) như thế nào?
- Giới hạn số file / dung lượng / định dạng?
- Có cần progress tổng và khả năng cancel không?
- Có cần list cụ thể file lỗi sau khi upload xong không?
- Entry point có được phép xuất hiện ở category ngoài scope không?
- Option mới có áp dụng cho Vector/Font không, hay chỉ raster?

## Suggested Test Focus

- Matrix category × chức năng: mỗi category trong scope + ít nhất 1 category ngoài scope.
- Matrix match: khớp hoàn toàn / khác hoa-thường / khác extension / có khoảng trắng / tên có dấu / không khớp / lô toàn file không khớp.
- Trùng tên: 2 item cùng tên, 2 file cùng tên.
- Verify thumbnail mới ở **cả** danh sách asset library, artwork editor và storefront (không chỉ ở list).
- Verify ảnh gốc (original/large) KHÔNG bị đổi khi chỉ update thumbnail, và ngược lại.
- Interrupt: đóng modal, đổi category, reload, mất mạng giữa batch.
- Regression: bulk delete, upload asset thường với từng option của `Upload options`.

## Security: quyền truy cập file CDN (bài học TIB-5516, 2026-10-09)

- File `users/<merchant>/...` trên CDN (`cdn.ownego.com/teeinblue-staging/...`) hiện **public**, không cần login. Ở TIB-5516, API chặn path `users/<merchant khác>/...` nhưng nhận URL CDN tuyệt đối của cùng file → ownership check bị bypass bằng đổi định dạng.
- Với issue library cho image layer (thumbnail, mask, ảnh gốc...), luôn hỏi: file nào cần private, có signed URL không, ownership check có áp dụng cho URL tuyệt đối không, URL ngoài domain có được fetch không, giới hạn kích thước file tải về.
- Test focus: dùng asset của merchant khác qua (a) id, (b) path tương đối, (c) URL CDN tuyệt đối; truy cập trực tiếp URL CDN không login.
