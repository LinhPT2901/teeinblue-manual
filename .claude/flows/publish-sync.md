# Publish / Update (sync) campaign

Publish ảnh hưởng thật ra storefront staging → chỉ publish khi được yêu cầu.

## Campaign by Product Base — Launch lần đầu

Điều kiện: print area đã có artwork ⇒ banner `Your campaign is valid and ready to launch!`.

1. Header nút **` Launch`** (tooltip `Publish to platform`). `role=button[name=" Launch"]` có lúc không khớp ⇒ `main nav button:has-text("Launch")`.
2. Dialog **`Multi-store launch`** — `Stores from Organization: Linh Pham`, bảng `STORE NAME | PLATFORM | CAMPAIGN LINK | ACTION`.
   Danh sách store (2026-10-28): `ship-n-pickup`, `linh-sdk-v2`, `linh-tib-checkout`, `linh-tib-theme` (Etsy), `linh-tib-staging`.
   Bảng load chậm (`Empty data / Loading..` vài giây) ⇒ chờ hàng xuất hiện.
3. **Chỉ** click `Launch` trên hàng store đích: `[role=dialog] tr:has-text("linh-tib-staging") button:has-text("Launch")` (hàng chỉ có tên store, không có domain; `td:text-is(...)` không dùng được). Không bấm `Launch` cho store khác.
4. Request: `POST https://staging-api.teeinblue.com/api/campaigns/<id>/publish` → **200**. Toast `Publishing campaign <tên> — Content is published. Mockups are still publishing.` (có lần không hiện toast).
5. Hàng đổi thành `View` + `Update` + CAMPAIGN LINK (đợi ~5-10s; hàng có thể vẫn hiện `Launch` vài giây — đọc lại, đừng bấm lại).
6. Header đổi sang **` View` + ` Update`**. List `/campaigns` hiện badge **`Published on current store`**; GraphQL `campaign_instances.status = 5`.

Store đích không phải lúc nào cũng là `linh-tib-staging`: có task chỉ định `linh-tib-checkout.myshopify.com` (Shopify **Plus**, có app block teeinblue trong checkout editor: Customization Image Preview ở Checkout page; Edit Customization + Digital Download ở Order Status page). Đọc yêu cầu trước.

Launch thêm store thứ 2 sau khi đã launch store 1: bấm `Update` ở header → cùng dialog, store chưa launch vẫn có nút `Launch` riêng ở hàng của nó ⇒ `POST /publish` 200, không ảnh hưởng store đã publish.

## Update campaign đã publish

- Sửa artwork xong bấm `Update` ở header (tooltip `Update changes to platform`) → dialog `Multi-store launch` → `tr:has-text("linh-tib-staging") button:has-text("Update")` (chỉ hàng store vừa sửa).
- Request **`POST /api/campaigns/<id>/sync`** → 200 (không phải `/publish`). Toast `Updated campaign <tên> — Content is published. Mockups are still publishing.` (có lúc không thấy toast).
- Store không bấm Update giữ trạng thái `Update required`.
- Verify: merchant JSON công khai `GET staging-api/api/merchant/campaigns/<shopifyProductId>.json?shop=...` (xem `storefront-sdk.md`). Storefront có thể cần 1-2 phút.
- Sync 400 `Artwork missing URL. Please regenerate those artworks: <tên>` khi job nền không chạy (artwork `url/thumbnail:null`, gặp sau sự cố API 500 2026-10-09). Editor không có nút Regenerate.

## Lỗi publish

### `Handle '<slug>' already in use` (500)
```
Something went wrong!
Shopify errors:
Handle '<slug>' already in use. Please provide a new handle.
```
- Trên store đã có Shopify product dùng đúng handle sinh từ title (của campaign khác, hoặc product tạo ngoài portal).
- `Listing info` không có field handle. Cách từ portal: **đổi campaign title** (inline STEP 2) → handle sinh lại.
- Phòng tránh: đặt hậu tố phân biệt vào title ngay từ đầu (vd `… (4 artworks)`).
- Nếu không có campaign teeinblue nào trùng (kể cả trash) thì là product Shopify sẵn có: không tự đổi title, báo người dùng (coordinator có thể đổi handle product cũ).

## Campaign by Shopify Products — Launch

- Không có dialog chọn store (store đã gắn cứng lúc tạo — phải chọn đúng `linh-tib-staging` ở bước tạo).
- `POST https://staging-api.teeinblue.com/api/platform-products/<id>/publish` → 200, toast `Launch campaign successfully` (có lần không bắt được toast).
- Header đổi `Unpublish · Logs · View · Update`. GraphQL `platform_products_by_pk` không có `status` — dùng `published_at`.
- List `/platform-products`: cột ACTION hiện `Launch` + `View` kể cả khi đã publish ⇒ kiểm `published_at` hoặc header editor `Unpublish`.
- Shopify product bị xoá ⇒ FE hiện "Product unavailable", nút Update disabled; artwork không gán variant (khi Connect ON) ⇒ Update disabled. Muốn quan sát backend: gọi thẳng `POST /api/platform-products/<id>/publish` (header X-XSRF-TOKEN).

## Metafield Shopify sau publish

- Campaign by Shopify (có addon): `teeinblue.platform_product` (json published_at), `teeinblue.addon_variants` (list.variant_reference), `app--3509845--teeinblue.campaign` (json campaign data).
- Campaign by PB: `teeinblue.campaign_version`, `teeinblue.addon_variants` (`[]` khi không có addon), `app--3509845--teeinblue.campaign`; KHÔNG có `teeinblue.platform_product`.
- Đọc: Shopify admin đã login trong profile → `admin.shopify.com/store/<shop>/products/<id>.json` và `/metafields.json`.

## Logs (campaign by Shopify)

- Modal 2 tab: `Publication History` (active mặc định, filter Status All/Published/Error) / `Edit Activities`.
- Sau publish: `Publication History` có dòng `<YYYY-MM-DD HH:mm:ss> Published to Shopify` — giờ theo timezone **store đang chọn ở sidebar** (237 UTC, 58 Asia/Bangkok).
- `Edit Activities` filter (2026-10-28): by Shopify `All / Artwork added(1) / Artwork removed(2)`; by PB `All status / Artwork added(0) / Artwork removed(1) / Handle changed(2) / Product added(3) / Product removed(4) / Campaign unlinked(5)`. Dòng `Platform product published/unpublished` chỉ hiện ở All. Mockup add / variant assign / toggle connect không sinh log.
- Filter Logs là `<select>` (selectOption).
