# Campaign Object Model & Relationships (teeinblue)

Use this rule for any teeinblue issue touching campaign, product base, variant, printarea, artwork, mockup, or the personalization form — especially features that map/navigate between form sections, artworks, and gallery mockups.

## Confirmed relationships (from TIB-5223 clarification)

- **Product base → printarea**: 1 product base has **many** printareas.
- **Variant → printarea**: 1 variant can be bound to **many** printareas (a variant belongs to one product base).
- **Printarea → artwork (within a campaign)**: **1 printarea maps to exactly 1 artwork** (1:1). An artwork is what shows as one section in the form.
- **Mockup ↔ printarea**: many-to-many. 1 mockup can hold **many** printareas; 1 printarea can appear on **many** mockups.
- **Ordering**: the **printarea order = the artwork order shown on the personalization form** (and therefore the order/index of navigation menu items). Index numbering follows printarea order.

## Derived facts for QA

- "Multiple artworks in the form" = a variant bound to **>=2 printareas** (each printarea = 1 artwork). This is the condition that enables the artwork-navigation feature (TIB-5223).
- Menu item name = **Product Base name + index**; since a variant is one product base, all items in one variant's form share the same base name, differentiated by index 1..n in printarea order.
- "First mockup containing the artwork's printarea" is meaningful because a printarea can live on multiple mockups → "first" needs an ordering rule (likely mockup order — confirm).
- A single mockup can belong to multiple artworks (holds multiple printareas) → gallery index for a shared mockup is ambiguous (confirm: one index vs multiple).

## Known conflicts / regression hotspots

- **Mobile sticky gallery**: on mobile there is a sticky gallery that **covers part of the form**. Any feature that scrolls the form to a section (e.g. artwork navigation) must offset for the sticky gallery height, or the target section/divider/first field gets hidden behind the gallery. Treat as a high-priority mobile edge case.
- **Variant switch**: switching to a variant bound to a different printarea set should rebuild the artwork list/order (nav items, indices). Verify no stale state.

## Open questions this model raises (still to confirm with PO/Dev)

- Exact "first mockup" ordering when a printarea is on multiple mockups.
- Gallery index behavior when one mockup carries printareas of multiple artworks.
- Whether index is strictly per-product-base or ever global (multi-base forms) — current model implies per product base by printarea order.
- Mobile scroll-offset handling vs sticky gallery.

## Suggested test focus

- Map each menu item → its single printarea/artwork (1:1) and verify order/index = printarea order.
- Printarea on multiple mockups → gallery lands on first mockup (verify ordering rule).
- Mockup shared by multiple artworks → gallery index correctness.
- Variant switch → nav rebuilds correctly.
- Mobile: nav-click scroll not hidden by sticky gallery; sticky nav + sticky gallery don't overlap.
