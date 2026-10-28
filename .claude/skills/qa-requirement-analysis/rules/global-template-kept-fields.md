# Global Template Kept-Fields (per layer type) Rules (teeinblue)

Dùng rule này khi issue nhắc đến "Global Template", "replica layer", `global_id`, `GlobalTemplateMerger`, "kept field(s)" / "locally-kept" / "local override", hoặc bug kiểu "render fallback về giá trị của Global Template thay vì giá trị local của artwork". Bổ trợ cho [[duplicate-link-layer]] và [[warp-text-clipart-background]].

## Context to recognize

Artwork 2.0 có Global Template: 1 layer "global" là nguồn styling chung, các layer ở template/product khác được link vào nó (replica layer, có `global_id`). Khi render (print/order/test file), backend `GlobalTemplateMerger` (`app/ArtworkObjects/GlobalTemplateMerger.php`) merge global layer xuống replica: **đa số field sync từ global**, nhưng một danh sách nhỏ field được giữ theo từng artwork (kept / local fields) — không bị global đè.

Cốt lõi: **mỗi layer type phải có kept-field list RIÊNG**, và list này phải khớp với SDK (`teeinblue-sdk/src/config/global-template.js`, vd `CURVE_TEXT_LOCAL_FIELDS`). Bug điển hình: một layer type (curve text) dùng nhầm kept-field list của type khác (plain text) → field đặc thù (curve radius, box width) không đọc được từ local override, render luôn fallback về global. Editor/SDK preview đúng vì SDK có list đúng; backend render sai vì list lệch → **preview-vs-render divergence**.

## Requirements to check

- **Kept-field list đúng theo type**: mỗi text-like type (plain text, curve text, warp/paragraph...) có đúng danh sách local field của nó; đặc biệt field kích thước/hình học đặc thù (curve `radius`, box `width`) phải nằm trong list nếu type đó cho override local.
- **Khớp với SDK**: backend kept-field list phải match `*_LOCAL_FIELDS` tương ứng bên SDK. Bất kỳ lệch nào → editor preview ≠ render.
- **Local override đọc đúng khi có set**: set field local khác global → render dùng local.
- **Sync đúng khi KHÔNG set local**: field để trống local + đổi trên global → replica pick up giá trị global mới.
- **Field bị loại khỏi list**: field trước đây "kept" nay rớt khỏi list (side effect của fix, vd `align`, `autoscale_enabled`, `autoscale_max_width` với curve text) → local override các field đó bị bỏ qua, render dùng global. Xác nhận đây là intended; cân nhắc ẩn control tương ứng trên editor để tránh gây hiểu nhầm.

## Impacted Areas

- Backend render pipeline: `GlobalTemplateMerger`, `ArtworkTransformer` / `ArtworkObjects` — merge chỉ chạy lúc render (regenerate mockup, generate proof/preview, place order), KHÔNG chạy trong editor UI.
- SDK storefront render (`config/global-template.js`) — nguồn "đúng" để đối chiếu.
- Các layer type dùng chung code merge: nguy cơ regression chéo khi tách/sửa kept-field list.
- Existing production campaigns dùng curve-text + Global Template — render trước/sau fix có thể đổi (đúng hơn) ở đúng field được sửa.

## Risk Patterns

- Preview (SDK/editor) đúng nhưng render (backend test file/print) sai — dấu hiệu kinh điển của kept-field list lệch.
- Sửa list cho 1 type vô tình đổi behavior type khác (share list/switch).
- Field rớt khỏi list âm thầm → local override "biến mất" mà không có cảnh báo.
- Regression các type không liên quan (warp, paragraph, clipart, clock, QR, calendar) nếu chạm nhầm code chung.
- Campaign production cũ đổi output ngoài mong đợi (field khác ngoài field được sửa cũng đổi).

## Open Questions To Consider

- Danh sách kept-field chính xác cho từng type sau fix là gì (đối chiếu SDK)?
- Field bị loại (align/autoscale với curve) có nên ẩn control trên editor không?
- Có type nào khác cũng đang dùng nhầm list của type khác không (không chỉ curve text)?
- Fix chỉ đụng render backend hay có kèm thay đổi SDK/editor?

## Suggested Test Focus

- Local override field đặc thù (curve radius, box width) khác global → render == SDK preview (đây là core của fix).
- Không set local → đổi global → replica sync giá trị global mới.
- Field bị loại khỏi list → render dùng global dù có set local (intended).
- Regression pixel-identical cho các layer type không đổi list (warp, paragraph, clipart, clock, QR, calendar).
- Production campaign thật dùng curve-text + Global Template: chỉ curve radius/width đổi (đúng hơn), field khác không đổi.
- Editor preview == backend render == print output cho artwork có replica curve-text.
