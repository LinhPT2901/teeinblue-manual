# Curve Text Render Rules (teeinblue)

Dùng rule này khi issue nhắc đến curve text render, `CurveTextRenderer`, `drawPositiveCurveText` / `drawNegativeCurveText`, `curve_radius`, ImageMagick "cache resources exhausted" / OpenPixelCache / pixel-cache, canvas sizing của curve text, hoặc `CurveTextEditor.vue` corner-drag resize. Bổ trợ [[warp-text-clipart-background]], [[global-template-kept-fields]].

## Context to recognize

Curve text bẻ chữ theo cung tròn bán kính `curve_radius`. Backend render (`CurveTextRenderer`) tạo canvas làm việc để vẽ từng glyph rồi composite vào artwork. Nhiều canvas được clone mỗi lần render (main, shadow source, stroke, char) → nếu canvas quá lớn, nhân lên nhanh và có thể vượt ImageMagick pixel-cache → crash "cache resources exhausted".

Bug class điển hình: canvas size không tính theo hình học thực của cung (chord width, sagitta height) mà lấy theo text_width bình phương → với `curve_radius` rất nhỏ so với text_width, canvas khổng lồ gần như trống → nổ RAM. Có 3 tầng thiếu guard: (1) FE `CurveTextEditor.vue` corner-drag rescale radius chỉ floor 0.05, không ràng buộc theo text_width/font_size (khác Quick Editor slider tự giới hạn `|radius| >= fontSize*1.2`); (2) backend validation chỉ có `curve_radius not_in:0`, không ràng buộc magnitude theo text_width/font_size; (3) renderer canvas sizing.

Positive curve (cười) vs negative curve (buồn) có nhánh code riêng — negative branch hay có bug latent (vd dùng nhầm canvas width thay vì height cho anchor Y) chỉ lộ khi canvas không còn vuông.

## Requirements to check

- **Không crash với case bệnh lý**: text rất rộng/dài + radius rất nhỏ (tight curve) → render/save bình thường, không 500, không "cache resources exhausted". Chữ có thể trông kỳ nhưng KHÔNG crash.
- **Không clipping**: full text hiển thị, không cắt đầu/cuối cung, không cắt ascender/descender — cho cả positive và negative curve, mọi tổ hợp (short/long text × gentle/tight curve, text vòng quá nửa vòng tròn).
- **Placement không đổi (regression)**: fix canvas sizing chỉ đổi kích thước canvas nội bộ, KHÔNG được đổi vị trí/size/rotation của layer trong artwork. So sánh output design cũ trước/sau fix phải pixel-identical — chú ý negative curve và curve text + global rotate.
- **Preview == render == print**: editor preview, generated mockup, và print/order file phải khớp.
- **Kết hợp feature khác**: stroke, background-image fill, per-letter colors kết hợp với tight curve vẫn đúng, không crash.

## Impacted Areas

- Backend `CurveTextRenderer` (positive + negative branch), canvas sizing, composite pipeline.
- FE `CurveTextEditor.vue` (teeinblue-portal): corner-drag resize rescale `curve_radius` — root data-entry gap (thường out-of-scope ở ticket backend fix, cần follow-up riêng).
- Backend validation cho `curve_radius` (hiện chỉ `not_in:0`).
- Order/fulfillment render (production-like load) — nơi crash dễ tái hiện nhất.
- Existing curve-text designs (radii/positive/negative/rotation khác nhau) — regression placement.
- Server memory/ImageMagick pixel-cache monitoring.

## Risk Patterns

- Fix canvas sizing vô tình dịch placement (nhất là negative curve, curve + rotate).
- Negative-curve branch còn bug latent do trước đây canvas luôn vuông (width==height) che lỗi.
- Golden-image fixtures cũ không match canvas mới → test đỏ nhầm/hoặc fixtures được regenerate sai.
- Clipping cạnh cung/ascender-descender ở canvas nhỏ hơn (bound quá chặt).
- FE vẫn cho lưu radius disproportionate → user vẫn tạo được data xấu (chỉ backend robust, không chặn nguồn).
- Editor preview (SDK) khác backend render.

## Open Questions To Consider

- Có chặn/validate FE hoặc backend cho radius disproportionate trong scope này không, hay chỉ làm renderer robust (follow-up ticket)?
- Margin thêm vào canvas bound là bao nhiêu — đủ để không clip glyph ở mọi font/rotation?
- Ngưỡng nào coi là "extreme" để test boundary (font_size, text_width, radius)?
- Case arc > PI (chữ vòng quá nửa vòng tròn) render đúng ở mọi rotation?

## Suggested Test Focus

- Repro crash: long text (40+ chars) + large font (150–250pt) + tight curve → render/save OK, không crash, không log cache exhausted.
- Boundary tổ hợp: short-tight, long-gentle, long-tight, arc > nửa vòng tròn.
- Positive + negative curve cho mọi tổ hợp trên.
- Tight curve kết hợp stroke / background fill / per-letter colors.
- No clipping: full text hiển thị mọi hướng.
- Regression placement: mở design curve-text cũ (radius/positive/negative/rotate khác nhau), so output trước/sau fix pixel-identical.
- Full order/fulfillment render (không chỉ editor preview) + kiểm tra log memory sau batch render extreme.
