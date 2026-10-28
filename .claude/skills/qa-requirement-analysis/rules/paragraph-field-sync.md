# Paragraph Field ↔ Sidecar Data Sync / Debounce / Font-Load Timing (teeinblue)

Use this rule when an issue touches the **Paragraph** form field / paragraph layer, or more generally any field where the raw user text is written immediately but a derived "sidecar" (`lines`, `font_size`, wrap data) is computed on a debounce, on blur, or after an async font load. Signals: `Paragraph.vue`, `ParagraphLayer.vue`, `ParagraphMixin`/`ParagraphCalculationMixin`, `useParagraphFont`, `ensureParagraphFontLoaded`, `measureText()`, `paragraph_flush`, `font_loaded`, debounce/watcher on text change, "lines/font_size out of sync", refactor of paragraph.

## Context to recognize

A paragraph field stores two things that must stay consistent: the **raw text** (written synchronously as the buyer types) and a **`-data` sidecar** (`lines` + `font_size`, computed from the text via canvas `measureText()`). The sidecar is computed lazily (debounce, e.g. 10ms) for perf, which opens timing gaps:

- **Submit-before-flush race**: buyer types then triggers add-to-cart before the debounce fires → stale `lines`/`font_size` submitted with fresh text (last line/tail dropped). Fixes usually add: recompute synchronously on `onBlur`, and a `paragraph_flush`/flush-on-`validate()` safety net for paths that skip blur (Enter-to-submit).
- **Font-not-loaded measurement**: `measureText()` on a font that hasn't finished loading returns fallback-font metrics → wrong `font_size`/`lines`. Especially for hidden / design-only / retrieval-populated paragraph fields that were never rendered as a visible component. Fix pattern: explicitly load font (`ensureParagraphFontLoaded`) before computing, and self-correct via a `font_loaded` event once it resolves — scoped to only fields actually using that font (avoid redundant recompute).
- **Portal watcher dedup**: the editor (`ParagraphLayer.vue`) may have overlapping watchers (immediate + debounced) doing the same recompute; collapsing them can fix a gap where prefix/suffix-only changes were missed, but risks changing recompute timing.

These are **timing/dedup refactors, not feature changes** — no API or print/render-pipeline change intended. That framing sets the QA baseline: prove the specific races are fixed AND prove nothing in the common paths / render output regressed.

## Requirements to check

- **Every submit path flushes**: click add-to-cart, Enter-to-submit, programmatic submit, quick-buy — each must read post-flush `lines`/`font_size`. Confirm which paths go through blur vs `validate()`/`paragraph_flush`.
- **No-blur submission**: submitting without ever blurring the field must still send correct data (the `validate()` safety net).
- **Font-load correctness**: hidden/design-only/retrieval-populated fields compute `font_size`/`lines` from the REAL font, not fallback — self-correcting after `font_loaded`.
- **Scoped recompute**: `font_loaded` only recomputes fields actually using that font; a hidden field sharing a font already loaded by a visible field must NOT trigger redundant recompute (perf).
- **Portal parity**: SDK form field and Portal editor share the same `font_size`/`lines` calculation — output must match after refactor.
- **Prefix/suffix-only change**: editing only prefix/suffix (not the whole string) updates preview/derived data (previously missed).

## Impacted Areas

- **SDK storefront form field** (`Paragraph.vue`, `ParagraphCalculationMixin` (ex-`ParagraphMixin`), `useParagraphFont`) — buyer typing, blur, submit, cart payload. — Confirmed (per impl comment).
- **Portal artwork editor** (`ParagraphLayer.vue`) — seller editing text/font/size, live preview. — Confirmed.
- **Add-to-cart / cart / order data** — the `lines`/`font_size` persisted to line item. — Confirmed (this is the data the race corrupts).
- **Font loading subsystem** (`ensureParagraphFontLoaded`, `font_loaded` event). — Confirmed.
- **Print / render / fulfillment pipeline** — impl says NOT touched; treat as **regression-only** area (final print must be unchanged). — Confirmed not-touched, verify.
- **Multi-bundle SDK** (default embed vs Shopify v2 vs headless) — timing/event behavior can diverge; verify parity. — Assumption / need confirm.
- **Other form field types** that share the mixin/debounce pattern — regression if mixin rename/cleanup leaked. — Assumption.

## Risk Patterns

- A submit path that skips both blur and `validate()` still sends stale data (e.g. some quick-buy / third-party cart trigger).
- Race still reproducible under fast typing + immediate submit on slow devices (debounce window widened by main-thread jank).
- Hidden field stuck on fallback-font metrics because `font_loaded` never fires or isn't scoped to it.
- Redundant recompute storm on `font_loaded` when many fields share a font (perf regression the fix was meant to avoid).
- Portal watcher collapse drops a legitimate recompute trigger (e.g. programmatic text set, undo/redo, template load).
- `measureText()` canvas metrics differ across browsers/devices → `lines`/`font_size` differ between buyer preview and print.
- Mixin rename (`ParagraphMixin` → `ParagraphCalculationMixin`) leaves a stale import/reference → runtime error on some path.
- Enter key now submits where it previously inserted a newline in the paragraph (or vice versa) — behavior change hidden inside the flush fix.

## Open Questions To Consider

- Exact debounce window and which submit paths are guaranteed to flush (full list)?
- Is `paragraph_flush` synchronous — does `validate()` block until recompute completes before reading data?
- Acceptable perf ceiling: how many paragraph fields / how large text before recompute lag is a bug? (No numeric threshold in issue → `PO/DEV confirm`.)
- Does the fix change any user-visible behavior (Enter key, wrap timing, preview latency), or is it strictly internal?
- Legacy line items / already-placed orders with old (possibly stale) `lines`/`font_size` — any migration, or only new submissions fixed?

## Suggested Test Focus

- **Race repro (core)**: type into visible paragraph field → immediately add-to-cart WITHOUT blur (direct click AND Enter-to-submit) → cart/line-item `lines`/`font_size` reflect the full last line, not truncated.
- **Common path (regression)**: type → blur normally → size/wrap recompute happens as before.
- **Hidden/design-only field, unique font**: `font_size`/`lines` self-correct after that font loads (not stuck on fallback metrics).
- **Shared-font perf**: hidden field using a font already loaded by a visible field → no redundant recompute on `font_loaded`.
- **Portal prefix/suffix-only edit**: preview/derived data updates (previously missed).
- **Portal font/size sidebar edit**: live preview recomputes correctly, same as before.
- **Print/render regression**: final print/order output for paragraph layers unchanged (pipeline untouched).
- **Cross-browser `measureText()` parity**: buyer preview vs Portal vs print agree on wrap/size.
- **General regression**: paragraph layers/fields across SDK storefront + Portal editor, plus other field types that shared the mixin.
