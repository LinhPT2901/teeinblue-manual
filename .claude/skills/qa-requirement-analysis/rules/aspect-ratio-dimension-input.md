# Aspect-Ratio Locked Width/Height Input (teeinblue)

Dùng rule này khi issue nhắc đến ô Width/Height tự tính chiều còn lại theo tỉ lệ (Locate artwork, resize layer, printarea, mockup, image crop…), lệch 1px / off-by-one, hoặc làm tròn (rounding) khi giữ tỉ lệ.

## Context to recognize

- Tỉ lệ có thể lấy từ 2 nguồn: **kích thước gốc** (artwork/image/printarea gốc) hoặc **kích thước hiện tại** (box đã locate/lưu, vốn đã làm tròn về số nguyên). Lấy từ nguồn đã làm tròn → sai số cộng dồn (rounding 2 lần).
- Thường có nhiều entry point cùng thay đổi kích thước: gõ Width, gõ Height, kéo handle trên board, nút căn lề/fit, Reset — mỗi cái có thể dùng nguồn tỉ lệ khác nhau.
- Giá trị lưu xuống (top/left/width/height) ảnh hưởng render design/print file, không chỉ UI.

## Requirements to check

- Round-trip: nhập đúng chiều gốc → chiều kia ra đúng chiều gốc (cả 2 hướng W→H, H→W).
- Kiểu làm tròn (round / floor / ceil) và floating point (vd 4459.9999 → floor ra 4459).
- Giá trị tối thiểu (thường 1) khi tỉ lệ cực lệch; xử lý 0, rỗng, âm, thập phân, ký tự không phải số.
- Gõ liên tiếp W rồi H rồi W: không drift dần.
- Entry point nào được fix, entry point nào giữ nguyên (known limitation) → test sự nhất quán khi trộn (kéo rồi gõ, gõ rồi kéo).
- Dữ liệu cũ đã lưu sai: có tự sửa không hay phải nhập lại + Save.

## Impacted Areas

- Editor UI (input W/H, drag resize, align/fit, Reset all, Save).
- Dữ liệu vị trí đã lưu → design render / print file / mockup preview / storefront.
- Clone/duplicate campaign, import/copy vị trí sang printarea khác.

## Risk Patterns

- Test chỉ với số "đẹp" (ratio chia hết) → false pass; cần kích thước lẻ/nguyên tố như 4460x6823.
- Fix tỉ lệ cho ô input nhưng drag vẫn dùng tỉ lệ box → trộn thao tác sinh lệch.
- Artwork gốc bị đổi kích thước/thay artwork sau khi đã locate → tỉ lệ "gốc" là cái nào.
- Artwork xoay (rotate) hoặc có offset → W/H tính trên box trước/sau xoay.

## Open Questions To Consider

- Nguồn "kích thước gốc" là gì (canvas artwork, ảnh, printarea)?
- Kiểu làm tròn và min/max cho phép?
- Dữ liệu cũ sai có cần migration không?
- Drag resize có nằm trong scope sau này không?

## Suggested Test Focus

- Kích thước lẻ, ratio dọc/ngang/vuông, ratio cực lệch (min 1).
- Round-trip 2 chiều + nhập liên tiếp nhiều lần.
- Trộn drag + gõ; Reset all; Save → reload → giá trị đúng.
- Render design sau Save đúng kích thước đã nhập.
