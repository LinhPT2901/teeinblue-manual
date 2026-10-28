# Warp Text Clipart Background Rules (teeinblue)

Use this rule when an issue mentions warp text background, clipart category background, `background_enabled` / `background_image`, `RetrievalBackgroundOption`, `ImageDataLayer` / `WarpTextTransformer`, `MaskRenderer` / `backgroundMaskId` / `backgroundWhitenFilterId`, or the interaction between warp text stroke and background.

## Context to recognize

Warp text layers can have an image (from a seller clipart category) rendered as a fill/background inside the glyph shapes, instead of a flat color. This is implemented via mask rendering (SVG mask/whiten-filter technique) on both the portal editor (FE, `ImageDataLayer`) and the print/order render pipeline (BE, `WarpTextTransformer` + `MaskRenderer`). It interacts with several other warp text features: stroke, letter/rainbow colors, and artwork 2.0's global template/replica layer system.

## Requirements to check

- **Stroke is mutually exclusive with background**: a warp text layer cannot have both a visible stroke and an image background at the same time. Confirm which one wins when both are toggled, in which order, and that a warning message is shown to the seller explaining why (exact copy should be confirmed with PO/design, not assumed).
- **Color type forcing**: enabling background on a warp text layer with per-letter/rainbow colors (`color_type`) forces it back to a single/text color and clears `letter_colors`. Confirm this is intentional and reversible (does disabling background restore the previous letter colors, or are they lost permanently?).
- **Global template / replica interaction (artwork 2.0)**: background edits made on a **local** (non-global) layer under a global template historically failed to save/display — this is a recurring artwork-2.0 bug class, not unique to this feature. Any layer-level property change needs an explicit local-vs-global-vs-replica test matrix: edit local layer, edit global template layer (propagation to replicas), and edit a normal layer that has no `global_id` (must not be wrongly blocked by replica-only guards like `is-replica` on shared UI components).
- **Save-time validation**: `background_enabled = true` without a `background_image` should fail validation server-side, not just rely on FE state.
- **Mask ID collision**: on canvases with multiple warp text layers using background, mask/filter element IDs must be scoped per layer (e.g. `layer.id` + artwork/session prefix) to avoid SVG ID collisions when rendered together.
- **Schema versioning**: background fields are typically gated behind a `schema_version` bump for the warp text layer type — old-schema artworks must render unchanged (no background fields silently added/applied).
- **Fit/aspect behavior**: as of the 2026-08 update the background uses **cover (slice)** + center-crop (like a plain text background), NOT contain/meet — the image is scaled to cover the glyph box, overflow is clipped, aspect preserved. SDK uses `preserveAspectRatio="xMidYMid slice"`; API `getBackgroundBox()` computes `cover_ratio = max(box_w/img_w, box_h/img_h)` and centers the crop (negative top/left), with `direct_upload_style: cover`. `getImageSize()` downloads/measures once per URL (cached), falls back to `Image::make()` for SVG; if the image can't be measured it reverts to the old contain behavior (top/left=0) and logs a warning. Confirm cover fit visually for landscape / portrait / svg (screenshot/recording) and that FE preview == backend/print render.

## Impacted Areas

- Portal artwork editor: warp text layer config panel (background toggle, clipart category picker), live preview.
- Rendering pipeline: FE preview (`ImageDataLayer`) vs BE/print render (`WarpTextTransformer`, `MaskRenderer`) — both must match.
- Artwork 2.0 global template / replica layer system (any local-layer-under-global-template edit).
- Stroke and per-letter/rainbow color features on warp text (mutually exclusive interactions).
- SDK storefront rendering across browsers, especially `mask-type="alpha"` support fallback.
- API save/validation for artwork layer data.
- Existing (pre-feature) warp text artworks — schema/regression safety.

## Risk Patterns

- FE preview shows correct background but BE/print render doesn't match (or vice versa) — the classic preview-vs-production render divergence for this app.
- Background silently not applying on local layers nested under a global template (known recurring bug class in artwork 2.0).
- Stroke + background both appearing to apply instead of being mutually exclusive, or the disable happening one-directionally only (e.g. adding stroke disables background, but removing stroke doesn't re-enable it).
- Letter/rainbow colors permanently lost after toggling background on then off.
- Mask ID collisions when multiple warp-background layers exist on one canvas.
- Old-schema artworks unexpectedly picking up new background fields/behavior.
- Browser-specific SVG mask rendering differences (alpha mask type support).

## Open Questions To Consider

- Exact warning copy and where it's shown when stroke blocks background (or background blocks stroke).
- Is the stroke/background exclusivity bidirectional and symmetric, or does one feature take priority when both are attempted?
- Are cleared `letter_colors` recoverable after disabling background, or permanently lost?
- Is the original QA-reported bug ("background renders in live preview but not in the actual design/print output") confirmed fixed by this change, or still open?
- What exactly does "design format is svg" validation mean — is it a hard blocker (background feature unavailable for non-SVG designs) with a specific user-facing message?

## Suggested Test Focus

- Happy path: enable background, pick clipart image, confirm editor preview == storefront/backend render == print output.
- Stroke vs background mutual exclusivity in both directions (add stroke after background; remove stroke after auto-disable).
- Letter/rainbow color forced-to-text-color behavior and reversibility.
- Global template local-layer edit, global-layer edit (propagation to replicas), and normal non-replica layer (regression, not blocked).
- Save validation: background enabled without image must fail; disabled doesn't require image.
- Multiple warp-background layers on one canvas (no mask ID collisions).
- Old-schema artworks unaffected (regression).
- Cross-browser mask rendering (alpha mask type fallback).
