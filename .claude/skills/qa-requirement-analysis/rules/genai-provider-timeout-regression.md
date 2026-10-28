# Rule: GenAI provider timeout / queue job hardening (teeinblue)

Dùng khi issue nói về: timeout Guzzle (`timeout`, `connect_timeout`), `ApplyImageFilterEffectJob`, `ApplyImageGenerateEffectJob`, `GenerateFromMultipleImagesJob`, `image-effect-queue`, `MaxAttemptsExceededException`, `retry_after`, `terminationGracePeriodSeconds`, poll loop ImagenHub/Flux, `CustomerUpload` kẹt `Processing`. Bổ trợ [[text-to-image-genai-layer]], [[provider-error-propagation]] (từ TIB-5389).

## Context cần nhận diện
- Thay đổi chủ yếu ở backend/infra; nhánh timeout chỉ xảy ra khi provider treo → QA **không trigger được** trên UI. Dev thường chốt "regression là đủ".
- QA không vào Horizon staging → không verify được trạng thái job/queue; chỉ quan sát qua UI + API status (`Completed` / `Failed` + `error_message`).
- Đọc kỹ "Known limitation" của dev: phần nào ngoài scope (vd pod bị kill → vẫn ~30 phút) thì không viết case fail cho nó.
- Message lỗi có thể đổi chữ (vd "Failed to download ImagenHub output image" → "Failed to download the generated image") → kiểm FE/translation có match chuỗi cũ không.

## Requirement cần kiểm tra
- Danh sách feature/endpoint dùng chung các job: filter effect async + status poll, text-to-image generate, multiple uploads, derive/populate `{{input}}`, ImagenHub face cutout/upscaler, print-file render có AI effect/emboss.
- Ma trận provider (GPT, Gemini, ImagenHub, Flux Kontext) — provider nào có sẵn credential trên staging.
- Lỗi thật của provider (moderation, rate limit) vẫn trả message cũ.
- Thời gian xử lý bình thường không tăng đáng kể (GPT có thể ~165s, sát nhưng dưới limit 300s).
- Có cách nào dev hỗ trợ giảm timeout qua env staging để QA thấy nhánh fail không (limit cấu hình qua env, không cần deploy).

## Risks
- Timeout đặt thấp hơn p99 thực tế → case GPT/ảnh lớn chậm bị fail oan (false failure).
- Job chạy nhiều effect liên tiếp vẫn vượt job `$timeout` → lỗi mới kiểu timeout của job.
- Lỗi transport hiển thị raw ("cURL error 28…") cho buyer.
- Regression ở bước download ảnh output (đổi cách download / thêm timeout).

## Suggested test focus
1. Regression happy path từng feature × provider có sẵn, ghi lại thời gian xử lý.
2. Lỗi provider thật (moderation / rate limit) vẫn hiện message cũ, upload `Failed`.
3. Print file render cho order có AI effect.
4. (Nếu dev hỗ trợ env) hạ timeout trên staging để quan sát nhánh fail + message mới; không tự giả lập bằng cách khác.
