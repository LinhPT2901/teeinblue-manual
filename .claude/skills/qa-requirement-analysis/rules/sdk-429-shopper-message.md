# Rule: SDK storefront xử lý 429 — thông báo thân thiện cho buyer (teeinblue)

## Khi nào áp dụng
Issue phía SDK/storefront nói về cách buyer thấy lỗi khi API trả **429** (hoặc lỗi HTTP nói chung) giữa flow customize: upload, effect GenAI, add-to-cart / create customization. Keyword: `429`, `Retry-After`, `rate limited`, `request_rate_limited`, "friendly message", "silent failure". Bổ trợ [[rate-limit-public-endpoints]] (phía server), [[presigned-upload-network-resilience]], [[genai-provider-timeout-regression]] (từ TIB-5539).

## Context cần nhận diện
- Phân biệt **429 của API teeinblue** (trong scope) với 429 của Shopify (`cart/add.js`, storefront API), của app ngoài (`window._TC`), của provider AI (ImagenHub, đã có message riêng ở TIB-5468), và **quota upload theo field** (message "upload limit… try again in an hour" — phải giữ nguyên).
- Trigger 429 thật trên staging: limit staging cố ý nhỏ → bắn thật được ở vài route; route khó bắn thì mock bằng Playwright `route.fulfill` (status 429 + header `Retry-After`). Mock không phản ánh CORS → luôn có ít nhất 1 case 429 **thật**.
- **CORS**: SDK chạy trên domain shop, gọi API cross-origin. `Retry-After` không phải CORS-safelisted header → JS chỉ đọc được nếu server trả `Access-Control-Expose-Headers: Retry-After`. Thiếu → SDK luôn rơi vào câu chung dù server có gửi header.
- Một luồng có nhiều request/route dự phòng (single upload đổi route, multi-upload song song) → message chỉ hiện khi đúng điều kiện dev nêu (mọi route đều 429 / chỉ ô bị 429).
- Dev thường thu hẹp AC ("respect Retry-After / gate retry") thành "chỉ hiện message, không khoá nút, không auto-retry" → cần PO chấp nhận.

## Requirement cần kiểm tra
- Câu chữ từng nhánh: không có `Retry-After`, `Retry-After` hợp lệ (giây → phút làm tròn lên), ngoài range, giá trị lạ (0, âm, số thập phân, HTTP-date, chuỗi rác).
- Vị trí hiển thị theo từng flow + từng display type (inline field, ô ảnh multi-upload, popup, toast).
- Không "thành công giả": 429 ở create customization → không thêm vào cart; upload 429 → field không coi như đã có ảnh; effect 429 → loading dừng, không hiện ảnh sai.
- Lỗi khác (500, network, 422) ở cùng bước giữ message cũ.
- Translation key mới: có trong portal Translations? fallback tiếng Anh.

## Risks
- Nhánh `Retry-After` không bao giờ chạy trên prod do CORS/endpoint không gửi header.
- Đường lỗi dùng chung giữa nhiều display type → sửa một chỗ vỡ chỗ khác (regression add-to-cart = mất đơn).
- Message 429 đè lên message cũ của quota field / provider rate limit.
- Retry sau 429 tạo duplicate customization hoặc upload.
- Test bắn 429 thật làm cạn bucket, ảnh hưởng các case chạy sau (chờ reset window).

## Đã chốt (TIB-5539, 2026-10-23, PO chốt qua Slack + dev huytv)
- Chỉ hiện message, không khoá nút / retry / countdown; nút ATC bật lại ngay sau lỗi — PO chấp nhận.
- `Retry-After`: <60s hiện giây (số ít/nhiều), ≥60s làm tròn lên phút; 0, âm, rác, rỗng, HTTP-date đã qua, >3600 → câu chung; thập phân làm tròn lên; HTTP-date tương lai tính số giây còn lại.
- Fallback single upload: edge → presigned → `photo-upload`; buyer thấy lỗi của route **cuối**. Ngoại lệ: edge GenAI (`genai-uploads`) 429 → dừng luôn, hiện câu 429.
- Provider rate limit (poll HTTP 200 + `error_message = rate_limit_exceeded`) là nhánh khác, giữ câu `rate_limit_exceeded`.
- Key dịch nằm ở portal Translations → product page content → block General error messages.
- Endpoint có trả/expose `Retry-After` hay không là việc của backend, không do SDK quyết định → mock để test SDK parse, quan sát header thật riêng.

## Suggested test focus
1. Regression happy path từng flow × display type trong scope.
2. 429 thật (ít nhất 1 route) + đọc header thực tế (`Retry-After`, `Access-Control-Expose-Headers`).
3. Mock 429 có/không `Retry-After` cho từng flow → đúng câu, đúng vị trí, không mất dữ liệu đã nhập.
4. Ma trận giá trị `Retry-After` (biên 1, 59, 60, 61, 3600, 3601, 0, rác).
5. Lỗi khác ở cùng bước giữ message cũ; quota field giữ câu cũ; 429 Shopify giữ hành vi cũ.
6. Sau khi hết thời gian chờ, thao tác lại thành công, không duplicate.
