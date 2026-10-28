# Render-Only Text Normalization Flag (teeinblue)

Use this rule when an issue adds an opt-in layer flag that **transforms the text only for layout/render** (strip line breaks, collapse spaces, trim, case transform…) while the **stored value stays raw**. Signals: "layout only", "stored value keeps…", `remove_line_breaks_enabled`, `applyLineBreakRule`, "ignore hard breaks", Song search / lyrics populated into Paragraph (TIB-4821).

## Context to recognize

Two copies of the same text now diverge on purpose: **raw value** (input field, cart line, order data) vs **normalized value** (what wrap/auto-fit and the canvas use). Every consumer must pick the right one. The flag lives in artwork layer JSON (no migration) and defaults OFF → existing artworks are the regression baseline.

Paragraph auto-fit: wrap to box width → binary-search largest font that fits, so **line count drives font size**. The normalization changes line count → font size → `lines`/`font_size` sidecar sent to cart (see [[paragraph-field-sync]]).

## Requirements to check

- Normalization applied in BOTH the auto-fit/measure path AND the path that produces the rendered `lines` — if only one, size and content diverge (size fitted for 3 lines, render still 10 lines → overflow/clipping).
- Backend design/print uses the sidecar `lines` from SDK, or re-wraps itself? If re-wraps, backend needs the same rule.
- Exact scope of normalization: `\r\n`, `\r`, `\n` → space; collapse ALL repeated spaces (incl. buyer's intentional double spaces on one line) or only those created by the replacement; tabs / unicode line separators?
- Prefix/suffix, max_length (counted on raw or normalized), default text, retrieval values — normalized or not.
- Where the toggle is hidden (shape-text, linked clones) and what a clone inherits from its origin.
- Every editor variant (legacy + new) and Global Option definitions, if the layer type exists there.
- Portal editor preview depends on the SDK submodule bump — check staging actually ships the SDK change before judging Portal preview.

## Risk Patterns

- Raw value leaks into render somewhere (mockup render, customization image, design file) or normalized value leaks into cart/order (lost line breaks for fulfillment).
- Edge strings: empty, only breaks, leading/trailing breaks, consecutive breaks → stray leading space / double space / non-empty "blank" render.
- Narrow box → no visible change (no-op by design) → false FAIL; wide box with short lines needed to see the effect → avoid false PASS.
- Flag ON but layer not auto-fit (fixed size) → behavior undefined.
- Old artworks (no flag key) behave differently from flag explicitly `false`.

## Suggested Test Focus

- Same populated value, toggle OFF vs ON, wide box: compare line count + font size in preview, cart `layer-<id>-data`, design file.
- Raw value preserved: input field, cart line, order detail, export.
- Edge strings + `\r\n`/`\r`.
- Toggle persistence / visibility in legacy + new editor, hidden cases.
- Regression: existing artworks with paragraph, shape-text, linked paragraph, prefix/suffix, populate, retrieval.
