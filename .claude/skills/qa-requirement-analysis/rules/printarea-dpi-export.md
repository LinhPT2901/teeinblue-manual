# Rule: DPI của print area & resolution file design export

## Khi nào áp dụng
Issue nhắc `DPI`, `PPI`, resolution file export, print size thật, print area quá lớn (>9000/10000 px) bị giảm kích thước, import product base từ provider kèm thông số in. Bổ trợ [[printarea-mapping]], [[pod-provider-capability-flag]], [[hd-preview-size-cap]].

## Kiến thức nền (TIB-5500, dev summary 2026-10-23)
- Provider gọi là DPI, pipeline render gọi là PPI, cùng một thứ.
- DPI chỉ đổi **metadata resolution** ghi trong file (PNG/JPG/PDF + thumbnail), **không đổi pixel** của design (design px = print area px). Kích thước in thật = px / DPI → đổi DPI mà không đổi width/height là đổi kích thước in.
- Print area cũ: `dpi` = null, hiển thị "300" mờ, export 300. Không migrate.
- Printify/Picanova (merchOne): print area > 9000 px tự giảm 1/2 kích thước + DPI 150 (trước TIB-5500 chỉ giảm size).
- Provider không có DPI trong API (vd Printbelle) → import mặc định 300.

## Đã chốt sau QA (dev tuanva, TIB-5500 comment 2026-10-30)
- DPI hợp lệ **72–300** (FE + BE + DB constraint `printareas_dpi_check`). Message FE: "DPI must be a whole number from 72 to 300".
- Provider trả DPI ngoài khoảng → BE đổi về 300 trước khi trả popup Import.
- Ngưỡng Printify/Picanova: width **hoặc** height `> 9000` (bằng 9000 không tính) → cả 2 cạnh /2, DPI 150.
- PDF 150 DPI trang to gấp đôi là đúng (cùng px, nửa DPI).
- Activity log: DPI null ghi là "300".
- Activity log product do browser ghi qua GraphQL từ trước, ngoài scope.
- Header `x-acting-user-id` kiểm tra membership org đã duyệt; sửa được data account khác = đang là member → không phải IDOR. Kiểm membership trước khi kết luận.
- Trang Products detail không load printareas từ 2022 (đã sửa trong TIB-5500).

## Requirement cần kiểm tra
- Phân biệt 3 trạng thái: null (cũ) / 300 tường minh / giá trị khác. Xoá trống inline → lưu null hay 300?
- Mỗi design format: PNG (pHYs, đơn vị px/m nên đọc ra có thể 149.99/59.06 px/cm), JPG (JFIF density), PDF (page size = px/DPI → kích thước trang đổi), SVG/format khác có DPI không.
- Mọi đường sinh file: order design, regenerate, bulk regenerate, bulk download, test design, file gửi provider fulfill.
- Đường ghi DPI: inline edit, form New printarea, popup Import from provider, import product base mới, admin, Hasura trực tiếp, MCP/Open API.
- Copy/clone: duplicate product base, clone campaign, copy/paste printarea, custom printarea campaign, Platform Product (không có product base).

## Risks
- Validate chỉ ở FE; Hasura cho role user update cột `dpi` → ghi được 0/âm/khổng lồ bằng GraphQL.
- Ngưỡng 9000 px: theo cạnh dài, width hay height, `>` hay `>=`; ảnh hưởng re-import product đã tồn tại.
- Đọc DPI bằng tool khác nhau ra số làm tròn khác nhau → fail giả.
- Test trên print area cũ (null) tưởng 300 đã được lưu.

## Open Questions thường phải hỏi
- Min/max DPI? Nhận số thập phân không?
- Re-import vào product base đã có có ghi đè DPI thủ công không?
- MCP/Open API có field DPI chưa?
- Design format nào ghi DPI, PDF đổi page size có đúng ý không?
