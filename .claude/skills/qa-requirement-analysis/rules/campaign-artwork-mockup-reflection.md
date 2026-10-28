# Campaign Artwork → Mockup Reflection (teeinblue)

Use this rule when an issue is about a campaign's artwork being added / replaced / removed and whether the campaign mockups (mockup editor, mockup thumbnails, published product images) reflect that change — especially after duplicating/cloning a campaign or product. Covers Boundless (`platform_products`), Shopify and Etsy campaigns.

## Confirmed facts (from TIB-5282 dev comment)

- Adding an artwork to a campaign does **not** auto-place it onto every mockup. A mockup shows the artwork only after "Add Artwork" was used inside **that mockup's editor** at least once (manual, per-mockup).
- "Reflect" fixes apply only to mockups that **already have** an artwork placement: replace → mockup shows the new artwork; remove (nothing replacing) → mockup shows no artwork.
- Boundless campaigns have **exactly one artwork per campaign**. Shopify/Etsy can have multiple artworks and per-variant assignment; fixes scoped to Boundless must not change Shopify/Etsy behavior.

## Things to clarify every time

- Does the expected behavior cover mockups that never had a placement? (Original bug reports often expect "all mockups" — dev scope may be narrower.)
- Placement of the new artwork: keep old transform (position/scale/rotation) or reset to default fit? What if the new artwork has a different size/ratio?
- Replace flow: is there a direct "change artwork" action, or only remove + add? Same result for both?
- Remove → re-add (same or different artwork): does the cleared mockup get the placement back, or must the user re-place?
- Where must the change be visible: mockup editor, campaign mockup list thumbnails, rendered mockup image, storefront/product images after publish/sync?
- Sync vs async (job/regenerate): instant, after reload, or after a re-sync?
- Duplicated campaign: changes in the copy must not touch the original (and vice versa).

## Risk patterns

- Mockup renders blank after replace (stale artwork reference / id points to removed artwork).
- Removed artwork keeps showing (placement not cleared).
- Duplicate shares references with the source → editing one breaks the other.
- Fix for single-artwork platform leaks into multi-artwork platforms (Shopify/Etsy per-variant mapping).
- Published listing images not regenerated even though editor shows correctly.

## Suggested test focus

- Placed vs never-placed mockups (multiple mockups in one campaign, mixed).
- Replace / remove / remove-then-add, on original and duplicated campaign.
- Isolation between source and duplicate.
- Visible surfaces: editor, list thumbnail, published images (if in scope).
- Regression on Shopify/Etsy: single artwork, multiple artworks, per-variant assignment.
