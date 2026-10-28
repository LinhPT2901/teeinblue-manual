# Print Area Mapping Rules (teeinblue)

Use this rule when an issue mentions print area, printarea, mockup, canvas, copy/paste printarea, import mockup, "With printarea" option, product base, campaign by product base, or mapping print areas across product bases/campaigns.

## Core Matching Logic

When copying/pasting/importing print areas into a *different* product base or campaign, the system must map by attributes, NOT by ID. Matching is done against the target product base's existing print areas.

### Priority order (confirmed, TIB-5251) — pick the FIRST match, top to bottom:

1. First print area matching `Display name` AND `size (width & height)`.
2. First print area matching `Fulfilled key` AND `size (width & height)`.
3. First print area matching `Display name` AND `ratio`.
4. First print area matching `Fulfilled key` AND `ratio`.
5. First print area matching `size (width & height)` only.

**Why Fulfilled key matters:** when a print area is created *manually*, its `Display name` can be `null`. In that case the system cannot rely on Display name alone — it falls back to `Fulfilled key`. So name-based tiers (1, 3) are effectively skipped for a source print area whose Display name is null; matching proceeds via key/size tiers (2, 4, 5).

Note: this 5-tier order supersedes the simpler 2-tier logic described in TIB-4924 (`Display name`+size, then `Display name`+ratio) by adding the Fulfilled-key fallbacks and a final size-only fallback.

Example (ratio fallback, from TIB-4924):
- A has `front - 4000x4000`. B has `front - 4000x4000` and `front - 8000x8000`.
- Copy `front` from A→B matches `front - 4000x4000` (Tier 1: name + exact size).
- Copy `front` from A→C (`front - 4000x8000`, `front - 8000x8000`) matches `front - 8000x8000` (Tier 3: name + ratio 1:1).

## What to Clarify

- Import source: Product base vs Campaign by product base — is behavior identical for both?
- Whether the "With printarea" import option is the only trigger, or if copy/paste flows share the same code path.
- What happens when NO match (neither size nor ratio) exists in the target — is the cloned print area left unmapped, dropped, or created new?
- Whether multiple print areas share the same Display name + size (ambiguous match) — which one wins.
- Whether layers/design content bound to the original print area are re-bound to the mapped print area or lost.
- Case-sensitivity / whitespace handling of Display name matching.
- Ratio tolerance: exact ratio only, or rounded/approximate.

## Impacted Areas

- Import mockups flow from Product base (BE).
- Import mockups flow from Campaign by product base (BE).
- Existing copy/paste printarea between mockups (same base) — regression.
- Print area ↔ layer/design binding after mapping.
- Product base / campaign data integrity after import.
- Preview/render of imported mockups in editor and on storefront.

## Risk Patterns

- Cloned print area keeps original ID/coordinates and does not function in the new context (the original bug this fixes).
- Ratio fallback picks the wrong print area when several match the ratio (order-dependent "first match").
- Layers lose their print area binding after remap, breaking the design.
- Behavior diverges between "import from product base" and "import from campaign".
- No-match case silently drops the print area or leaves broken state.
- Size stored in different units/scales between source and target causing false non-match.

## Open Questions To Consider

- What is the exact fallback order for "first print area with matching ratio"?
- What happens on zero match?
- Are layers/designs re-mapped along with the print area?
- Is matching case- and whitespace-insensitive on Display name?
- Does the campaign import path reuse the exact TIB-4924 logic or a copy of it?

## Suggested Test Focus

- One case per tier (1→5): name+size, key+size, name+ratio, key+ratio, size-only.
- Tier precedence: when two tiers are simultaneously satisfiable, the higher tier wins (e.g. T1 name+size beats T3 name+ratio; T2 key+size beats T3 name+ratio; T4 key+ratio beats T5 size-only).
- Null Display name (manually-created print area): name-based tiers skipped, matched via Fulfilled key tiers.
- No match on any tier (no name, no key, no size) — verify defined/expected behavior.
- Import from Product base vs Campaign by product base — both use same logic.
- "First" selection when multiple candidates match the same tier — deterministic order.
- Layer/design binding preserved and functional after import.
- Regression: same-base copy/paste (TIB-4924) still works.
- Imported mockup renders correctly in editor and storefront.
