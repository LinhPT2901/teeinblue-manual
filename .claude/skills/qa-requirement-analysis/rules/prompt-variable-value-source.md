# Prompt Variable Value Source (teeinblue, TIB-5583)

Use when an issue is about **which value** a prompt variable `{{Layer title}}` resolves to: translated vs original value, wrong layer matched, title collision, template selector picked instead of a layer, AI prompt / ImagenHub template getting unexpected text. Pairs with [[layer-translation]], [[text-to-image-genai-layer]], [[imagenhub-template-variable-sync]].

## Context to recognize

- Prompt variables live in AI prompts (Text to Image, Gen AI image effect) and ImagenHub templates (Photo effect, Text to Image provider ImagenHub, Multiple Uploads). The SDK fills each one from the buyer's pick on a layer whose **title** matches the variable name.
- Dynamic Translations (Extras → Dynamic Translations) is a store-wide `original → translated` map per locale. The buyer form shows translated text; the value sent to generation is a separate path.
- Confirmed by dev (TIB-5583): sources that can fill a variable = **Text, Additional Option, JSON List** only. The artwork template selector ("Choose a design") is no longer a source.
- Confirmed by dev (TIB-5583): Additional Option + translation → generation receives the **original** value; form/preview/cart still show the translated one. Changing what gets sent makes images generated before the deploy stale, so the buyer has to generate once more.

## Answered by PO/Dev (TIB-5583, 2026-10-26)

- Scope is the **option value** only. A translated **option title** is out of scope.
- The fix covers **every consumer** that uses variables (all AI prompts, all ImagenHub templates).
- **Global Option** and **JSON List** sources also send the original value.
- Image swatch / color is only a display type of Additional Option, not a separate value path. No separate case needed.
- Switching locale after generating does **not** make the image stale.
- Order / design / export data: **unchanged** versus before the fix.
- Portal editor "+ Variable" does **not** list the template selector. The editor shows "no matching layer: <name>" when a variable refers only to the selector. The earlier answer "still lists" was corrected by the user on 2026-10-26 after checking it.
- When no layer matches, the storefront sends the **raw token** (e.g. `{{Design}}`) to the provider, does not block generation, and shows the buyer no warning. Accepted as-is (user, 2026-10-26).
- No merchant communication about removing the template selector as a source.
- Shipped to staging. No separate SDK bundle verification needed.

## Observed on staging (TIB-5583 test run, 2026-10-26)

- **JSON List items are NOT translated** on the storefront: the SDK runs only the field label through the dictionary. **By design** (user confirmed 2026-10-26). Do not write "translated JSON List value" cases.
- `{{City}}` inserted via "+ Variable" → "The whole item as JSON" puts the **whole JSON object** into the prompt; `{{City.name}}` gives only the name.
- The Portal "+ Variable" picker does not list Global Option layers (`{{Hat}}` had to be typed by hand). This is a known issue from TIB-5465.
- Generation endpoints for payload checks: `POST staging-api…/api/merchant/shopify/customer-uploads/generate` (T2I, ImagenHub `variables`, Gemini `prompt`); `POST upload-staging…/v1/shopify/genai-uploads` (Photo image_filter).
- Dictionary changes take about 1–2 minutes to reach the storefront. The SDK keeps the selected template in localStorage.

## Requirements to check

- Two separate translated things: the **option value** (what the buyer picks) and the **option title** (the variable key). A fix to one does not fix the other.
- Each consumer: Text to Image prompt, Text to Image + ImagenHub, Gen AI effect prompt, ImagenHub effect on Photo, Multiple Uploads + ImagenHub, Global Option layer (does a GO count as "Additional Option"?).
- Primary locale vs secondary locale; value with no dictionary entry; same value present in the dictionary for other layers.
- Title collision: layer title == template selector title → variable takes the layer value.
- Stale/regenerate logic: switching storefront locale after generating must not mark the image stale if the original value is unchanged.

## Risk Patterns

- Fix covers option values but the translated option **title** still breaks the match.
- Only one consumer is fixed (e.g. ImagenHub) while the GPT/Gemini prompt still gets the translated text.
- Global Option layers or Additional Option of the "image swatch/color" display type follow a different code path.
- Merchants who wrote templates against translated values break after deploy (dev: intended).
- Merchants who relied on the template selector as a variable source lose it without notice.

## Suggested Test Focus

- Capture the real generation request (network payload) — never judge only by the generated picture.
- Matrix: locale (primary / secondary with translation / secondary without entry) × source layer type × consumer.
- Locale switch after generating → stale warning behaviour.
- Template selector collision case, before/after.
- Regression: store without Dynamic Translations sends the same values as before.
