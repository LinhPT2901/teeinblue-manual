# QA Checklist A — Validate a Function on a Single Layer

> **Part of the [TeeInBlue Artwork 2.0 QA Checklist](artwork-2.0-qa-checklist.md).**
> Purposes: **A (this file)** · [B — a function across all supporting layers](qa-checklist-B-function-across-layers.md) · [C — a new layer type in a family](qa-checklist-C-new-layer-type.md)

## When to use this checklist

Use this when you are validating **one function on one specific layer** — e.g. "Drop shadow on the Text layer", "Crop into custom shape on Photo Upload". Scope is a single layer type + single capability.

> If the same function must be verified across **every** layer that supports it, use Checklist B instead.
> If you are validating a **brand-new layer type**, use Checklist C (which includes this per-function checklist as one of its steps).

Guiding principle:

> Do not test a function only by toggling its own setting. Check its UI/availability, configuration persistence, runtime/storefront output, and how it interacts with other layers on the same artwork.

---

## A1. Identify capability

- [ ] Identify the layer family: Text / Image / Vector / Map / Puzzle / Others / Form Elements.
- [ ] Identify the specific layer type.
- [ ] Identify which group the function belongs to:
  - [ ] Toolbar
  - [ ] Design settings
  - [ ] Populate values
  - [ ] Personalization
  - [ ] Conditional
  - [ ] Extra
  - [ ] Duplicate / Link
  - [ ] Bulk action
  - [ ] Convert
  - [ ] Template interaction
  - [ ] Artwork interaction

## A2. UI / availability

- [ ] The function appears for the correct layer type.
- [ ] The function does not appear when the layer does not support it.
- [ ] The function has the correct label / icon / control type.
- [ ] The default value is correct.
- [ ] The required / optional state is correct.
- [ ] The disabled state is correct when there is a dependency.
- [ ] A deprecated function is not used in place of the new flow.
- [ ] The function does not surface settings that do not belong to the layer type.

## A3. Configuration

- [ ] The function can be enabled / disabled.
- [ ] Valid values can be entered.
- [ ] Boundary values are handled correctly.
- [ ] Invalid values are validated correctly.
- [ ] Empty / null values are handled correctly.
- [ ] The default value renders correctly.
- [ ] Setting changes are reflected immediately on the Canvas / Preview when expected.
- [ ] Reloading / reopening the editor preserves the configuration.
- [ ] Save → reopen preserves the configuration.

## A4. Runtime / storefront

- [ ] The function works correctly in Live Preview.
- [ ] The function works correctly on the storefront.
- [ ] Customer input is handled correctly.
- [ ] The generated output is correct.
- [ ] The personalization form displays correctly.
- [ ] When the customer changes input, the canvas/output updates correctly.
- [ ] Refresh / reload does not lose input beyond the expected behavior.
- [ ] Cart / checkout receives the correct customization data when the function is relevant.
- [ ] Order Design receives the correct output.
- [ ] Mockup Preview receives the correct output.

## A5. Interaction with other layers

- [ ] The function works when the layer stands alone.
- [ ] The function works when the layer is placed together with other layers.
- [ ] The function does not alter other layers beyond the expected scope.
- [ ] Layer order / z-index is not affected beyond the expected behavior.
- [ ] Grouped layers still work correctly.
- [ ] Multi-select does not lose or corrupt the configuration.
- [ ] Conditional dependencies still work.
- [ ] Populate dependencies still work when the layer supports Populate.
- [ ] Shared / linked input is still correct when the layer supports Duplicate & Link.

## A6. Persistence / version

- [ ] Save.
- [ ] Save & Close.
- [ ] Reopen artwork.
- [ ] Duplicate artwork.
- [ ] Duplicate template.
- [ ] The function configuration remains correct after the actions above.
- [ ] The artwork version is created correctly.
- [ ] No side effects occur on other versions.

Note: each action creates an artwork version, but Logs only record a subset of changes such as layer add/remove and custom font changes; therefore do not use Logs as the sole source to verify persistence.

---

**See also:** [Checklist B — function across all supporting layers](qa-checklist-B-function-across-layers.md) · [Checklist C — new layer type](qa-checklist-C-new-layer-type.md) · [Combined master](artwork-2.0-qa-checklist.md)
