# Date Range + Timezone Rules (Portal ↔ Backend)

Dùng rule này khi issue động đến lọc/tìm kiếm theo khoảng ngày: Orders page, export CSV, analytics/report, Order API (public/partner), instance order items, hoặc bất kỳ thay đổi nào ở scope query theo `start_date` / `end_date`.

## Context cần nhận diện

- **Ai sinh ra giá trị ngày**: Portal (frontend) gửi datetime chính xác đã quy đổi theo store timezone, hay client gửi bare date `YYYY-MM-DD`?
- **Backend làm gì với giá trị đó**: có `startOfDay()` / `endOfDay()` widening không? Widening theo timezone nào (UTC hay store timezone)?
- **Timezone nào là "nguồn sự thật"**: store timezone (Shopify shop setting) vs browser/device timezone của người đang đăng nhập vs UTC của DB.
- **Scope/query dùng chung bao nhiêu consumer**: một `scopeByDateRange()` thường phục vụ cả Portal UI lẫn public API — sửa hành vi là sửa toàn cục.

## Nguyên nhân lỗi kinh điển

Double conversion / re-widening: Portal đã convert `23:59:59` local → instant UTC chính xác, backend lại `->endOfDay()` trên instant đó theo lịch UTC → nới thêm tới ~24h. Với store lệch UTC (vd UTC-7) sẽ kéo đơn của ngày kế tiếp vào kết quả.

Cách phân biệt khi test: bug **chỉ xuất hiện với store có offset ≠ 0**. Store UTC sẽ pass ngay cả khi code sai → không bao giờ verify fix loại này chỉ trên store UTC.

## Requirement cần kiểm tra

- Biên chính xác: đơn tại `start 00:00:00` và `end 23:59:59` (giờ store) phải **nằm trong** kết quả (inclusive 2 đầu).
- Đơn tại `end + 1 giây` và `start − 1 giây` phải **không** xuất hiện.
- Bare date input (`2026-08-13`, không có time) phải giữ nguyên hành vi cũ = full calendar day.
- Cùng một khoảng ngày phải cho **cùng tập kết quả** ở list, count/total, pagination và export CSV.

## Impacted areas

- Orders page (list + filter + count hiển thị).
- Export CSV / export template theo cùng bộ lọc.
- Public/partner Order API (thường gửi bare date — path phải bất biến).
- Instance order items endpoints.
- Analytics/dashboard nếu dùng chung scope.
- Pagination (page 2+ phải giữ đúng range), sorting theo ngày.

## Risk patterns

- Off-by-one-day ở đúng 1 trong 2 biên (start đúng, end sai hoặc ngược lại).
- Fix cho Portal làm hỏng silently public API (bare date bị hiểu là 00:00:00 → mất cả ngày dữ liệu).
- Store ở offset **dương** (vd UTC+7, Asia/Ho_Chi_Minh) lệch ngược chiều với UTC-7 → phải test cả 2 chiều offset, không chỉ chiều trong bug report.
- DST: store ở timezone có daylight saving, range vắt qua ngày đổi giờ.
- Range 1 ngày (start = end) và range đảo ngược (start > end).
- Số liệu tổng/count lấy từ query khác với query list → lệch nhau.

## Open questions to consider

- Timezone dùng để hiển thị cột ngày trong list có trùng timezone dùng để lọc không?
- Store đổi timezone sau khi có đơn thì kết quả lọc thay đổi thế nào?
- Public API có phiên bản/khách nào đang gửi datetime chính xác (không phải bare date) không?
- Bộ lọc preset (Today / Last 7 days) sinh giá trị theo timezone nào?

## Suggested test focus

- Ma trận biên 4 mốc: `start-1s`, `start`, `end`, `end+1s` — giờ store, không phải giờ trình duyệt.
- Ít nhất 3 store timezone: offset âm (UTC-7), offset dương (UTC+7), UTC.
- Bare date qua public API → vẫn trả full ngày như trước fix.
- Đối chiếu list vs count vs CSV export cùng một range.
- Range 1 ngày, range dài, range không có đơn (empty state).
- Người dùng admin ở timezone khác store → kết quả vẫn theo giờ store (đây là hành vi đúng, không phải bug).
