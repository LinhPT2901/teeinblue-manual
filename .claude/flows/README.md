# Sổ tay flow staging portal teeinblue — index

Selector / label / bước thao tác đã verify trên `staging-portal.teeinblue.com`. Đọc file này trước, rồi mở đúng file theo việc cần làm.
Gặp UI khác ghi chép: cập nhật đúng file chủ đề (ghi ngày), không thêm nhật ký phiên. Mục bị thay thế chuyển vào `_archive.md`.

## Danh sách file

| File | Đọc khi |
|---|---|
| `login-instance.md` | Login `/login?staff=true`, 2FA, kiểm/đổi instance–store (switcher), endpoint & trang chính |
| `playwright-tooling.md` | Profile Playwright bị khoá, CDP workaround, portal trắng trang, nắp Mac đóng, Crisp chặn click |
| `campaign-product-base.md` | Tạo campaign by PB: tạo, add PB (blocker `preview_thumbnail`), gắn/gỡ artwork print area, Locate, mockup trong campaign, duplicate/archive, 250 variants |
| `publish-sync.md` | Launch / Update (multi-store), lỗi handle, publish platform product, metafield, Logs |
| `product-base.md` | Tạo/duplicate Product Base, printarea, variant, giá, description Tiptap, mockup của PB |
| `mockup-editor.md` | Mockup Editor: printarea layer, Transform không id, Add Image, Add Artwork, Alt text |
| `campaign-by-shopify-products.md` | Campaign by Shopify Products: chọn Shopify product, connect variant, mockup, assign mockups; Shopify Admin |
| `boundless.md` | Instance Boundless 287/561: Products (Boundless), storefront open platform |
| `artwork-editor.md` | Dialog `Artwork details`, design format, Save / Save & Close, đọc JSON, 1.0 vs 2.0, template, layer list, picker `+ Layer`, duplicate artwork |
| `toolbar-transform.md` | Toolbar canvas, Transform (cạm bẫy fill), font, background image, shadow, border, HD, emboss, curve |
| `layers-text.md` | Single-line Text, Paragraph (auto-fit, Remove line breaks), Curve, Warp, Spiral, prefix/suffix, Duplicate & Link |
| `layers-image-photo.md` | Static Image, Clipart/Vector Category, Vector Upload, Photo Upload, Multiple Uploads, T2I, image effects, ImagenHub, biến prompt, Dynamic Clipart |
| `layers-form-elements.md` | Toggle, Font, Color, Additional Option, Addon Charge (2 mode, giá per-store), JSON List, Song Search, Route Maps, puzzle |
| `personalization-populate-conditional.md` | Panel Personalization, Populate values (thứ tự Source → Value, token), Conditional |
| `global-options.md` | Tạo/sửa Global Option, cạm bẫy ô Name, gắn GO vào layer |
| `assets-library.md` | Assets categories, clipart/vector/font/color/map, thư viện ảnh mask/image, layer image, trash, quota 429 |
| `dynamic-translations.md` | Dictionary, CSV import/export, Import to Translation, locale storefront |
| `quick-navigation.md` | Popup Quick navigation, điều kiện enable |
| `shop-config-defaults.md` | Store config công khai, mặc định layer theo ngày (Rule 14), Product Page Settings, market/currency |
| `storefront-sdk.md` | SDK v1/v2, paragraph rules, cache bundle, route `merchant/*`, rate limit, localStorage, ATC/checkout/order |
| `qa-rules.md` | Rule 13 (race condition), Rule 14 (sai mặc định), nguyên tắc verify |
| `_archive.md` | Nhật ký phiên, blocker đã hết, ghi chép bị thay thế (nguyên văn, chỉ để tra cứu) |

## Cạm bẫy chung

- **Kiểm instance/user trước khi tạo data** (`GET /api/user` = 64, sidebar `linh-tib-staging.myshopify.com`). Instance active dùng chung giữa các phiên, bị đổi bất chợt.
- Sau navigate: `browser_wait_for` `textGone: "Initializing..."`. Sau login portal luôn về `/`.
- **Add product base:** check network/console — blocker `preview_thumbnail` tái phát 2026-10-23 (2026-10-26 lại chạy), có thể đã hết, kiểm lại.
- **`Save & Close` chỉ tạo artwork, không gắn vào print area** — click card trong `Select your artwork`, kiểm print area đã đổi.
- **Save sớm, save từng chặng**: session hết hạn im lặng làm mất layer chưa lưu. Đọc **toast** sau mỗi Save (validate fail không có lỗi console).
- **Ô Name của `Artwork details`: `input[name="name"]:visible`** — selector khác trúng ô search layer phía sau.
- **Transform: clear rồi mới nhập** (Cmd+A → Delete → fill), đọc lại 4 field; `fill()` có thể nối/nhân đôi giá trị.
- **Toggle = `label.vue-js-switch`**, radio = `label[for=...]`; click chữ không ăn.
- **Header section panel ✎ là Title Case trong DOM**; section có thể thu gọn nên field chưa có trong DOM.
- **Panel ✎ che layer list và `+ Layer`** — bấm back trước. `#manage-layer` trùng id — scope theo `#artwork-sortable-layer-layer-<id>`.
- **Populate: chọn Source trước, Value sau** (chọn Source xoá Value).
- **Mặc định toggle (required, show_in_cart) đổi theo config shop** — đọc lại mỗi phiên trước khi kết luận (Rule 14).
- **Multi-store launch: chỉ bấm hàng store đích**; campaign đã publish dùng `Update` (`/sync`).
- `GET /api/artworks/<id>` = 405 — đọc qua GraphQL `artworks_by_pk` hoặc merchant JSON công khai.
- UI có thể nuốt lỗi (429 tạo layer-image, GraphQL error) — xem network.
- WAF chặn request body chứa `<script` / `onload=` (SVG upload, `option_template`) ⇒ `net::ERR_FAILED` + CORS, không retry.
- Publish ảnh hưởng storefront thật — chỉ publish khi được yêu cầu. Storefront password `oe`.

Bản gốc nguyên vẹn trước khi tách: `_original-2026-10-31.md` (chỉ để tra, không cập nhật).
