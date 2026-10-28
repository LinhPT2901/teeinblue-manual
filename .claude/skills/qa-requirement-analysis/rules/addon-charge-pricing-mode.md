# Addon Charge / Personalization Pricing Mode Rules

Use this rule when an issue mentions `Addon charge`, `Charge by Character count`, per-option/per-layer pricing, "adjust item price directly" vs "separate addon line item", or any new pricing mode for a personalization option (text, dropdown, radio, image upload).

## Context to Recognize

- Teeinblue personalization layers (text, addon/option groups) can carry an extra charge when the buyer picks a value.
- Two known pricing mechanisms exist or are being introduced:
  - **Separate addon item** (legacy/default): the extra charge is added to the Shopify cart as its own line item, distinct from the base product line item.
  - **Direct price adjustment** (newer, e.g. `Charge by Character count` for text layers): the extra charge is folded into the base item's price — no second cart line item is created.
- A ticket introducing direct-price mode for a new layer type is almost always modeled "same as" an existing layer type's mechanism — treat that existing mechanism as the reference implementation, not as fully-specified behavior, unless QA can inspect its actual test cases/behavior.

## What to Clarify

- Is the new pricing mode a per-layer setting (each layer/option group picks independently) or global per-campaign/per-store?
- Is the new mode opt-in with the legacy separate-item behavior remaining the default for both new and existing layers?
- How is the extra amount computed per option value — fixed amount per value, or formula-based (like per-character)?
- Does the merged price update live on PDP (before add-to-cart) or only after add-to-cart/at cart-cart calculation time?
- How does this interact with Shopify variant price differences already in play (e.g. size variant with its own price) — additive, or does the addon replace/override the variant price?
- What happens with multiple personalization layers on the same product each contributing a direct-price addon — cumulative?
- How does the merged price affect tax calculation, discount codes, and compare-at-price display?
- Does quantity multiply the adjusted price correctly?
- What happens to orders/exports/webhooks/admin views that previously relied on a distinct addon line item for reporting — is that data still available anywhere (e.g. line item properties) once merged into base price?
- Can a merchant switch an existing (published, already-purchased) layer between modes — does that affect historical orders or only new cart sessions?
- Is there a UI label/toggle name confirmed for the new mode, and where does it sit in the layer settings panel?

## Impacted Areas

- Personalization layer settings panel (Addon charge / option layer config) — Confirmed only if screenshots/design provided.
- Storefront PDP price display (live update before add-to-cart).
- Cart (native cart page + any cart drawer app) line item structure.
- Checkout totals, tax, discounts.
- Order creation, admin order view, order export, webhooks that read addon/line-item pricing.
- Any shared pricing engine code path with `Charge by Character count` (regression risk on text layers).
- Existing campaigns/layers using legacy separate-item behavior (must remain unaffected — backward compatibility).
- Multi-currency stores, if applicable.

## Risk Patterns

- Shared code path between old text-layer mechanism and new addon-layer mechanism can regress the existing feature.
- Rounding/precision errors when folding cents into base price.
- Double-charging if the separate addon item isn't fully suppressed when direct-price mode is on.
- Tax/discount miscalculation if the merged price changes which tax class or discount eligibility applies.
- Losing visibility into "what personalization charge was applied" in admin/order data once no separate line item exists.
- Cumulative-stacking bugs when several layers each add to the base price on one product.
- Default-behavior drift for existing merchants if the opt-in flag is mis-defaulted during rollout/migration.

## Common Test-Design Mistake (confirmed on TIB-5482)

The "price" field of the new direct-price mode and the "addon variant" reference of the legacy separate-item mode are **two independent data fields**, not two views of the same value. Toggling the Charge method radio does **not** convert one into the other.

- A layer built directly in direct-price mode (only a raw price number entered, no addon variant ever Attached) will show **nothing** if forced into legacy mode — this is correct behavior, not a regression, because legacy mode has no variant configured for it to add.
- The "switching preserves config" guarantee (config only hidden, not deleted, per dev comments on TIB-5482) only applies to a layer that **started in legacy mode with a variant already Attached**, then was switched to direct-price and back.
- **Do not** write a regression case that expects a direct-price-only layer's price number to reappear as a separate cart item after switching to legacy mode — that expectation is invalid. To test the "switch preserves legacy config" behavior, use/create a layer that has a real Shopify variant Attached from the start.
- This caused a false-positive bug report on TIB-5482 (TC-TIB-3913/3914) before being caught and corrected — worth double-checking test data setup before concluding a mode-switch scenario is broken.

## Suggested Test Focus

- New opt-in mode: selecting an option value updates displayed price and results in exactly one cart line item with the adjusted price (no separate addon item).
- Legacy/default mode: unchanged — separate addon item still created (regression).
- Switching between option values updates price correctly both up and down.
- Quantity changes multiply the adjusted price correctly.
- Cart, checkout, order confirmation, and admin order all show consistent totals.
- Combined with another charge-by-price layer (e.g. text char count) on the same product — cumulative price is correct.
- Existing/legacy campaigns remain unaffected after the new mode ships (backward compatibility).
- Edge cases: option with $0 addon, missing configured price, currency formatting.
