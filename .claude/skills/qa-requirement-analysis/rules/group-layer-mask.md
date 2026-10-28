# Group Layer Mask (teeinblue Artwork Editor)

Dùng rule này khi issue nhắc đến "Mask", "Mask for Group", "crop nhiều layer cùng lúc", "Mask Editor Mode", "Custom shape mask", `Group` layer + Print Effects. Bổ trợ [[duplicate-link-layer]], [[global-template-kept-fields]], [[bulk-edit-layers]], [[ssrf-url-fetch]] (Paste URL mask image).

## Context to recognize

Mask là setting của **Group layer** (không áp cho layer đơn; muốn mask 1 layer phải group trước). Mask áp lên kết quả composite của mọi descendant visible, dùng hệ tọa độ của Group. Cấu hình ở Portal (toolbar tab `Mask` cạnh `Print Effects`, popover Enable mask, Type Rectangle/Custom shape, Mask Editor Mode), phải render đúng ở 3 nơi: **editor (SDK vendored trong portal)**, **buyer preview (SDK)**, **print file (API)** → nguy cơ divergence do transformer riêng.

## Requirements to check

- Chỉ hiện tab Mask khi chọn đúng 1 Group; ẩn với layer đơn / multi-select / group + sibling.
- Toggle default OFF; bật lần đầu mở thẳng Mask Editor với box = bounding box thật của group (kể cả text-only group, nested group).
- OFF giữ config, ON lại khôi phục không re-prompt; green dot khi enabled (và Print Effects cũng có green dot độc lập).
- Cancel (mask mới → discard; mask cũ → revert) / Apply (commit đúng kích thước đã resize).
- Editor mode: lock selection, ngoài mask fade (không hard-crop), ngoài editor mode là hard-crop.
- Transform group → mask di chuyển/scale theo; transform child → chỉ đổi vị trí trong mask.
- Thứ tự: child effect (crop, border) trước, group mask sau.
- Membership: add vào → bị mask; remove → hết mask; duplicate → copy config (kể cả custom image); ungroup → xóa mask; copy/paste sang artwork khác size → scale theo ratio.
- Linked layer: mask độc lập, không sync. Global template group: không hỗ trợ.

## Impacted Areas

Portal toolbar/popover/Mask Editor; SDK group composite render (editor + buyer preview); API print render/transform; Print Effects, Shape Cut/Emboss; Duplicate/Copy-paste/Ungroup/Undo-redo; Linked layer; Global Template; artwork save/load data model; asset upload (custom mask image).

## Risk Patterns

- Editor ≠ buyer preview ≠ print file (3 renderer).
- Resize gesture không commit khi Apply; box 0-height với text-only group.
- Crash khi drag/resize group không mask (regression group transform).
- Nested group double-crop / thiếu content; click child trên canvas chọn group.
- Custom shape: ảnh mask sai format/size/alpha, URL fetch phía server (SSRF), ảnh bị xóa sau khi gán.
- Mask + rotate/flip/scale rất nhỏ-lớn; mask box ngoài vùng content; hiệu năng group nhiều layer.
- Bug "mask ngoài print area/printarea clip" tương tác với mockup/printarea mapping.

## Open Questions To Consider

- Custom shape: định dạng, kích thước tối đa, dùng alpha hay luminance, vùng nào giữ lại? Mask image fit/stretch theo box thế nào?
- Mask lên group có Shape Cut/Emboss/Print Effects: thứ tự áp dụng?
- Group chứa layer personalization (text buyer nhập): mask có cắt text dài tràn ra ngoài không, autoscale tính theo mask hay theo child?
- Global template: ẩn tab hay disable + tooltip? Group chứa replica layer thì sao?
- Mask Editor: min size, snap, giới hạn kéo ra ngoài canvas?

## Suggested Test Focus

Popover/visibility matrix; Mask Editor Apply/Cancel/Resize commit; transform masked group; nested group; membership changes; duplicate/copy-paste/ungroup; linked + global template; buyer preview + print file đối chiếu pixel với editor (Rectangle + Custom shape); regression Print Effects, group transform, layer thường.
