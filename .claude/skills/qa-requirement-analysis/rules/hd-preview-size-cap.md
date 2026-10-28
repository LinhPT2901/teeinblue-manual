# Rule: HD layer (`master_large`) & giới hạn kích thước ảnh preview — teeinblue image layer

## Khi nào áp dụng
Issue nhắc nút **HD** trên layer, `master_large`, `create-master-large`, `use_hd_layer`, HD preview, "original quality", preview cap/"px per edge", WebP size limit (16383px), hoặc đổi kích thước một bản ảnh phái sinh (thumbnail/preview). Bổ trợ [[image-encode-format-fallback]], [[asset-copy-on-pick-dedup-key]], [[bulk-edit-layers]].

## Kiến thức nền tính năng HD (đã xác nhận qua Jira)
Lịch sử: TIB-4847/QA-2810 (tạo tính năng) → TIB-5195 (disable cho clipart) → TIB-5212 (tách HD thành feature độc lập trên toolbar, hỗ trợ multi-select; **Re-open**) → TIB-5384 (cap 16383 thay vì lỗi) → TIB-5420 (async worker + cap 4096) → TIB-5543 (chốt cap 4096 + tooltip).

- **3 bản ảnh của layer image:** `_large` (preview mặc định, ~800–1000px webp), `_master_large.webp` (HD preview, tạo khi bật HD), `master` (original, dùng để **render/print**).
- **Bật HD** → gọi `POST /api/layer-images/create-master-large` → url preview của layer đổi `_large` → `_master_large`. Tắt HD chỉ đổi url về `_large`, **không xoá** file.
- **Theo layer, không theo ảnh** (TIB-4847): cùng ảnh ở layer khác không bị ảnh hưởng.
- **Preview dùng `master_large`:** artwork editor, storefront/personalizer, SDK mockup preview. **Render/print/mockup download luôn dùng `master` gốc** (TIB-5420 Q7, Q9).
- **Một nút HD** trong shared quick layer editor → áp dụng cho cả Artwork 1.0 và 2.0 (TIB-5420 Q12).
- **Batch HD cho multi-select** (dev xác nhận TIB-5212, comment 2026-10-27): chọn nhiều image layer khác ảnh → bật HD hàng loạt, tối đa `MASTER_LARGE_BATCH_LIMIT` (mặc định 10) ảnh khác nhau chưa ở HD mỗi lần bấm, endpoint `POST /layer-images/create-master-large/batch`. Vượt limit: toast info rồi toast lỗi tiêu đề "Something went wrong!", không layer nào đổi. Mỗi chu kỳ poll 2s có switch = 1 undo step; tắt HD = 1 step. Tooltip `Selected layers use different images…` (xác nhận 2026-10-15 khi execute TIB-5543) là từ một fix cũ chỉ có trên staging, **đã bị thay thế**.
  - Test failed/timeout: upload ảnh **mới** (chưa từng HD) → gửi url cho dev → dev set cache status failed/pending trên server → bật HD. `unavailable` và "chỉ 1 job" không test được từ UI/API, dev đã cover bằng automated test → bỏ qua.
- **Layer "Import from a clipart category" ĐƯỢC bật HD** (người dùng xác nhận 2026-10-16). Khi import, hệ thống gọi `POST /api/layer-images/from-clipart` để convert clipart thành layer image (url `users/{id}/image-layers/...`), nên HD chạy bình thường. Điều kiện disable bên dưới (TIB-5195) **không áp dụng** cho flow này nữa, đừng kỳ vọng HD disabled cho layer clipart-category import. Dev xác nhận lại ở TIB-5212 (2026-10-27): HD phụ thuộc nơi ảnh nằm, ảnh pick từ clipart category được copy vào image library (TIB-5425) nên bật HD được; chỉ layer **cũ** còn trỏ thẳng vào clipart mới bị disable. Xem [[asset-copy-on-pick-dedup-key]].
- **Điều kiện bật được nút** (TIB-5195, một phần đã lỗi thời, xem dòng trên): url layer đúng dạng `users/{id}/image-layers/...`; disable với layer `clipart-category`, `group-clipart-categories`, `dynamic-by-text` hoặc form_type `clipart`/`grouped_clipart`/`dynamic_by_text`. Multi-select: chỉ bật khi **tất cả** layer hợp lệ. Tooltip khi disabled: `Cannot work with layers imported from clipart`. Chỉ chặn ở Portal, API không đổi. Có thể disable nhầm layer ảnh url khác dạng (Canva, PSD automap, artwork cũ).
- **Async (TIB-5420):** toast `Converting to HD. This can take from a few seconds to a few minutes.` → `HD layer is ready.`; spinner thay icon edit/swap/duplicate/delete ở Layers panel (tooltip `Converting to HD...`); trong lúc convert thì Save & Close bị disable, Save/Ctrl+S/Cancel hiện cảnh báo. HD áp cho các layer được chọn **lúc bấm**. SVG → `HD is not available for this image.`; lỗi → `Could not create the HD image. Please try again.` (bấm lại để thử lại); quá 3 phút → `Creating the HD image is taking too long. Please try again.` (job vẫn chạy tối đa 10 phút, bấm lại sẽ lấy file đã xong). Bấm lại cùng ảnh không tạo job mới. Concurrency = min(`MASTER_LARGE_MAX_CONCURRENCY`=2, `HORIZON_PREVIEWABLE_PROCESSES`=5), dùng chung cho mọi seller.
- **Cap:** cạnh dài nhất ≤ **4096px**, ảnh nhỏ hơn giữ nguyên kích thước gốc (không upscale). JPG decode rút gọn (nhanh, 18174×6900 ~3s); PNG vẫn decode full (chậm hơn) — đây là known limitation, không phải bug.
- **Dữ liệu cũ:** layer image đã có `master_large` (kể cả bản ≤16383 hoặc bản gốc chưa cap) → **không tạo lại**; tắt rồi bật lại HD sẽ dùng lại bản cũ ngay (TIB-5420 Q11). Bản cũ chưa cap là đúng thiết kế, không phải bug.
- QA **không** có số liệu k8s/Grafana (restartCount, 5xx, memory) — dev không cung cấp (Q8). Horizon cũng không vào được → verify qua UI + network.

## Context cần nhận diện khi phân tích issue mới
- Issue chạm bản ảnh nào (`_large` / `master_large` / `master`)? Bản in **phải** giữ nguyên.
- Cap theo cạnh dài, giữ tỉ lệ, không upscale — confirm lại nếu issue thay đổi logic này.
- Derivative có thể được dùng chung theo **layer image** (Q11 nói "if a layer image already has a master_large") → layer mới dùng lại cùng layer image có thể nhận file cũ.
- Đọc comment dev ở các ticket liên quan: quyết định thường đã chốt ở ticket khác (vd 4096 chốt ở TIB-5420).
- Text UI (tooltip/toast) có con số cứng → so khớp chính xác từng ký tự; có 2 tooltip (enabled vs disabled-clipart).

## Risks
- Cap nhầm vào print file → design in nhỏ/mờ (nghiêm trọng nhất).
- Méo tỉ lệ; panorama bị cap sai cạnh; off-by-one ở 4096/4097.
- File cũ chưa cap bị báo nhầm là bug; ngược lại, file mới không được cap vì tái dùng file cũ.
- Định dạng nguồn: PNG lớn chậm; AVIF master sai màu/mất alpha (TIB-5575); SVG không có HD.
- Thay đổi tooltip có thể làm vỡ tooltip disabled-clipart, hoặc tooltip không hiện trên `<button disabled>` (Firefox).
- Toolbar TIB-5212: HD đứng cuối (Shadow → Photo Border → Shape Cut → Mask → HD). Chọn 1 group ở Artwork 2.0 thì ẩn Photo Border (do group border quản lý), Shadow và HD vẫn hiện. Selection có layer customization type Linked thì ẩn cả 3 field.

## Suggested test focus
1. Boundary kích thước nguồn: <4096, =4096, 4097, rất lớn (≥16383, vd 18174×6900); ngang/dọc/vuông/panorama; JPG vs PNG. Đo kích thước thật của `_master_large.webp` qua network/URL, không đo bằng mắt.
2. Preview dùng `master_large` trên editor + storefront; render/order design/mockup download vẫn dùng `master` gốc.
3. Dữ liệu cũ: layer có `master_large` trước deploy → giữ nguyên; tắt/bật lại HD dùng lại bản cũ.
4. Tooltip enabled (mới); layer clipart import (đã convert sang layer image) bật HD được; kiểm tra tooltip trên Chrome/Firefox/Safari.
5. Regression flow async: toast, spinner, chặn save, lỗi/timeout (cần dev set status). Batch multi-select ≤10 ảnh khác nhau, ảnh dùng chung tính 1, layer đã HD không tính.
6. Khi cần ảnh lớn: lấy từ `test-data/`, tự tạo file phải hỏi trước.
