# Variant Rules

Use this rule when an issue mentions variants, variant options, SKU, FF SKU, price, compare price, weight, color, size, color hex, product sync, campaign sync, or Update Campaign.

## What to Clarify

- Which variant fields are in scope: price, compare price, weight, SKU/FF SKU, color, size, color hex, or other attributes.
- Whether fields are updated together as a group or independently.
- Whether the behavior applies at store level, user level, all stores under one user, or a specific merchant/internal UID.
- Whether existing config must remain backward compatible after the change.
- What happens when all variant options are unchecked or skipped.
- Whether default states differ when a store/user has existing sync config.

## Config Rules To Check

- Legacy config such as `skip_on_sync: { "variants": true }` should be treated as a backward compatibility risk.
- If a store/user already uses the legacy variants skip config, confirm whether all newly split variant options should inherit unchecked/skipped state.
- If a store/user does not use the legacy config, confirm whether all newly split variant options should default to checked/included.
- If new split-option config is introduced, identify exactly which option keys map to each UI checkbox and backend field group.
- For user-level config, confirm whether it applies to every store under that user unless a store-level override exists.

## Impacted Areas

- Update Campaign UI and payload.
- Backend sync/update mapping for each variant field group.
- Existing stores/users with legacy `skip_on_sync.variants` config.
- Merchant-specific or UID-specific configuration.
- Product/campaign data integrity after partial variant updates.
- Regression for fields intentionally not selected for update.

## Risk Patterns

- UI checkbox state and backend payload can drift, causing fields to update even when unchecked.
- Legacy config migration can accidentally change default behavior for existing users.
- Grouped fields such as `Price & Compare price` or `Others` can hide field-level ambiguity.
- Store-level and user-level config precedence can produce inconsistent defaults across stores.
- Partial update failures can leave variant data in a mixed state if rollback behavior is unclear.

## Open Questions To Consider

- What is the exact config schema for each split variant option?
- Which config wins when store-level and user-level values conflict?
- Does checking/unchecking UI update config, or only affect the current update run?
- Are price and compare price always handled together?
- Does SKU mean Shopify variant SKU, FF SKU attribute, or both?
- What should happen if every split option is unchecked?

## Suggested Test Focus

- Default checked state when no legacy or split-option config exists.
- Default unchecked state when legacy `skip_on_sync.variants = true` exists.
- User-level config applying across multiple stores.
- Store-level override behavior if supported.
- Split-option config for specific fields, such as skipping price/compare price and weight while keeping SKU and Others checked.
- Data integrity: unchecked fields must not be updated.
- Regression: checked fields must still update correctly.
