# QA Checklist — Paragraph layer (text wrapping & data parity)

> **Part of the [TeeInBlue Artwork 2.0 QA Checklist](artwork-2.0-qa-checklist.md).**
> Related: [A — a function on a single layer](qa-checklist-A-single-layer-function.md) ·
> [B — a function across layers](qa-checklist-B-function-across-layers.md) ·
> [C — a new layer type](qa-checklist-C-new-layer-type.md)

## When to use this checklist

Use this whenever a change touches the **Paragraph layer** — the wrap/auto-shrink calculation,
the personalization form field, or anything that writes `layer-*-data`. That includes the three
paths where a paragraph's value arrives **programmatically** rather than by typing:
populate-values (P8), Duplicate & Link (P9), and cross-template sync (P10). Paragraph is the only
form field whose stored data is *derived* (wrapped) rather than the raw customer input, so it
has a failure mode no other field has: **the value the customer sees and the value that gets
printed can silently diverge.**

Origin: TIB-001 / TIB-4589 (Refactor Paragraph), verified on staging 2026-08-25.

---

## P0. Background you must know before testing

Each paragraph layer stores **two** keys, both in `localStorage["teeinblue-customizations"]`
and in the merchant API payload:

| Key | Meaning |
|---|---|
| `layer-XXXXXX` | raw value — exactly `textarea.value`, only hard `\n` typed by the customer |
| `layer-XXXXXX-data` | `{ lines: "<text AFTER wrapping>", font_size: <after auto-shrink> }` |

Who consumes which:

| Consumer | Source |
|---|---|
| Live preview SVG | `lines` (+ layer prefix/suffix) |
| Design / print file | `lines` + `font_size` |
| Cart line-item property (customer-facing) | raw value |
| Open API `/openapi/v1/customizations/{uuid}` | raw value, keyed by field label |

**The merchant API does not recompute `lines`** — it persists byte-for-byte what the SDK sends.
So a wrong `lines` is a real data defect, not a cosmetic one.

---

## P1. Parity: raw value vs `lines`

Use `scripts/tib-check-paragraph-parity.js` → `auditCustomizations()` in the console.
Do **not** assert `value === lines`, and do **not** normalize with `replace(/\s+/g,' ')`
(that collapses hard `\n` too and hides the "lost Enter" defect).

- [ ] Short text, no wrapping → `value` and `lines` are **byte-identical**.
- [ ] One long line that wraps → differs **only** by inserted soft `\n`; every word preserved, same order.
- [ ] Hard `\n` (customer pressed Enter) → preserved in **both** keys, same count position.
- [ ] Mixed hard + soft breaks → `lines` newline count > `value` newline count, `checkParity` ok.
- [ ] A word longer than the print area → **not split mid-word**; it overflows to its own line and `font_size` shrinks.
- [ ] Double spaces / leading / trailing spaces / trailing `\n` → **not collapsed** in either key.
- [ ] Untouched optional field → only `layer-XXXX-data` exists, no raw key; treat as N/A, not a failure.
- [ ] Empty field → `lines: ""`, `font_size` = the design default's size, no error on submit.

## P2. Recompute triggers

- [ ] Type → blur → `lines` recomputed against the final text.
- [ ] Type → Add to cart **without** blur → submitted `lines` includes the last line, not truncated.
- [ ] Type → submit **inside the 10ms debounce window** → `paragraph_flush` safety net still submits the final text.
- [ ] **Clear all (X button)** → both `value` and `lines` go empty, preview clears. ⚠️ *Known defect — see P6.*
- [ ] `input` then `blur` within <10ms → `lines` must not keep the previous value. ⚠️ *Known defect — see P6.*
- [ ] Edit → blur → re-edit → submit without blur → latest edit wins, no stale value from the first blur.
- [ ] Fast continuous typing → debounced (no recompute per keystroke), final data still correct.
- [ ] Font finishes loading late → `lines`/`font_size` self-correct from real font metrics, not fallback.
- [ ] Retrieval / edit link (`?customization-id=...`) → prefilled field recomputes to the same values as typing directly.

## P3. Persistence & clean state

- [ ] `localStorage` entry survives reload — **and is not silently stale**: after reload, `value` and `lines` still pass parity.
- [ ] A broken parity state does **not** self-correct on reload alone; confirm what does correct it (any subsequent recompute).
- [ ] Clear `localStorage["teeinblue-customizations"]` + reload **before each case** — stale state from a previous case leaks in otherwise.

## P4. Merchant API

Capture with a `fetch` hook, or DevTools → Network.

- [ ] `POST /api/merchant/shopify/customization` carries **both** `layer-XXXX` and `layer-XXXX-data`.
- [ ] Response echoes the request body unchanged (server does not recompute).
- [ ] `GET .../customization/<uuid>` returns both keys for every paragraph layer.
- [ ] `/cart/add.js` line-item property uses the **raw value** (no soft `\n`).
- [ ] Open API `GET /openapi/v1/customizations/{uuid}` returns raw value keyed by field label.
- [ ] `font_size` in the payload matches the size actually rendered in the preview.

## P5. Rendering

- [ ] Preview SVG text (join `tspan` with `\n`) === `lines`, allowing for the layer's prefix/suffix.
- [ ] Layers with a prefix/suffix render `prefix + lines + suffix`, and editing **only** the prefix/suffix still triggers a recompute.
- [ ] Portal live preview and storefront SDK produce **identical** `lines`/`font_size` for the same text + font.
- [ ] Print/order output unchanged versus pre-change baseline.
- [ ] Changing font, or font size, in the Portal sidebar recomputes the preview.
- [ ] Programmatic text set (undo/redo, template load) still triggers a recompute.

## P6. Known defects — regression guards

- [ ] **Clear all (X) leaves `lines` stale** (TC-TIB-714). `clearAll()` does not schedule a recompute;
      `flushPendingCalculation()` reads the old `modelValue`. Field empties, preview keeps the old text,
      and the stale state persists in `localStorage` across reload.
- [ ] **`input` + `blur` within the debounce window** — same root cause, `lines` keeps the previous
      value or the design default.
- [ ] For both: confirm whether any submit path bypasses `paragraph_flush`
      (retrieval/edit link, quick-buy, theme cart drawer). A bypassing path means a **wrong print file**.

## P7. Security & edge

- [ ] XSS payload (`<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`) → escaped everywhere,
      never executed; `<` `>` not swallowed; wrap still computed normally.
- [ ] Enter key behaviour unchanged (`<textarea rows=3>` → newline, does not submit the form).
- [ ] Other form field types (Text, Number, Clipart, Template select) still work — no runtime error from
      shared mixin renames; console clean.
- [ ] Slow network + submit before the font loads → no fallback-font metrics persisted.

## P8. Populate values — paragraph fed from a source option

`POPULATE VALUES` is a section in the **layer's settings** (select layer → ✎ on the layer row).
UI text: *"Let this layer receive values populated from other options."* The paragraph takes its
text from another option instead of from a customer typing into it.

**Four independent toggles, two of which change the wrap:**

| Toggle | Affects wrap? |
|---|---|
| `Populate Content from another option` | **Yes** — new text ⇒ `lines`/`font_size` must recompute |
| `Populate Font from another option` | **Yes** — new font ⇒ different metrics ⇒ different wrap. Precondition stated in the UI: *"Must change from Google Font to Custom Font to use this feature"* |
| `Populate Color from another option` | No |
| `Populate Background from another option` | No |

**Source syntax** — `{{token}}` placeholders pasted into the Value field, mixable with literal
text (`{{title}} by {{artists}}`). Nine source types: Street Maps, Star Maps, Text & Curve Text,
QR code, Song search, Moon Phase - Date, Moon Phase - Location, JSON List, Clock.
Song search offers `{{title}}` `{{artists}}` `{{url}}` `{{duration}}` `{{lyrics}}`
(the last needs *"Load song lyrics"* enabled on the Song Search layer).

The value therefore arrives **programmatically** — the same code path shape as `clearAll()`,
which is where the known parity defect lives. Every case below must check `lines`/`font_size`,
not just the visible text. Mechanism in the bundle: `mapperSchemas` → `applyMapperForSources(...)`,
plus `handleFontLoaded(e)` which returns early when `mapperSchemas` is empty — that early return
is why a design-only paragraph is the only way to exercise the font self-correction path.

### Populate Content

- [ ] Source option produces a value → target paragraph populates **and** wraps: `lines`/`font_size` computed for that text.
- [ ] Source value changes (customer picks a different song / moves the map pin) → target re-populates **and** re-wraps; no stale `lines` from the previous selection.
- [ ] Target wraps by **its own** layer width / font / size — nothing carried from the source option.
- [ ] Source cleared / nothing selected → target `lines: ""`, `font_size` = the design default's size, no error.
- [ ] **`{{lyrics}}`** — the heaviest case: long text, many hard `\n`, arriving programmatically. Every hard newline survives; soft wraps added on top; no tail line dropped; auto-shrink applies without splitting a word.
- [ ] Value mixing tokens and literals (`{{title}} by {{artists}}`) → composed string wrapped as one unit.
- [ ] Token that resolves to empty (e.g. song with no lyrics loaded) → no literal `{{lyrics}}` left rendered, `lines` consistent.
- [ ] Target with prefix/suffix enabled → renders `prefix + populated + suffix`, wrap recomputed over the combined string.

### Populate Font

- [ ] Precondition holds: the toggle only works once the layer is switched from Google Font to Custom Font. Verify the toggle is disabled/ineffective otherwise.
- [ ] Source option changes the font → `lines` **and** `font_size` recompute against the new font's metrics, not the old ones.
- [ ] Populated font arrives late (font still loading) → self-corrects via `font_loaded`; no fallback-font metrics persisted.
- [ ] Populate Content **and** Populate Font together → both applied, single consistent recompute.

### Storage & output

- [ ] **Parity after populate**: run `checkParity()` on the target. A populated target that never recomputes is the TC-TIB-714 failure mode arriving through a different door.
- [ ] localStorage: confirm whether a populated (non-form) target gets a raw `layer-XXXX` key at all, or only `layer-XXXX-data`. Record which — assertions depend on it.
- [ ] Merchant API payload carries the populated target's `layer-XXXX-data`; response echoes it unchanged.
- [ ] Print/design file reflects the populated text.

### Unblocks two existing cases

- [ ] **TC-TIB-007** — design-only paragraph using a font **no visible field uses**: after that font loads, `lines`/`font_size` self-correct via `font_loaded`; not stuck on fallback metrics.
- [ ] **TC-TIB-009** — hidden paragraph sharing a font **already loaded** by a visible field: no redundant recompute on every `font_loaded`; recompute scoped to fields actually using that font.

## P9. Duplicate & Link options

Created from the selection toolbar (`Duplicate & Link options`, its own icon next to Duplicate).
Verified on staging 2026-08-25 — the mechanics are narrower than they look:

- The linked layer gets **no form field of its own**; it is driven by the source layer's field.
- Selecting a linked layer **removes font family / font size from the toolbar** — only
  `Transform / Align / Shape Cut` remain. There is no UI path to give it a different font.
- Resizing a paragraph layer **scales it, it does not reflow**: Width 800 → 400 took the font
  from 80 to 40 and left the line breaks untouched.

Consequence: source and linked layer always carry the **same `lines`** and differ only in
`font_size`. And neither the linked layer nor a design-only layer appears in the customization
data at all — the print pipeline derives them server-side.

- [ ] Duplicate & Link a paragraph → linked layer appears with a 🔗 marker, **no new form field**.
- [ ] Type once in the source field → both layers render the text, both wrap the same way.
- [ ] Linked layer's `font_size` scales with its size; `lines` stay identical to the source's.
- [ ] Run `checkParity()` **per layer** against the shared raw value. Never compare one layer's `lines` to another's.
- [ ] localStorage: confirm the linked layer contributes **no** `layer-XXXX` and **no** `layer-XXXX-data`.
- [ ] Merchant API payload likewise carries only the source layer's entries.
- [ ] **Risk to probe**: find any path that gives a linked layer an independent font or size — import artwork, bulk edit, API. If one exists, the source's `lines` would be wrong for the linked layer, and nothing in the payload would reveal it.
- [ ] Unlink → values diverge from that point on; previously entered value is not lost.
- [ ] Delete one of a linked pair → the remaining layer still populates and wraps correctly.
- [ ] Clear-all (X) on the shared field → **all** linked layers clear. Given TC-TIB-714, expect this to fail the same way; check every linked layer.

### Design-only vs mockup-only

- [ ] A **design-only** paragraph renders in the print file but **not** in the storefront preview, and contributes nothing to localStorage or the payload. It cannot be verified through the DOM — plan a different route (print file, or ask DEV to expose it).
- [ ] A **mockup-only** paragraph does render in the preview.

## P10. Sync value between templates (store config, matched by field title)

Store setting `sync_between_templates` (read it without logging in:
`GET https://staging-api.teeinblue.com/api/merchant/shopify/config?shop=<shop>`) carries a
customer's input across templates: type into a field titled `X` on template 1, switch to
template 2 which also has a field titled `X`, and the value comes along.

Setup in the Portal: the **+** button beside the template name → `Add new`; give the destination
layer the **same Option Title** under PERSONALIZATION SETTINGS → `Create a new option`.

This was the highest-risk area — the value is written programmatically into a *different* layer,
with its own width, font and size. **Verified working on staging 2026-08-25**: sync carries the
raw value and recomputes `lines`/`font_size` for the destination; it does not copy the source's
`lines`. Source at Hourglass Of Shine/120 gave 6 lines, destination at Roboto/22 gave 2 lines and
`font_size` 22. Round-trip back to the source template restored 6 lines / 109.

Two behaviours to build assertions around:

- localStorage holds **only the currently selected template's layers**. Switching template deletes
  the previous template's `layer-*` entries outright; switching back restores them. A missing key
  after a template switch is expected, not data loss.
- Matching is by **Option Title**, so the destination field's title must be identical.

- [ ] Setting **off** → switching template does not carry the value.
- [ ] Setting **on**, titles match exactly → value carried into the new template's field.
- [ ] **After sync, `lines` is recomputed for the destination layer** — verify with `checkParity()` against the destination's own font/size/width, and confirm the line count differs from the source when the geometry differs.
- [ ] Destination with a different font or size → `font_size` recalculated (including auto-shrink) rather than copied.
- [ ] Switch back to the original template → value still correct, parity still holds, original `lines`/`font_size` restored.
- [ ] localStorage after each switch → only the active template's layers present.
- [ ] Titles differing only by case or surrounding whitespace → document whether they match; whichever it is, it should be consistent.
- [ ] Same title but **different field type** (Text vs Paragraph) → defined, non-crashing behaviour; `lines` only produced for the paragraph side.
- [ ] Two fields sharing one title within a single template → document which one wins.
- [ ] Value containing hard `\n` → newlines survive the sync.
- [ ] Sync, then Add to cart **without touching the field** → merchant API payload has correct `lines` for the destination layer.
- [ ] Sync into a field that is design-only/hidden on the destination template → still recomputes.
- [ ] Sync while the destination's font is still loading → self-corrects, no fallback metrics persisted.

---

## Tooling

| What | Where |
|---|---|
| Parity checker (`checkParity`, `auditCustomizations`) | [`scripts/tib-check-paragraph-parity.js`](../scripts/tib-check-paragraph-parity.js) |
| Environment, endpoints, SDK gotchas | [`.claude/tib-portal-flows.md`](../.claude/tib-portal-flows.md) § Storefront SDK — Paragraph layer |
| Evidence from the 2026-08-25 run | `test-results/evidence/tib-001-localstorage-lines-parity.md` |
