# Quy tắc QA khi kết luận (Rule 13, Rule 14)

## Rule 13 — Đo ngưỡng trigger trước khi gọi race condition là bug

Bài học TC-TIB-747: báo "input + blur trong debounce <10ms phá parity", đo lại thì chỉ 0ms (cùng tick) fail, ≥5ms pass; gõ phím + click thật pass.

Hai sai lầm cần tránh:
1. Lấy hằng số trong code (debounce 10ms) làm điều kiện trigger mà không đo.
2. Tái hiện bằng `dispatchEvent()` + `blur()` liền nhau trong 1 `page.evaluate()` rồi coi là hành vi sản phẩm. Thao tác người thật luôn là task riêng trong event loop ⇒ artifact của automation.

Quy trình:
```js
for (const d of [0, 5, 10, 15, 25, 50, 100, 300]) { input(); await sleep(d); blur(); check(); }
```
Rồi bắt buộc chạy lại bằng thao tác thật (`pressSequentially` + click thật). Chỉ delay 0 fail mà thao tác thật pass ⇒ không phải defect, chỉ là điểm robustness.
"State sai vĩnh viễn" không đủ để kết luận bug — phải chứng minh điều kiện đầu vào có trong đường đi người dùng thật.

## Rule 14 — Trước khi báo bug "sai giá trị mặc định"

Dính thật ở TIB-030 / TIB-5315: báo FAIL "toggle show_in_cart phải OFF by default" trong khi shop có `default_value: { show_in_cart: true }`. Không phải bug.

1. Đọc config shop (`shop-config-defaults.md`), xem `default_value` có key tương ứng không.
2. Có → không phải bug; ghi giá trị config trong test result, nhờ người có quyền đổi config rồi chạy lại.
3. Không có key → mặc định của code, đủ cơ sở báo bug.
4. Chạy lại sau khi đổi config: load portal với `Network.setCacheDisabled`.

Áp dụng cho cả layer trong artwork lẫn global option.

Cách viết test result: không xoá dấu vết lần chạy sai. Giữ screenshot cũ, ghi "lần đầu FAIL do config, không phải lỗi code", kèm giá trị config lúc đó và lúc chạy lại.

Cùng họ Rule 13: loại trừ biến môi trường/cấu hình trước khi kết luận defect.

## Ghi chú chung khi verify

- Toast là cách duy nhất biết validate Save fail ở artwork editor (console sạch) — đọc toast sau mỗi Save.
- UI có thể nuốt lỗi (vd 429 tạo layer-image, `preview_thumbnail`) ⇒ check network/console sau bước quan trọng.
- Re-test bug SDK: bust cache bundle trước (Rule 12, `storefront-sdk.md`); ghi bundle size + Last-Modified + đã bust hay chưa.
