# Multi-Artwork Form Navigation (teeinblue SDK/storefront)

Use this rule when an issue adds/changes **navigation between artworks inside the personalization form** of a multi-artwork campaign: keywords "artwork navigation", "quick navigation", "switch to form & mockup", "multi-piece / multi-artwork campaign", sticky menu at top of form, "menu item = Product Base name + index", gallery/mockup sync with form scroll, divider between artwork sections.

## Context to recognize

Some campaigns bundle **many artworks** (multi-piece products, e.g. a set of tie clips). The buyer form then lists every artwork's options stacked together — long and hard to navigate. This feature adds a **sticky navigation bar** at the top of the form: one menu item per artwork; clicking scrolls the form to that artwork's section and switches the gallery to the first mockup containing that artwork's printarea. It's a **buyer-facing storefront (SDK)** feature plus a **Portal toggle** to enable it per campaign. Menu label = **Product Base name + index** (`Tie clip 1`, `Tie clip 2`, …).

Key sub-behaviors (SDK): horizontal scroll + auto-scroll active item into view; overflow dropdown for hidden items; sticky on scroll; menu placed under form header if one exists; active item highlights as buyer scrolls/edits that artwork (scroll-spy); divider with menu name between each artwork's form; gallery shows index badge indicating which artwork a mockup belongs to. "Display on Cart" is explicitly **out of scope / later**.

Portal: button next to "Personalization Form" title → popup with a toggle "Enable quick navigation to each artwork's options". Button **disabled** (with tooltip) unless the form shows **multiple artworks for one variant**; active otherwise.

## Requirements to check

- **Enable gating**: Portal button disabled + tooltip ("Quick navigation only works with multiple artworks in the form") when form has only one artwork; active only with multiple artworks for one variant. Navigation appears on storefront only when the toggle is ON.
- **Menu label source**: uses **Product Base name** (the name in the campaign), not artwork name/printarea name; index appended (1-based). Confirm behavior when two product bases share a name, or name is empty/very long/has special chars.
- **Click behavior**: (a) form smooth-scrolls to that artwork's section; (b) gallery switches to the **first mockup containing that artwork's printarea**. Confirm "first" ordering is deterministic.
- **Scroll-spy highlight**: editing/scrolling an artwork's options highlights its menu item. Confirm the rule when two artworks are both partly visible (which one is "active").
- **Overflow**: horizontal scroll when too many items; active item auto-scrolls into view; dropdown lists the hidden/invisible items and can select them.
- **Sticky**: nav stays pinned under form header while scrolling; does not overlap/detach.
- **Divider**: each artwork form section separated by a divider showing the menu-item name.
- **Gallery index badge**: mockup in gallery shows the artwork index it belongs to.
- **Out of scope**: Display on Cart — verify it is NOT implemented yet (don't fail the feature for its absence).

## Impacted Areas

- **SDK storefront personalization form**: new sticky nav component, section anchors, smooth-scroll, scroll-spy, dividers. — Confirmed
- **SDK gallery/preview**: mockup switching on nav click, index badge. — Confirmed
- **Portal campaign editor**: button next to "Personalization Form" title, enable popup + toggle, disabled/tooltip state. — Confirmed
- **Campaign data / settings**: persisted "quick navigation enabled" flag per campaign. — Assumption (verify persistence + publish)
- **Single-artwork campaigns / existing forms**: regression — nav must not appear; form behaves exactly as before. — Confirmed
- **Multi-bundle SDK** (default embed / Shopify v2 / headless): nav render + sticky behavior across bundles. — Need Dev/PO confirmation
- **Theme/layout variations & mobile**: sticky + horizontal scroll behavior on small screens/different themes. — Assumption

## Risk Patterns

- Nav shows for single-artwork campaigns (gating bug) or fails to show when enabled.
- Menu label wrong (uses artwork/printarea name instead of Product Base, or index off-by-one / not per-variant).
- Click scrolls form but gallery doesn't switch (or switches to wrong mockup when multiple mockups contain the printarea).
- Scroll-spy highlights wrong/no item, or flickers between items.
- Sticky nav overlaps form header or content; z-index/scroll-jank issues.
- Overflow dropdown misses items or auto-scroll doesn't reveal active item.
- Performance: many artworks (10+) → scroll-spy listeners / re-render lag.
- Toggle state not persisted, or not respected after publish/republish.
- Enabling then removing artworks (back to single) leaves a stale nav or a stuck disabled/active button.
- Mobile: horizontal scroll unusable, sticky broken, index badge overlaps mockup.
- Accessibility: nav not keyboard-navigable / no focus handling on scroll.

## Open Questions To Consider

- Index numbering: 1-based, per variant, in artwork order? Reset per variant?
- Product Base name collision (two bases same name) — how disambiguated beyond index?
- Empty / very long Product Base name — truncation, tooltip?
- "First mockup containing the printarea" — exact ordering definition when several qualify.
- Variant switch: does the active artwork / nav reset? Does nav rebuild for the new variant's artworks?
- Does the enabled flag carry to already-published campaigns, or only on next publish?
- Behavior when an artwork has no mockup/printarea to show in gallery.
- Expected behavior on mobile vs desktop (any layout differences intended?).

## Suggested Test Focus

- Portal: button disabled + tooltip for single-artwork form; active for multiple-artwork-per-variant; toggle on/off persists and reflects on storefront.
- Storefront: nav appears only when enabled + multiple artworks; hidden otherwise (regression on single-artwork forms).
- Menu labels = Product Base name + correct 1-based index, in order.
- Click item → form smooth-scrolls to section AND gallery shows first mockup with that printarea.
- Scroll-spy: scrolling/editing an artwork highlights its menu item; correct item when two are visible.
- Overflow: horizontal + auto-scroll active into view; dropdown lists hidden items and selects them.
- Sticky: nav pinned under header on scroll; no overlap.
- Divider with menu name between each artwork section; gallery index badge correct.
- Variant switch rebuilds nav / resets active state correctly.
- Boundary: 2 artworks (min to trigger), many artworks (10+/perf), 1 artwork (no nav).
- Mobile + different themes: sticky, horizontal scroll, badge layout.
- Display on Cart NOT present (explicitly deferred).
- Accessibility/keyboard navigation of the nav.

---

## Cập nhật TIB-5349 — scope chuyển xuống per Product Base + custom menu name

Từ TIB-5349 (dev comment 2026-09-30, huytv), phần "Menu label = Product Base name + index" và "toggle per campaign" ở trên **đã lỗi thời**. Hành vi mới:

### Xác nhận bởi dev (TIB-5349)

- **Toggle + tên menu lưu per Product Base**, không còn ở cấp campaign. Popup Quick navigation có thêm ô `Menu Item's name`, chỉ hiện khi toggle bật, **auto-save khi blur hoặc Enter**, giới hạn **255 ký tự**. Toggle và ô tên **lưu độc lập**; lưu lỗi thì revert về giá trị cũ.
- **Platform/Shopify product** không có khái niệm Product Base → tên đặt ở **cấp product**, nhưng vẫn có ô tên này.
- **Bảng render tên** (nav/section title vs pill trên gallery):
  | Seller nhập | Nav / section title | Pill gallery |
  |---|---|---|
  | (trống) | `Organic Cap 1` | `Organic Cap 1/2` |
  | `Customize #{{index}} design` | `Customize #1 design` | `Customize #1/2 design` |
  | `My design` (không có `{{index}}`) | `My design 1` | `My design 1/2` |
  | `Design {{ index }}` (có space trong placeholder) | `Design 1` | `Design 1/2` |
  | toàn khoảng trắng | coi như trống | coi như trống |
- **Nav bar chỉ hiện số** (`#1`); **chỉ pill trên gallery hiện phân số** (`#1/2`).
- Bỏ dòng `Note: Navigation will use Product Base as the menu name` trong popup.
- **Product Base mới thêm vào campaign có sẵn → nav mặc định TẮT** (intended, không phải bug).
- Addon product, cross-sell, nút Personalize **không có nav** — giữ quyết định từ TIB-5223.
- **Dynamic Translation**: key phải là **nguyên cả chuỗi kể cả `{{index}}`** (vd key `customize #{{index}}` → value `customize en #{{index}}`). Key thiếu `{{index}}` → mất số thứ tự; key chỉ là `customize` → không dịch. Tên menu **không tự xuất hiện** trong danh sách Dynamic Translation, seller phải tự gõ key. Portal luôn hiển thị/lưu **tên gốc của seller**, không bị bản dịch ghi đè. Xem [[layer-translation]] — dictionary là store-wide (`Extras → Dynamic Translations`), cần dọn data sau test.

### Fix kèm, lan ra ngoài scope ticket (vùng regression bắt buộc)

- **Cache storefront**: trước đây đổi toggle phải chờ tới 1 tiếng mới thấy trên storefront; giờ đổi toggle/tên là xoá cache ngay.
- **Hàm xoá cache campaign dùng chung** từng lỗi & dừng giữa chừng với campaign có store liên kết chưa đầy đủ (chưa publish xong). Hàm này dùng chung cho: **sửa artwork**, **đồng bộ ảnh sản phẩm Shopify/Etsy**, **lệnh sync campaign lên store** → 3 flow này phải regression.

### Regression hotspots mới

- **Migration campaign cũ**: campaign đang bật nav / đã đặt tên → chép cài đặt xuống **mọi** Product Base. Storefront phải trông y hệt trước deploy.
- **Clone campaign & import campaign mẫu**: cài đặt nav per-PB phải đi theo bản sao.
- **Pill gallery**: trước đây cắt số ở cuối label để ghép phân số; giờ phân số đặt đúng vị trí `{{index}}`.
- **Mọi layout form storefront**: thường, button-popup, button-toggle, headless, edit customization, CampaignBoard.
- **Campaign nhiều Product Base**: đổi variant sang PB khác → nav bật/tắt và đổi tên theo PB đang chọn.

### ⚠️ Thứ tự deploy — kiểm tra TRƯỚC khi execute test

- **API + portal phải lên cùng lúc**, kèm chạy migration và apply Hasura metadata. Portal lên trước → popup báo lỗi khi lưu. Thiếu migration → tính năng không chạy.
- **SDK lên SAU API.** SDK lên trước → **nav tắt ở mọi campaign**, kể cả campaign đang bật. Đây là lệch thứ tự deploy, **không phải bug** — đừng log bug, hỏi dev xác nhận build đang chạy trên env trước.

### Trả lời bổ sung cho TIB-5349 (2026-09-30, qua QA)

- **Mỗi Product Base có popup Quick navigation RIÊNG** (không phải 1 popup liệt kê hết các PB).
- Label chính xác trên UI: **`Menu Item's name`**.
- **Nhiều `{{index}}` trong 1 chuỗi ⇒ điền đúng index vào TẤT CẢ vị trí.** Vd `Design {{index}} of {{index}}` → nav `Design 1 of 1`.
- **Tên dài trên nav mobile ⇒ xuống dòng (wrap)**, không truncate/ellipsis.
- **Auto-save có toast thông báo.**
- **Ticket KHÔNG chạm order / generated artwork / print file** — chỉ là form copy trên storefront. Bỏ nhóm regression đó khỏi scope.
- **Sau khi "xoá cache ngay" vẫn có thể còn layer cache khác** ⇒ case cache phải hard-reload + retry trước khi kết luận, đừng fail ngay lần đầu.

### Chốt bổ sung (2026-09-30, vòng 2)

- **Thời điểm auto-save: theo dev — lưu khi RỜI Ô (blur) hoặc bấm Enter.** Gõ xong mà không blur/Enter rồi reload ⇒ **mất giá trị**. (Bản "gõ xong là save" đã bị bác.)
- **PB 1 artwork sau migration**: nút toggle **vẫn disabled**, nhưng giá trị ON đã được migrate nằm sẵn ⇒ **thêm artwork thứ 2 vào PB đó thì nav tự được enable**, seller không phải bật tay.
  - ⚠️ Đừng nhầm với rule "PB **thêm mới** vào campaign có sẵn ⇒ nav mặc định TẮT". Hai tình huống khác nhau:
    - PB **cũ** (đã qua migration, ON dormant) + thêm artwork ⇒ nav **ON**.
    - PB **mới toanh** thêm vào campaign ⇒ nav **OFF**.

### ⚠️ Vẫn chưa chốt — KHÔNG viết pass/fail, phải mark `PO/DEV confirm`

- **Escape HTML trong tên menu**: mới là **kỳ vọng của QA**, dev chưa xác nhận đã implement. Viết dưới dạng quan sát; nếu inject được thì **hỏi dev trước, không tự log bug** — xem [[security-testing-no-inference]], [[no-auto-bug-report-testlane]].
- **Vượt 255 ký tự**: dev skip, chưa trả lời (chặn bằng maxlength hay báo lỗi server? message gì?).
- **Biến thể placeholder sai** (`{{Index}}`, `{{INDEX}}`, `{index}`, `{{ index`): dev skip, chưa trả lời.
