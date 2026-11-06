# Rule: Rate limiting & client identity trên public storefront endpoints

## Khi nào áp dụng
Issue có keyword: `rate limit`, `throttle`, `429`, `thumbmark`, `fingerprint`, `bot`, `spam`, `abuse`, `CAPTCHA`, `public endpoint`, `unauthenticated`, `per-IP`, `payload size cap`, hoặc security hardening trên các route `merchant/*` mà SDK storefront gọi ẩn danh.

## Context cần nhận diện
- Route `merchant/*` của teeinblue-api là **public, anonymous shopper** gọi từ storefront qua teeinblue-sdk — không có user login, nên "identity" chỉ là IP + header do client tự gửi (`X-Thumbmark-ID`).
- Header do client cung cấp = **không tin được**. Rate limit key trên header đó là bypass được bằng cách random header mỗi request. Fix chuẩn: server-signed identity (HMAC) + IP làm lớp thứ hai.
- Laravel `throttle:x,y` mặc định key trên **domain + IP**, KHÔNG có route → nhiều route dùng cùng chuỗi throttle sẽ **chia sẻ chung một bucket**. Đây là bug rất hay gặp; test phải verify từng route có bucket độc lập.
- Thay đổi kiểu này luôn có **2 repo**: api (server-side) + sdk (client bundle). SDK bundle đã cache ở storefront của merchant → phải có **soft-transition** chấp nhận cả format cũ lẫn mới trong một thời gian.

## Requirement cần kiểm tra
- Mỗi route được nêu: đúng limit, đúng window (min vs hour), đúng key (IP vs thumbmark vs cả hai), bucket độc lập.
- Response khi vượt limit: status **429**, body/flag rõ ràng (vd `rateLimitExceeded: true`), header `Retry-After`/`X-RateLimit-*` (hỏi nếu chưa nêu).
- Identity không hợp lệ / chữ ký sai → **401** (không phải 403/422) — xác nhận với dev.
- Payload cap: đo theo gì (bytes JSON-encoded? depth? số phần tử?), vượt thì **422** với lỗi gắn đúng field, không phải 413/500.
- Legacy format vẫn phải pass trong transition window + có log để đo migration.

## Impacted areas
- Toàn bộ storefront widget flow: upload ảnh, vector, PDF, GPX/Strava, game, AI generate/effect.
- Create/update customization + cart-token save → ảnh hưởng trực tiếp **add-to-cart**, tức doanh thu merchant.
- Fallback path khi `localStorage` bị chặn (incognito, Safari ITP), multi-tab, mạng chậm/timeout.
- Merchant volume cao / shop dùng chung IP (office, mobile carrier NAT, proxy Shopify) → nguy cơ false-positive 429.

## Risks
- **Rủi ro số 1: false positive chặn nhầm shopper thật** → mất đơn hàng. Limit tính theo IP rất dễ đụng khi nhiều shopper sau cùng một NAT/CDN, hoặc khi Laravel đọc IP từ proxy sai (`TrustProxies`) → cả site thành 1 IP.
- Widget không handle 429/401 → màn hình trắng, console crash, mất data khách đang nhập.
- Fetch identity thêm 1 round-trip trước upload đầu tiên → regression latency ở first load.
- Race multi-tab: 2 tab cùng fetch/ghi `localStorage` → identity chèn nhau.
- Cap payload đặt quá thấp → campaign nhiều layer hợp lệ bị 422 (cần test với campaign phức tạp thật, không chỉ text rác).
- Số limit chỉ là "starting estimate" chưa validate với traffic thật → không phải bug nếu con số chưa tối ưu, nhưng phải report nếu chặn nhầm case hợp lệ.

## Suggested test focus
1. **Regression happy path trước tiên**: mọi loại upload + full customize → add-to-cart, không có 401/429 lạ. Đây là phần quan trọng hơn cả test 429.
2. **Từng route một**: đúng ngưỡng N, request N+1 mới 429 (không sớm hơn), và bucket reset đúng sau window.
3. **Bucket độc lập giữa các route** (bắn cạn route A rồi kiểm route B vẫn còn full quota).
4. **Identity**: format mới đúng chuẩn, chữ ký bị sửa → 401, thiếu header → ?, format cũ → vẫn pass + có log.
5. **Cache identity**: fetch 1 lần rồi reuse (không gọi lại mỗi lần load), clear storage giữa session vẫn tự phục hồi.
6. **Degradation**: incognito/localStorage bị chặn, mạng 3G/timeout, multi-tab đồng thời.
7. **Payload cap**: dưới ngưỡng OK, trên ngưỡng 422 đúng field; và campaign thật nhiều layer vẫn dưới ngưỡng.
8. **UI xử lý lỗi**: 429/401 hiển thị thông báo hợp lý, không mất dữ liệu khách đã nhập.

## Chuỗi nhân quả giữa các ticket cùng sửa thumbmark/identity (case thực tế: TIB-5341 → TIB-5460)
- TIB-5341 đổi `ThumbmarkService` từ "luôn tự sinh fingerprint tại client" sang "ưu tiên fetch signed thumbmark từ server (GET merchant/{platform}/thumbmark), fallback về fingerprint cũ khi fetch lỗi/timeout". Việc thêm 1 network round-trip làm tỉ lệ rơi vào fallback tăng lên so với trước — bug collision vốn tiềm ẩn trong fallback fingerprint (ít khi dùng tới) mới bộc phát rõ thành TIB-5460.
- Khi 1 ticket đổi cơ chế fetch/issue identity (timing, timeout, retry), luôn hỏi: "cơ chế fallback cũ có sẵn từ trước hay không, và ticket này có làm tăng tần suất dùng tới fallback không?" — đây thường là nguồn bug ẩn, không phải do logic fallback mới sai mà do tần suất chạm tới nó tăng đột biến.
- Khi 2 ticket liên tiếp cùng sửa chung 1 service (vd `ThumbmarkService`, `ValidateThumbmark`), regression test của ticket sau PHẢI re-run lại các checklist quan trọng của ticket trước (đặc biệt: legacy format vẫn pass, tamper signature → 401, per-route bucket độc lập) — không giả định ticket trước đã "xong" là miễn nhiễm với thay đổi mới.
- Log kiểu `thumbmark.validation.legacy_format_used` (đếm tần suất fallback/legacy path) là bằng chứng định lượng hữu ích để so sánh trước/sau một fix về fallback — nên hỏi dev có dashboard/metric này không thay vì chỉ test thủ công.

## Open questions template
- Limit tính theo IP đọc từ đâu (`X-Forwarded-For` có được trust không)? Shopper sau NAT chung có bị chặn nhầm?
- Ngưỡng cụ thể per route đã chốt chưa, hay còn tune? Có config bật/tắt/nới nhanh trên prod không?
- Response 429 gồm những gì (message, `Retry-After`, flag)? SDK/widget hiển thị gì cho shopper?
- Thiếu hoàn toàn header identity thì trả gì — 401 hay vẫn cho qua bằng IP?
- Identity có TTL/expiry không? Hết hạn thì widget tự refresh hay shopper bị 401?
- Transition window chấp nhận legacy format kéo dài bao lâu, tiêu chí nào để tắt?
- Payload cap đo theo tiêu chí nào và ngưỡng bao nhiêu? Campaign phức tạp nhất hiện có nặng bao nhiêu?
- Có cần test lại trên môi trường có CDN/proxy thật không (staging có phản ánh đúng IP không)?
