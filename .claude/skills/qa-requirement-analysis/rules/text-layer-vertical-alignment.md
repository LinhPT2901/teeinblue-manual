# Text Layer Vertical Alignment / Offset Rules (teeinblue)

Use this rule when an issue mentions text vertical alignment, off-center text, font bounding box (ascender/descender), a "Vertical Offset" (or "Horizontal Offset") field, or centering text within a cell/grid/shape for text-based layer types (Scrabble, Word Search, Word Cloud, standard Text layer, or similar grid/cell-based text layers).

## Context to recognize

Different fonts have different internal metrics (ascender height, descender depth, cap height, x-height). When a layer engine centers text purely by the font's bounding box, visually the glyph often looks off-center within its cell/shape because the box includes invisible whitespace above/below the glyph. The fix pattern is a manual numeric "Vertical Offset" field the seller/designer can nudge to compensate, on a per-layer or per-font basis. Word Search already has this field; other grid/cell text layers (Scrabble, and potentially future ones) are being retrofitted with the same field for parity.

## Requirements to check

- **Reference implementation parity**: when a Jira issue says "similar to Word Search," don't assume 1:1 parity — confirm exact unit (px vs % vs pt), min/max range, step increment, default value (0? or a computed default per font?), and portal field label/position match Word Search's existing field, or intentionally differ.
- **Scope of effect**: does the offset apply per-layer (whole text block) or per-cell/per-letter? For grid layouts (Scrabble letters in cells, Word Search grid), confirm whether one offset value shifts all cells uniformly.
- **Sign convention**: positive value moves text up or down? Must be unambiguous and consistent with Word Search's existing convention.
- **Persistence & scope**: is the offset saved per campaign/artwork, per font, or globally? Does it reset when font changes?
- **Interaction with font change**: if seller changes font after setting an offset, does the offset value stay (likely now wrong) or reset/re-suggest?
- **Interaction with font size / cell size changes**: does offset scale proportionally with font size, or stay an absolute pixel value (which would look wrong at different sizes)?
- **Default/backward compatibility**: existing campaigns/artworks created before this field existed — what offset do they get (0 / null) so their current (possibly already visually-tuned) appearance doesn't shift unexpectedly?

## Impacted Areas

- Portal artwork editor: layer config panel for the text-based layer type (new numeric field), live preview.
- Rendering engine: canvas draw logic that positions text within a cell/shape — must apply offset consistently between portal preview, storefront SDK preview, and final print/order render.
- Storefront SDK preview (if the layer is buyer-personalizable, offset must not be exposed/editable by buyer — it's a seller/design-time setting).
- Print/fulfillment output — the offset must carry through to the final production file, not just on-screen preview.
- Other grid/cell text layer types not explicitly in scope of the current issue (regression: verify they are unaffected unless deliberately included).
- Existing artworks/campaigns using the layer type before this field was added (default value / visual regression risk).

## Risk Patterns

- Offset applied in portal preview but not reflected in storefront SDK preview or final print render (rendering pipeline divergence).
- Sign convention inverted (positive moves down when seller expects up, or vice versa vs. Word Search).
- Offset doesn't scale with font size → looks correct at one size, wrong when seller changes font size afterward.
- Existing artworks shift/break visually because a non-zero default offset is silently applied instead of 0/unset.
- Offset field exposed to buyer on storefront instead of being seller/design-time only.
- Extreme offset values push text outside the cell/print area with no clamping or warning.
- Multi-bundle SDK divergence (default embed vs Shopify v2 vs headless) in how offset is rendered.

## Open Questions To Consider

- Exact unit, min/max, step, and default value for the new field.
- Sign convention (positive = up or down).
- Does the offset scale with font size or stay absolute?
- What happens to existing/legacy artworks created before this field existed?
- Is the field per-layer, or does it need to support per-font presets (since the root cause is font-metric-driven)?
- Does this field also apply to/needs to be added for Word Cloud or other text-based layers, or is scope strictly limited to Scrabble in this issue?

## Suggested Test Focus

- Set offset to a range of values (min, 0/default, max, negative if allowed) and confirm visual centering improves and direction matches expectation.
- Compare rendering parity across: portal editor preview, portal live preview, storefront SDK preview, and actual print/order output.
- Regression: existing artworks/campaigns (created pre-feature) render unchanged (default offset = 0/no visual shift) unless explicitly stated otherwise.
- Font change after setting offset — confirm defined behavior (kept vs reset).
- Font size change after setting offset — confirm offset behavior (absolute vs proportional).
- Buyer-facing storefront: confirm offset is NOT an editable/visible buyer control (seller/design-time only), unless the issue states otherwise.
- Cross-browser/device rendering consistency of the offset (canvas rendering can differ subtly).
- Extreme values: text pushed outside cell/print bounds — confirm clamping, warning, or defined behavior.
