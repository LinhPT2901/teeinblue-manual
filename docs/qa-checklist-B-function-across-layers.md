# QA Checklist B — Validate a Function Across All Layers That Support It

> **Part of the [TeeInBlue Artwork 2.0 QA Checklist](artwork-2.0-qa-checklist.md).**
> Purposes: [A — a function on a single layer](qa-checklist-A-single-layer-function.md) · **B (this file)** · [C — a new layer type in a family](qa-checklist-C-new-layer-type.md)

## When to use this checklist

Use this when a function must be validated across **every layer type that supports it** — the regression view. Example:

> Feature: `Duplicate & Link`

Do not test only the Text layer and conclude the feature is fine. Take **every layer type that supports the feature**, run the same capability checklist (see [Checklist A](qa-checklist-A-single-layer-function.md)) on each, and confirm the non-supporting layers correctly do NOT expose it.

---

## B1. Build the feature coverage matrix

- [ ] Identify the function to test.
- [ ] List all layer types that support the function.
- [ ] List the layer types in the same family that do NOT support the function.
- [ ] Identify layer types with special behavior.
- [ ] Identify layer types with opposite behavior.

Example for Duplicate & Link:

| Family | Layer type | Expected |
|---|---|---|
| Text | Text | Linked |
| Text | Curve text | Linked |
| Text | Paragraph | Plain |
| Image | Photo Upload | Linked |
| Image | Static Image | Linked |
| Image | Dynamic Clipart | Plain |
| Vector | All | Plain |
| Map | Maps | Linked |
| Map | Route Maps | Linked |
| Map | Star Maps | Plain |
| Map | Moon phase | Linked |
| Puzzle | Word Search | Plain |
| Puzzle | Scrabble | Linked |
| Others | Calendar | Linked |
| Others | QR Code | Plain |
| Others | Song Search | Plain |
| Form Elements | All | Plain |

These differences are documented in each family's capability matrices.

## B2. Test positive cases

For each layer that supports the function:

- [ ] The function appears.
- [ ] The function can be executed.
- [ ] The expected result occurs.
- [ ] Data is shared / propagated correctly.
- [ ] The UI indicator is correct.
- [ ] Reopening the artwork is still correct.
- [ ] Live Preview is correct.
- [ ] Storefront is correct.
- [ ] Cart / checkout / order design is correct when relevant.

## B3. Test negative cases

For layers that do NOT support the function:

- [ ] The function does not appear; or
- [ ] The function appears but is correctly disabled.
- [ ] The function cannot be triggered through a UI workaround.
- [ ] No side effect occurs when the layer is duplicated.
- [ ] No shared state is created by mistake.

Example:

`Star Maps` must be a plain duplicate, while Maps / Route Maps / Moon phase support linked copy.

## B4. Cross-family consistency

- [ ] The same function in a different family behaves the same for the generic part.
- [ ] Family-specific behavior is preserved.
- [ ] A capability from another family is not applied by mistake.

Example:

`Populate values` should not be treated as a simple "supported / not supported" boolean. Vector can only Populate `Color`, whereas Text can Populate `Content / Font / Color / Background`.

---

## B5. Bulk action coverage (when the function is exposed in multi-select)

If the function is also available as a bulk/multi-select action, verify it there too:

- [ ] Select two layers that both support the function → action works on both.
- [ ] Select a supporting + a non-supporting layer → action is disabled or applies only to the valid layers, per design.
- [ ] Unsupported actions are disabled and not exposed by mistake.

Bulk actions are grouped by capability: Align / Transform / Group / Duplicate / Delete are common; Bulk edit default text is text-family only; Replace image / clipart / group and Convert have their own scope.

---

## The cross-layer principle (why this checklist exists)

When a layer adds a new capability that other layers also implement, do not only test it on that one layer. Turn the feature into a **Cross-Layer Feature Checklist** and regression it across every layer that supports the capability.

Example:

`New Layer X` adds the ability to `Populate Background`

→ Don't only test `X → Background`, but also:

`Text → Background`
`Curve → Background`
`Paragraph → Background`
`X → Background`
`Existing option → X`
`X → another layer`
`X + Conditional`
`X + Global Template`

This turns the checklist into a **living QA matrix** instead of a static list you edit by hand each time a layer is added.

> **Test bucket for this activity:** `TC-02 Cross-Layer Feature` → `[Feature] - All Supported Layer Types`
> Examples: `[Conditional] - All supported layer types` · `[Populate] - All supported layer types` · `[Duplicate & Link] - All supported layer types`.

---

**See also:** [Checklist A — a function on a single layer](qa-checklist-A-single-layer-function.md) · [Checklist C — new layer type](qa-checklist-C-new-layer-type.md) · [Combined master](artwork-2.0-qa-checklist.md)
