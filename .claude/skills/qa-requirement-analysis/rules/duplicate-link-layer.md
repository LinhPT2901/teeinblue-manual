# Duplicate & Link / Linked Layer Rules (teeinblue)

Dùng rule này khi issue nhắc đến "Duplicate & Link", "Dup & Share", "linked layer", "share with another layer", `customization_type: 'linked'`, hoặc mở rộng tính năng link/duplicate sang một layer type mới (Paragraph, Curve Text, Shape Text, clipart, photo...).

## Context to recognize

teeinblue có mô hình "linked layer": Layer B được link vào origin Layer A → B là **bản sao scale** của A, dùng chung design + personalization của A. Mỗi layer type có transformer riêng (`src/transformer/artwork/new-layers/linked-*.ts`) đi qua switch chung `customization_type === 'linked'`. Khi thêm 1 layer type mới vào tính năng này, thường: (1) thêm transformer mới ở SDK, (2) thêm counterpart render ở API (cho print/fulfillment), (3) thêm UI tab "Linked layer" + guard trên Portal.

Mô hình scale điển hình: `ratio = linked.width / origin.width`. Các thuộc tính kích thước (`height`, `font_size`, `stroke_width`, `letter_spacing`) scale theo ratio; nội dung (text, color, font, stroke color, word-wrapped `lines`) reuse nguyên từ origin. `line_height`/`lines` thường KHÔNG rescale (line_height là hệ số unitless; scale đều width+font bảo toàn wrap).

## Requirements to check

- **Thuộc tính editable của linked layer**: thường chỉ Align, Transform (aspect ratio LOCKED), Font size (= origin × scale), Extra (Display this layer on). Mọi thứ khác read-only/kế thừa từ origin — xác nhận đúng danh sách cho layer type đang xét.
- **Target selector scope**: khi link, selector chỉ liệt kê **cùng layer type** (Paragraph chỉ link Paragraph). Xác nhận không lẫn type khác.
- **Propagation**: đổi design/option/personalization ở origin → mọi linked cập nhật theo. Verify cả trên editor, storefront preview, và print output.
- **Exclusion guard**: các type "họ hàng" dùng chung behavior/internal type nhưng KHÔNG có linked support (vd Shape Text dùng chung behavior type với Paragraph) phải bị loại trừ rõ ràng.
- **Aspect ratio & resize handle**: linked layer resize chỉ corner-drag, không side/edge handle, luôn giữ ratio. Quick Transform: đổi 1 chiều tự cập nhật chiều kia.
- **Highlight**: resize origin → linked hiện highlight outline.
- **Staleness/persistence**: linked height/size phải cập nhật khi origin resize dù không đụng trực tiếp vào linked (bug hay gặp: linked giữ giá trị frozen của chính nó).

## Impacted Areas

- Portal artwork editor: options panel (tab Linked layer), Quick Transform, canvas resize handles, highlight khi resize origin.
- SDK artwork transformer (editor/live preview render) — `linked-<type>.ts` mới.
- API server-side render — print/order/fulfillment file (transformer riêng, KHÁC SDK → nguy cơ divergence editor vs print).
- Các linked layer type CŨ (Text, Curve Text, clipart, photo) — regression do dùng chung switch `customization_type === 'linked'`.
- Form pipeline: linked layer bị loại khỏi form generation (không có form field riêng) — verify không sinh field thừa.
- Storefront buyer personalization: nhập ở origin phải render đúng ở linked.

## Risk Patterns

- Scale sai (font_size/stroke_width/height/letter_spacing không đúng ratio) → linked lệch, rõ nhất ở ratio rất nhỏ/lớn.
- Editor preview (SDK) ≠ print output (API) do 2 transformer khác nhau.
- Wrap/lines sai nếu width và font scale không đều.
- Staleness: linked không cập nhật khi origin resize gián tiếp.
- Exclusion guard hụt → type họ hàng (Shape Text) vô tình được phép link.
- Regression linked type cũ do share switch/logic.
- Personalization propagation sai trên storefront/order (khác với editor).

## Open Questions To Consider

- Storefront: linked render/nhập thế nào khi buyer personalize origin?
- Xóa origin hoặc unlink → linked thành gì (xóa/standalone/giữ giá trị cuối)?
- Giới hạn số linked trên 1 origin?
- Font size linked là read-only (×scale) hay editable?
- Thuộc tính đặc thù type (background, stroke, rotate) có scale/độc lập không?

## Suggested Test Focus

- Link → resize/move origin → linked scale đồng bộ (size, stroke, wrap).
- Resize linked → corner-only, ratio locked, không side handle.
- Quick Transform đổi 1 chiều → chiều kia auto-update.
- Resize origin → linked highlight outline.
- Type họ hàng bị loại trừ vẫn không có option link.
- Print/order output khớp editor preview (mọi thuộc tính scale đúng).
- Regression linked type cũ không bị ảnh hưởng.
- Chỉ thuộc tính cho phép của linked editable; còn lại khóa.
- Target selector chỉ liệt kê cùng layer type.
