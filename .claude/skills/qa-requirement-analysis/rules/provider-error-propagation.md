# Rule: Trả lỗi của provider bên thứ 3 (POD/fulfillment catalog API) về front-end

## Khi nào áp dụng
Issue có keyword: `provider error`, `catalog API`, `fulfillment provider`, `[Printful]`, `provider_error`,
`502`, `Could not connect`, `error inside 200`, hoặc thay đổi cách map lỗi từ API ngoài sang response/toast
của portal (bài học từ TIB-5548).

## Context cần nhận diện
- Mỗi provider trả lỗi theo kiểu riêng: HTTP 4xx chuẩn, **HTTP 200 kèm error code trong body**
  (Shirtee, Printbelle), 5xx/HTML page, hoặc timeout/không kết nối được. Một issue "chuẩn hoá lỗi"
  phải được test theo **từng kiểu lỗi × từng provider**, không phải chỉ 1 provider đại diện.
- **401 của provider ≠ 401 của portal.** Nếu backend forward nguyên 401, portal thường hiểu là session
  hết hạn và **logout merchant**. Fix thường map 401 → 400. Luôn có case "provider từ chối key nhưng
  merchant KHÔNG bị logout".
- Phân biệt 2 nhóm provider: merchant tự nhập key (Extras → Fulfillments — QA tự trigger được) và
  provider dùng key của teeinblue (chỉ trigger được khi dev đổi `.env` staging → case phụ thuộc dev,
  để `blocked` nếu chưa có hỗ trợ).
- **Cache catalog** có thể che lỗi: key đã sai nhưng list vẫn hiện từ cache → phải clear cache trước.
- Label provider lấy từ dữ liệu cấu hình (vd `fulfillments.display_name`) → casing/tên hiển thị có
  thể khác tên thương hiệu; expected result nên bám theo display_name thực tế trên môi trường.

## Requirement cần kiểm tra
- Mapping status code: 4xx giữ nguyên? 401 có bị đổi không? lỗi trong 200 → 400? 5xx/timeout → 502?
  429 (rate limit) xử lý thế nào?
- Message format (`[Provider] <reason>`) và các field phụ (`provider`, `provider_error`) cho từng kiểu lỗi,
  đặc biệt khi body lỗi là HTML/rỗng (5xx).
- Raw response chỉ log server, **không** lộ ra client (kể cả key/token bị provider echo lại).
- Phạm vi endpoint: list catalog, options, print providers, import, re-sync variants/stock/printareas.
- Lỗi không đến từ provider (validation nội bộ teeinblue) không bị gắn tag provider nhầm.

## Risks
- Logout ngoài ý muốn khi provider trả 401.
- Regression ở happy path của provider trước đây "không check lỗi" (thêm check có thể bắt nhầm
  response hợp lệ thành lỗi).
- Message từ provider hiển thị trong toast: chuỗi dài/HTML/ký tự đặc biệt → vỡ UI hoặc XSS.
- Timeout quá dài khiến UI loading treo.

## Suggested test focus
1. Ma trận provider × kiểu lỗi (4xx, 200-có-error, 5xx, connection failure) — kiểm tra status + body + toast.
2. Không logout sau lỗi key của provider.
3. Clear cache trước khi test lỗi catalog list.
4. Regression happy path cho từng provider trong scope (list, options, import, re-sync).
5. Kiểm tra response không chứa raw provider payload / secret.
