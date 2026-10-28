# Translation Delivery: Inline vs API by Key Threshold (teeinblue, TIB-5352)

Signals: INP/page weight, "translations in Liquid", `translations/<locale>.json?v=...`, translation version hash, theme app extension translation dictionary, `pt-BR`/`zh-CN` locale.

## Confirmed behavior (dev comment TIB-5352)
- Per locale, count only translated keys with non-empty value: 0 -> original text, no request; below threshold (default 1000, env-configurable) -> dictionary inlined in HTML, no API call; >= threshold -> only version hash in HTML, SDK fetches API in parallel with campaign.
- API fail / >5s -> widget still renders with original text; SDK retries exactly once.
- Each save in portal generates a new version hash (cache-bust).
- Deploy order: SDK -> API (API first = locales >= threshold show original text). Theme app extension is order-independent.
- Embed (non-Shopify) still calls API as before, no version hash.

## Test focus
- Boundary 0 / 1 / 999 / 1000 / 1001 keys; empty values not counted; per-locale independence.
- Every flow that builds its own campaign: product page, cart edit modal, cross-sell, addon, cross-sell variant selector option/color labels.
- Locale switch, regional code secondary locale, secondary locale without translation, primary locale change.
- Portal save/edit/delete -> storefront refresh (no stale cache); delete locale -> Shopify translation updated.
- Network: API blocked/slow/5xx; dictionary printed once with "enable for all pages"/two blocks.
- Verify on real storefront, not theme editor preview.

## Open questions
- Is the threshold env value on staging default 1000? How can QA lower it for cheap testing?
- Existing shops stay in old format until next translation save — confirm acceptable.
