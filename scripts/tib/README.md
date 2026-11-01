# scripts/tib — chạy case storefront bằng script

Mục đích: giảm thời gian execute. Agent viết một case file ngắn dùng helper có sẵn, rồi chạy nhiều case trong **một** lệnh. Không phải gọi tool từng bước, và không chờ cố định.

| File | Việc |
|---|---|
| `lib.mjs` | Helper: storefront SDK (`sf`), merchant API công khai (`api`), mạng (`net`), `until`, `testFile` |
| `run.mjs` | Runner: mỗi case một browser context, chạy song song, ghi kết quả + bất thường + trace |
| `poll.mjs` | Chờ tới khi điều kiện đúng (lệnh shell hoặc URL), thay cho `sleep N` |
| `examples/` | 4 case mẫu đã chạy pass trên staging 2026-11-01. Chạy lại sau khi sửa `lib.mjs` |

## Chạy

```bash
node scripts/tib/run.mjs --key TIB-xxxx runs/TIB-xxxx/cases/            # cả thư mục, theo thứ tự tên file
node scripts/tib/run.mjs --key TIB-xxxx --parallel 3 a.mjs b.mjs       # song song
node scripts/tib/run.mjs --key TIB-xxxx --headed case.mjs              # xem browser
node scripts/tib/run.mjs --key QA-EXAMPLES scripts/tib/examples/       # kiểm thư viện còn chạy
```

- Session lấy từ `playwright/.auth/mcp-isolated.json` (đã login portal + mở khoá storefront). Hết hạn: `node scripts/make-mcp-storage-state.mjs`. Không cần session: `--state none`.
- Kết quả từng case in ra JSON, cuối cùng in bảng tóm tắt. Đồng thời nối vào `runs/<KEY>/script-results.jsonl`.
- Ảnh và trace lưu ở `evidence/<KEY>/<id>-*.png|zip`. Case không pass luôn có ảnh cuối và trace (`npx playwright show-trace <zip>`).
- Exit 1 khi có case `error`.

## Case file

```js
export const meta = { id: 'TC-12', title: 'ATC giữ đúng giá trị text' };
export default async ({ page, sf, api, net, until, check, note, shot }) => {
  await sf.open(page, { handle: 'my-product' });               // store v1 mặc định; { store: 'v2' } cho linh-tib-checkout
  await sf.fill(page, 'Name', 'Max');                          // theo tiêu đề field, hoặc id layer: 990080
  const atc = await sf.addToCart(page);
  check('ATC thành công', atc.ok, atc.customization?.status);
  const line = (await sf.cart(page)).items.at(-1);
  check('cart giữ đúng text', line.properties.Name === 'Max', line.properties);
};
```

Kết quả: `pass` khi mọi `check` đúng, `fail` khi có `check` sai, `error` khi văng lỗi hoặc case không có `check` nào. Runner **không** ghi Testlane. Agent đọc kết quả, tự kết luận theo quy tắc của `tib-execute-testcase`, rồi mới update.

Tự ghi vào `anomalies`: console error, response teeinblue ≥ 400, request teeinblue bị lỗi mạng. `ERR_ABORTED` (do chuyển trang hoặc đóng context) bị bỏ qua.

## Helper

| Helper | Làm gì | Ghi chú |
|---|---|---|
| `sf.open(page, {store, handle, variant, locale, clearState})` | Mở product, tự qua password, xoá state SDK rồi reload, chờ field hiện | `clearState: false` khi case cần state cũ (vd khôi phục từ localStorage) |
| `sf.fields(page)` | Liệt kê field: `id`, `kind`, `label`, `required`, `hidden`, `invalid`, `controls` | Template duy nhất có `hidden: true` |
| `sf.template(page, label)` | Chọn template | v2 không tự chọn template |
| `sf.fill(page, ref, value)` | Input/textarea: xoá rồi gõ. Select: theo label. Radio/swatch: click label | `ref` = id layer hoặc tiêu đề field |
| `sf.upload(page, ref, 'TIB-xxxx/file.jpg')` | Upload file **trong `test-data/`**, chờ request upload cuối cùng xong | Trả `ms` + danh sách request. Dừng khi gặp 429 |
| `sf.addToCart(page)` | Bấm ATC (v1 `#teeAtcButton`, v2 nút theme), chờ POST customization + `cart/add` | Bị validation chặn thì trả `invalid.fields` ngay. **Tạo cart item và customization thật** |
| `sf.cart`, `sf.clearCart`, `sf.current`, `sf.storage`, `sf.productJs` | Đọc `/cart.js`, xoá cart, `getCurrentCustomization()`, localStorage SDK, `/products/<h>.js` | |
| `sf.previewSvg(page, evidencePath('preview'))` | Lưu SVG preview thật ra `.html` + `.png` | Ảnh cho mục review render |
| `sf.bundle(page, {bust})` | So bundle SDK trang đã nạp với bản server, trả `Last-Modified` | Chỉ biết bản trang đã nạp khi trang mở bằng `sf.open` |
| `api.campaign(store, shopifyProductId)`, `api.customization(store, uuid)` | Merchant API công khai | |
| `net.capture(page, /pattern/)` | Mảng request khớp pattern: method, url, status, ms, body | |
| `net.throttle(page, 'slow3g' \| 'fast3g' \| 'offline' \| {latency, down, up})` | Giả lập mạng qua CDP, trả hàm gỡ | Đã verify: latency 1500ms làm `/cart.js` từ 148ms thành 1509ms |
| `net.fail(page, /pattern/, {status, body, abort})` | Trả lỗi giả cho đúng request khớp, trả hàm gỡ | Đã verify: customization 500 giả, cart không có line |
| `until(fn, {timeout, interval, message})` | Chờ `fn()` truthy | Thay cho `waitForTimeout` |
| `testFile(rel)` | Đường dẫn file trong `test-data/`, báo lỗi nếu nằm ngoài | |

Throttle và route giả lỗi chỉ sống trong context của case, mất khi case kết thúc. Vì vậy không ghi `tib_runctl change` cho loại này.

## poll.mjs

```bash
node scripts/tib/poll.mjs --timeout 300 --interval 5 --match '"status":1' --url "https://staging-api.teeinblue.com/..."
node scripts/tib/poll.mjs --timeout 120 -- test -f evidence/TIB-xxxx/design.png
```

Thoát ngay khi điều kiện đạt (exit 0), in số giây đã chờ. Hết giờ thì exit 1. Trạng thái chỉ đọc được qua MCP (vd item order về Ready) thì agent gọi MCP; không dùng `sleep` cố định giữa các lần gọi.

## Lưu ý

- ATC trên store dùng chung: rate limit customization là 4 request/phút. Chạy `--parallel` nhiều case có ATC có thể dính 429. Kiểm `atc.customization.status` và `rateLimitRemaining`.
- Chưa có helper cho checkout/order và các luồng portal. Phần này vẫn dùng MCP, hoặc bổ sung helper khi một luồng lặp lại ở nhiều issue.
- Sửa `lib.mjs` xong thì chạy lại `examples/` (`--key QA-EXAMPLES`).
