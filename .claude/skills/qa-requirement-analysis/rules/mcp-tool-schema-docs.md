# MCP Tool Schema / Docs-only Changes (teeinblue MCP server)

Dùng rule này khi issue chỉ đổi **tài liệu, note, default được khuyến nghị, hoặc example** mà một MCP tool trả cho AI client (vd `get-layer-schema-tool`, `get-mockup-layer-schema-tool`, `get-workflow-guide-tool`, server instructions) — và ghi rõ "validation unchanged" / "docs only".

## Context to recognize

- Output của tool schema là **input cho AI**, không phải cho người dùng cuối. Thay đổi đúng = AI đọc xong tạo dữ liệu tốt hơn; hành vi lưu/render ở backend không đổi.
- "Default" trong docs thường là **khuyến nghị cho AI**, KHÔNG phải default server tự điền khi field bị bỏ trống. Phải phân biệt hai nghĩa này.
- Một layer type thường xuất hiện ở nhiều surface: per-type note, example, `format=compact`, server instructions, mockup layer schema.

## Requirements to check

- Danh sách layer type bị ảnh hưởng có đầy đủ không — còn type nào có field tương tự (font/typography…) mà không nằm trong list?
- Note text kỳ vọng là exact string hay chỉ cần chứa ý chính?
- Example mới có **hợp lệ thật** không: đem example đi save/validate (`validate-artwork-tool`, create/update) phải pass; giá trị (vd font family/variant) phải tồn tại trong nguồn dữ liệu thật (`list-fonts-tool`).
- Field mới được document (vd `family`) có thực sự được backend/renderer dùng không, hay chỉ là pass-through? Bắt buộc hay optional?
- `format=compact` (và các format khác) có còn chứa note/example mới không, hay chỉ cần "không lỗi"?
- "Validation unchanged": payload cũ (thiếu field mới) vẫn save được; payload mới (có field mới) cũng save được.

## Risk Patterns

- Test E2E bằng AI là **non-deterministic**: AI có thể vẫn chọn font khác, hoặc tự bịa field. Cần tiêu chí pass rõ (bao nhiêu lần chạy, prompt cố định, model nào).
- Docs nói default nhưng server không tự điền → khi AI bỏ trống field vẫn ra dữ liệu thiếu; dễ bị hiểu nhầm là bug của fix.
- Example dùng giá trị không tồn tại (variant naming `regular` vs `400`) → AI copy example gây lỗi render.
- Docs đổi ở per-type nhưng còn chỗ khác (server instructions, workflow guide, mockup schema) vẫn ghi giá trị cũ → AI nhận thông tin mâu thuẫn.
- Staging MCP server chưa deploy PR (Jira status ≠ deploy status).

## Open Questions To Consider

- PR đã merge + deploy lên staging MCP chưa?
- "Default" là khuyến nghị cho AI hay server-side default?
- Field mới optional/required, được renderer dùng ra sao, phải khớp với gì (vd tên family của font đã upload)?
- Tiêu chí pass cho test E2E qua AI (prompt, số lần, model)?
- Có surface docs nào khác cần đồng bộ không?

## Suggested Test Focus

- Gọi tool cho từng type trong scope, đối chiếu note + example (cả default và compact format).
- Lấy example trả về đem đi create/validate thật → save OK + render OK.
- Backward compat: payload cũ không có field mới vẫn save; artwork cũ edit qua MCP không bị đổi font/render.
- E2E qua AI client với prompt cố định, ghi lại payload AI thực sự gửi (để tách lỗi AI vs lỗi docs vs lỗi backend).
- Smoke 1–2 type ngoài scope để chắc không bị ảnh hưởng.
