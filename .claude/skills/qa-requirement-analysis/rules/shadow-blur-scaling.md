# Shadow Blur / Display-Scaling Consistency Rules (teeinblue SDK)

Use this rule when an issue mentions shadow blur, `shadow_blur`, drop shadow, `feDropShadow`, blur looks different between preview and print/render, blur differs between Campaign Editor and Mockup Editor, "sub-pixel blur", the 1px blur floor, Safari/iOS smearing a blurred layer, or any effect authored in **artwork units** that looks wrong only at certain preview sizes. Related [[curve-text-render]] ("Preview == render == print"), [[printarea-mapping]].

## Context to recognize

Effects like shadow blur are authored in **artwork coordinates** (e.g. a 4500px artwork). By the time a layer is painted, its value has been scaled down twice: (1) board ratio — the board is scaled to the width it's displayed at; (2) mockup zoom. Different surfaces show the board at different widths, so the *same* authored value paints differently on each:

- Store preview / gallery: board shown at ~500px → 4500px artwork shrunk ~9x → authored blur 1 arrives as ~0.11px.
- Artwork / Campaign / Mockup editor: board width × zoom (each surface differs).
- Rendered print file / order render: full size, **nothing scaled** → always correct.

Bug class: a floor/clamp meant to protect one surface is applied **after** scaling. The SDK has a **1px floor on blur** because Safari iOS smears the whole layer on sub-pixel blur. Applied post-scaling, 0.11px rounded up to 1px → shadow painted ~9x wider than designed. Because each surface scales by a different amount, the floor rounds up by a different amount → Campaign Editor ≠ Mockup Editor ≠ storefront, while the print file stays correct.

Fix pattern (TIB-5353): when scaled blur lands **under half a display pixel**, draw a **hard (unblurred)** shadow instead of inflating to 1px (0.11px looks hard anyway, and leaves no `feDropShadow` for Safari to smear). Between 0.5px and 1px the floor still applies (off by at most half a pixel). At ≥1px nothing changes. Rule of thumb: shadow drawn hard when `blur × (preview width / artwork width) < 0.5`.

## Requirements to check

- **Preview == print (the fix)**: judge the on-screen preview against the **print/render file scaled to preview width**, NOT against the old preview (the old preview is the bug). Shadow blur should look consistent across artwork editor, Campaign Editor, Mockup Editor, storefront preview/gallery, and print file — regardless of preview size.
- **Campaign Editor == Mockup Editor**: the same mockup must show the same blur in both (they render the board at different widths — the original symptom).
- **Print file unchanged (regression)**: print files / order renders are produced server-side at full size and were correct before — must be pixel-identical after the fix.
- **No Safari/iOS smear**: on Safari iOS a small-blur shadow must not smear the whole layer.
- **Threshold boundaries**: below 0.5 display px → hard shadow; 0.5–1px → floored (≤0.5px off); ≥1px → unchanged. Verify each band.
- **Filter box sizing (bundled fix)**: a wide, short layer (title strip / banner) must size its shadow filter box by the correct side (height, not width) so a large shadow isn't clipped.

## Impacted Areas

- SDK `src/components/svg-artworks/BaseLayerMixin.js` — **all layer types inherit** (text, image, vector, clipart, etc.) → broad regression surface for any layer with a shadow.
- Ships in **core SDK bundle**, not a plugin version bump → no plugin cache to clear; hard-reload storefront. Portal editors embed the SDK as a **submodule** — only pick up the fix once the submodule pointer is bumped (test storefront first).
- Storefront preview / product gallery, Artwork editor, Campaign Editor, Mockup Editor.
- Print file / order render (server-side, full size) — regression check only, should be untouched.
- Removed dead `shadowCssStyles` CSS helper (unused since Dec 2024) — no behaviour change expected.

## Risk Patterns

- Hard-shadow threshold makes the shadow appear/disappear abruptly when zooming or resizing preview (flicker at the 0.5px / 1px boundary).
- Fix changes a layer type that shouldn't be affected (all types inherit from BaseLayerMixin) — regression on image/vector/text shadows.
- Print/order render accidentally changed (should be identical).
- Safari iOS smear reappears in the 0.5–1px band.
- Filter box off-centre: a shadow with a large **positive offset** can still clip on right/bottom edge — **known & deliberately out of scope**, separate issue (don't file as regression).
- Submodule pointer not bumped → editors still show old behaviour, mistaken for "fix not working".

## Open Questions To Consider

- Which surfaces/zoom levels are the acceptance baseline (which preview widths must match the print file)?
- Is there a tolerance for "consistent" (perceptual, or must be exact within the display-scaled value)?
- Does the fix cover all layer types with shadows, or only the reported one?
- Behaviour at extreme zoom in editors (very small and very large board widths)?
- Are both offset-X/offset-Y and blur handled, or blur only?

## Suggested Test Focus

- Repro case: shadow blur = 1 on a 4500px artwork, compare storefront preview / gallery vs print file (scaled) — should match, not over-blurred.
- Cross-surface consistency: same mockup in Campaign Editor vs Mockup Editor — identical blur.
- Threshold bands: blur values that land <0.5px, 0.5–1px, and ≥1px in a given preview — verify hard / floored / unchanged.
- Layer-type sweep: shadow on text, image, vector, clipart layers (all inherit BaseLayerMixin).
- Wide-short layer (banner/title strip) with large shadow — not clipped (filter box height fix).
- Safari iOS: no whole-layer smear on small blur.
- Regression: print file / order render pixel-identical before vs after.
- Various preview widths / zoom to confirm no abrupt appear/disappear artifacts.
