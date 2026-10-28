# MCP Bulk Tool Semantics (teeinblue MCP server)

Dùng rule này khi issue thêm/sửa tool MCP dạng **bulk** (nhiều id/item trong 1 call), có `dry_run`, `force`, per-item `results[]`, limit per call, hoặc thay single-record tool bằng bản bulk (vd TIB-5369).

## Context cần nhận diện

- Có 2 kiểu semantics khác nhau, dễ lẫn:
  - **Per-item (partial)**: 1 item lỗi không fail batch; mỗi item trả `ok` / `skipped` / `blocked` / error kèm reason.
  - **All-or-nothing (array builder)**: validate hết trước, 1 item sai → không ghi gì, trả lỗi theo path (`products.2.product_id`).
  Mỗi tool thuộc kiểu nào phải được nêu rõ — test sai kiểu là kết luận sai.
- `dry_run` default khác nhau theo tool; `force` chỉ có ý nghĩa với item "in use".
- Audit log có granularity khác nhau (1 entry/call vs 1 entry/campaign vs 1 entry/copy).
- Limit per call thường configurable qua env → QA staging thường chỉ test được default.
- Đổi format response (vd status → `{value,label}`) là **breaking change** cho client/automation đang parse field cũ.

## Requirement cần kiểm tra

- Bảng per-tool: kiểu semantics, có `dry_run` không + default, có `force` không, limit, granularity audit log.
- Danh sách đầy đủ result status/reason codes (enum) cho từng tool.
- `dry_run=true` thực sự không ghi DB, không log, không dispatch job, không regenerate mockup.
- Kết quả dry_run có khớp kết quả apply thật không (cùng input → cùng ok/blocked/skipped).
- Ownership: id của user khác ↔ id không tồn tại phải trả **cùng** response (không leak tồn tại/tên).
- Dedup id, id dạng numeric string, thứ tự `results[]` theo request, `summary` đúng count.
- Boolean dạng string: giá trị không hợp lệ bị reject, không âm thầm thành false.
- Null/blank semantics per field (giữ nguyên / clear / reset / reject) — thường khác nhau giữa các tool.
- Tool cũ bị xoá: đã biến mất khỏi `tools/list`; client gọi tool cũ nhận lỗi gì.

## Risk Patterns

- dry_run vẫn có side effect (job, regenerate, log).
- Partial apply để lại data nửa vời khi exception giữa chừng (không phải lỗi validation).
- `force` xoá cascade sang campaign archived/published ngoài ý muốn.
- Fan-out "mặc định áp cho mọi campaign dùng product" → tác động rộng khi AI bỏ trống `campaign_ids`.
- Thay đổi DB nhưng store (Shopify) không được sync → lệch dữ liệu nếu user không chạy sync.
- Timeout MCP call với batch lớn (100 campaign × regenerate mockup).
- Limit check đếm trước hay sau dedup.

## Open Questions To Consider

- Tool nào default dry_run=true / false / không có dry_run?
- Enum reason code đầy đủ per tool?
- Staging có hạ được `MCP_BULK_LIMIT_*` để test over-limit không?
- QA đọc audit log ở đâu (portal UI / DB / tinker)?
- Breaking change format response đã thông báo cho client/automation hiện có chưa?

## Suggested Test Focus

- **Cách test chính: prompt ngôn ngữ tự nhiên như merchant thật**, gọi đối tượng bằng tên (campaign name, product title, màu/size, "mockup thứ 2"), **không dùng ID** (vd "Trong campaign 'Summer Tee', gán biến thể Black size M vào mockup thứ 2"); test data đặt tên riêng biệt, không trùng. Giao cho agent không có bối cảnh, ghi lại tool AI chọn + arguments + kết quả cuối. Gọi tool trực tiếp bằng id/JSON-RPC chỉ để bổ sung khi cần cô lập lỗi tool vs lỗi AI hiểu prompt (bài học TIB-5369).

- Mỗi tool: dry_run → apply (so sánh), mixed batch (ok + not-found + blocked + duplicate), over-limit, ownership (2 account).
- force on/off với item in-use; cascade đúng phạm vi (active vs archived).
- Audit log đúng số entry, dry_run không log, no-op không log.
- Regression: tools/list đủ số tool, tool cũ đã xoá, response format mới ở tool cũ bị sửa.
