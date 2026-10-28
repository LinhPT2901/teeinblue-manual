# JSON List Layer Rules (teeinblue)

Use this rule when an issue mentions JSON layer / JSON List layer type, seller-provided JSON URL, searchable dropdown option, `option_template` / `{{key}}` display tokens, `default_value`, item `id`/`name`/`data` schema, Global Option variant of a field, layer dependency source, or reconciliation of a buyer's saved selection against a reloaded list. Pairs with [[text-to-image-genai-layer]] (TIB-5217), which injects a JSON item's data into a GenAI prompt.

## Context to recognize

A JSON List layer loads a seller-hosted JSON array (URL) and renders it as a **searchable dropdown** in the buyer form (form-only field — no visible layer on the canvas). Buyer sees `name`; the item's full `data` is what gets injected downstream (e.g. into a text-to-image prompt). Built to scale to thousands of options that don't fit "additional options" added one by one.

## Requirements to check

- **Source URL**: seller provides a URL. Must be `https://` (validated, non-https rejected, can't save). Fetched with the browser's native `fetch` (URL is seller-controlled, not the app's authenticated client). 15s fetch timeout. Response MUST be a JSON array → else "invalid response" error.
- **Item schema**: `id` (classify), `name` (shown as title + used for buyer search + the value stored to cart/order), `data` (injected downstream), extendable later.
- **Item hygiene**: items missing/empty `name` or with a **duplicate** `name` are skipped/deduped — **first occurrence wins**; rest still usable.
- **Option display template** (`option_template`, default `{{name}}`): renders `{{key}}` tokens against an item; multi-field allowed (e.g. `{{name}} — {{city}}`); missing/null keys render **blank**; content is **HTML-escaped** (no script/HTML injection). Same renderer used admin-preview and buyer SDK → outputs must match.
- **Default value**: name-based; matching item pre-selected on a fresh form; non-matching default is ignored (no crash, field starts empty).
- **Config fields (portal editor)**: personalization mode (own option vs existing Global Option), Option Title, JSON File URL, display template, Default value (searched live against JSON), input hint, required, show-in-cart, group name.
- **Global Option variant**: define once, reuse across products/campaigns; editing source URL/template on the Global Option propagates to all attached campaigns.
- **Storefront (SDK)**: loading state during fetch; search/filter by name; selecting updates artwork/preview via `option_template`; error state + **Retry** button (Retry busts per-URL in-memory cache and refetches); required → blocks add-to-cart/personalize until selected; cart/order value = selected item's `name` (not the full object). Error strings overridable via config translation keys.
- **Reconciliation**: on revisit, a saved selection is re-looked-up by `name` against the reloaded list and its data refreshed; if the item was **removed** from the JSON, the stale selection is **kept as-is, not cleared** (documented behavior — flag to PM if not desired UX). No current selection → apply `default_value` by name if it matches.
- **Dependency source**: JSON List `canBeDependency() = true` — usable as a condition source ("is any of" a subset of item names) to conditionally show/hide other fields; works in portal live preview and storefront.
- **Duplicate & Link**: JSON List is in `NO_SHARED_NEW_LAYER_TYPES` — cannot be duplicated-and-linked (SDK has no linked-layer transformer; a linked copy would silently fail to render). Normal independent duplication is unaffected.
- **Variable picker in AI-prompt**: `{{JSON List.attribute}}` token support was implemented then **reverted** on this branch — JSON List should NOT appear in the AI-prompt "+ Variable" picker yet (delivered in a separate PR).

## Impacted Areas

- Portal artwork editor: new "JSON List" layer type + layer-editor tab; Global Option definitions.
- `SingleDependency.vue` / layer-dependency system (JSON List as source).
- SDK storefront dropdown (`JsonListDropdown` wrapping `SearchableDropdown`), multiple platform bundles (default embed, Shopify v2, headless).
- Cart / order customization data + show-in-cart line.
- Seller's external JSON endpoint (availability, CORS, size, shape).
- AI-prompt Variable picker (regression: JSON List must NOT appear).
- Existing dependency types (additional-option, category, toggle) — regression.
- Duplicate & Link mechanism.

## Risk Patterns

- Non-array / malformed / slow (>15s) / unreachable / CORS-blocked seller JSON → error handling and Retry.
- HTML/script injection from item content into the dropdown label (must be escaped).
- Duplicate/missing `name` dedup: wrong item kept, or search collisions.
- Reconciliation: removed-item stale selection silently kept → buyer orders an option that no longer exists (documented but risky — flag).
- Global Option propagation misses some attached campaigns.
- Large list (thousands of items): dropdown/search performance, fetch payload size.
- Multi-bundle SDK divergence: works on default embed but breaks on Shopify v2 / headless.
- Cart stores full object instead of just `name`; show-in-cart toggle wrong.
- JSON List leaking into AI-prompt Variable picker (should be reverted/absent).
- Duplicate & Link not actually blocked → silent non-render on storefront.

## Open Questions To Consider

- Is "stale selection kept when item removed" the desired UX, or should it clear/warn? (dev flagged for PM)
- CORS / auth requirements on the seller's URL; behavior when the endpoint requires headers.
- Max list size supported before search/perf degrades; is there pagination/server-side search (later phase)?
- Case/whitespace sensitivity of name-based search, default-value match, and reconciliation lookup.
- Caching: per-URL in-memory cache TTL/scope; when does a buyer see updated seller data without Retry?
- What exactly is stored to order when `data` changes between selection and checkout.

## Suggested Test Focus

- URL validation matrix: non-https rejected; 404/unreachable; non-array; >15s timeout; valid array.
- Item hygiene: missing/empty name skipped; duplicate name deduped (first wins).
- Display template: multi-field render; missing key blank; HTML escaped (injection attempt); admin preview == storefront.
- Default value: matching pre-selects; non-matching ignored (no crash).
- Storefront: loading, search/filter, selection updates preview, error + Retry (cache bust), required blocks ATC, cart value = name.
- Global Option: attach to 2+ products, edit propagates to all.
- Reconciliation: item data updated → refreshes on revisit; item removed → stale kept (documented); no selection → default applied.
- Dependency: "is any of" show/hide in portal preview and storefront.
- Regression: AI-prompt Variable picker does NOT list JSON List; existing dependency types intact; multi-bundle SDK (default + Shopify v2/headless).
- Duplicate & Link blocked; normal duplicate works.
- Order/cart data + show-in-cart toggle.
