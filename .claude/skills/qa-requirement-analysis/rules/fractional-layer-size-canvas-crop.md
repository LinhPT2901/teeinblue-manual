# Fractional Layer Size → Canvas Truncation / Edge Crop (teeinblue backend render)

Dùng rule này khi issue nói clipart/image bị **cắt 1px ở cạnh phải/dưới**, hình tròn bị "phẳng" một bên, chỉ xảy ra khi layer size **không nguyên** (vd 50.88px), hoặc nhắc đến `EnsuresMinimumDimension`, `createValidCanvas`, truncate vs round canvas size. Bổ trợ [[font-size-precision-rendering]], [[image-colorspace-render]].

## Context to recognize

- Backend tạo canvas theo layer size rồi resize ảnh vào. Nếu canvas **truncate** (50.88 → 50) nhưng ảnh **round** (→ 51) → ảnh to hơn canvas 1px → mất 1 cột/hàng pixel ở cạnh phải/dưới (gốc toạ độ ở top-left nên luôn mất phải/dưới).
- Chỉ thấy lỗi khi phần thập phân **≥ .5** (round lên còn truncate xuống). Với .1–.49 cả hai đều ra cùng số → không lệch. Test với .88 thấy, với .3 có thể không thấy → dễ false pass/false fail.
- Layer size thập phân hay sinh ra **gián tiếp**: scale artwork vào printarea của product khác, Cover/Contain tính theo aspect ratio → "cùng artwork, product này OK product kia cắt".
- Hàm helper dạng "EnsuresMinimumDimension" thường là **trait dùng chung** cho nhiều layer type (clipart, image, upload photo, photo effect/GenAI, mask...) → phạm vi regression rộng hơn mô tả bug.
- Live preview (SDK/browser) không đi qua code này → thường đúng sẵn; bug chỉ ở **test design / order design / print file**.

## Requirements to check

- Cạnh phải/dưới đủ pixel với size thập phân ≥ .5 (vd .88), và size < .5 (vd .3) không bị lệch kiểu ngược lại (canvas không thừa viền trong suốt).
- Mọi style fit: default (stretch), Cover, Contain.
- Size nguyên → pixel-identical như trước.
- Mọi entry point render chung renderer: test design, order design, regenerate (single/bulk), customization image nếu dùng chung.
- Các layer type cùng trait: clipart, image, photo upload, photo + effect.
- Design cũ chỉ đúng sau regenerate (không tự đúng).
- Hằng "minimum dimension" (vd ≥1px) vẫn giữ khi size rất nhỏ (0.4px → round 0 → phải vẫn ≥1).

## Risks

- Chọn ảnh vuông/không có chi tiết sát mép → không nhìn ra 1px mất → false pass. Nên dùng clipart tròn/viền sát mép, đo bằng pixel (magick / zoom).
- **Kiểm alpha bbox của file trước khi dựng data**: file "hình tròn" thường có padding trong suốt (vd TIB-5587: mask-circle-black.png 400px, bbox 10..390 = 2.5% padding → 1px cắt rơi vào vùng trong suốt, trước/sau fix giống nhau). Hình phải chạm 4 cạnh canvas. Đo bbox với ngưỡng alpha cao (vd ≥ 128), không dùng alpha > 0 — pixel nhiễu mờ ở góc làm bbox giả "chạm cạnh" (mask-circle-8000.png: alpha>0 ra 0..7999 nhưng hình đặc là 100..7899, padding 1.25% ≈ 0.56px ở 50.88px — vẫn đủ nhỏ để thấy vết cắt 1px).
- Cover của clipart = **stretch** (méo hình theo box), không phải scale + crop (TIB-5587, quan sát trên staging, chưa có dev confirm).
- Clipart vuông trong box vuông → Cover và Contain ra y hệt nhau; muốn phân biệt fit mode cần box hoặc ảnh không vuông.
- Rounding thay đổi vị trí/kích thước 0.5px → lệch nhẹ so với layer khác hoặc printarea; cần ảnh grid để so vị trí ([[position-test-grid-image]] trong memory).
- Size rất nhỏ (< 0.5) bị round về 0 → lỗi canvas 0px.
- Width và height thập phân độc lập (50.88 × 50) → chỉ 1 cạnh bị ảnh hưởng.

## Suggested Test Focus

1. Clipart tròn 50.88 × 50.88 → design không bị phẳng phải/dưới (zoom + đo pixel).
2. Lặp với Cover / Contain / stretch.
3. Biên: .49 vs .5 vs .88; chỉ width thập phân; chỉ height thập phân; size rất nhỏ.
4. Regression size nguyên, photo upload, photo + effect.
5. Order design + regenerate khớp test design; order cũ trước fix sau regenerate.
