# Rule: MCP artwork authoring (AI tạo/sửa artwork qua teeinblue MCP)

Dùng khi issue nói về việc AI client tạo/sửa artwork qua MCP: "create artwork via MCP", "reference image", layer schema (`app/ArtworkSchema/Types/*`), populate/`retrieval_*`, `render-design-preview-tool`, `get-form-preview-tool`, `validate-artwork-tool`, global option/clipart item tạo qua MCP. Bổ trợ [[mcp-tool-schema-docs]], [[access-control-idor]], [[photo-border-prerender-client-render]].

## Context cần nhận diện
- Mỗi fix thường thuộc 1 trong 3 loại, cách test khác nhau:
  1. **Docs/guidance cho AI** (nhận diện effect, placement mode từ ảnh mẫu) → non-deterministic, phải test qua AI client với prompt cố định + chấm nhiều lần.
  2. **Server normalise/default** (vd thiếu `visible` → `true`, `[true]` → `true`, border type rỗng → `contour_cut`) → deterministic, test bằng gọi tool với payload thiếu/sai.
  3. **Validation mới** (populate thiếu layer, toggle non-boolean, border type sai) → test reject + message, và artwork cũ có lỗi sẵn chỉ bị warning.
- Tool mới (list values, form preview, tạo item) → test như API: input hợp lệ/không hợp lệ, ownership cross-merchant.
- "Đúng" = Portal hiển thị đúng + storefront hoạt động đúng + server render (order design) đúng. Tool trả 200 chưa đủ.

## Requirement cần kiểm tra
- Default/normalise áp dụng cho write qua MCP hay cả REST/Portal? Áp dụng cho layer mới hay cả layer cũ khi update?
- Payload cũ (giá trị legacy như `[true]`) trên artwork đã lưu: còn edit được không, có tự sửa khi save lại không, render order cũ có đổi không.
- Reuse-or-create asset: tiêu chí "match" (tên? value? exact/case-insensitive?).
- Preview tool có "parity" với Portal/SDK không, và danh sách case chưa hỗ trợ (warnings) đã được chấp nhận là ngoài scope chưa.

## Risks
- Normalise server-side làm đổi output của artwork/order cũ (layer trước ẩn nay hiện, layer phụ thuộc toggle trước ẩn nay hiện).
- Validation chặt hơn phá flow AI đang chạy ổn (AI gửi payload cũ bị reject).
- Fix ownership 1 endpoint nhưng endpoint anh em chưa fix (follow-up).
- Kết luận sai vì lỗi do AI chọn sai chứ không phải backend — luôn ghi lại payload AI thực gửi.

## Suggested test focus
- Mỗi case: (a) gọi tool trực tiếp bằng payload chuẩn/thiếu/sai, (b) E2E qua AI với ảnh mẫu/prompt cố định, (c) verify Portal + storefront + render.
- Cross-merchant với 2 MCP account (staging tib vs staging tib victim).
- Regression: Portal tạo asset/global option thủ công, REST API, order design render, artwork cũ edit qua MCP.
