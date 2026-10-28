# Rule: Open API upload asset vào library (layer image / clipart / library ảnh) — teeinblue

## Khi nào áp dụng
Issue mở Open API (`openapi/v1/*`) để upload/list/get/delete asset (layer image, clipart, category, library thumbnail/mask/background...), thường phục vụ agent/automation của khách (vd UID). Keyword: "Open API to upload material", `assets:read`, `assets:write`, `upload_id`, `POST /uploads`, `on_duplicate`, "Create via Open API". Ví dụ gốc: TIB-5536 (layer image + clipart), vệ tinh TIB-5627 (library của TIB-5192). Đi kèm [[open-api-write-endpoint]], [[upload-false-success-temporary-file]], [[ssrf-url-fetch]], [[access-control-idor]], [[asset-library-bulk-thumbnail]].

## Context cần nhận diện
- Thường có **3 nguồn file**: presigned (`POST /uploads` → `PUT` → create với `upload_id`), regular multipart (chỉ cho SVG/EPS/GPX), và `url` (server fetch → SSRF). Mỗi loại file chỉ hợp lệ với một số nguồn → ma trận loại file × nguồn.
- Raster xử lý **async** (`processing` → `ready`) → cần biết trạng thái lỗi (`failed`?) và caller poll thế nào.
- Dev refactor code upload portal sang class dùng chung → **regression portal + MCP** là phần lớn khối lượng test, không chỉ API.
- **Quota ngày dùng chung** portal + API → test cộng dồn 2 kênh; trên staging limit có thể khác số trong ticket.
- Mục tiêu business thường là "agent tìm lại asset theo tên/prefix SKU" → tên giữ nguyên và search là AC thật, không phải chi tiết phụ.

## Requirement cần kiểm tra
- Tên mặc định (bỏ extension?), tên tự đặt, trùng tên, ký tự đặc biệt/unicode, độ dài; filter list là **exact** hay **prefix**.
- `on_duplicate`: key so trùng là gì (name / hash / url), giá trị mặc định, các giá trị khác.
- `upload_id`: chưa PUT, đã dùng rồi, hết hạn, của user khác, sai loại file so với khai báo.
- Delete asset đang dùng trong artwork qua API có bị chặn như portal không.
- Status code chuẩn: 401 / 403 (thiếu ability) / 404 (cross-tenant) / 422 (validation, >size) / 429 (quota hay rate limit?).
- Activity log ghi đúng kênh ("via Open API"); portal log không đổi.

## Risks
- Duplicate khi caller retry sau timeout (request tới server nhưng response mất).
- Item tạo ra nhưng file hỏng/không tới storage (thành công giả).
- SSRF qua `url`; file >limit qua `url` tải hết rồi mới chặn.
- URL CDN trả về public → asset lộ dù API có ownership check.
- Regression âm thầm ở portal uploader (replace, keep thumbnail, zip bulk, daily limit message).

## Suggested test focus
1. Happy path từng loại file × từng nguồn hợp lệ; verify item hiện trên portal đúng tên/category và dùng được trong artwork.
2. Ma trận nguồn sai (raster qua multipart, GPX không Mapbox token, AVIF, file đổi đuôi).
3. Size: đúng limit pass, limit+1 → 422 (cả file lẫn URL).
4. Auth/ability/cross-tenant; `upload_id` bất thường.
5. Duplicate/`on_duplicate`, name filter, category_id của account khác.
6. Quota dùng chung portal + API; activity log.
7. Regression portal + MCP theo checklist dev.

## Đã chốt với dev (TIB-5536, 2026-10-28)
- `on_duplicate` so theo **tên** (layer image/clipart: cùng tên + cùng category; category: tên + type [+ parent]). `create` mặc định; `skip` → 200 trả item cũ, không tính quota; `replace` chỉ raster clipart (+`keep_thumbnail`).
- `search` (Typesense, như MCP) cho layer image / layer image category / clipart category; `name` exact; dùng cả hai → 422. Clipart không có search.
- Status: không token/revoked 401; thiếu ability 403; id account khác trên URL 404; `category_id`/`parent_id` account khác trong body 422; quota ngày 429; rate 60 req/phút 429. **Bắt buộc `Accept: application/json`** (thiếu → 302/HTML).
- Không có trạng thái `failed`: xử lý lỗi thì item kẹt `processing`, `url: null`.
- Xoá layer image đang dùng → 400 "This image has already been used."; xoá clipart → vào Trash 60 ngày (không có restore API).
- URL: chỉ http/https, chặn private/loopback/link-local/metadata (422), **không follow redirect** (422), >64 MB chặn sớm, timeout 30 s.
- `upload_id` lỗi đều 422: chưa PUT ("PUT it to the upload_url first", vẫn dùng lại được); đã dùng/hết hạn/account khác ("not found or has expired"); upload URL sống 5 phút, `upload_id` 30 phút.
- Quota reset không có; test 429 bằng hạ "… max attempts" ở admin panel. `thumbnail_url` public CDN là by design; `url` là storage key.
