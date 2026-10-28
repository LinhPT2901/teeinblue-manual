# Phạm vi load SDK trên storefront (bật/tắt script theo trang)

## Nhận diện
Issue nhắc setting bật/tắt script theo trang (cart page, all pages, product page), `app-v1.js`, `async.js`, `personalizer-config`, `window.teeinblueShop`, `TEEINBLUE_LOADED`, app embed, `teeinblue-scripts.liquid`, page speed/TBT.

## Kiến thức nền cần kiểm tra
- SDK có nhiều đường load: liquid in thẻ `<script defer>` (app embed block **và** legacy snippet cài tay) + `async.js` force-load theo URL. Tắt phải chặn **mọi** đường, kiểm tra cả HTML source lẫn request động.
- Cờ setting đi: portal → config registry/metafield shop → liquid expose ra `window.teeinblueShop.*` → JS đọc. Theme/snippet chưa update thì cờ không có → phải rơi về hành vi mặc định, không lỗi.
- Nhận diện trang bằng regex URL dễ match nhầm (handle sản phẩm, locale prefix `/fr/cart`, trailing slash, query string, `/pages/cart`). Tách test theo: template liquid (`template.name`) vs `location.pathname`.
- Setting chồng nhau (vd "Load scripts on all pages" vs "Disable on cart") → hỏi thứ tự ưu tiên.
- Cart page ≠ cart drawer: drawer chạy trên trang khác, không thuộc template cart.

## Impacted areas hay gặp
- Feature SDK trên trang bị tắt (cart: thumbnail customization, preview, edit customization, edit cross-sell, auto-hide addon, autofixer addon).
- Order/print file (phải không đổi vì lưu từ product page).
- Theme preview (unpublished), Markets/locale URL, theme editor.

## Rủi ro test
- Theme editor preview không có data teeinblue → verify trên storefront thật.
- Cache metafield/CDN → đổi setting xong cần chờ/sync, ghi rõ.
- Lighthouse/TBT dao động → chạy nhiều lần, chỉ dùng làm tham khảo.

## Câu hỏi mẫu cho PO/Dev
- Setting nào thắng khi chồng nhau? Có cần ghi chú trên UI không?
- Merchant đang dùng snippet legacy phải tự update không? Có hướng dẫn/KB?
- Path nào được coi là cart (locale, trailing slash, `/pages/cart`)?
