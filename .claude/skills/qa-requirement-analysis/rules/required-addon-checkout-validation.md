# Required Addon: ATC Block + Shopify Checkout Validation Function

Use this rule when an issue is about blocking add-to-cart or checkout because an addon product (separate addon line item) is missing, unavailable, archived/draft, out of stock, or has the wrong quantity — especially when a Shopify Function (cart & checkout validation / "Checkout rules") is involved.

## Context to recognize (from TIB-5510)

- Addon in teeinblue = option value linked to a Shopify variant, added to cart as a separate line item. Parent line carries `_tib_addon_variant`, both lines share `_tib_customization_id`.
- Defense in 2 layers: SDK blocks ATC on the PDP (client side, can be bypassed), Shopify Function blocks at checkout (server side, also covers Shop Pay / PayPal / Apple Pay / direct checkout links).
- The Function is app-defined but the merchant must add + activate it in `Settings > Checkout > Checkout rules`. Off by default.
- Function reads `buyerJourney.step`; skipping `CART_INTERACTION` means no error on `/cart`, only at checkout.
- Direct-price addon mode (TIB-5482, no separate line item) must never be blocked — see `addon-charge-pricing-mode.md`.

## Confirmed on TIB-5510 (user/dev answers 2026-10-26)

- `rate` comes from the addon setting in the artwork layer.
- Direct-price addons do not carry `_tib_addon_variant` → never checked by the Function.
- Edit Customization changes `_tib_customization_id` and the addon line follows it.
- Validation banner shows on the checkout page; Pay now cannot complete. Function failure = fail open (checkout succeeds).
- Staging: test on linh-tib-checkout (Plus). Shop Pay / PayPal are out of QA scope.
- "Unlisted" = Shopify's Unlisted product status.
- Out of scope: Function failure cases, draft order / POS / B2B.
- Dev phatnt 2026-10-27: applies to all merchants, both layers in scope. SDK toggle has no Portal UI; priority `window.teeinblue.blockAtcUnavailableAddon` → campaign API `block_atc_unavailable_addon` → default `true`. QA toggles it via the DevTools console or a theme snippet.
- Checkout message is shared by "missing" and "not enough quantity" and is English only (Function runtime has no locale). The ATC message is translatable via `addon_unavailable_error`.
- `_tib_addon_variant` format `<variantId>:<rate>|<variantId>:<rate>`; each addon is checked separately, so one missing addon blocks checkout.
- SDK availability is a page-load snapshot. A stale tab (addon archived after page load) does not block ATC: Shopify returns 422, or Layer 2 blocks at checkout. A stale tab where the addon came back in stock keeps blocking until reload. Stale-tab = the original bug path, so it must be a test case.

## What to clarify

- Scope: all merchants or only the reporting merchant? Is the SDK ATC block in scope or dev extra?
- Where the SDK toggle lives (portal setting / per store / per campaign) and its default for existing merchants.
- Exact error messages (ATC, checkout, quantity shortfall) and whether they are translatable.
- How "unavailable" is detected (metafield sync after archive/draft/delete) and how long the sync takes.
- Which addon cases count: multiple addons per item, checkbox multi-select, rate > 1, global option addons, cross-sell addons.
- Behavior on Edit Customization (customization id changes?), cart drawer apps, draft orders/POS/B2B.
- What happens if the Function errors / times out (fail open or fail closed).
- Which test store can run checkout rules + accelerated checkout on staging, and is the extension deployed to the staging app.

## Risks

- False block: products without addon, direct-price addons, oversell-allowed or unlisted addons.
- False pass: rule not activated, mismatch on customization id, quantity checked per line instead of per customization.
- Shopify silently removes archived/draft lines from cart → test that path explicitly.
- Accelerated checkout often not testable on dev stores (Bogus gateway only).

## Suggested test focus

- ATC: draft / archived / deleted variant / OOS-deny → blocked; OOS-continue-selling / unlisted → allowed; auto-clear error; checkbox multi.
- Checkout: addon line removed, addon archived after ATC, quantity shortfall (parent qty 2, addon 1), happy path, rule inactive.
- `/cart` interactions not blocked; error only at checkout.
- Regression: product without addon, direct-price addon mode, toggle off.
