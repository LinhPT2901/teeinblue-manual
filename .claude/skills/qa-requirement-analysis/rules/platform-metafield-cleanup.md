# Platform metafield cleanup on unpublish/delete (teeinblue)

Use for issues where teeinblue writes/removes data on the merchant's platform product (Shopify metafields) when a campaign is published, unpublished, deleted, archived or synced. First seen: TIB-5505.

## Context to recognise
- Two campaign models: Campaign by Product Base (unlink deletes the Shopify product) vs Campaign by Shopify / PlatformProduct (Shopify product belongs to the merchant and must be kept).
- Metafields seen so far: `$app:teeinblue.campaign` (Campaign data, app-reserved), `teeinblue.platform_product`, `teeinblue.addon_variants`. Each one can behave differently per action — build a matrix action × metafield.
- Cleanup usually runs in a queue job → asynchronous, needs a wait and a failure path.

## Requirement to check
- Which actions trigger cleanup: unpublish (detail page, bulk, MCP tool), delete (single, bulk), archive, unlink product, uninstall app.
- Which metafields are removed vs kept per action; product, variants, images, other apps' metafields must stay.
- Re-publish restores the metafield and storefront works again.
- Idempotency: delete after unpublish, double unpublish, Shopify product already deleted, token revoked, 429.
- Data written before deploy: cleaned or not (usually not → known limitation).

## Risks
- `$app:` namespace is app-reserved: Shopify admin/GraphiQL of another app resolves `$app` to *its own* app id → QA can get a false "metafield gone". Agree on a verification channel (teeinblue token, debug endpoint, full `app--<id>--teeinblue` namespace).
- Same Shopify product linked by more than one campaign/store → cleanup of one may wipe data of another.
- Storefront/theme cache after metafield removal; existing carts/orders/Edit customization referencing the removed campaign.

## Suggested test focus
- Matrix action × metafield, verified on the real store via an agreed channel.
- Unpublish → republish round-trip; delete published vs delete already-unpublished.
- Error/idempotent paths of the queue job.
- Regression: required addon (`addon_variants`), Edit Activities / Publication History. Do NOT add Product Base cases when the issue states "Campaign by Shopify only" (user feedback, TIB-5505).
