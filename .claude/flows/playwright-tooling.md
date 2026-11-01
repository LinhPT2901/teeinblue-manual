# Playwright / browser: khoá profile, CDP workaround, sự cố môi trường

## Profile Playwright MCP bị khoá

Lỗi: `Browser is already in use for .../teeinblue-manual/.playwright-profile, use --isolated`.

Phân biệt 2 trường hợp:
- **Tiến trình cũ còn sót** (Chrome for Testing giữ `SingletonLock`, không ai dùng): `ps aux | grep "[p]laywright-profile"` rồi `kill -TERM` PID Chrome + MCP cũ (giữ MCP hiện tại). Người dùng cho phép kill Chrome for Testing đang giữ lock. Session login nằm trong profile nên không mất.
- **Session Claude/MCP khác đang dùng** (MCP PID khác relaunch Chrome ngay sau khi kill): KHÔNG kill. Dùng CDP workaround.

## CDP workaround (đã chạy nhiều phiên)

Cách A — copy profile, không cần login lại:
1. `rsync` `.playwright-profile` sang scratchpad, bỏ `Singleton*`, `*Cache*`, `Service Worker`, `IndexedDB` (~27MB).
2. Chạy Chrome for Testing với `--remote-debugging-port=<port> --user-data-dir=<scratchpad>/profile --use-mock-keychain --password-store=basic` ⇒ cookie Sanctum giải mã được, vào thẳng portal (và Shopify admin nếu profile gốc đã login).

Cách B — profile sạch: launch Chromium của playwright local (`node -e "require('playwright').chromium.executablePath()"`) với `--remote-debugging-port=<port> --user-data-dir=<scratchpad>/profile`, rồi login `/login?staff=true` bằng `.env`.

Lái bằng script nhỏ:
- `chromium.connectOverCDP('http://127.0.0.1:<port>')` → `ctx.pages()[0]`; kết thúc bằng `process.exit`, KHÔNG `browser.close()`.
- Vẫn đi đúng luồng UI (click/fill).
- Mỗi phiên chọn port riêng, không dùng port phiên khác đang giữ (đã dùng: 9337, 9338, 9341, 9355, 9363, 9381, 9395, 9411, 9433, 9447, 9465, 9471, 9483, 9489, 9503, 9505, 9517, 9531, 9539, 9545, 9547, 9551, 9563, 9577, 9583, 9591, 9593, 9601, 9611, 9620, 9643, 9663, 9677, 9727, 9751, 9821, 9192, 9212).
- Profile cũ trong scratchpad báo `Opening in existing browser session` ⇒ đổi tên thư mục profile.
- Context tạo bằng `browser.newContext()` qua `connectOverCDP` bị huỷ khi script disconnect ⇒ login account B + thao tác + query phải nằm trong CÙNG một script.
- Session của profile copy có thể bị huỷ giữa chừng (419 rồi 401, portal về `/login`) — có thể do phiên khác dùng chung cookie. Khi đó mở profile sạch và login lại.

Runner:
- `node run.js` phải `process.exit(1)` khi step lỗi, nếu không chuỗi `&&` chạy tiếp và áp config nhầm lên **layer đang mở panel**. Guard: so `.layer-editor-panel .layer-editor-title` với tên layer mong đợi trước mỗi bước sửa.
- Ghi network vào `net.jsonl`; tăng `slice` body lên ~300000 (body PUT artwork dài). KHÔNG ghi body `/api/login`.
- `browser_click` với CSS selector thường (vd `#artwork-sortable-layer-layer-600619 #manage-layer`) chạy được, không bắt buộc ref snapshot.

## Sự cố môi trường đã gặp

- **Portal trắng trang** (body/`#app` rỗng, không gọi API, `pageerror: Unexpected end of input` hoặc chunk 404) sau login hoặc sau vài lần goto: cache giữ bundle JS bị cắt. Fix: CDP `Network.clearBrowserCache` rồi reload.
- **Nắp Mac đóng** (`ioreg -r -k AppleClamshellState` = Yes): Chrome có giao diện mất vsync, `requestAnimationFrame` treo trên mọi tab ⇒ click kẹt "waiting for element to be visible, enabled and stable", screenshot timeout, v-popper không mở. Kiểm nhanh: evaluate rAF có timeout 4s. Chữa: copy profile rồi chạy headless `--headless=new --disable-gpu --disable-gpu-vsync --disable-frame-rate-limit --disable-background-timer-throttling --disable-renderer-backgrounding`. Máy sleep/dark-wake ⇒ một bước có thể mất vài phút, chạy nền rồi chờ.
- Session khác relaunch Chrome giữa chừng (trang về `about:blank`, mất artwork chưa lưu) ⇒ chuyển CDP ngay, **Save ngay sau layer đầu tiên** để artwork có id.
- `page.screenshot` timeout (chờ font 403) ⇒ chụp bằng CDP `Page.captureScreenshot`.
- Screenshot MCP ghi file trễ ~1-2s và `Read` cache theo path ⇒ mỗi ảnh tên mới, chờ ~2s trước khi Read.
- Widget chat Crisp (`.crisp-client`) chặn click nút dưới cùng modal ⇒ `page.addStyleTag({content:'.crisp-client{display:none !important}'})`.
- `#modals-container` dùng `position:fixed` ⇒ `offsetParent` luôn null; đọc dialog bằng `document.querySelector('#modals-container').innerText`.
- `bash sleep` bị sandbox chặn ⇒ chờ bằng `browser_wait_for({time: N})`.

## Giới hạn tooling

- Playwright MCP không expose CDP `Network.emulateNetworkConditions` (Slow 3G) — ghi nhận 2026-08-25/28.
- Không bật được "block site data" per-site, không có Safari ITP, không có request interception qua MCP để ép lỗi fetch.

## Nhiễu console bỏ qua được

- `403` cho `cdn.ownego.com/.../fonts/*.woff2|ttf`, `404` gravatar, `favicon.ico 404`.
- `404 /api/staff-activity-logs/variant:0` khi thêm variant PB.
- Warning `NaN` khi clear ô số.
