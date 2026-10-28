# Rule: Open API write endpoint (server-to-server, teeinblue `openapi/v1/*`)

## Khi nào áp dụng
Issue thêm/sửa endpoint trong `openapi/v1/*` có tác dụng ghi (POST/PUT/PATCH/DELETE), xác thực bằng API token (Sanctum Bearer) có ability (`orders:write`, `campaigns:write`...), thường là "mirror" một action đã có trên Portal.

## Context cần nhận diện
- Open API là server-to-server: không có người dismiss cảnh báo → dev hay làm **strict hơn Portal** (precondition cứng, 422). Phải liệt kê từng điểm lệch so với Portal.
- Token có **ability** riêng (read vs write). Endpoint ghi phải chặn token chỉ có ability read.
- Thiếu header `Accept: application/json` → Laravel có thể trả 302 redirect tới login thay vì 401 (đã gặp ở TIB-5506 trên staging). Luôn test cả có/không header.
- Endpoint nhận `url` thay cho file → áp dụng thêm `ssrf-url-fetch.md`. Endpoint theo numeric ID → áp dụng `access-control-idor.md`.
- "Mirror Portal" nghĩa là side effect (status, storage path, cache, webhook, line item property) phải giống Portal — so sánh trực tiếp 2 đường trên cùng loại data.

## Requirement cần kiểm tra
- Ma trận auth: không token / token sai / token revoked / token thiếu ability / token store khác → status code từng case.
- Ma trận input: thiếu cả 2 nguồn, gửi cả 2 nguồn cùng lúc, sai loại file, file quá lớn, URL lỗi.
- Precondition trạng thái resource: liệt kê đủ các status không hợp lệ, không chỉ 1 case.
- Side effect đúng như Portal; side effect KHÔNG được xảy ra (vd fulfillment status không đổi).
- Response schema: field nào caller cần để verify; có lộ dữ liệu thừa/nhạy cảm không.

## Risks
- Credential thật bị dán trong Jira/Slack sample curl → yêu cầu revoke.
- Lệch hành vi Portal vs API mà không ghi lại → support không giải thích được cho merchant.
- Cache CDN khi overwrite cùng path → caller/POD lấy file cũ.
- Race: API ghi cùng lúc Portal thao tác / đơn đang được gửi sang fulfillment.

## Suggested test focus
1. Happy path mỗi biến thể input (file/url) + verify side effect trên Portal.
2. Auth & ability matrix, có/không `Accept: application/json`.
3. Cross-account (IDOR) bằng ID thuộc account khác.
4. Precondition status negative cho từng status khác.
5. Validation input + SSRF (nếu nhận URL).
6. So sánh đối chiếu Portal action tương đương trên cùng data.
7. API docs (redoc) khớp hành vi thật.

## Open questions template
- Danh sách điểm lệch có chủ đích giữa API và Portal?
- Giới hạn file (type, size, dimension) có giống Portal?
- Gửi cả `file` và `url` thì ưu tiên cái nào hay 422?
- Có rate limit riêng cho endpoint ghi không?
- Có bắn webhook/sync platform sau khi ghi không?
