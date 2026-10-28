# Storefront Variant Picker: Availability vs Existence

Use this rule when an issue touches a storefront variant picker (cross-sell/upsell popup, product page, quick view), especially behavior around `sold out`, unavailable options, default/pre-selected variant, switching between products, or price showing `$0`.

## Context to recognize (from TIB-5418)

- Shopify Storefront API returns every option value with `availableForSale`, but does NOT say whether a given option combination exists. So "non-existent" and "sold out" look the same unless the app checks the variant list itself.
- Products with different option sets (e.g. White Mug only has `white`, Color Mug has other colors) are the typical trigger: switching product keeps a stale option → no matching variant → price `$0`.
- Campaign source matters: product base (usually 2 options `Size`/`Color`) vs SFP / Shopify product (many options/variants). Fixes often scope by source.

## Resolved pattern (TIB-5418, dev phatnt comment 2026-10-15)

- First available = first variant in `variants[]` with `availableForSale: true`; all sold out → fallback `variants[0]`.
- Non-existent combination → jump to the "most reasonable" existing variant: prefer in stock, keep as many of the buyer's other selections as possible, drop stale options from the previous product. Price is always the real variant price, never `$0.00`.
- Buyer picks an existing sold-out variant → keep the selection, show its real price, CTA shows "Sold out", no auto-jump.
- Scope: only the cross-sell campaign popup (QA lead confirmed). Test must cover all 3 product sources: product base, SFP, Shopify product.
- Mockup/image after auto-select follows the existing mockup logic (mockup assigned to the variant, else load the first mockup) — no new mockup rule.
- Entry points: open popup, pick product from a collection, switch style/product. Regression: main `CampaignForm` and regular Addon product must not change.

## What to clarify

- Exact definition of "first available variant": variant order from Shopify, position, or option order?
- What happens if NO variant is available (all sold out): which variant is selected, is Add to cart disabled?
- How a non-existent combination is detected (variant list lookup vs API flag) and what price shows for it.
- "Next existing variant": next by which order? Must it be available, or just existing?
- Does pre-select change the mockup/image, price, and the variant id sent to cart?
- Does the behavior apply per product inside a multi-product popup, or only on open?

## Risks

- `$0` price leaking into cart / checkout (variant id null or wrong).
- Pre-select overriding a buyer's explicit previous choice.
- Performance on products with many variants (SFP/Shopify product).
- Inconsistent behavior between campaign sources.

## Suggested test focus

- Popup open with first variant sold out → lands on first available.
- All variants sold out.
- Switch product where current option does not exist → selection moves, no `$0`.
- Picking a sold-out variant manually → still shows `sold out`, no auto-jump (if declared out of scope).
- Add to cart after auto-select → correct variant id/price in cart.
- Regression: product page picker, single-product popup, product base vs SFP vs Shopify product campaigns.
