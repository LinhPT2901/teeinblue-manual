# Shopify Product Search / Picker Rules (teeinblue)

Use this rule when an issue touches searching or filtering Shopify products/variants: product picker in "Campaign by Shopify", attach product to campaign, product sync list, or any change to the search query string sent to Shopify Admin API.

## Context to identify

- Which picker/screen is affected (Campaign by Shopify picker, attach-product, product sync list, order product lookup).
- Whether the change is backend-only (query string) or also frontend (new input, new column, badge).
- Whether the same request class / API endpoint feeds **more than one** screen — a query-string change is global to every consumer.

## Shopify search-query semantics to check

The portal forwards the keyword to **Shopify's own search engine** — behaviour must be compared against Shopify Admin's product search, not assumed. Verified on TIB-5018 (2026-08-21):

- SKU is **tokenised on non-alphanumeric separators** (`-`, `_`, `/`), and each query token **prefix-matches any SKU token**; all query tokens must match (AND).
  - `RED-XL-20260820`: `20260820` matches, `XL` matches, `BROWN` matches, `2026` matches.
  - `0820`, `260820`, `KU-1` do NOT match — not a segment prefix.
  - `RED-XL-202608201` → 0: one non-matching token voids the whole query.
- Do **NOT** write "SKU is prefix-match only, so a middle/end substring cannot match" — that is wrong and will fail a correct build. Verify against Shopify Admin before asserting any matching rule.
- `title:*term*` is contains-match on the title.
- Combined clauses must be parenthesised — `(title:*t* OR sku:t*)` — otherwise a later `AND status:active` binds only to the last OR branch.
- Matching is case-insensitive (verified).
- The term is interpolated into the template unescaped, so a `"` can restructure the query. Assess impact before calling it a vulnerability: if the tenant is fixed by an id in the **URL path** and everything reachable is the merchant's own catalogue (visible anyway by clearing the box), it is a low-priority hardening note, not a security defect. Shopify Admin itself accepts `sku:`-style syntax from users.

## Data-shape traps

- Search matches **any variant's** SKU, but list responses often select only the **first variant** (`origVariants(first: 1)`). A product matched via variant #3 will display variant #1's SKU → user sees a SKU that doesn't contain the searched term. Always raise this mismatch.
- Products with empty/null SKU must not crash or be matched by an empty term.
- Deleted/draft/archived products and products already used by another campaign — confirm whether they are filtered out before or after the search clause.

## Impacted areas

- Product picker search box (debounce, min length, clear/reset).
- Status filter + search combination.
- Cursor-based pagination with an active search term (page 2 must keep the term).
- Any other screen sharing the same request class/endpoint.
- Shopify API rate limits with rapid typing.

## Risk patterns

- Regression on title search after adding the OR clause (results widen or narrow unexpectedly).
- Filter leak: status/other filters stop applying when a search term is present.
- Pagination losing the search term or returning duplicates across pages.
- User confusion when the matched SKU is not visible anywhere in the UI.
- Unescaped special characters producing a 400/empty list instead of "no results".

## Open questions to consider

- Should the matched SKU be displayed in the picker row? If yes, which variant's SKU when the product has many?
- Does the actual token-prefix matching cover the customer's SKU scheme? (Often it does — check before escalating.)
- Does the change apply to every consumer of the endpoint or only this picker?
- Minimum character count / debounce before firing search?
- Exact-match priority: should an exact SKU hit rank first in results?

## Suggested test focus

- Full SKU, segment prefix, prefix of a segment, and a non-prefix substring (expect no match); lowercase/uppercase.
- Compare any surprising result against the same term in Shopify Admin before logging a defect.
- Title search regression (contains-match still works, partial word, accented/unicode).
- Term matching both a title and another product's SKU → both returned, no duplicates.
- Search + status filter + pagination combined.
- Special characters and spaces in SKU; SKU with leading zeros.
- Multi-variant product matched by a non-first variant's SKU → verify what is displayed and that the product is selectable/usable in campaign creation.
- Empty result state, clearing the search box restores the full list.
