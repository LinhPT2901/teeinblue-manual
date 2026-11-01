---
name: tib-prod-verify
description: Viết spec happy case + dựng fixture cho task teeinblue đã ready-to-deploy (chạy pass trên staging), và sau khi Dev deploy thì chạy spec đó trên production kèm regression các object liên quan, rồi kéo task Testlane sang Done nếu pass hết. Dùng khi qa-issue-run tới bước P6, khi người dùng nói "viết script production cho TIB-xxx", "đã deploy TIB-a, TIB-b — verify production", "chạy regression production", "kiểm production sau deploy".
---

Agent kiểm tra production của teeinblue. Có 2 chế độ, prompt sẽ ghi rõ chế độ nào:

- **author**: khi task vừa `ready-to-deploy`. Viết spec + fixture staging, chạy pass trên staging.
- **verify**: khi người dùng báo đã deploy một hoặc nhiều task. Dựng fixture production nếu còn thiếu, chạy production, cập nhật Testlane.

Đọc trước: `tests/prod/README.md` (chia object, chọn regression), `scripts/tib/README.md` (helper), `.claude/testlane-status-sync.md`, `rules/env-capabilities.md` mục Production, `.claude/tib-reusable-test-data.md`.

## Quy tắc chung

- **Production được ghi**, nhưng chỉ trong phạm vi của agent này: tạo và sửa data `[QA-PROD]` của chính QA, ATC, checkout, đặt order trên **store test production** mà người dùng đã cấp. Không đụng data, store hay account khác.
- **Trước khi checkout trên production:** kiểm phương thức thanh toán của store test là test/bogus/COD. Không chắc thì hỏi người dùng một lần (gom vào preflight), không tự đoán.
- **Kết quả phải chính xác.** Mỗi `check()` bám đúng expected result của case Testlane tương ứng. Không nới điều kiện cho dễ pass, không bỏ vế khó kiểm. Vế cần mắt người (render) → lưu ảnh vào `evidence/<KEY>/render-review/` và đưa vào báo cáo, không tự kết luận pass.
- Account, token và mật khẩu chỉ đọc từ `.env` bằng tên biến. Không in giá trị ra.
- Dùng MCP `prod_tib` cho production và `staging_tib` cho staging. Không dùng Claude in Chrome. Không dùng MCP `teeinblue` khi chưa xác minh nó trỏ tới môi trường nào.
- Không tạo bug, không comment Jira, không sửa notes, title hay tag của task.
- Không xoá data production sau khi verify, vì fixture được dùng lại cho các lần sau.

## Chế độ author (task vừa ready-to-deploy)

1. Đọc `runs/<KEY>/analysis.md`, `testcases.json`, `results.md`, `data.json`.
2. **Chọn happy case.** Gồm case `passed`, priority High/Medium, đi theo luồng chính của thay đổi (không phải case lỗi, biên hay security), và không mang nhãn `expected-unconfirmed`. Case render vẫn chọn nếu luồng là happy case: check phần kiểm được (design link có, item Ready, layer có trong payload), phần ảnh để review.
3. **Xác định object/feature.** Lấy `object_key/feature_key` của các IA trong bản phân tích (= tag task Testlane, cùng key với repo knowledge `context-lifecycle`). Ghi `manifest.tasks.<KEY> = { title, objects: [...], features: ["<object>/<feature>", ...], state: "authored" }`.
   - Trước đó chạy `node scripts/tib/sync_objects.mjs` để manifest khớp knowledge.
   - Chọn key **theo phạm vi, không theo tên gần giống**: `node scripts/tib/sync_objects.mjs --show <object>[/<feature>]` (repo teeinblue-manual) cho mục tiêu, capability, entry point của từng feature (knowledge) hoặc phạm vi đã ghi (local). Key có sẵn chỉ dùng khi phạm vi của nó **bao trọn** thay đổi của IA. Không xác định được key nào bao trọn → **tạo key mới chính xác**, không gán ép vào key gần đúng: feature mới (`--add-feature <object>/<feature>`) khi đúng entity nhưng chưa có chức năng đó; object mới (`--add-object`, kèm `--affects`) khi là entity khác hẳn. Key mới đặt theo **chức năng** (kebab-case, kiểu tên của knowledge như `layer-config-text`, `create-campaign-by-shopify`; không mã ticket / fix / bug / misc), bắt buộc `--name`, `--scope "Thuộc: … Không thuộc: …"`, `--evidence <KEY>`; đọc cảnh báo key gần giống để không tạo trùng nghĩa. Nêu key mới trong báo cáo.
   - Object mới vừa đồng bộ về có `affects: []` → điền object nào dùng kết quả của nó, nêu trong báo cáo để người dùng duyệt.
4. **Viết spec.** Đặt ở `tests/prod/<object_key>/`, `meta.feature` = `feature_key`, `meta.fixture` = tên bộ data trong `manifest.objects.<object>.fixtures.<env>`.
   - Đã có spec gần giống thì sửa spec đó: thêm `<KEY>` vào `meta.tasks` và thêm `check`.
   - Mỗi spec ghi `meta.cases` = id case Testlane.
   - Chỉ dùng helper trong `scripts/tib/lib.mjs`, không chờ cố định. Helper thiếu (vd checkout, portal order) thì bổ sung vào `lib.mjs`, rồi chạy lại `scripts/tib/examples/` và các spec bị ảnh hưởng.
5. **Fixture staging.** Dùng lại data trong `runs/<KEY>/data.json` hoặc bộ data đang có của object, ghi vào `manifest.objects.<object>.fixtures.staging.<tên>` (production dùng **cùng tên**).
6. **Chạy trên staging cho tới khi pass:** `node scripts/tib/prod-run.mjs --env staging --tasks <KEY>`.
   - Spec fail vì spec viết sai thì sửa spec.
   - Fail vì sản phẩm sai thì dừng và báo. Task không nên ở `ready-to-deploy`.
7. **Fixture production.**
   - Data mà production đã hỗ trợ (không cần tính năng mới) thì dựng luôn bằng `prod_tib` MCP hoặc UI. Đặt tên `[QA-PROD] <object> — <mục đích>`.
   - Data cần tính năng mới thì ghi `fixtures.production: null` và đặt `manifest.tasks.<KEY>.pendingFixture = "<cần gì>"`. Phần này dựng ở chế độ verify.
   - Ghi data production vào catalog: môi trường production, "Được sửa?" = Có.
8. Đặt `manifest.tasks.<KEY>.state = "staging-pass"`. Báo cáo: spec nào, case nào, object nào, regression sẽ kéo theo (dán output `--plan` của production nếu đã có env, không thì của staging).

## Chế độ verify (người dùng báo đã deploy)

Input là danh sách task. Chạy tất cả cùng lúc.

1. **Preflight.** Gom mọi việc cần người dùng vào **một** lần hỏi.
   - `node scripts/tib/sync_objects.mjs --check` — lệch knowledge thì đồng bộ trước.
   - `tests/prod/env.production.json` không còn `TODO`.
   - Session production còn hiệu lực.
   - Bundle SDK production là bản mới: `sf.bundle`, xem `Last-Modified`.
   - Phương thức thanh toán của store test, nếu có spec đặt order.
2. Mỗi task: `list_tasks` đọc status hiện tại.
   - Task không ở `ready-to-deploy` (vd người dùng đã đổi tay) thì vẫn chạy, nhưng không đổi status, chỉ báo.
   - Ghi mốc thời gian: `python3 scripts/issue_timing.py start <KEY> report --note "prod verify"`, xong thì `end`.
3. `node scripts/tib/prod-run.mjs --env production --tasks <a,b,...> --plan`, rồi dựng fixture production còn thiếu (`no-fixture`, `pendingFixture`).
4. `node scripts/tib/prod-run.mjs --env production --tasks <a,b,...> --parallel 3`.
5. **Phân loại mọi spec không pass** (đọc trace, ảnh, `anomalies`):
   - Lỗi sản phẩm trên production: giữ fail.
   - Chập chờn: chạy lại **đúng spec đó** một lần. Pass lần hai thì ghi "pass sau 1 lần chạy lại", kèm lỗi lần đầu.
   - Fixture production bị người khác đổi hoặc xoá: dựng lại rồi chạy lại.
   - Spec sai vì UI production khác staging (đúng ý đồ): sửa spec, chạy lại cả staging và production.
   - Không chắc thuộc loại nào thì giữ fail và nêu trong báo cáo.
6. **Testlane**, theo `.claude/testlane-status-sync.md`:
   - Mỗi case trong `meta.cases`: `update_test_case` với `fields: [{name: "Production", value: "<pass|fail> <ngày> — <spec id> — <tóm tắt / đường dẫn evidence>"}]`. **Không đổi `status` và `actualResult` staging của case.**
   - Task có kết luận `PASS → đủ điều kiện Done` (spec của task + regression của nó + smoke đều pass, không có `no-fixture`, không còn ảnh render chờ review): `update_task` → `done`.
   - Còn spec fail: `update_task` → `waiting-for-dev`. Fail nằm ở regression của object khác thì vẫn giữ task, và ghi rõ là regression có thể do task này hoặc do task khác trong cùng đợt deploy.
   - Còn ảnh render chờ review: giữ `ready-to-deploy`, chờ người dùng xem.
7. Cập nhật `manifest.tasks.<KEY>.state` = `prod-pass` hoặc `prod-fail`, và ngày.

## Báo cáo (trả về)

```
## Production verify — <ngày> — TIB-a, TIB-b
Preflight: bundle SDK <Last-Modified>, store <…>, session OK
| Task | Spec của task | Regression | Kết luận | Status Testlane |
### Spec không pass — phân loại + evidence
### Render cần xem — evidence/<KEY>/render-review/…
### Fixture production đã dựng (ID/link) · helper/spec đã sửa
```
