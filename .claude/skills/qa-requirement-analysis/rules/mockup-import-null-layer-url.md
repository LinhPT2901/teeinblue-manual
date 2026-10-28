# Rule: Mockup import/copy để lại layer hỏng (null image url) (teeinblue)

## Khi nào áp dụng
Issue có keyword: `Import mockups from Campaigns`, `Import from Product Bases`, `mockup import`, `clone mockup`, `duplicate mockup`, `layer url null`, `Replace layer`, `publish fail` do mockup, hoặc bất kỳ flow nào **copy mockup kèm layer** sang product base / campaign / platform khác. Bổ trợ [[campaign-object-model]], [[upload-false-success-temporary-file]], [[asset-copy-on-pick-dedup-key]].

## Context cần nhận diện
- Import mockup = copy mockup + copy ảnh của từng image layer sang file mới. **Layer id không đổi** khi clone (chỉ unique trong 1 campaign mockup) → cùng `#layer-xxx` có thể xuất hiện ở nhiều mockup.
- Hai nguồn gây null url khác nhau: (a) **mockup nguồn đã hỏng** → lan sang đích; (b) **nguồn lành nhưng bước copy ảnh fail** lúc import. Fix kiểu "chặn khi nguồn hỏng" chỉ xử lý (a). Luôn hỏi (b) được xử lý thế nào.
- Có nhiều đường copy mockup ngoài 2 modal import: duplicate tại chỗ, clone campaign, MCP (`attach-mockup-to-campaign-product`, `bulk-attach-mockup-to-campaigns`, `bulk-duplicate-mockups`, `bulk-sync-mockups-to-campaigns`). Ticket thường chỉ nói tới modal.
- Không tạo được null url từ UI → test data cần Dev set DB, hoặc chặn request copy ảnh. Phải chốt cách tạo data trước khi viết case.

- Import from Campaigns sang campaign **khác product base** thì campaign mockup đích không cần giữ `mockup_id` (null là chấp nhận được, người dùng chốt 2026-10-15). Khi **cùng product base** thì chưa chốt: thấy `mockup_id = null` + `variant_ids = []` (TIB-5522, cm 12273), trong khi import từ PB / clone campaign đều giữ.

- **Publish dựa vào preview đã render**, không render lại nếu đã có preview. Người dùng chốt (TIB-5522, 2026-10-15): còn preview (kể cả preview cũ copy qua clone) → publish thành công là bình thường; chưa có preview → publish bị chặn (instance Error, log nêu layer) là đúng. Test publish với layer hỏng phải dùng campaign mockup **chưa từng có preview** (vd add product mới); set null qua DB sau khi đã generate thì publish vẫn dùng ảnh cũ. Save trong Mockup Editor mà không sửa gì không generate lại.

## Requirement cần kiểm tra
- Phạm vi chặn: từng flow (PB→PB, PB→Campaign, Campaign/Platform→Campaign/Platform) và từng đường copy khác (clone, MCP, duplicate).
- Batch: 1 mockup hỏng thì cả batch bị chặn hay chỉ mockup đó — phải có PO confirm.
- Nội dung lỗi: nêu mockup, tên layer, layer id, hướng dẫn sửa; modal không hiện toast chung chồng lên.
- Cảnh báo trong Mockup Editor: chỉ image layer; printarea/artwork layer không url không được cảnh báo; Replace xong icon mất.
- Publish khi vẫn còn layer hỏng: chặn / cảnh báo / bỏ qua layer — ticket thường yêu cầu nhưng Dev hay không làm.
- Phân biệt `null` / chuỗi rỗng / url trỏ file đã xoá (404).

## Risks
- Fix chỉ chặn nguồn hỏng, còn copy-fail lúc import vẫn sinh null → bug gốc tái hiện.
- Data hỏng có sẵn không được migrate; publish vẫn fail với campaign cũ.
- Chặn nguyên batch làm merchant không import được mockup lành.
- Replace layer ở nguồn có ảnh hưởng mockup đích đã import trước đó (dùng chung layer id)?

## Suggested test focus
1. Icon + tooltip + Replace trên Mockup Editor (product base và campaign).
2. Ma trận import 3 flow × (nguồn hỏng / nguồn lành / batch lẫn lộn) → 422, message, không tạo mockup ở đích.
3. Publish campaign có layer hỏng → hành vi theo PO confirm.
4. Đường copy khác: duplicate, clone campaign, MCP tools.
5. Regression: import bình thường, layer printarea/artwork không cảnh báo, publish/sync bình thường.
