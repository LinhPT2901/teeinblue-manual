# Rule: Photo border pre-render / client-side render (teeinblue)

Dùng khi issue nhắc tới: `photo_border`, `custom_shape`, `contour_cut`, `/image_effect`, `/photo-border`, `photo-border-masks`, `masked_url`/`masked_enable`, `ImageDataLayer`/`ImageDataClipartLayer`, giảm request tới `merchant/games`, hoặc chuyển render từ server sang client (canvas/SVG filter). Bổ trợ [[access-control-idor]], [[ssrf-url-fetch]], [[group-layer-mask]], [[shadow-blur-scaling]].

## Context cần nhận diện
- Thay đổi kiểu này luôn đụng 3 repo: API (endpoint sinh file) + SDK (dùng file / vẽ client) + Portal (gọi endpoint, embed SDK qua submodule). Staging phải có đủ cả 3 và submodule đã bump.
- File pre-render lưu ở **đường dẫn cố định theo artwork_id/layer_id**, bị ghi đè mỗi lần sinh, cache-bust bằng `?v=<timestamp>` lưu trong layer.
- Sinh file khi **config thay đổi** (debounce), không phải khi Save.
- Layer cũ (không có url) phải fallback về endpoint cũ.

## Requirement cần kiểm tra
- File được sinh lại khi MỌI input của render đổi: size, color, mask (`masked_url`), display, kích thước layer (width/height), mask từ global option.
- Unsaved/discard: file đã bị ghi đè trước khi Save → storefront đang live có bị lộ border chưa lưu không.
- Save trong cửa sổ debounce / request lỗi → layer lưu url/version cũ.
- Duplicate layer / duplicate artwork / clone campaign / global template → url có còn trỏ file của layer gốc không (sửa bản này làm đổi bản kia).
- Client render vs server render: tolerance "close to" phải được định nghĩa; print file phải giữ nguyên.
- Option bị "ignore" (vd `line` cho custom_shape) nhưng toggle vẫn hiện → hành vi legacy có đổi output không.

## Risks
- Stale border (CDN/browser cache, input render đổi mà không regenerate).
- Shared file giữa các layer/artwork do copy url.
- Canvas tainted (CORS) → client render thất bại im lặng; Safari thiếu OffscreenCanvas; hiệu năng mobile với ảnh lớn.
- Endpoint sinh file nhận config từ client → IDOR (artwork khác merchant), path traversal qua layer_id, SSRF qua `masked_url`, ghi file rác cho layer_id không tồn tại.

## Bài học TIB-5516 (dev confirm 2026-10-08)
- File thực tế content-addressed `{layer_id}-{hash}.png`, GC chỉ khi xoá artwork → file thừa tích luỹ suốt đời artwork; file của artwork gốc bị copy url sang bản duplicate có thể mất khi xoá artwork gốc.
- Regenerate chỉ khi layer đang được chọn trong editor (key: border config + masked_url + width + height). Mọi đường sửa khác (API/MCP, import, bulk edit, sửa khi layer không chọn, global option) → stale border. Luôn hỏi "đường sửa nào không đi qua editor?".
- Endpoint sinh file nhận `url`/`width`/`height`/`size` từ client, validate lỏng (string, min:1, không max) → test url của merchant khác, URL ngoài/nội bộ, mask rất lớn, size cực lớn.
- Output capped 960px → hỏi print file có dùng file pre-render không (chất lượng in).
- Không validate layer_id thuộc artwork là có chủ đích (layer chưa lưu vẫn cần sinh file) → test throttle thay vì validate.

## Suggested test focus
- Network count trước/sau (filter theo endpoint) cho: load page, đổi color/size, đổi variant, quay lại giá trị cũ.
- Ma trận regenerate theo từng input render; discard/unsaved; save nhanh trong debounce.
- Duplicate/clone flows → độc lập file.
- Legacy fallback; print file/mockup so sánh trước/sau.
- API negative: cross-merchant 403, layer_id unsafe 422, thiếu field 422, quyền staff view-only.

## Pivot TIB-5516 (dev 2026-10-09): bỏ pre-render, custom_shape vẽ canvas client (A4)
- Lý do: file pre-render dùng ratio mặc định 0.1 → bỏ qua `size`. Bài học: khi so "border khớp", phải so ở NHIỀU size với nguồn chuẩn (`/image_effect`), không chỉ 1 config — mask tròn kín khung che mất khác biệt size.
- Client render cần hỏi thêm: CORS của CDN mask (thiếu → âm thầm fallback server), giới hạn canvas iOS Safari, hiệu năng blur trên main thread với mask lớn, parity với print file (server), data cũ (url/signature) bị bỏ qua.
