# Text-to-Image / GenAI Layer Rules (teeinblue)

Use this rule when an issue mentions Text-to-Image layer, GenAI / Gen AI, AI image generation, providers (Gemini, GPT-Image, Flux / Flux Kontext, ImagenHub), prompt variables `{{Layer name}}`, JSON-layer sub-key `{{Layer.key}}`, "Generate/Regenerate" button, reference image, effects after generating, or a buyer-side "needs regenerate / stale image" warning.

## Context to recognize

A Text-to-Image layer replaces a photo-upload slot: the buyer presses **Generate** and a GenAI provider renders an image from a seller-written prompt. Output fills the same slot a photo upload would. Seller-side config lives in the v2 layer editor; buyer-side is the storefront product form.

## Requirements to check

- Provider must be chosen explicitly by seller — nothing preselected. Save must fail if provider is empty.
- Provider-specific panels: Gemini / GPT-Image / Flux show prompt + reference image; **ImagenHub** switches to a template picker (no prompt / no reference image).
- Flux version awareness: Flux Kontext **v1** is edit-only → cannot text-to-image. Portal shows a warning when Flux is picked on a v1 account; generation is an *expected failure*, not a bug, if ignored.
- Prompt variables: `{{Layer name}}` and JSON-list sub-key `{{Layer.key}}` (second-level picker).
- Layer is **always required** — the "required" toggle is hidden; buyer must generate before Add to Cart.
- **Stale-image / ATC gating** (high-value logic):
  - Not generated yet → ATC blocked, required message near Generate button.
  - Generated, then a referenced field changed → ATC blocked, "needs regenerate" warning.
  - Revert referenced field back to the last successfully-generated value → warning clears, ATC allowed automatically WITHOUT regenerating.
  - Last generation attempt failed → ATC blocked, warning shown.
- Effects after generating: same effect list as photo layer, **plus a Gen AI effect** (e.g. ImagenHub template) run as a *second* GenAI pass on the already-generated image → extra cost + counts against rate limit again.
- Rate limit: generation counts against the same upload rate limit as photo uploads. Gen AI effect = a second hit.
- v2 layers only — no legacy/v1 layer support.
- Translations: Generate / Generating / Regenerate button labels and "needs regenerate" warning text are customizable.
- Field heading above Generate is hidden by default (layer name shows once on artwork preview); error/required messages render next to the Generate button, not top of form.
- To force showing the layer title, seller adds `tee-show-layer-title` to the layer's Custom class.
- Duplicate & Link on a text-to-image layer must render the generated image in both buyer preview and final render (was a vanish bug).

## Impacted Areas

- v2 layer editor (seller): new layer type, provider select, prompt/reference/template panels, effects repeater, Translations, Custom class.
- Storefront product form (buyer): Generate button, artwork preview, ATC gating, stale/failed warnings.
- GenAI provider integrations (Gemini / GPT-Image / Flux / ImagenHub) — API calls, credentials, failure handling.
- JSON layer (TIB-5216) dependency for variable data / sub-keys.
- Upload rate-limit subsystem (shared with photo upload).
- Final render / fulfillment pipeline (generated image must persist to order artwork).
- Duplicate & Link mechanism.
- Cart / checkout (ATC block conditions).

## Risk Patterns

- Stale-detection false negative: buyer sneaks a changed referenced value into cart without regenerating.
- Revert-to-original not detected → warning stuck, buyer forced to regenerate needlessly (or vice versa: clears when it shouldn't).
- Provider swap doesn't reset provider-specific fields (e.g. ImagenHub template left behind when switching to Gemini).
- Flux v1 warning ignored → silent/unclear failure instead of a clear "generation failed" state.
- Rate-limit double counting via Gen AI effect not surfaced to buyer → confusing "limit reached".
- Generated image lost in Duplicate & Link, preview, or final render/fulfillment.
- Prompt variable referencing a deleted/renamed layer or missing JSON sub-key → broken prompt, unclear error.
- Buyer cannot clear a generated image (only regenerate) — verify this is intended, not a dead-end.

## Open Questions To Consider

- Exact list of "referenced fields" that trigger stale state — only variables in the prompt/template, or any field?
- What defines "the same value" for revert detection (trim/case/normalization)?
- Behavior when generation API times out / returns error vs. returns a bad image.
- Whether reference image is optional or required per provider.
- Rate-limit thresholds and the buyer-facing message when exceeded (incl. the double-count effect case).
- Does the generated image persist correctly through to fulfillment / order export?
- ImagenHub not verified against real credentials — flag failures as follow-up, not confirmed bug on first pass.

## Suggested Test Focus

- Provider required on save; per-provider panel differences (esp. ImagenHub template picker).
- Flux v1 warning path and expected-failure generation.
- Full ATC gating matrix: not-generated / generated / changed-then-stale / reverted-to-original / last-attempt-failed.
- Prompt variables incl. JSON sub-key second-level picker; deleted/renamed referenced layer.
- Effects after generating incl. Gen AI effect second pass (cost + rate-limit double count).
- Rate limit shared with photo upload; behavior at/over limit.
- Translations customization reflected buyer-side; hidden field heading + message placement near Generate.
- Duplicate & Link renders generated image in preview and final render.
- Required toggle hidden (always required).
- Persistence of generated image into final render / fulfillment.

## Cập nhật TIB-5389 (2026-10-18)
- Portal hiện **không có setting reference image** cho layer Text-to-Image ở mọi provider, và buyer cũng không upload được reference image trên storefront. SDK vẫn đọc `text_to_image_enable_ref_img` / `text_to_image_ref_img`, nhưng portal không đặt được giá trị cho hai key này. Người dùng đã chốt: không viết case reference image cho Text-to-Image. "Use Reference Image" chỉ có ở Gen AI image effect (`*:image_filter`).
- Prompt do merchant cố định, buyer chỉ có nút Generate. Muốn test moderation thì phải tạo một layer riêng chứa prompt vi phạm.
