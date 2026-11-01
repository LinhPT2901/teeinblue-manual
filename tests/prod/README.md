# tests/prod — kiểm tra production sau deploy

Mỗi task, sau khi đạt `ready-to-deploy`, có các happy case được viết thành spec. Spec chạy trên staging trước, và sau khi Dev báo deploy thì chạy lại trên production, kèm regression các phần liên quan. Production pass hết thì task chuyển sang `Done`.

Agent phụ trách: `tib-prod-verify` (`.claude/agents/tib-prod-verify.md`). Runner: `scripts/tib/prod-run.mjs`.

## Chia theo object — đồng bộ với repo knowledge

Bộ key = `object_key` / `feature_key` của repo knowledge `context-lifecycle` (`knowledge/products/teeinblue/_registry.json` + `<object>/features/<feature>/`) **cộng key local** cho phần knowledge chưa có. Cùng một bộ key được dùng ở mọi chỗ:

| Chỗ dùng | Dạng |
|---|---|
| Bản phân tích (`analysis.md`) | Mỗi Impacted Area: `IA2 — sdk/storefront-buyer-facing: …` |
| Tag task Testlane | `["TIB-xxxx", "sdk", "sdk/storefront-buyer-facing"]` |
| Thư mục spec | `tests/prod/<object_key>/` |
| `meta` của spec | `object`, `feature` |
| `manifest.tasks.<KEY>` | `objects`, `features` (= tag task) |

Đồng bộ manifest với knowledge (đọc repo knowledge, **không sửa bên đó**):

```bash
node scripts/tib/sync_objects.mjs           # thêm object/feature mới, đánh dấu cái đã bị bỏ, kiểm spec trỏ đúng key
node scripts/tib/sync_objects.mjs --check   # chỉ kiểm (preflight)
```

Repo knowledge mặc định ở `../context-lifecycle`, có thể đổi bằng biến `TIB_KNOWLEDGE_DIR`.

**Chọn key theo phạm vi, không theo tên.** Knowledge có thể thiếu key cho chức năng mới. Key có sẵn chỉ dùng khi phạm vi của nó **bao trọn** thay đổi của ticket. Không xác định được thì **tạo key mới chính xác**, không gán ép vào key gần đúng, vì gán sai sẽ làm regression chọn sai spec.

```bash
node scripts/tib/sync_objects.mjs --list                          # mọi key (knowledge + local)
node scripts/tib/sync_objects.mjs --show sdk                      # các feature của object + mục tiêu từng feature
node scripts/tib/sync_objects.mjs --show sdk/storefront-buyer-facing   # mục tiêu, capability, entry point
node scripts/tib/sync_objects.mjs --add-feature sdk/addon-charge-pricing \
  --name "Addon charge — tính và cộng phí vào cart" \
  --scope "Thuộc: giá addon hiển thị, cộng vào line/cart. Không thuộc: cấu hình layer addon trong editor" \
  --evidence TIB-5482
node scripts/tib/sync_objects.mjs --add-object <object> --name "..." --scope "..." --evidence TIB-xxxx --affects sdk,order
```

| Trường hợp | Làm gì |
|---|---|
| Có feature bao trọn thay đổi | Dùng key đó |
| Đúng entity (object) nhưng chưa có chức năng đó | Tạo feature mới dưới object đó |
| Entity khác hẳn các object đang có | Tạo object mới, khai báo `affects` |
| Thay đổi trải trên nhiều feature | Gắn nhiều key, không gộp thành một key chung chung |

Đặt tên key mới:
- Đặt theo **chức năng**, kebab-case, cùng kiểu với knowledge (`layer-config-text`, `create-campaign-by-shopify`, `addon-charge-pricing`).
- Không chứa mã ticket, `fix`, `bug`, `misc`, `other`, `general` hay version. Lệnh từ chối các tên này.
- Bắt buộc có `--name`, `--scope` (Thuộc / Không thuộc) và `--evidence`, để lần sau map ticket khác vào đúng hay sai.
- Đọc cảnh báo key và alias gần giống mà lệnh in ra.

Key local được đánh dấu `source: local`. Khi knowledge có đúng key đó, lần sync sau tự chuyển sang `knowledge`. Feature bị bỏ khỏi knowledge thì chuyển thành local, không mất.

Ngoài key, `manifest.json` giữ 2 thứ riêng của repo test:
- **`affects`**: đổi object này thì object nào cần regression. Bản nháp hiện tại (2026-11-01, cần QA chỉnh):

| Object | affects |
|---|---|
| `asset-category`, `font`, `global-option` | `artwork`, `sdk` |
| `image-library` | `artwork`, `product-base`, `sdk` |
| `artwork` | `sdk`, `order` |
| `product-base` | `campaign`, `order` |
| `campaign` | `sdk`, `order` |
| `translation` | `sdk` |
| `sdk` | `order` |
| `order` | — |

- **`fixtures.<staging|production>.<tên>`**: các bộ data có tên. Spec chọn bằng `meta.fixture`; hai môi trường dùng cùng tên.

```js
export const meta = {
  id: 'SDK-addon-price', title: 'Addon charge cộng đúng giá vào cart',
  object: 'sdk', feature: 'storefront-buyer-facing',   // key của knowledge, = tên thư mục + tag task
  fixture: 'addon-charge',                              // manifest.objects.sdk.fixtures.<env>['addon-charge']
  tasks: ['TIB-5483'], cases: ['TC-TIB-812'], smoke: false,
};
export default async ({ page, sf, fx, check }) => { await sf.open(page, { store: fx.store, handle: fx.handle }); ... };
```

- Spec không viết cứng handle, ID hay store, mà lấy tất cả từ `fx`.
- Task sau đụng lại cùng feature thì sửa spec cũ (thêm key vào `meta.tasks`), không chép thành spec mới.

## Biết case nào cần regression

`prod-run.mjs` đọc object/feature của task (từ `manifest.tasks`, tức tag task) và chọn theo thứ tự hẹp dần ra rộng:

1. **Spec của task**: `meta.tasks` có key của task.
2. **Cùng feature**: các spec khác của feature mà task đụng.
3. **Cùng object**: các spec thuộc feature khác của cùng object.
4. **Ảnh hưởng**: object khác, lan theo `affects` tới hết chuỗi, vd `ảnh hưởng artwork → sdk → order`.
5. **Smoke** (`meta.smoke: true`): luồng chính, luôn chạy.

Dùng `--plan` để xem trước, mỗi spec có kèm lý do. Nếu một lỗi production lọt qua mà regression không bắt được, kiểm xem `affects` có thiếu cạnh nào không.

## Lệnh

```bash
node scripts/tib/prod-run.mjs --env staging --tasks TIB-a --plan              # xem sẽ chạy gì và vì sao
node scripts/tib/prod-run.mjs --env staging --tasks TIB-a                     # bắt buộc pass trước khi deploy
node scripts/tib/prod-run.mjs --env production --tasks TIB-a,TIB-b --parallel 3
node scripts/tib/prod-run.mjs --env production --smoke | --objects sf-cart | --all
```

- Cấu hình môi trường ở `env.staging.json` và `env.production.json`. File production chép từ `env.production.example.json`, không commit. Runner từ chối chạy khi còn giá trị `TODO`.
- Spec thiếu fixture của môi trường thì không chạy và bị báo `no-fixture`. Agent dựng data rồi chạy lại.
- Kết quả lưu ở `runs/<PROD|STG>-<ngày>/script-results.jsonl`, ảnh và trace ở `evidence/` cùng tên. Cuối bảng có kết luận theo từng task: `PASS → đủ điều kiện Done` hoặc liệt kê spec chưa đạt.
