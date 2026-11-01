# Năng lực môi trường test teeinblue

Cái gì test được, ở đâu, và cái gì không test được trên staging. Gom từ memory (2026-08 → 2026-10-31).

**Ai đọc:** `qa-requirement-analysis` (mục Impacted Areas / Risks), `gen-testcase` (gắn nhãn `env-blocked` ngay lúc sinh case), `create-test-data`, agent `tib-test-data` và `tib-execute-testcase`.
**Quy tắc cập nhật:** phát hiện giới hạn môi trường mới, hoặc giới hạn cũ đã hết → sửa file này, ghi ngày + ticket. Giới hạn chỉ ghi khi đã được người dùng/Dev xác nhận hoặc đã kiểm chứng; quan sát chưa xác nhận ghi ở mục cuối với nhãn `chưa xác nhận`.

Nhãn dùng khi sinh test case:
- **`env-blocked`**: cả case không chạy được trên môi trường QA → không execute, status `skipped` + lý do lấy từ file này.
- **Vế không kiểm được**: chỉ một vế của expected không kiểm được → giữ case, bỏ vế đó khỏi expected (hoặc ghi "vế X: skip — <lý do>"), case kết luận theo các vế còn lại.

---

## 1. Host và môi trường

| Thành phần | Staging | Production |
|---|---|---|
| Portal admin | `staging-portal.teeinblue.com` | `portal.teeinblue.com` |
| API | `staging-api.teeinblue.com` (GraphQL qua `/api/graphql`) | — |
| SDK storefront | `staging-sdk.teeinblue.com` | `sdk.teeinblue.com` |
| Customize page | `staging-sdk.teeinblue.com/customize/` | `customize.teeinblue.com` |
| Upload | `upload-staging.teeinblue.com` | `photo-api.teeinblue.com` |

- Nhận biết môi trường của storefront: xem script SDK (`staging-sdk` = staging).
- **Auth staging = Sanctum session:** `GET /sanctum/csrf-cookie` (Origin/Referer = portal) → `POST /api/login` kèm `X-XSRF-TOKEN` → cookie session. Gọi thẳng `staging-graphql.teeinblue.com` lỗi "Invalid response from authorization hook". Thiếu User-Agent → 403. `scripts/make-mcp-storage-state.mjs` làm sẵn bước này.
- **2FA portal staging:** tắt từ 2026-10-28. Nếu `/login/two-factor` xuất hiện lại → nhờ người dùng nhập mã trong server Playwright `playwright` (preflight).
- **Rate limit staging cố ý nhỏ hơn ticket** (vd ticket 20/min, staging `x-ratelimit-limit: 4`). Verify theo header thực tế, không theo số trong ticket.
- **WAF/Cloudflare** chặn body chứa `<script` / `onload=` (ERR_FAILED + lỗi CORS giả) và payload SSRF/XSS trong Postman. Xem L-003 trong `.claude/tib-operational-lessons.md`.

## 2. Store / instance — cái gì test ở đâu

| Store / instance | Plan / đặc điểm | Dùng cho | Không dùng cho |
|---|---|---|---|
| `linh-tib-staging.myshopify.com`, instance 58, user 64 | Dev store, **non-Plus** | Mặc định: portal, storefront, Thank You / Order status page | Checkout page; **Generate test design bị disable** ("Not available for Development stores") |
| `linh-tib-checkout.myshopify.com`, instance 237 | **Plus** | **Bắt buộc** cho app block trên Checkout page | — |
| instance 287 "linh open platform" (tester-4.com) | Boundless, không có storefront thật, không có PB `example` | Case Boundless (portal) | Case campaign by Shopify; chạy song song với 58 (cùng account linhtester) |
| `linh-open-platform.myshopify.com`, instance 561 | Storefront Boundless | Case Boundless cần storefront (platform product 279) | Tạo data mới |

Account / data đặc thù (no-Mapbox, onboarding, victim org 94, staff quyền hạn chế…): tra `.claude/tib-reusable-test-data.md`.

**Thanh toán test:** linh-tib-staging dùng Bogus gateway, hiển thị là **"Credit card"**. Thẻ `1` = thành công, `2` = fail, `3` = exception. Money Order / COD đã hết lượt order của dev store.

## 3. Không test được trên staging

| Hạng mục | Mức | Cách xử lý | Nguồn |
|---|---|---|---|
| **Test design** (Generate test design) trên dev store | Vế/bước | Thay bằng đặt order test rồi lấy design của order | 2026-10-16 TIB-5575 |
| **Horizon** (job failed/queued) | Vế | Bỏ vế Horizon; verify UI + API là đủ để pass | người dùng 2026-10-14 TIB-5544 |
| **Strava** (Route Maps `strava-upload`) | Vế | Bỏ dòng Strava, ghi "not testable on staging"; không blocked | người dùng 2026-10-27 TIB-5539 |
| **Tracking từ provider** (fulfilled theo tracking) | Case | `env-blocked` → skipped. Fulfill tay trên Shopify đi đường khác, không thay được | người dùng 2026-10-29 TIB-5439 |
| **Size gốc provider** (Printify không token, merchOne API 403) | Vế | Vế "giảm 1/2 size" skip; vẫn verify DPI | người dùng 2026-10-30 TIB-5500 |
| **`photo_endpoint=snap`** | Case/vế | Portal không có setting; chỉ Dev/admin set được. Trên staging snap = photo-api cùng URL → chỉ verify HTML/preconnect | 2026-10-23 TIB-5551 |
| **photo-api / upload CORS / preconnect cdn, photo-api** | Vế | Hai host này vẫn là production → phải kiểm trên production | 2026-10-22 TIB-5551 |
| **Network timing** (preconnect, connection reuse, TTFB) | Vế | Số headless chỉ tham khảo; kết luận theo Chrome thật (headed / người dùng kiểm DevTools) | 2026-10-23 TIB-5551 |
| **Browser chặn site data / ITP** | Vế | Chỉ giả lập được clear storage, route abort — chưa chứng minh tương đương | 2026-10-31 |
| **2 shop khác nhau** | — | Dùng org 64 vs 94 (catalog), không tạo mới | — |
| **Config server** (`.env` provider key teeinblue, branch, migration) | Case/vế | Điều kiện tiên quyết cho Dev; không tự làm | — |

## 4. Đặc điểm của môi trường làm sai kết quả nếu không biết

- **Preview trong theme editor / checkout editor không có data teeinblue** (chỉ placeholder) → không kết luận extension hỏng dựa trên preview. Verify bằng order thật trên storefront.
- **Link Edit Customization luôn trỏ `customize.teeinblue.com` (production)** kể cả trên staging → 404 là chấp nhận được, không log bug. Tự đổi host sang `https://staging-sdk.teeinblue.com/customize/?<giữ nguyên query>`.
- **Upload bằng Playwright vượt thuộc tính `accept`**: Dropzone báo đỏ nhưng file vẫn lên server. Merchant thật bị FE chặn. Lấy kết quả FE làm hành vi merchant; phần server ghi riêng "tool bypass", không log bug.
- **`app-v1.js` không có version hash, cache 10 năm**: trình duyệt có thể chạy bundle cũ. Preflight phải so bundle.
- **Translations storefront cache immutable 1 năm theo `translation_version`**: vừa Save có thể chưa tăng version → đợi rồi reload, hoặc mở context sạch.
- **Customization data của field trên storefront nằm ở localStorage** (global option ở key `teeinblue-global-options`) → dùng context sạch, localStorage giữ customization cũ.
- **Dialog Confirm password có hiệu lực 15 phút**: case cần thấy dialog phải fresh login hoặc chờ quá 15 phút.
- **`default_layer_value` của user 64** do người dùng tự đặt, có thể đổi (lần gần nhất `{required: true, show_in_cart: true}`, 2026-10-21) → đọc lại giá trị thật trước khi test.

## 5. Tool: MCP và Shopify

| Tool | Giới hạn | Cách xử lý |
|---|---|---|
| Staging MCP `create-global-option-tool` | Không có `show_in_cart` → giá trị GO không hiện ở cart / order Options. Lỗi đã report riêng | Case cần thấy ở cart → bật Show in cart trên Portal rồi sync campaign |
| Staging MCP (GO, layer) | **Không áp `default_layer_value`** của user (portal có áp) | Expected khi tạo qua MCP = payload truyền vào. Dựng data cho case phụ thuộc default thì tạo bằng Portal |
| Staging MCP condition (`dependency.dependencies[].value`) | Phải đúng kiểu id: AO nguồn category = số `[3510]`, inline = chuỗi `["L00"]`. Sai kiểu MCP vẫn nhận nhưng storefront không match | Dùng id số lấy từ campaign JSON `clipart_categories[].options[].id` |
| Shopify MCP (`mcp__shopify__*`) | Trỏ linh-tib-staging (instance 58); `get-orders` chỉ trả order cũ nhất; không tạo collection, không publish Online Store; product tạo bằng MCP chưa lên Online Store (storefront 404) | Làm qua Shopify admin bằng Playwright (server `playwright`, có session). Xem L-002 |
| Playwright headless | Timing mạng sai; thiếu throttle mặc định | Dùng server MCP (headed); throttle/route theo công thức trong agent execute |

## 6. Chạy song song

- Server `playwright`: profile cố định, giữ session tương tác (Shopify admin SSO, 2FA). Dùng cho việc cần login tay.
- Server `playwright-2`, `playwright-3`: `--isolated` + `storageState` login sẵn (`playwright/.auth/mcp-isolated.json`, gồm portal + mở khoá 2 storefront + Shopify admin nếu `shopify.json` còn hạn). Mỗi lần server khởi động là một context sạch. Session hết hạn → `node scripts/make-mcp-storage-state.mjs` rồi restart Claude Code.
- Mỗi issue một server. Tài nguyên dùng chung (setting store/account, theme, campaign tái sử dụng) phải giữ quyền qua `scripts/tib_runctl.py`.
- Instance 58 và 287 dùng chung account linhtester → không chạy song song.

## 7. Quan sát chưa xác nhận

- Quota tạo layer-image theo account (429 kéo dài, ≤ 2 request liên tiếp) — ngưỡng cụ thể chưa rõ (L-001).
- Upload bị 422 validation có tính vào daily limit hay không — chưa rõ.
