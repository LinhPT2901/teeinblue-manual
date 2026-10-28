# Warp Text Canvas Point Editing Rules (teeinblue)

Use this rule when an issue mentions dragging warp points/anchors directly on the artwork canvas, the `Warp` toolbar button/popover, `Warp mode` (Free / Vertical / Horizontal), mirror/symmetric warp, or the warp `Advanced editor` dialog. Complements [[warp-text-clipart-background]] (warp fill/background) and [[curve-text-render]].

## Context to recognize

Warp text shape is defined by control points (e.g. 6 round anchors + 4 square control points forming top/bottom curves). Historically points were edited only by typing coordinates in the Advanced editor dialog. Canvas editing adds a second editing surface that must stay in sync with the dialog and with the render pipeline (FE preview vs BE render). Spiral Text is a sibling layer type that must NOT get this behavior.

## Requirements to check

- Points render at the correct position and follow the layer under zoom, resize, rotate, flip (if supported), and after undo/redo.
- Dragging a point changes only the warp shape — never moves/resizes the layer; the layer transformer handles and the warp points must not steal each other's drags (especially where they overlap at corners/edges).
- Mode semantics: Free = independent; Vertical = mirror across vertical center; Horizontal = mirror across horizontal center. Check points lying ON the mirror axis (e.g. middle anchors) and switching mode on an already asymmetric shape (does it snap/normalize or only affect future drags?).
- Mode sync both directions (popover ↔ dialog ↔ canvas) and persistence (saved with layer? per layer or global editor preference?). Old layers without a stored mode → default value.
- Undo/redo granularity: one drag = one step; check toolbar buttons AND keyboard shortcuts; does changing the mode itself create a step / mark artwork dirty?
- Bounds: whether points are clamped to the layer box, and what happens to glyphs that end up outside the render area (clipping). Dialog and canvas must behave identically.
- Render parity: shape built on canvas == shape built with same coords in dialog == BE/print render == storefront.

## Impacted Areas

- Portal artwork editor: canvas transformer, toolbar `Warp` button, Advanced editor dialog, undo/redo history, layer save payload.
- Warp text render (FE preview + BE render endpoint), storefront personalization preview.
- Artwork 2.0 global template / replica layers, locked/hidden layers, layers inside groups.
- Spiral Text (must stay on old editor) and other text layer types (regression).

## Risk Patterns

- Points drift from cursor at non-100% zoom or on rotated layers (coordinate-space transform bugs).
- Mirror mode applied to wrong partner point or doubling movement for on-axis points.
- Mode desync between popover and dialog after closing/reopening, switching layers, or reloading.
- Undo history splitting one drag into many steps (or merging several drags into one).
- Behavior change vs previously-passed build (e.g. clamp removed) — previous test cases become stale.
- Shape correct in editor but render clipped/different in BE output.

## Suggested Test Focus

- Point positions under zoom/resize/rotate; drag accuracy.
- Each mode × anchor vs control point × on-axis point.
- Popover UI copy, default, Advanced editor button; mode sync + persistence after save/reload.
- Undo/redo per drag; layer not moved/resized by point drags.
- Drag outside layer box → render parity with dialog.
- Spiral Text / other layer types regression; global template/replica/locked layer handling.
