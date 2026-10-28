# ImagenHub Template Variable Sync (teeinblue)

Use when an issue mentions ImagenHub template variables, variable list being outdated/stale, "reselect template", option title not matching a variable, or warnings about ImagenHub variables in the artwork editor (from TIB-5465).

## Context to recognize

ImagenHub templates expose variables. Teeinblue stores a snapshot of that variable list on the artwork layer that uses the template. On the storefront, a variable gets data from a layer whose title matches the variable name. If the snapshot is stale, the storefront sends no data for the new names and nothing tells the seller why.

Layers that can hold an ImagenHub template: Photo/Clipart with an ImagenHub effect, Text to Image (provider = ImagenHub), Multiple Uploads (provider = ImagenHub), and Global Option layers (template lives in the Global Option itself).

Note (TIB-5465, user confirmed 2026-10-21): ImagenHub is an AI photo-processing service, so its effect applies **only to photo uploads**. A Clipart layer has no "Image effects" setting. When a dev comment says "Photo/Clipart", do not write a Clipart case; test only the Photo layer.

Note (TIB-5465, dev confirmed 2026-10-21): the per-field warning and the "+ variable" button in the prompt do not recognise the **title of a Global Option layer**. They take the layer name, so the SDK cannot find the variable. This bug also exists on prod. The warning box at the top of the canvas does match by the Global Option title. Matching uses the **Option Title**, not the layer name (observed in TC-004). Always add a case where the Global Option layer name differs from its title.

## Requirements to check

- When the sync runs (on editor open only? also on reselect?) and which layer types it covers.
- Does the refreshed list persist without Save? (TIB-5465: no — only after Save; it does not mark artwork dirty.)
- Warning content: added/removed variables per layer; "no matching layer" per artwork template.
- Matching rule: which layer types count as a match (TIB-5465: Text, Additional Option, JSON List; Global Option via its own title). Case/whitespace sensitivity.
- Per-template check when the artwork has multiple templates (storefront only uses the selected template's layers).
- Template unreachable / deleted / API error → notice + variables untouched.
- Out of scope surfaces: API/MCP edits, Global Option editor.

## Impacted Areas

- Artwork editor (portal): load flow, warning box, Save, Cancel, History preview.
- Per-field warnings in ImagenHub template field and Gen AI / Text to Image prompt fields.
- Storefront SDK: data sent to ImagenHub prompt after Save (campaign cache cleared by Save).
- ImagenHub API integration (fetch template variables).

## Risk Patterns

- Save before refresh finishes → old variables saved silently.
- Refresh not persisted but no dirty flag → Cancel without prompt; seller thinks it's fixed.
- False "no matching layer" for case/whitespace differences, or false match against Photo layer titles.
- Many templates → slow open / rate limit against ImagenHub.
- Warning stays after fix, or never clears after Save.

## Suggested Test Focus

- Rename / add / remove variable in ImagenHub → open editor → warning content → Save → storefront sends data.
- Not saving → next open shows the same notice.
- Each layer type carrying a template; Global Option excluded.
- Match rule by layer type; multi-template artwork.
- Unreachable template; dismiss ×; History preview hides box; Cancel after open.
