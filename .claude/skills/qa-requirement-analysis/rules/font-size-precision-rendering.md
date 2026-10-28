# Font-Size Rounding / Precision Across Render Outputs (teeinblue)

Dùng rule này khi issue nhắc đến text/curve-text/paragraph field bị **shrink/lệch size** giữa live preview, customization image (thumbnail), và order design/print file — đặc biệt khi kèm **Autoscale**, "fit-down"/auto-fit, hoặc backend làm tròn font size trước khi vẽ.

## Context to recognize

Khi text overflow box, có 2-3 nơi tính font size độc lập:
- **SDK/live preview** (frontend): tính font size để fit, giữ **fractional** (vd 12.41) vì canvas/CSS render mượt với số thập phân.
- **Backend renderer** (dùng chung cho customization image + order design/print): trước khi vẽ có thể **round** font size fractional về số nguyên (hoặc làm tròn khác nhau ở từng code path) → lệch với preview. Mức lệch phụ thuộc scale: font nhỏ (12.41→12, lệch ~3%) thấy rõ hơn font lớn (100→100.5, lệch ~0.5%, gần như không thấy) dù cùng lỗi.
- Nhiều loại layer cùng đi qua logic fit-down này: `text` với Autoscale, `curve-text` với Autoscale, `paragraph` khi dòng dài nhất cần shrink để fit — không chỉ 1 loại layer.

## Requirements to check

- **Parity 3 chiều**: live preview, customization image, order design/print phải hiển thị cùng font size / cùng cách wrap — không chỉ so 2 trong 3.
- **Áp dụng cho mọi loại layer bị fit-down**: text autoscale, curve-text autoscale, paragraph auto-fit — không chỉ loại layer nêu trong bug report gốc.
- **Regression cho case KHÔNG bị fit-down**: layer không bật Autoscale / font size nguyên, không bao giờ overflow → output phải pixel-identical trước/sau fix (đây là nhóm layer không đi qua code path bị sửa, dùng làm baseline no-op).
- **Legacy/đã tồn tại**: design/customization image tạo TRƯỚC khi fix deploy có tự động đúng lại không, hay chỉ đúng khi **regenerate** (single hoặc bulk)? Nếu chỉ đúng khi regenerate, cần rõ: dữ liệu cũ có được coi là "chấp nhận được sai" hay cần backfill.
- **Tất cả entry point cùng dùng chung renderer**: xác nhận danh sách nơi gọi cùng 1 renderer (customization image, order design, bulk regenerate, export, mockup preview render) đều nhận fix — không sót entry point nào vẫn còn code path round cũ.

## Impacted Areas

- Backend renderer dùng chung cho customization image + order design (so sánh call site nào share, nơi nào tách riêng).
- Regenerate design (single) và Bulk regenerate designs — nơi verify fix áp dụng cho order cũ.
- Layer types: `text` (Autoscale), `curve-text` (Autoscale — kết hợp thêm rủi ro từ [[curve-text-render]]), `paragraph` (auto-fit-down — liên quan [[paragraph-field-sync]] cho phần SDK-side sizing, dù thường out-of-scope với fix backend-only).
- SDK/live preview — thường KHÔNG bị đổi (đã dùng fractional từ trước) → là baseline "đúng" để so sánh, không phải thứ cần fix.

## Risk Patterns

- Chỉ test loại layer nêu trong bug report, bỏ sót loại layer khác cùng chung code path (vd bug report ghi "text" nhưng fix chung áp dụng cả curve-text/paragraph).
- Nhầm "làm tròn 2 chữ số thập phân" là hết lỗi hoàn toàn — vẫn còn sai số cực nhỏ, cần biết ngưỡng chấp nhận được (tolerance) là gì, ai xác nhận.
- Test trên order/design tạo MỚI sau fix nhưng quên test regenerate cho order CŨ (nơi bug thực sự ảnh hưởng người dùng thật).
- Đổi rounding có thể ảnh hưởng nhẹ tới các renderer khác dùng chung hàm (vd nơi cố tình cần số nguyên, như canvas sizing tính theo pixel) — cần xác nhận phạm vi hàm bị đổi có bị dùng cho mục đích khác không.
- So sánh "giống nhau" chỉ bằng mắt thường ở font nhỏ — nên có case font nhỏ (dễ thấy lệch) THAY VÌ chỉ test font lớn (lệch không thấy được, false pass).

## Open Questions To Consider

- PR/fix đã merge và deploy lên môi trường test chưa (so sánh trạng thái PR vs Jira status)?
- Danh sách đầy đủ các entry point/renderer dùng chung logic bị sửa — có sót path nào không?
- Order/customization image cũ (trước fix) có auto-đúng lại không, hay bắt buộc phải regenerate mới đúng?
- Có ngưỡng tolerance nào được định nghĩa cho "matching" giữa 3 output, hay yêu cầu khớp tuyệt đối?
- Các bug/ticket duplicate trước đó (nếu có) có phạm vi rộng hơn (vd thêm khu vực hiển thị khác ngoài customization image/order design) mà ticket hiện tại không nhắc tới — có cần regression thêm không?

## Suggested Test Focus

- So sánh song song 3 output (live preview / customization image / order design) trên cùng 1 field, với text đủ dài để chắc chắn kích hoạt shrink (tỷ lệ shrink gần như luôn ra số thập phân).
- Lặp lại cho từng loại layer bị fit-down: text autoscale, curve-text autoscale, paragraph auto-fit gần giới hạn box.
- Regression: layer KHÔNG autoscale / size nguyên → output không đổi so với trước fix.
- Regenerate design (đơn) và Bulk regenerate designs trên order cũ (tạo trước khi fix deploy) → xác nhận ra kích thước đúng sau khi regenerate.
- Nếu có font nhỏ và font lớn cùng bug: ưu tiên test case font nhỏ vì lệch dễ nhìn thấy hơn, tránh false pass vì lệch quá nhỏ để mắt thường phát hiện.
