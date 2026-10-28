# Artwork 2.0 Onboarding & Deprecated Options (teeinblue)

Dùng rule này khi issue nhắc đến: onboarding Artwork 2.0, walkthrough/first-open popup slideshow, badge `2.0` / `Artwork 2.0`, "deprecated option / This field is deprecated / Learn the new way", hoặc việc **thêm rồi gỡ** các hướng dẫn onboarding sau giai đoạn ra mắt Artwork 2.0. Bổ trợ [[duplicate-link-layer]], [[curve-text-render]], [[form-artwork-navigation]].

## Context to recognize

Artwork 2.0 (TIB-4823, Done) tách personalization thành các layer type độc lập, thêm Global Options, Populate values nâng cao, Font/Color/Toggle thành layer riêng, Linked layers, text container frame... Khi ra mắt, team thêm 3 lớp onboarding tạm thời:

1. **First-open walkthrough popup** (slideshow, 4 slide nội dung + 1 slide wrap): chỉ hiện lần đầu mỗi staff mở Artwork 2.0; không cho dismiss ngoài (phải Next → Got it); tracked per staff; KHÔNG hiện cho staff mới tạo và KHÔNG hiện khi mở artwork cũ (1.0).
2. **Badge**: `2.0` trên nút "New artwork"; `Artwork 2.0` cạnh tên artwork trong editor. Style: border `#d19cff`, background animation `#a78bfa` ↔ `#60a5fa`.
3. **Deprecated options** (disabled + dòng "This field is deprecated. Learn the new way" + KB link) — chỉ trong ngữ cảnh Artwork 2.0:
   - Add a toggle to show/hide this layer → dùng conditions/Toggle layer
   - Allow customers to change Text Color / Font / Enable text background → tạo Color/Font option + Populate values
   - Populate values from other options (bản cũ) → Populate values section mới
   - Auto scale (Auto-scale max width) → text container frame (kéo anchor)
   - Curve text (toggle cũ trong Text) → thêm layer Curve Text mới
4. (Admin) In-app banners ở trang Artworks và Global Options.

**Ticket gỡ bỏ (vd TIB-5033)**: sau khi user quen, gỡ các hướng dẫn tạm thời. Cần xác định rõ gỡ những mục nào (badge? popup? deprecated options? banner?) và **scope theo phiên bản artwork**.

## Requirements to check

- **Scope theo phiên bản**: các phần tử onboarding chỉ gắn với Artwork 2.0. Việc gỡ KHÔNG được ảnh hưởng artwork cũ (1.0) — ở 1.0 các option như Curve text toggle, Allow change Font/Color, Auto scale, Toggle show/hide **vẫn hoạt động bình thường** (chúng không "deprecated" trong 1.0). Xác nhận rõ removal chỉ áp cho 2.0.
- **Deprecated options removal**: gỡ hẳn field khỏi UI 2.0 (không còn hiện dù disabled). Không còn dòng "This field is deprecated" + KB link. Không để lại khoảng trống/section rỗng/hàng bị vỡ layout.
- **Badge removal**: gỡ cả badge trên nút "New artwork" và badge cạnh tên artwork; không để lại animation/CSS chạy nền hay khoảng trống lệch layout.
- **Popup removal**: popup không còn hiện cho **bất kỳ** staff nào (đã xem hay chưa xem), kể cả staff mới; không leftover tracking gây lỗi; không chặn thao tác mở editor.
- **Không mất chức năng thay thế**: cách làm mới (Toggle/Color/Font layer, Populate values, container frame, Curve Text layer) vẫn hoạt động — deprecated option biến mất nhưng "new way" còn nguyên.

## Impacted Areas

- Portal artwork editor 2.0: layer options panel (Text/Image/Curve...), nút "New artwork", header tên artwork. — Confirmed
- Onboarding popup component + cơ chế tracking per-staff (flag đã-xem). — Confirmed
- Artwork cũ (1.0): các option tương ứng vẫn phải hoạt động — regression chính. — Confirmed
- In-app banners (Artworks / Global Options) — có nằm trong scope gỡ hay không. — Need PO confirmation
- Dữ liệu/flag onboarding đã lưu (per-staff seen) — có cần cleanup hay để nguyên vô hại. — Need Dev confirmation

## Risk Patterns

- Gỡ nhầm cả ở artwork 1.0 → mất Curve text/Font/Color/Auto scale/Toggle đang dùng thật.
- Layout vỡ / khoảng trống sau khi bỏ badge hoặc dòng deprecated.
- Popup vẫn còn logic tracking → lỗi console hoặc chặn mở editor cho staff cũ.
- Gỡ deprecated option nhưng vô tình gỡ luôn "new way" tương ứng.
- Hiểu sai "remove deprecated options": chỉ bỏ dòng instruction mà vẫn để field disabled (hoặc ngược lại) — cần chốt là bỏ hẳn field.

## Open Questions To Consider

- Removal áp cho tất cả artwork hay chỉ Artwork 2.0? (kỳ vọng: chỉ 2.0)
- "Remove deprecated options" = gỡ hẳn field, hay chỉ gỡ dòng instruction?
- Có gỡ in-app banners (method 4) và các "Learn more/Learn the new way" KB link không?
- Có cần migrate/cleanup dữ liệu flag onboarding đã lưu không?
