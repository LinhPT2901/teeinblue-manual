# Quick Navigation (TIB-5349) — popup & điều kiện bật

## Nút mở

Campaign editor, `STEP 2: PREVIEW YOUR CAMPAIGN` → header **`PERSONALIZATION FORM`**, icon "table of contents" mép phải: **`.artwork-navigation-button button`** (accessible name rỗng).

## Phạm vi lưu

- Campaign by PB: popup **per product base** (mỗi PB setting riêng). Đổi PB: click tên PB trong `AVAILABLE PRODUCT` (URL `?product-id=<pbId>`).
- Campaign by Shopify Products: 1 ô ở cấp product (campaign chỉ 1 sản phẩm). Nội dung popup giống hệt.

## Nội dung popup (2026-09-30)

- Toggle OFF: tiêu đề `Quick navigation` (X `.dialog-close`) + toggle `Enable quick navigation to each artwork's options` + mô tả *"A navigation will show up at the top of the form, buyers can click on it to quickly scroll to a specific artwork's form. Best for campaigns with a long form like multi-pieces campaigns."*
- Toggle ON thêm: label **`Menu Item's name:`** + hint `(Leave empty to use product name)`, input placeholder **`Product name 1`** (số = index PB), helper ``Insert {{index}} to place the number. Eg. "Customize #{{index}} design".``
- Chỉ 1 ô Menu Item's name cho cả PB (không theo artwork). Dòng cũ `Note: Navigation will use Product Base as the menu name.` không còn.
- **Không có nút Save** — đổi là lưu ngay (reload vẫn giữ).

## Điều kiện enable

- Variant phải bind ≥2 printarea (form ≥2 artwork). Nếu không: nút `disabled`, tooltip `Quick navigation only works with multiple artworks in the form`.
- Số artwork trong form = số printarea mà **VARIANT** bind, không phải số printarea của PB (mug 3140 bật custom variant printarea ⇒ mỗi variant 1 section ⇒ disable; tshirt 3139 ⇒ 2 section). Xem `product-base.md`.
- Platform product: 2 artwork cùng hiện cho 1 variant (`Connect artworks with Shopify variants` OFF) ⇒ enable.
- Test overflow: PB 4 printarea (vd PB 3325 `QA-TIB-5349 Quad Panel Tee`: Front 14129 / Back 14130 / Left Sleeve 14131 / Right Sleeve 14132, custom variant printarea OFF) ⇒ 4 section.

## Render khi ON

`.tee-artwork-nav` > `.tee-artwork-nav__viewport` > `.tee-artwork-nav__item` (+ `--active`) > `.tee-artwork-nav__label`, nút overflow `.tee-artwork-nav__more-button`. Label mặc định = tên artwork + số thứ tự.
