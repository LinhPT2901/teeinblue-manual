# Bulk Edit Multiple Layers (teeinblue Artwork Editor)

Dùng rule này khi issue nhắc đến "Bulk edit", "multiple layers selected", "More options" trong Artwork editor, `Replace clipart category`, `Replace group of clipart categories`, `Bulk edit default text`, "Conditional settings" áp cho nhiều layer, hoặc bất kỳ thao tác nào ghi đè cùng một setting lên N layer cùng lúc. Bổ trợ cho [[campaign-object-model]], [[global-template-kept-fields]], [[duplicate-link-layer]], [[json-list-layer]].

## Context to recognize

Artwork editor cho phép multi-select layer rồi áp một loạt setting chung. Mô hình mới: gom mọi entry rời rạc trong **More options** thành **một action `Bulk edit`** → mở modal tái sử dụng **Layer settings panel** của single-layer editing.

Ba trục chi phối toàn bộ behavior — mọi phân tích/test đều nên bám 3 trục này:

1. **Intersection of settings** — modal chỉ hiển thị setting **chung cho TẤT CẢ layer type đang chọn**. Chọn hỗn hợp type → tập setting co lại; chọn thuần 1 type → tập setting nở ra (có thêm design settings đặc thù type đó).
2. **Empty-on-open** — mọi field render rỗng bất kể giá trị hiện có của từng layer. Field rỗng ⇒ **không đụng vào**, field có nhập ⇒ **override toàn bộ layer đã chọn**. Đây là điểm mơ hồ kinh điển: "rỗng = bỏ qua" hay "rỗng = clear"? Phải confirm cho từng kiểu control (text input, dropdown, toggle/checkbox, conditional rule builder).
3. **Toggle tri-state** — checkbox/toggle (Required, Show on cart/checkout, Personalization for this layer) không có trạng thái "rỗng" tự nhiên. Cần confirm có tri-state (indeterminate / "No change") hay mặc định OFF sẽ vô tình tắt hết cho toàn bộ selection.

## Requirements to check

- **Entry replacement**: các action cũ (`Replace clipart category`, `Replace group of clipart categories`, `Conditional settings`, `Bulk edit default text`) đã bị gỡ khỏi More options và **không còn đường vào nào khác**; mọi use case cũ phải làm được qua Bulk edit mới (không mất chức năng).
- **Modal chrome**: title `Bulk edit`; selected count đúng số/số ít-số nhiều (`1 layer` / `N layers selected`); description "Only settings available to all selected layers are shown."; warning "Any changes will override existing values."; nút Cancel / Save.
- **Common-settings resolver**: với mọi tổ hợp type, tập setting hiển thị đúng = giao của các type. Test ma trận: thuần text / thuần clipart / thuần group-clipart / thuần vector / text+clipart / 3 type trở lên / layer không hỗ trợ personalization.
- **Mixed-selection exclusions**: khi chọn nhiều type khác nhau — ẩn **Populate content from another option**, và trong Personalization for this layer ẩn **Use an existing global option**. Confirm 2 exclusion này chỉ áp cho mixed hay áp cả single-type.
- **Type-specific extras**: text-family (single-line, paragraph, curve, warp, spiral) → thêm **Default text**; clipart → **Select one clipart category** + default value; group of clipart categories → **Select a group** + group default value; vector category → **Select one vector category** + default value.
- **Text family gộp chung**: 5 text type có được coi là "cùng type" để hiện Default text không (yêu cầu gốc từ khách: Paragraph + Text phải bulk edit chung được).
- **Save semantics**: field rỗng không ghi đè; field có giá trị ghi đè hết. Layer trong selection mà setting đó không áp dụng được → bỏ qua hay báo lỗi.
- **Option title collision**: bulk set cùng Option title cho N layer → hệ thống có tự suffix/uniquify hay chấp nhận trùng (ảnh hưởng form field mapping trên storefront).
- **Conditional settings trong bulk**: rule tham chiếu option khác — áp cùng một rule cho N layer có hợp lệ khi các layer nằm ở artwork/printarea khác nhau không; self-reference (layer tự trỏ vào chính nó) phải bị chặn.

## Impacted Areas

- Portal Artwork editor: More options menu, multi-select layer, Bulk edit modal, Layer settings panel dùng lại (component sharing → nguy cơ regression ngược lên single-layer editing).
- Personalization Form generation: option title, placeholder, instruction, required, show-on-cart → đổi hàng loạt làm form/field key đổi theo.
- Conditional logic engine: rule áp hàng loạt có thể tạo vòng lặp/rule mồ côi.
- Clipart / group clipart / vector category data: đổi category hàng loạt → default value cũ có thể không còn thuộc category mới.
- Global Template / linked layer: layer replica hoặc linked có được phép bulk edit không, hay bị lock theo origin ([[global-template-kept-fields]], [[duplicate-link-layer]]).
- Undo/redo + autosave của Artwork editor: một Save = 1 undo step hay N step.
- Storefront SDK render + campaign đã publish: bulk override giá trị sai → hỏng hàng loạt layer cùng lúc (blast radius lớn hơn single edit).

## Risk Patterns

- **Blast radius**: một thao tác sai làm hỏng N layer, không có preview trước khi Save và có thể không undo được.
- Toggle mặc định OFF → Save vô tình tắt Required / Show on cart cho mọi layer đã chọn.
- Common-settings resolver tính giao sai → hiện setting mà một type không hỗ trợ → Save lỗi im lặng hoặc ghi field rác vào layer.
- Đổi clipart/vector category hàng loạt nhưng default value không được validate lại theo category mới → default trỏ vào asset không tồn tại.
- Bỏ sót entry cũ: gỡ khỏi More options nhưng use case cũ chưa được cover hết trong modal → mất chức năng (regression cho khách đang dùng).
- Trùng option title hàng loạt → form storefront merge/ghi đè giá trị buyer nhập.
- Selection thay đổi khi modal đang mở (layer bị xoá/deselect ở nền) → Save ghi vào layer sai hoặc crash.
- Performance khi chọn rất nhiều layer (50+/100+): modal chậm, save timeout, autosave conflict.
- Layer bị lock / hidden / thuộc Global Template vẫn bị bulk edit đè.

## Open Questions To Consider

- Field để rỗng = "không thay đổi" hay "xoá giá trị hiện có"? Áp dụng thống nhất cho text input, dropdown, toggle, conditional rule?
- Toggle/checkbox có tri-state ("No change") không?
- Số layer tối thiểu/tối đa cho phép mở Bulk edit? Chọn 1 layer có mở được không (copy nói `1 layer/N layers selected` ⇒ có)?
- Hai exclusion (Populate content, Use an existing global option) chỉ áp cho mixed selection hay cả single-type selection?
- 5 text type có được gộp thành một "text family" để hiện Default text không?
- Bulk edit có tạo 1 undo step duy nhất không?
- Có confirm bước 2 trước khi override không, hay chỉ warning text tĩnh?
- Layer replica (Global Template) / linked layer / layer đã lock có nằm trong scope bulk edit không?
- Xử lý partial failure: một số layer save lỗi thì rollback toàn bộ hay commit phần thành công?
- Có cần validate Option title trùng nhau sau bulk set không?

## Suggested Test Focus

- Ma trận selection → tập setting hiển thị: thuần từng type, mixed 2 type, mixed 3+ type, chọn 1 layer.
- Empty-on-open: mọi field rỗng dù layer có giá trị sẵn; Save với toàn bộ field rỗng ⇒ không layer nào đổi.
- Partial fill: chỉ nhập 1 field ⇒ đúng field đó đổi trên mọi layer, field khác giữ nguyên.
- Toggle behavior: bật/tắt/không đụng → verify từng layer sau Save.
- Type-specific: Default text cho text family; clipart category + default; group + group default; vector category + default — verify default value hợp lệ với category vừa chọn.
- Mixed selection ẩn đúng Populate content + Use an existing global option.
- Regression: More options không còn 4 entry cũ; mọi use case cũ vẫn làm được.
- Regression single-layer editing (panel dùng chung) không đổi.
- Cancel không lưu gì; ESC/click outside behavior; undo sau Save.
- Boundary/perf: chọn nhiều layer (50+), layer xuyên nhiều artwork, layer lock/hidden/replica.
- End-to-end: sau bulk edit → publish → form storefront + order/print phản ánh đúng giá trị mới.
