# Global Option `data` Stray Keys (teeinblue)

Dùng khi issue nói về global option tạo/sửa qua MCP (`create-global-option-tool`, `update-global-option-tool`, `duplicate-global-option-tool`) hoặc bug "design trống / layer phụ thuộc bị ẩn" với layer dùng global option. Bổ trợ [[mcp-artwork-authoring]], [[global-template-kept-fields]].

## Context to recognize

- Layer dùng global option có `customization_type: "global_option"` + `global_option: <id>`. Lúc render, backend (`NewLayerFactory`) merge `data` của global option xuống layer.
- Nếu `data` chứa key định danh của layer (`customization_type`, `global_option`, `id`, `type`, `name`) — thường do AI copy nguyên layer schema example — key đó đè lên layer → layer đổi identity → condition không match → layer phụ thuộc ẩn → design trống.
- Fix thường 2 lớp: (1) tool MCP strip key khi create/update; (2) renderer bỏ qua key đó khi merge (bảo vệ data cũ trong DB). Còn có data-fix script cho prod.

## Requirements to check

- Danh sách key bị strip chính xác, và giống nhau ở create / update / duplicate không.
- Strip im lặng hay có warning trả về cho AI.
- Renderer bỏ qua đúng những key nào (chỉ `customization_type` hay cả 5 key).
- Portal / REST tạo global option có đi qua cùng sanitizer không.
- Data cũ bị hỏng: chỉ đúng sau khi regenerate; data-fix script xoá key nào.

## Risks

- Strip quá tay làm mất field hợp lệ của option (form label, required, default, mask, options list).
- Renderer fix làm đổi output của global option Portal vốn đúng (regression render).
- SDK storefront preview vẫn dùng logic merge cũ → preview ≠ order design.
- Design đã trống trên order cũ không tự sửa.

## Suggested Test Focus

- Repro: MCP tạo option có stray key → artwork có condition theo option → order design đúng theo từng value.
- Read-back `data` sau create/update/duplicate: key bị strip, field khác giữ nguyên.
- Option bẩn sẵn trong DB → render/regenerate đúng (cần Dev hỗ trợ sửa DB).
- Regression option tạo từ Portal mọi type: preview == design test/order design.
