# Default-Text Fallback After Clearing a Field (teeinblue)

Use this rule when an issue says a layer renders its **default text** wrongly (size, wrap, position) after the buyer **typed then cleared** a field — i.e. the state "value = empty string" behaves differently from "value never set". Signals: "after deleting custom text", "cleared", "empty string", "falls back to default text", "populate step", "base font size", auto-fit.

## Context to recognize

A text-like layer has 3 states that look identical to the buyer but take different code paths:
- **Never touched** (`undefined`/no value) → uses the font size/lines saved with the artwork (fitted to default text).
- **Typed** (non-empty) → size/lines recomputed from the buyer's text.
- **Typed then cleared** (`""`) → populate step receives an empty string; if the recompute uses `""` but the render uses the default text, size and content diverge (e.g. auto-fit of `""` returns the base size → default text renders enlarged).

⚠️ "Populate step" in a ticket = the layer receives its value via **POPULATE VALUES** from ANOTHER option (layer itself "No personalization"). Test data must reproduce that: source option + populated layer. A layer the buyer types into directly does NOT exercise this path (TIB-5538: first setup was wrong for this reason). Also (user-confirmed): an empty text/paragraph layer renders NOTHING in the design — including a paragraph that is both a buyer field and populated, and whitespace-only input. Default text is preview-only. So the size check in the empty state = preview + `font_size` in the line-item payload (`layer-<id>-data`), not the design. Clearing the populate source overwrites a direct edit in the target field (by design).

Bug is usually in the populate step, which is shared by the editor/storefront preview AND the backend design/print render → both outputs must be checked.

## Requirements to check

- Cleared state renders default text at the SAME size/wrap as the never-touched state (that state is the baseline).
- Both preview (SDK/form) and generated design/print file go through the fix.
- Partial delete, whitespace-only, select-all+delete, re-typing after clear, clearing via other means (reset button, variant/artwork switch, Edit Customization from cart).
- Layer types sharing the populate step (paragraph vs single-line text, curve text) — which are in scope.
- Cart/order payload: what value + sidecar (`font_size`/`lines`) is stored for a cleared field.

## Risk Patterns

- Fix only on preview side; backend design still uses the bad size (or vice versa).
- Fix compares against `""` only — whitespace-only or `null` paths still broken.
- Fallback now also overrides a legit buyer value (e.g. short text gets default-text size).
- Default text longer/shorter than box: only one direction tested.
- Legacy orders created with bad size need regenerate — fixed automatically or not?

## Suggested Test Focus

- Baseline vs cleared: compare never-touched vs type→clear on the same layer, preview + design file.
- Type → clear → type again: size recomputes from new text (no stuck fallback).
- Default text long enough to need shrink (otherwise bug invisible → false pass).
- Regression: normal typed text, single-line text layer, layer without default text.
