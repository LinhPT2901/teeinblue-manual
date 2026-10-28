# Customization callback payload: `design_url(s)` per artwork

Use this rule when an issue touches the **`onCustomizationCreated` callback** (embed `postMessage` or open-platform `window.teeinblue.onCustomizationCreated`), the **customization submission payload**, or exposing **per-artwork design/print files** to a merchant's integration — keywords: `design_url`, `design_urls`, `onCustomizationCreated`, `customization object data`, `print file`, `design_format`, multi-artwork customization.

## Context to recognize

- A **customization** can bundle multiple artworks (e.g. via the multi-artwork Quick Navigation feature, see [[form-artwork-navigation]] / [[campaign-object-model]]). Historically the callback only ever returned **one** `design_url`, built from the **first artwork only**, following the pattern `designs/{customizationId}/{customizationId}-{artworkId}.{ext}`.
- Merchants/fulfilment partners need **one print file per artwork** (e.g. per garment in a matching-set product). Client integrations read this from the JS callback, not from a server API — so this is primarily an **SDK/front-end payload** change, not necessarily a backend data model change.
- An **interim/manual workaround** exists: derive artwork ids from the customization object data — keys shaped like `artwork-<n>` hold the artwork id as their value; any value starting with `template` marks its own key as an artwork id. Don't confuse this workaround convention with the actual fix; it's a fallback for merchants until `design_urls` ships.

## Requirements to check

- `design_urls` (plural, array) is present, **one URL per artwork**, in the **same order as the artworks appear in the product/form** — confirm this order is printarea order (per [[campaign-object-model]]), not artwork-creation order.
- Each URL keeps the existing pattern `designs/{customizationId}/{customizationId}-{artworkId}.{ext}`, with `{ext}` matching **that artwork's own** `design_format` (don't assume all artworks in one customization share the same format).
- `design_url` (singular) **still present, unchanged**, equal to `design_urls[0]` — backward compatibility for existing single-artwork integrations is a hard regression requirement, not a nice-to-have.
- Verify on **both** delivery mechanisms if the app supports both: embed `postMessage` and open-platform `window.teeinblue.onCustomizationCreated` — a fix landing in only one is a common miss.
- Each returned URL must actually **resolve to the correct print file** for its artwork (not just be well-formed).

## Impacted Areas

- teeinblue-sdk repo: callback/event payload builder (embed + open platform). — Confirmed (this is where such a fix ships)
- Any server-side Customization API/webhook that a merchant backend might call **by customization id** instead of using the client callback — check separately; a client-side callback fix does not automatically mean a backend API was also updated. — Need Dev/PO confirmation
- Admin/portal views of a customization/instance. — usually out of scope unless stated
- Single-artwork customizations (regression). — Confirmed must be unaffected

## Risks

- Order mismatch between `design_urls` and the actual artwork/garment order → merchant sends the wrong print file to the wrong item (fulfilment mistake, high business impact, hard for QA to catch by just checking "array is non-empty").
- Extension/format assumed uniform across artworks when it isn't.
- Partial failure: one artwork's design fails to generate — undefined whether it's omitted, null, or blocks the whole array; untested by default.
- Manual-only test plans (no automated payload-shape test) regress silently on the next SDK refactor.
- QA verifying only on local dev server (`yarn dev`) may miss issues specific to the real embed/open-platform runtime used by the actual merchant.

## Suggested Test Focus

- Multi-artwork product (2+, and 3+ to check scaling) → submit → verify `design_urls` array: length, order, URL pattern, extension per `design_format`.
- Single-artwork regression: `design_url` and `design_urls[0]` unchanged vs. pre-fix behavior.
- Both embed and open-platform delivery paths.
- Resolve every URL and confirm it's the correct file for that specific artwork (not just artifact-1's file repeated).
- Mixed `design_format` across artworks in the same customization, if the platform allows it.
- Ask Dev whether a failed/partial artwork design generation is in scope before assuming happy-path only.
