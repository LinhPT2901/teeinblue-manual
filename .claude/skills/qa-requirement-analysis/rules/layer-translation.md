# Layer Translation Scope: Form Copy vs Design Content (teeinblue)

Use this rule for any issue touching the **translation / multi-locale** feature of a campaign layer or form field. Signals: `LAYER_TRANSLATABLE_FIELDS`, `translateLayer()`, `merchant/translations/<locale>.json`, Portal → Artwork translations screen, auto-translate, translation CSV import/export, `TranslationController@store|bulkStore|translate`, "text differs between preview and print", missing/extra whitespace after translation, `prefix`/`suffix`/`form_label`/`form_placeholder`/`input_hint`.

## Context to recognize

teeinblue has **two rendering engines** for the same text layer:

- **Storefront preview (SDK, JS)** — applies the shop's translation dictionary via `translateLayer()` before rendering.
- **Server-side artwork/print renderer (PHP, `ArtworkObjects\Text::getText()`)** — **never applies translations**; it renders the authored campaign data.

Therefore **any field that is translatable AND printed will make preview and print file disagree.** This is the structural bug class, not just a cosmetic one.

**Confirmed product stance (TIB-5414):** prefix/suffix being translatable at all was an **oversight**, not a feature. The backend renders nothing from translations. So the correct fix is to remove them from the translatable list — NOT to preserve whitespace through translation. Merchants losing a prefix translation need **no announcement/communication**.

Text layer output is composed as `prefix + buyer_value + suffix`. So:

- `prefix` / `suffix` = **design content** (printed) → must NOT be translatable.
- `form_label`, `form_placeholder`, `input_hint`, `*_label` (color/font/background), `name` = **form copy** (only shown in the personalization form, never printed) → correctly translatable.

## Confirmed platform behaviors (from TIB-5414 investigation)

- Translation dictionary is a JSON map `authored string -> translated string` per locale, keyed by the **source text itself**.
- Laravel `TrimStrings` / `TrimStringsCustom` middleware **trims the value** when a translation is saved, but **never touches the key** → key `"All Day I Dream About "` maps to value `"All Day I Dream About"`. Leading/trailing whitespace is silently lost.
- Auto-translate also drops outer whitespace; Portal CSV import (`TranslationSettings.vue`) trims values too.
- Portal's Artwork translations screen is built from the SDK constant `LAYER_TRANSLATABLE_FIELDS` (`ArtworkItem.vue`), so removing a field from that constant also removes its rows from the translation UI.
- **VERIFIED ON STAGING 2026-09-09 — where the translation UI actually lives.** There is no per-campaign or per-artwork "Translations" tab. The dictionary is the global **`Extras → Dynamic Translations`** screen (`/artwork-translations`): one key→value map **shared across the whole store**, per locale. Writes go through `POST /api/translations/bulk`.
  - **Two ways rows get in there.** (1) **`Import to translation`** — a button on the **artwork list, product base list and campaign list**. This is the path that walks the entity's translatable fields and pushes their strings into the dictionary, so **this is the surface that consumes `LAYER_TRANSLATABLE_FIELDS`**. (2) **Add new translation** — manual entry, type both key and value.
  - **Whether the import reads `LAYER_TRANSLATABLE_FIELDS` is UNCONFIRMED — ask dev before writing a pass/fail expectation on it.** It is the plausible candidate (it is the flow that walks an entity's translatable fields), and a dev comment on TIB-5414 said "the portal reads the same constant from the SDK (`ArtworkItem.vue`) to build the Artwork translations screen" — but that named a screen that does not exist in that form, so the mapping to this button is inference, not fact. The import could equally scrape every text string it finds, or use a server-side field list of its own.
  - Consequence: a test like "run `Import to translation`, expect no prefix/suffix rows" is worth running to **observe behavior**, but must carry `PO/DEV confirm` until dev answers. If prefix/suffix rows still arrive, two causes are indistinguishable without dev: the submodule was not bumped, or the import never used that constant. **Do not log a bug, and do not use it as a deploy probe, on the strength of the inference alone.**
  - Simply *browsing* the dictionary proves nothing on its own: a string is only there if someone imported or typed it. Never read "no prefix rows listed" as evidence of the fix without running the import first.
  - Consequence for test data: manual entry reproduces the bug exactly — key keeps its whitespace, value gets trimmed on **both** ends by the middleware.
  - Consequence for isolation: the dictionary is **store-wide**, not scoped to a campaign. Rows seeded for one test affect every campaign on that store whose text matches the key. Note what you add and clean it up.
- Removing a field from `LAYER_TRANSLATABLE_FIELDS` makes existing dictionary entries **inert** — no migration; entries stay in the JSON but are ignored.

## Requirements to check

- A field removed from the translatable list falls back to the **authored** value in every locale, and that value matches the print file **character for character** (including whitespace).
- Fields that remain translatable still translate correctly per locale — no collateral regression.
- Whitespace-sensitive cases: prefix with trailing space, prefix with leading space, suffix with leading/trailing space, multiple consecutive spaces, non-breaking space.
- Preview ↔ generated artwork ↔ cart/line-item ↔ order/print file all agree.
- Portal translation UI: removed rows disappear; remaining rows still save / auto-translate / export / import.

## Impacted Areas

- **SDK storefront preview & personalization form** — main change surface.
- **Portal → Artwork → Translations screen** — row list is derived from the same constant (picked up only after `src/sdk` submodule bump → **deploy/version ordering matters for QA env**).
- **Generated artwork / print file / fulfillment** — should be unchanged (never used translations); regression-only area.
- **Campaign mockups & customization image** — same path as artwork, regression-only.
- **Existing merchants' translation dictionaries** — entries become inert, not deleted.
- **Multi-locale storefronts (Shopify Markets / translation apps)** — locale switching, default vs secondary locale.
- **SDK bundle variants** (default embed, Shopify v2, headless) — verify parity.

## Risk Patterns

- Merchant **relied on** translating prefix/suffix (e.g. German vs English design text) → after the fix the preview reverts to the authored language. This is a **behavior regression from the merchant's point of view**, even though it now matches print. Needs PO awareness/comms.
- QA verifies on Portal before the SDK submodule bump → translation rows still visible → false FAIL/PASS.
- Cached SDK bundle / CDN → storefront still runs the old code.
- Cached campaign payload or cached rendered preview hides the change.
- Fix applied only to the storefront preview path but another consumer (cart preview, order preview, email, Shopify UI extension) still translates.
- The underlying trimming bug still exists for the remaining translatable fields — a label ending with a space is still trimmed. Out of scope but reportable.

## Answered by PO/Dev (TIB-5414 — reusable defaults)

- Prefix/suffix being translatable = **oversight**. BE renders nothing from translations. Removing them is the intended fix; no need to preserve whitespace through translation.
- **No merchant communication needed** when a prefix translation stops applying.
- The change removes **only** `prefix` and `suffix` — every other translatable field is untouched.
- **Scope of artwork translation after the fix:** switching language on the storefront translates only **option title / label / placeholder**. Anything else visibly changing per locale in an artwork is a bug.

## Open Questions To Consider

- **Does the `Import to translation` flow read `LAYER_TRANSLATABLE_FIELDS`, or does it collect strings some other way?** Blocks any pass/fail expectation on that button. Also: do the artwork / campaign / product base entry points share one field list?
- Which portal surface, concretely, is the one a dev means by "the Artwork translations screen" that is built from the constant?
- Should trailing/leading whitespace be preserved for the fields that remain translatable (the `TrimStrings` root cause) — separate ticket?
- Do other layer types with prefix/suffix (Paragraph, Curve text, Warp text, JSON list) share the same constant?
- Translation CSV export/import behavior for a field removed from the list.
- Empty state of the Artwork translations screen when nothing is left to translate.
- Which SDK bundles / which release contains the change, and when does the Portal submodule bump land?

## Suggested Test Focus

- **Prerequisite before anything else**: confirm the target storefront actually has the second locale **published** (Shopify admin → Settings → Languages). A locale listed in the teeinblue portal proves nothing — the portal reads `shop_locales`, which includes unpublished ones. Check the real storefront: the language switcher (`form[action*="localization"]`, `locale_code`) and `Shopify.locale`. A locale that 404s on `/<code>/` is not published, and every translation test is blocked until it is.
- **Core repro**: layer with prefix ending in a space + a translation dictionary entry for that prefix → storefront preview renders the space, in every locale.
- **Preview vs print parity**: personalize → add to cart → generated artwork/print file matches preview character for character.
- **Whitespace matrix**: leading-space prefix, trailing-space suffix, both, multiple spaces.
- **Fallback behavior**: layer whose prefix has a dictionary entry → preview shows **authored** prefix, not translated.
- **No regression on translation feature**: option title / label / placeholder still translated per locale — and, after a prefix/suffix removal, those are the ONLY things that may change when switching storefront language on an artwork.
- **Portal `Import to translation`**: run it from the artwork list (and campaign / product base list) on an entity whose layers have prefix/suffix, then diff the dictionary. Expected *if* the import reads the constant: rows for the still-translatable fields, none for prefix/suffix — but mark it `PO/DEV confirm`, see the caveat above. Also check whether all three entry points share one field list.
- **Regression**: mockups, customization image, existing orders unchanged.

## Update TIB-5585 (dev comment 2026-10-19) — whitespace now kept on manual save

- **Manual** translation values in `Extras → Dynamic Translations` keep leading/trailing spaces on Save (persist after reload, render as-is on storefront). Supersedes the "value gets trimmed on both ends" behavior above **for manual entry only**.
- Still trimmed (intended): **Auto translate** output; translations saved trimmed before the fix (no migration — merchant must re-enter).
- Whitespace-only value is now a real translation → storefront shows a blank title instead of falling back to the source.
- Language name is no longer trimmed on save either.
- Change covers the whole Save of the page (add/edit/delete language, delete row, all platforms) → regression surface is the entire screen, not just the value input.
- QA trap: HTML collapses leading/trailing spaces visually — verify whitespace via DOM text / API payload / stored JSON, never by eye.
- Whitespace-sensitive consumers to cover: storefront option title, product base name, variant name, Shopify translation sync, photo-upload sync between options whose titles differ only by spaces.
