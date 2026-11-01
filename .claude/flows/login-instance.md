# Login, instance, store switcher, endpoint chung

## Endpoint đã quan sát (network log)

| Mục đích | Request |
|---|---|
| Login | `POST https://staging-api.teeinblue.com/api/login` (401 khi fail) |
| Lấy token (cũ) | `POST https://staging-api.teeinblue.com/api/token` |
| Thông tin user | `GET https://staging-api.teeinblue.com/api/user` |
| Danh sách instance (store) | `GET https://staging-api.teeinblue.com/api/instances` |
| Instance active | `GET /api/instances/<id>/popup-messages` (bắn sau login) |
| GraphQL portal | `POST https://staging-api.teeinblue.com/api/graphql` (cookie + header `X-XSRF-TOKEN`); relay: `POST /api/graphql/relay` |
| GraphQL cũ (list campaign, aggregate) | `POST https://staging-graphql.teeinblue.com/v1/graphql` — gọi thẳng từ browser trả `Invalid response from authorization hook` |
| Trash | `GET https://staging-api.teeinblue.com/api/trash?cursor=&per_page=20&sort=deleted_at&sort_type=desc` |
| Activity log | `GET https://staging-api.teeinblue.com/api/staff-activity-logs` |
| Đổi user/store | `POST /api/users/<userId>/login` (vd 64 = Linh Pham, 117 = linh open platform) |

`GET /api/artworks/<id>` trả **405**. Đọc artwork bằng GraphQL `artworks_by_pk(id){ templates }` hoặc merchant API công khai (xem `storefront-sdk.md`).
`GET /api/instances/287` trả cả `token`/`crisp_token` — đừng in ra output.

## Các trang chính

| Trang | URL |
|---|---|
| Campaigns by Product Base | `https://staging-portal.teeinblue.com/campaigns` |
| Campaigns (filter theo tên) | `https://staging-portal.teeinblue.com/campaigns?limit=20&name=<keyword>` |
| Campaigns by Shopify Products | `/platform-products` (mới: `/platform-products/new`) |
| Product Base | `/products` |
| Artworks | `/artworks` |
| Trash | `/trash` |
| Activity logs | `/activity-logs` |
| Global Options | `/global-options` (Assets) |
| Dynamic Translations | `/artwork-translations` (Extras) |
| General settings | `/general-settings` |
| Product Page Settings / Content | `/product-page-settings`, `/product-page-content` |

`/settings` là 404.

## Login (đã verify từ 2026-08-23)

Portal có 2 kiểu login:

| Kiểu | URL | Dùng cho |
|---|---|---|
| Shopify owner | `/login` | Nhập store domain → `Log in` |
| Teeinblue account (staff) | `/login?staff=true` | Email + password → `Log in` |

Agent dùng **`/login?staff=true`** (`.env` là email/password).

1. Navigate `https://staging-portal.teeinblue.com/campaigns` → chưa có session sẽ về `/login` (kiểu Shopify domain).
2. Navigate `https://staging-portal.teeinblue.com/login?staff=true`.
3. Điền textbox `Your email` (label `Enter your email *`) và `Your password` (label `Enter your password *`).
4. Click `Log in`.
5. Verify: URL rời `/login`, snapshot thấy dữ liệu.

- Lỗi hiện dạng text ngay dưới form (vd `Email address is not verified`). Đọc cả snapshot lẫn network để phân biệt sai password vs account chưa verify.
- Trang login có **Cloudflare Turnstile**. Nếu thành interactive challenge thì dừng, báo người dùng login tay.
- Account: `TIB_STAGING_EMAIL` (`.env`) → login OK (user `Linh Pham`, id 64). account phụ dạng `+auto` của cùng email chưa verify email → đừng dùng.
- Sau login portal về `/` (Home), không giữ trang đích. Tự navigate lại.
- SPA load chậm: sau navigate luôn `browser_wait_for` `textGone: "Initializing..."`. Trang Dynamic Translations có khi cần ~8s.
- Auth staging là Sanctum session (cookie). Request API tự gọi cần `credentials:'include'` + `X-XSRF-TOKEN` lấy từ cookie.

### 2FA
- 2026-10-27 portal từng bắt 2FA sau email/password (`/login/two-factor`). Người dùng đã tắt 2026-10-28; login lại `POST /api/login` 200 không hỏi mã.
- Nếu 2FA bật lại: agent không có TOTP/inbox → nhờ người dùng nhập mã trong browser Playwright rồi chạy tiếp.

## Instance / store đang active

- Account `TIB_STAGING_EMAIL` mặc định làm việc ở instance **58** `Enterprise (Test)`, store **`linh-tib-staging.myshopify.com`** (sidebar dưới tên `Linh Pham`, và `Store Settings`). Đây là store đích khi publish.
- Instance id: linh-tib-staging = 58, linh-sdk-v2 = 325, linh-tib-checkout = 237 (plan `Starter (Test)`), 287 = `linh open platform` (Boundless, tester-4.com, plan `Basic - Picanova`).
- Plan badge của 58 có lúc hiện `Free for development`, có lúc `Enterprise (Test)` — cùng store, không phải lỗi switch.
- **Instance active lưu phía SERVER theo account**, dùng chung giữa các phiên. Phiên khác có thể đổi instance giữa chừng (đã gặp: 287, linh-tib-checkout 237, OETester 241 `oe24-staging-tib-2` acting_user 94, user 247 `sample-tib-campaign`). Dấu hiệu: `/orders/<id>` của 58 trả trang trống, dữ liệu lạ.
- **Luôn kiểm trước khi tạo data:** đọc tên store ở sidebar + `GET /api/user` (id phải là 64) + request `/api/instances/<id>/...`.
- Session còn sống nhưng là user 247: login lại `/login?staff=true` vẫn ra 247. Phải đổi bằng switcher (dưới).

Sidebar instance 58: `Home`, `Orders`, `Bulk Fulfill`, `Campaigns` (> `by Product Base` `/campaigns`, `by Shopify Products` `/platform-products`), `Product Base` `/products`, `Artworks` `/artworks`, `Assets`, `Store Settings`, `Extras`, `AI Assistant (MCP)`, `Organization`.

## Đổi store / instance (switcher)

Cách ổn định nhất (2026-10-28/29):
1. Click `.instance-domain:visible` (khối tên instance/domain góc trên sidebar; cũ: `.sidebar-users .user-switcher-toggle`, hoặc `page.mouse.click(150,98)`).
2. Popup `.user-switcher-popover` (`Switch to:`, ô `Search..`, danh sách user/org có mũi tên `>`).
3. Nếu org đang thu gọn: click org (`Linh Pham` / `linh open platform`) để xổ store con.
4. Click store theo domain: `linh-tib-staging.myshopify.com` (hoặc `.user-item__instance__domain:visible`, `getByText('| linh-tib-staging.myshopify.')`, `getByTitle('linh-tib-checkout | linh-tib-...')`).
5. ⇒ `POST /api/users/<id>/login` 200, về `/`. Reload/navigate lại để sidebar cập nhật (reload có thể `ERR_ABORTED`, vô hại).

Ghi chú:
- Ô `Search..` có lúc lọc được (gõ `linh-tib-staging`), có lúc không — khi không lọc được thì xổ org rồi click domain.
- Org `linh open platform` có 2 dòng cùng tên `tester 4` (tester-4.com / tester-5.com) → chọn theo domain: `page.getByText('tester-4.com').first()`.
- Dữ liệu Organization dùng chung: Product Base, campaign, artwork tạo ở store này hiện ở store khác cùng org. Header store là state phía server.
- `/platform-products/new` chọn store riêng trong form, không cần switch sidebar.

## Storefront

- `linh-tib-staging.myshopify.com` và `linh-tib-checkout.myshopify.com` đều có password storefront `oe`.
- Publish ảnh hưởng thật ra storefront staging → chỉ publish khi được yêu cầu.
