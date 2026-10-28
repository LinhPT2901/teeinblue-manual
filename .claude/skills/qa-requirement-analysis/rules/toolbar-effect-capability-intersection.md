# Toolbar effect theo capability, multi-select (teeinblue Artwork Editor)

Dùng khi issue tách một field/effect của toolbar (Shadow, Photo Border, HD, Shape Cut, Mask, Print Effects...) ra khỏi toolbar theo layer type để chạy được trên multi-select / group. Ticket gốc: TIB-5212. Bổ trợ [[bulk-edit-layers]], [[hd-preview-size-cap]], [[photo-border-prerender-client-render]], [[shadow-blur-scaling]], [[group-layer-mask]].

## Context cần nhận diện
- Field hiện khi **mọi** layer trong selection hỗ trợ nó (giao capability). Group được "mở" ra để xét các layer con, kể cả nested group; group layer bản thân không bị ghi.
- Đây là thay đổi cấu trúc toolbar → **mọi** toolbar theo type đều bị đụng (field bị gỡ khỏi từng type rồi gắn lại ở vị trí chung) → regression rộng, dễ hiện trùng 2 lần hoặc mất ở một type.
- Danh sách type hỗ trợ thường chỉ có trong comment dev/diff, không có trong description → cần PO confirm.

## Requirement cần kiểm tra
- Ma trận visibility: từng type đơn, mixed 2 type, group, nested group, empty group, group có layer không hỗ trợ.
- Điều kiện ẩn: hidden/locked layer hoặc group, đang reposition, layer link mới.
- **Mixed value**: các layer đang có giá trị khác nhau thì control hiển thị gì (giá trị layer đầu? rỗng? indeterminate?).
- **Ghi đè từng field hay toàn bộ config**: đổi 1 thuộc tính (vd color shadow) có ghi đè các thuộc tính khác (blur, offset) của mọi layer không.
- Undo: một thao tác trên N layer = 1 undo step.
- Thứ tự field trên toolbar + vị trí field bị dời (Shape Cut, Mask).
- Kết quả phải đi tới preview storefront + print file, không chỉ editor.

## Đã chốt ở TIB-5212 (dev 2026-10-27)
- Shadow mixed: toggle Off trừ khi mọi layer bật; color đen, blur/X/Y rỗng, Display trống; đổi 1 thuộc tính chỉ ghi thuộc tính đó.
- Photo Border mixed: hiện default; **bật toggle ghi đè toàn bộ** (type, color, size, display, line) lên mọi layer; đổi 1 thuộc tính cũng bật border cho mọi layer.
- Mỗi thay đổi = 1 undo step; ô số lưu theo từng phím (gõ "12" = 2 step).
- Ẩn cả 3 field khi selection có layer customization type Linked. Chọn 1 group (2.0) ẩn Photo Border.
- Artwork 1.0 cùng rule, trừ Shadow trên paragraph chỉ có ở 2.0.

## Risks
- Field trùng / mất trên một toolbar type ít dùng (calendar, clock, word cloud, moon phase...).
- Ghi nhầm vào group layer hoặc layer không hỗ trợ trong group.
- Ghi đè toàn bộ config làm mất setting riêng của từng layer.
- Đường sửa không qua editor (MCP/API, global option) không đồng bộ với logic mới.

## Suggested test focus
Ma trận visibility theo type + group; mixed value; partial change; undo/redo; hidden/locked; regression single layer; storefront/print sau save.
