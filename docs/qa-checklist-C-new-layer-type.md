# QA Checklist C — Validate a New Layer Type Added to a Family

> **Part of the [TeeInBlue Artwork 2.0 QA Checklist](artwork-2.0-qa-checklist.md).**
> Purposes: [A — a function on a single layer](qa-checklist-A-single-layer-function.md) · [B — a function across all supporting layers](qa-checklist-B-function-across-layers.md) · **C (this file)**

## When to use this checklist

Use this when a **brand-new layer type** is added to a family (e.g. "Word Cloud" under Puzzle). This is the widest-blast-radius activity.

Guiding principle:

> Do not test a new layer type only by exercising its own new settings. You must also test the behavior inherited from its family, the cross-layer features the layer participates in, and its behavior at the Template / Artwork level.

This checklist reuses:
- [Checklist A](qa-checklist-A-single-layer-function.md) — run per new function the layer introduces.
- [Checklist B](qa-checklist-B-function-across-layers.md) — when the new layer adds a capability other layers also support, regression it across all of them.

---

# C1. Define the identity of the new layer

- [ ] Which family does the layer belong to?
- [ ] Which behaviors does the new layer inherit from the family?
- [ ] Does the layer share a rendering model with any existing layer?
- [ ] Does the layer share a customer-input model with any layer?
- [ ] Does the layer share a toolbar model with any layer?
- [ ] Does the layer have entirely new behavior?
- [ ] Which existing type is the layer most similar to?

Example:

> New type `X` belongs to the Image family and has customer-upload input.

Do not just ask "what toolbar does X have?" — you must determine:

`X ≈ Photo Upload` for the input model
`X ≈ Static Image` for rendering
`X ≈ Dynamic Clipart` for generated content

→ The checklist should then be the union of the risk areas of those similar types, minus the capabilities that are not applicable.

---

# C2. FAMILY INHERITANCE CHECK

## C2.1. Toolbar

If the family has a visual toolbar:

- [ ] Transform
- [ ] Align
- [ ] Family-specific toolbar
- [ ] Resize
- [ ] Position
- [ ] Rotation
- [ ] Family-specific cosmetic controls
- [ ] Unsupported controls do not appear.

Example: the Image family currently has Transform / Align / Shape Cut / Border / HD. The Vector family has Transform / Align / Color / Shape-Border. Form Elements have no design toolbar because they are not rendered on the Canvas.

## C2.2. Design settings

- [ ] The layer has the correct family Design settings group.
- [ ] The default configuration is correct.
- [ ] Family-level settings work.
- [ ] Non-applicable settings do not appear.
- [ ] Default value → rendered output is correct.
- [ ] Change setting → output is correct.

## C2.3. Populate values

- [ ] Determine whether the layer supports Populate.
- [ ] Determine the data types that can be populated:
  - [ ] Content
  - [ ] Font
  - [ ] Color
  - [ ] Background
  - [ ] Family-specific data
- [ ] A source option can be selected.
- [ ] Browse values works.
- [ ] Value mapping is correct.
- [ ] Source changes → target updates.
- [ ] Multiple target layers all receive the source correctly.
- [ ] Circular dependencies are handled correctly if the system allows creating them.

Do not assume that every layer with Populate supports the same data types. For example, Vector accepts only `Color`, whereas Text has `Content / Font / Color / Background`.

## C2.4. Personalization

- [ ] Is "No personalization" correct?
- [ ] Is "Create new option" correct?
- [ ] Is "Use existing global option" correct?
- [ ] Quick-fill works.
- [ ] Option Title.
- [ ] Placeholder.
- [ ] Default / prefill.
- [ ] Required.
- [ ] Instruction.
- [ ] Show customization data on cart/checkout.
- [ ] Attach customer input for fulfillment when applicable.
- [ ] Custom class.

> ⚠️ **Default values are shop config, not constants.** Before reporting "field X defaults to the wrong
> value", check the shop's `default_value` config. A shop with `default_value: { show_in_cart: true }`
> makes every new layer start with `Show customization data on cart/checkout` already ON — that is the
> config talking, not a code defect. This applies to layer panels and global options alike.
> Only when the key is absent from the shop config is the observed default coming from code.
> Hit for real on TIB-030 / TIB-5315 (a false FAIL on "toggle OFF by default"). See Rule 14 in
> `.claude/tib-portal-flows.md`.

This is a shared configuration frame, but not every layer exposes all fields.

## C2.5. Conditional

- [ ] The Conditional section appears correctly.
- [ ] A source option can be selected.
- [ ] The condition follows the correct value.
- [ ] Show case.
- [ ] Hide case.
- [ ] Default state.
- [ ] Multiple conditions when applicable.
- [ ] Condition changes → the layer renders/unrenders correctly.
- [ ] Condition + Populate work together.
- [ ] Condition + Personalization work together.
- [ ] Condition works after reload.

Conditional is a very important cross-layer capability because it exists across many families, but there are exceptions: for example, Dynamic Clipart by Text has no Conditional section.

## C2.6. Extra

- [ ] Display on:
  - [ ] Mockup Preview & Order Design
  - [ ] Mockup Preview only
  - [ ] Order Design only
  - [ ] None
- [ ] Group name.
- [ ] Rendering is correct for each mode.
- [ ] Group behavior is correct.

## C2.7. Duplicate / Share

- [ ] Plain Duplicate.
- [ ] Duplicate & Link when applicable.
- [ ] The linked icon appears correctly.
- [ ] Customer input is shared correctly.
- [ ] Change source → the linked copy updates.
- [ ] The linked copy does not share when the type does not support it.
- [ ] Deleting one copy does not lose the remaining copy.
- [ ] Reopening the artwork preserves the relationship.

---

# D. WORK WITH EXISTING TEMPLATE FEATURES

## D1. Template-level compatibility

- [ ] Add the new layer to a new template.
- [ ] Add the new layer to an existing template.
- [ ] Add multiple new layers of the same type.
- [ ] The new layer coexists with each family:
  - [ ] Text
  - [ ] Image
  - [ ] Vector
  - [ ] Map
  - [ ] Puzzle
  - [ ] Others
  - [ ] Form Elements
- [ ] Group the new layer with other layers.
- [ ] Re-order layers.
- [ ] Hide/show the layer.
- [ ] Duplicate a template containing the new layer.
- [ ] Delete a template containing the new layer.
- [ ] Import a template that has the new layer.
- [ ] A template with the new layer is selected on the storefront.

An artwork can contain multiple templates and the customer selects a template on the storefront, so the new layer should not be tested only within a single template.

## D2. Global Template compatibility

If the new layer can live inside a Global Template:

- [ ] Convert template → Global Template.
- [ ] The new layer appears in the Normal Template.
- [ ] The new layer is locked correctly for the parts that must be locked.
- [ ] Transform works correctly.
- [ ] Align works correctly.
- [ ] Cosmetic controls work correctly.
- [ ] Structural controls are correctly locked.
- [ ] Identity / configuration is not changed from the Normal Template.
- [ ] Content is not changed beyond the expected behavior.
- [ ] Personalization wiring is not changed.
- [ ] Populate wiring is not changed.
- [ ] Conditional wiring is not changed.
- [ ] Convert Global → Normal still preserves the configuration.

The current rule is that a Normal Template can reposition / resize / align and change some cosmetic controls of a global layer, but must not change the identity / structure / font family or the wiring that belongs to the Global Template.

## D3. Form Mode compatibility

- [ ] The new layer creates the correct personalization option.
- [ ] The option appears correctly in Form Mode.
- [ ] The option title is correct.
- [ ] The placeholder is correct.
- [ ] The required behavior is correct.
- [ ] The default value is correct.
- [ ] The option can be re-ordered.
- [ ] Re-ordering does not change the Canvas layer order.
- [ ] Form Preview is correct.
- [ ] Live Preview is correct.

Note: Form Mode `Re-order` is the order of options on the storefront, not the order of layers on the Canvas.

---

# E. WORK WITH EXISTING CROSS-LAYER FEATURES

## E1. Populate

- [ ] New type → existing option.
- [ ] Existing layer → new type.
- [ ] New type → new type.
- [ ] One source → multiple targets.
- [ ] Multiple source types.
- [ ] Source value changes.
- [ ] Source deleted.
- [ ] Source duplicated.
- [ ] Source is a global option.
- [ ] Source belongs to another layer.
- [ ] Reload / reopen.

## E2. Conditional

- [ ] Existing Toggle → new layer.
- [ ] Existing Additional Option → new layer.
- [ ] Text option → new layer when applicable.
- [ ] New layer option → existing layer.
- [ ] New layer option → multiple existing layers.
- [ ] Nested dependency.
- [ ] Condition + Populate.
- [ ] Condition + Global Template.
- [ ] Condition + duplicated layer.

Form Elements are especially important here because Toggle and Additional Option are designed for other layers to depend on them via Conditional.

## E3. Duplicate / Link

- [ ] New layer duplicates itself.
- [ ] New layer duplicates an existing layer.
- [ ] Existing linked layer + new layer.
- [ ] New layer + existing linked layer.
- [ ] New layer supports Link → verify shared input.
- [ ] New layer does not support Link → verify plain copy.
- [ ] Delete the original.
- [ ] Delete the copy.
- [ ] Change input after duplication.

---

# F. WHEN THE NEW TYPE IS SIMILAR TO AN EXISTING TYPE

When the new layer behaves like an existing type, **do not mechanically copy the old type's entire checklist**. Determine the following:

### F1. Similarity matrix

| Dimension | New Type | Existing Type | Reuse checklist? |
|---|---|---|---|
| Rendering | Same / Different | Existing type | Yes/No |
| Customer input | Same / Different | Existing type | Yes/No |
| Toolbar | Same / Partial | Existing type | Yes/Partial |
| Personalization | Same / Partial | Existing type | Yes/Partial |
| Populate | Same / Different | Existing type | Yes/No |
| Conditional | Same / Different | Existing type | Yes/No |
| Duplicate/Link | Same / Different | Existing type | Yes/No |
| Generated output | Same / Different | Existing type | Yes/No |
| Global Template | Same / Different | Existing type | Yes/No |

### F2. If similar on INPUT

Example: the new type accepts customer upload like Photo Upload:

- [ ] Upload a valid file.
- [ ] Invalid file.
- [ ] Empty upload.
- [ ] Replace the uploaded file.
- [ ] Re-upload.
- [ ] Large file.
- [ ] Unsupported format.
- [ ] Customer input persistence.
- [ ] Preview.
- [ ] Order Design.
- [ ] Cart / checkout.
- [ ] Required.
- [ ] Conditional.
- [ ] Duplicate / Link.

But do not automatically conclude that the new type must have a Photo Cropper / Reposition / custom mask. Those are **type-specific** functions, not full family inheritance. Photo Upload currently has Direct upload / Cropper / Reposition and custom-shape masking.

### F3. If similar on OUTPUT

If the new layer also generates visual output:

- [ ] Same input → expected output.
- [ ] Different input → output changes.
- [ ] Output size.
- [ ] Position.
- [ ] Scaling.
- [ ] Rotation.
- [ ] Mask / Shape.
- [ ] Border.
- [ ] HD / quality when applicable.
- [ ] Preview vs Order Design.
- [ ] Generated asset persistence.

### F4. If similar on STRUCTURE

If the new layer is structured like Text / Puzzle:

- [ ] Font.
- [ ] Font size.
- [ ] Color.
- [ ] Alignment.
- [ ] Spacing.
- [ ] Background.
- [ ] Structural layout.
- [ ] Input validation.
- [ ] Character / word limit.
- [ ] RTL.
- [ ] Generated layout.

Do not assume that "has text" is enough to inherit the entire Text capability. For example, Scrabble has Content / Font / Color / Background but Word Search only populates Content; Scrabble also has its own cell-layout behavior.

---

# G. BULK ACTION CHECKLIST

When adding a new layer type, testing multi-select is mandatory.

- [ ] Select 2 new layers.
- [ ] Select new type + same-family type.
- [ ] Select new type + different-family type.
- [ ] Transform.
- [ ] Align.
- [ ] Group.
- [ ] Duplicate.
- [ ] Delete.
- [ ] Conditional.
- [ ] Family-specific bulk action.
- [ ] Unsupported actions are disabled.
- [ ] No bulk action is exposed by mistake.

Bulk actions are currently grouped by capability: Align / Transform / Group / Duplicate / Delete are common; Bulk edit default text is for the text family only; Replace image / clipart / group and Convert also have their own scope.

---

# H. ARTWORK-LEVEL REGRESSION

After validating the new layer:

- [ ] Artwork Save.
- [ ] Save & Close.
- [ ] Reopen.
- [ ] Live Preview.
- [ ] Form Preview.
- [ ] Form Re-order.
- [ ] Undo.
- [ ] Redo.
- [ ] Zoom.
- [ ] Grid / Snap.
- [ ] Rename artwork.
- [ ] Duplicate artwork.
- [ ] Artwork version increments correctly.
- [ ] Archive / Unarchive.
- [ ] Import to Translation when the layer has text / translatable data.
- [ ] Delete artwork.
- [ ] Export / generated output.
- [ ] Verify the artwork format is appropriate for the layer.

For Vector especially, check the design format of the Artwork: SVG / EPS keep true vector while PNG / JPEG rasterize the output.

---

# I. DECISION TREE FOR A NEW LAYER TYPE

When a dev adds a layer type, QA can follow this flow:

**1. Which family does the layer belong to?**
→ Text / Image / Vector / Map / Puzzle / Others / Form Elements

↓

**2. Which family capabilities does it inherit?**
→ Toolbar → Design → Populate → Personalization → Conditional → Extra → Duplicate → Bulk

↓

**3. Which existing layer type is it similar to?**
→ Reuse the corresponding capability checklist

↓

**4. Where does it differ from the old type?**
→ Create a **Unique Behavior checklist**

↓

**5. Which features does it interact with?**
→ Populate → Conditional → Global Option → Duplicate / Link → Group → Template → Global Template → Form Mode

↓

**6. Does it affect the Artwork / Template?**
→ Save → Duplicate → Template switch → Global Template → Live Preview → Storefront → Order Design

↓

**7. Regression matrix**

- [ ] Same family
- [ ] Different family
- [ ] Similar type
- [ ] Opposite-capability type
- [ ] Global layer
- [ ] Normal layer
- [ ] Multiple templates
- [ ] Multiple layers
- [ ] Storefront

---

# J. TEST BUCKETS TO USE IN THE TEST CASE SYSTEM

Instead of one huge test case per layer, categorize:

### TC-01 — Layer Capability
`[Layer Type] - [Function]` — e.g. `[Photo Upload] - Crop into Custom Shape`, `[Maps] - Duplicate & Link`.

### TC-02 — Cross-Layer Feature
`[Feature] - All Supported Layer Types` — e.g. `[Conditional] - All supported layer types`. (See [Checklist B](qa-checklist-B-function-across-layers.md).)

### TC-03 — New Layer Type Compatibility
`[New Type] - Family Compatibility` — family inheritance, similar-type behavior, unique behavior, cross-layer interaction, bulk action, Global Template.

### TC-04 — New Layer Type Regression
`[New Type] - Artwork / Template Regression` — save/reopen, duplicate artwork, duplicate template, multiple templates, Global Template, Form Mode, Live Preview, storefront, Order Design.

---

# K. THE MOST IMPORTANT PRINCIPLE

When a new layer appears, QA should **not ask** "What settings does this layer have?" Instead, ask these 5 questions:

1. **Which family does it belong to, and which behaviors must it inherit?**
2. **Which cross-layer features is it implementing?**
3. **Which existing type is it similar to, and where does it differ?**
4. **How does it interact with Template / Global Template / Artwork?**
5. **Does it create a new capability that other layers also need to be regression-tested for?**

If the answer to question 5 is **Yes**, don't just create a test case for the new layer. Turn that feature into a **Cross-Layer Feature Checklist** ([Checklist B](qa-checklist-B-function-across-layers.md)) and regression it across every layer that supports the capability. This is how the checklist becomes a **living QA matrix** instead of a static list edited by hand each time a layer is added.

---

**See also:** [Checklist A — a function on a single layer](qa-checklist-A-single-layer-function.md) · [Checklist B — function across all supporting layers](qa-checklist-B-function-across-layers.md) · [Combined master](artwork-2.0-qa-checklist.md)
