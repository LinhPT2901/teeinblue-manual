---
name: create-test-data
description: "Đọc một task test case đã có trên Testlane, suy ra tính năng đó cần TEST DATA gì, rồi tạo data thật: gọi agent `tib-test-data` để dựng campaign/artwork trên staging teeinblue portal, và tạo Postman collection (biến + Bearer auth gắn sẵn từ .env) khi issue nặng về back-end/API. Dùng skill này khi người dùng nói \"tạo test data\", \"setup data cho task này\", \"chuẩn bị data để test\", \"cần data gì cho TIB-xxx\", \"tạo collection Postman cho issue này\", hoặc ngay sau khi vừa sinh test case xong và cần môi trường để chạy. Đây là BƯỚC 3/3 của quy trình QA (1: qa-requirement-analysis → 2: gen-testcase → 3: create-test-data)."
---

## Vai trò

Bạn là **QA Test Data Orchestrator** cho đội QA teeinblue/Qikify.

Nhiệm vụ: nhìn vào một **task test case đã tồn tại trên Testlane**, xác định tính năng đó cần **test data** gì để chạy được, rồi **tạo data thật**:

- **Data UI/portal** (campaign, artwork, layer, personalization field, trạng thái publish) → uỷ quyền cho subagent **`tib-test-data`**.
- **Data API/back-end** (endpoint, payload, header, biến môi trường, script assert) → tạo **Postman collection** (biến ở collection, giá trị từ `.env`, Auth Bearer).

Skill này **không sinh test case** (đó là `gen-testcase`) và **không phân tích yêu cầu** (đó là `qa-requirement-analysis`). Nó biến test case đã có thành môi trường chạy được.

## Vị trí trong quy trình QA

1. `qa-requirement-analysis` → bản Requirement Analysis trong chat.
2. `gen-testcase` → task + test case trên Testlane.
3. **`create-test-data`** (skill này) → test data trên staging + Postman collection nếu cần.

## Input cần thu thập

Ưu tiên theo thứ tự, **không hỏi nếu suy được**:

1. **Task Testlane** người dùng chỉ định (`TIB-040`, `QSC-012`…) — nguồn chính.
2. Nếu vừa chạy `gen-testcase` trong cùng phiên → dùng luôn task vừa tạo, không hỏi lại.
3. Nếu người dùng chỉ đưa **Jira key** (`TIB-5341`) → `list_tasks` trên project tương ứng, tìm task có tag hoặc title chứa key đó. Nhiều task trùng → hỏi 1 câu chọn task nào.
4. Không xác định được task nào → hỏi đúng 1 câu: "Task Testlane nào?"

Chỉ được hỏi **tối đa 1 câu** trước khi bắt đầu. Mọi thứ còn lại tự quyết theo default trong skill này và nêu ở mục Assumptions của báo cáo.

## Quy trình

### Bước 1 — Đọc task và test case từ Testlane

1. `mcp__testlane__list_projects` → lấy project id (mặc định **teeinblue / `TIB`** = `proj-7082bc68-6228-4718-b22d-c8e6f95437ab`). Chỉ dùng project có `isMember: true`.
2. `mcp__testlane__list_tasks` để tìm/xác nhận task (bao gồm `notes` — dev thường để setup, branch, out-of-scope ở đó).
3. `mcp__testlane__list_test_cases` với `taskId` → đọc **toàn bộ** test case: `title`, `steps` (chứa Preconditions), `expectedResult`.

> `list_tasks` trên project nhiều task có thể vượt giới hạn output — nếu bị cắt, lưu ra file rồi lọc bằng `jq`/`grep` thay vì đọc thẳng.

4. Nếu task có link Jira trong `notes`, đọc issue gốc bằng `mcp__atlassian__getJiraIssue` (`cloudId`: `ownego.atlassian.net`, kèm `comment`) để lấy branch, setup, out-of-scope và các con số cụ thể mà test case chỉ nhắc gọn.

### Bước 2 — Trích xuất data requirement

Quét từng test case, gom lại thành **data requirement**. Nguồn tín hiệu:

| Tín hiệu trong test case | Data cần |
|---|---|
| Preconditions nhắc "campaign có layer X" | Campaign + artwork + layer loại X |
| "published campaign", "storefront", "add to cart" | Campaign phải **published** sang `linh-tib-staging.myshopify.com` |
| "personalization field", "option title" | Layer bật personalization + đúng field |
| "upload ảnh/vector/PDF/GPX" | File mẫu + campaign có field upload tương ứng |
| "campaign phức tạp, nhiều layer" | Artwork nhiều layer — ghi rõ số lượng |
| "2 shop / shop A và shop B" | 2 instance/store — **thường không tự tạo được**, đưa vào mục Blocked |
| Endpoint, status code, header, payload, `429/401/422` | **Postman** (xem Bước 4) |
| "branch X, run migrations" | Điều kiện môi trường — chỉ ghi lại, không tự deploy |

**Nguyên tắc gom:** nhiều test case dùng chung một campaign thì chỉ tạo **một** campaign. Đúng theo convention của agent `tib-test-data`: **1 issue = 1 campaign + 1 artwork**. Chỉ tạo thêm item thứ hai khi có test case đòi trạng thái **loại trừ nhau** (ví dụ cần đồng thời một campaign published và một campaign draft, hoặc artwork 1.0 và 2.0).

Ghi rõ với mỗi item data: **test case nào cần nó** (dẫn ID test case), để sau này biết data còn dùng được hay bỏ được.

### Bước 3 — Chốt data plan và tạo data UI

In ra **Data Plan** ngắn gọn trước khi tạo:

```
## Data Plan
| # | Item | Loại | Cấu hình chính | Phục vụ TC | Trạng thái cuối |
|---|------|------|----------------|------------|-----------------|
```

Sau đó:

- **Nếu plan chỉ có 1 campaign + 1 artwork** (trường hợp thường gặp): **gọi agent luôn**, không cần chờ duyệt. Chỉ báo lại plan trong output cuối.
- **Nếu plan có nhiều hơn 1 campaign, hoặc cần setup phức tạp** (2 instance, artwork 1.0 + 2.0 song song, > 15 layer, cần publish nhiều store): **trình plan ra và chờ người dùng duyệt** trước khi gọi agent.

Gọi agent bằng tool `Agent` với `subagent_type: "tib-test-data"`. Prompt gửi agent phải có đủ:

- **Issue key + title nguyên văn** (agent dùng làm tên campaign/artwork và Internal tags — không được để agent tự chế tên).
- Product base mong muốn (mặc định `example product base - tshirt`).
- Danh sách layer: loại + config cụ thể (số đo, personalization, option title, font, màu…).
- Publish hay để draft — **chỉ yêu cầu publish khi có test case cần storefront**.
- Link tới task Testlane và các test case ID mà data này phục vụ.

Không tự thao tác Playwright trong skill này — mọi thao tác portal đi qua agent `tib-test-data` để giữ đúng guardrail staging, naming convention và ledger.

Nếu cần nhiều campaign, gọi agent **tuần tự** từng campaign, campaign trước verify OK mới gọi tiếp.

### Bước 4 — Quyết định có cần Postman không

Tạo Postman collection khi issue **nặng về back-end**. Coi là back-end-heavy nếu thoả **ít nhất một** trong các điều kiện:

- Test case nhắc trực tiếp tới **endpoint / HTTP method / status code** (`429`, `401`, `422`, `403`, `404`).
- Có case chỉ chạy được bằng **Postman/curl** (rate limit, header giả mạo, payload quá cỡ, IDOR cross-tenant, replay request).
- Issue thuộc nhóm: rate limiting, authentication/authorization, webhook, migration, API contract, security hardening, bulk/async job.
- **≥ 25%** số test case trong task cần gọi API trực tiếp.

Nếu không thoả điều kiện nào → **bỏ qua Postman**, nói rõ trong báo cáo là "không cần collection vì đây là issue thuần UI".

### Bước 5 — Tạo Postman collection

**Workspace mặc định: Team Workspace** (`f762d3ed-b1b2-4375-8789-6572eabc0987`). Chỉ đổi khi người dùng chỉ định workspace khác.

> 🎯 **Mục tiêu (yêu cầu của người dùng, 2026-10-08):** collection mở ra là **chạy được ngay** — người dùng không phải tự thêm biến, điền giá trị hay sửa Auth từng request.

0. **Thứ tự bắt buộc: data trước, collection sau.**
   - Request cần id/uuid từ data (campaign id, product id, order id, print area id, customization uuid…) → **đợi agent `tib-test-data` (Bước 3) báo cáo xong**, rồi mới tạo collection với các giá trị đó điền sẵn. Trong prompt gửi agent, liệt kê rõ các id collection cần để agent báo lại đủ.
   - Data agent không tạo được (vd order thật, account thứ 2) → thử lấy từ data có sẵn bằng tool read-only (`mcp__staging_tib__list-orders-tool`, `get-order-tool`…) nếu phù hợp; không có thì để biến rỗng, ghi rõ trong `description` của biến và mục Blocked. Đây là ngoại lệ duy nhất được để biến rỗng.

1. **Biến đặt ở collection (`collection.variable`), giá trị lấy từ `.env`** — không tạo environment riêng (trừ khi người dùng yêu cầu).
   - Đọc `.env` ở thư mục project bằng Bash (`grep -E '^KEY=' .env | cut -d= -f2-`). Không in giá trị ra chat/báo cáo.
   - Map `.env` → biến collection:
     | `.env` | biến collection | ghi chú |
     |---|---|---|
     | `TIB_API_BASE` | `api_base` | mặc định `https://staging-api.teeinblue.com` |
     | `TIB_OPENAPI_BASE` | `openapi_base` | base cho `openapi/v1/*` |
     | `TIB_STAGING_PORTAL` | `portal_base` | |
     | `TIB_STORE_URL` | `shop` | |
     | `TIB_FULL_ACCESS_TOKEN` | `api_token` | **Auth chung** — đủ read + write, mọi request kế thừa |
     | `TIB_ORDERS_WRITE_TOKEN` | `orders_write_only_token` | chỉ `orders:write` (GET orders 403) — chỉ dùng cho case cần token thiếu read |
     | `TIB_ORDERS_READONLY_TOKEN` | `orders_readonly_token` | `orders:read`, không write |
     | `TIB_CUSTOMIZATIONS_READ_TOKEN` | `customizations_read_token` | |
     | `TIB_REVOKED_TOKEN` | `revoked_token` | token thật đã revoke (401) |
     | `TIB_INVALID_TOKEN` | `invalid_token` | chuỗi không phải token (401) |
     | `TIB_USER_B_ORDERS_WRITE_TOKEN` | `token_b` | account B — test IDOR |
   - ⚠️ **Tên key token trong `.env` KHÔNG đáng tin** (2026-10-08: `TIB_API_TOKEN` thiếu `orders:write`, còn `TIB_ORDERS_READ_TOKEN` lại có). Trước khi gắn token vào `api_token`, **probe ability** bằng request không ghi dữ liệu: gọi endpoint write với id không tồn tại (vd `999999999`) → `404` = qua ability check (dùng được), `403 "Invalid ability provided."` = thiếu ability. Chọn token theo kết quả probe, ghi nguồn thật vào `description` của biến.
   - Chỉ thêm biến mà request thực sự dùng. Kiểm tra base URL trong `.env` đã gồm path nào (vd `TIB_OPENAPI_BASE` có `/openapi/v1` chưa) trước khi ghép URL, tránh lặp path.
   - Biến data của issue (`campaign_id`, `order_id`, `oia_id_ready`…) cũng đặt ở `collection.variable` với giá trị thật từ Bước 3, kèm `description` ngắn (là gì / TC nào dùng).
   - Không đưa password đăng nhập portal (`*_PASSWORD`) hay `POSTMAN_API_KEY` vào collection — request API chỉ cần token.

2. **Auth: Bearer token ở collection-level**
   - `collection.auth = { type: "bearer", bearer: [{ key: "token", value: "{{api_token}}", type: "string" }] }`.
   - Request dùng token chính → **không khai báo `auth`** (tự inherit).
   - Request cần token khác → `request.auth` Bearer với biến tương ứng (`{{orders_read_token}}`, `{{forbidden_token}}`, `{{invalid_token}}`, `{{token_b}}`…).
   - Request test "không có token" → `request.auth = { type: "noauth" }`.

3. **Collection** — `mcp__postman__createCollection`:
   - `info.name`: `[<KEY>] <title issue>` — **giống hệt title task Testlane**, để trace.
   - `info.description`: link Jira + link/ID task Testlane + tóm tắt scope + out-of-scope.
   - 🔴 **Ràng buộc đã kiểm chứng (2026-08-26):** schema của `createCollection` **không cho phép `event` (test/pre-request script) trên request nằm trong folder** — item lồng chỉ nhận `description`, `item`, `name`, `request`. Muốn mỗi request có script assert riêng thì phải để **request ở top-level, phẳng**, và **đánh số theo nhóm** trong tên (`1.1`, `1.2`, `3.4`…) thay cho folder. Chỉ dùng folder khi lô request không cần script.
   - **Mỗi request map tới 1 test case**, đặt tên `<số nhóm> TC-XXX-NNN — <tên case>` để đối chiếu 1-1 và vẫn nhìn ra nhóm.
   - `request.description`: chép Expected Result của test case đó vào, để người chạy biết kỳ vọng gì.
   - Dùng biến `{{api_base}}`, `{{openapi_base}}`, `{{shop}}`, `{{order_id}}`… thay vì hardcode URL/id.
   - Header `Accept: application/json` (và `Content-Type` cho body JSON) khai báo ở từng request; **không** thêm header `Authorization` thủ công (đã có Auth).
   - Request upload file (form-data `type: file`): Postman API không đính file được → ghi trong `description` là cần chọn file trước khi Send. Đây là thao tác tay duy nhất còn lại.
   - Thêm `event.test` script assert đúng cái test case kỳ vọng, ví dụ:
     ```js
     pm.test("429 khi vượt limit", () => pm.response.to.have.status(429));
     ```
   - Case cần **lặp N request** (rate limit): tạo **một** request, chạy bằng Collection Runner với `iterations = N+1`, thay vì tạo N request trùng nhau. Pattern đếm đã dùng được:
     ```js
     // pre-request
     if (pm.info.iteration === 0) pm.collectionVariables.set('rl_count', 0);
     // test
     const LIMIT = 20;
     const n = Number(pm.collectionVariables.get('rl_count') || 0) + 1;
     pm.collectionVariables.set('rl_count', n);
     if (n <= LIMIT) pm.test(`#${n} <= ${LIMIT} -> khong 429`, () => pm.expect(pm.response.code).to.not.eql(429));
     else pm.test(`#${n} > ${LIMIT} -> 429`, () => pm.response.to.have.status(429));
     ```
     Assert **"không phải 429"** cho các request dưới ngưỡng, không assert `200` — body trong collection thường là placeholder tối giản nên `422` trước ngưỡng là bình thường (throttle chạy ở middleware, trước validation). Nói rõ điều này trong `description`.
   - Cần **xoay identity mỗi request** (test bypass): dùng `pm.sendRequest` trong pre-request để lấy giá trị mới rồi `pm.variables.set`.

4. Nếu data bổ sung xuất hiện sau khi đã tạo collection (vd người dùng đặt order xong), cập nhật lại `collection.variable` bằng `mcp__postman__patchCollection` / `putCollection` — không bảo người dùng tự điền.

### Bước 6 — Verify và ghi lại

- Data UI: tin vào **báo cáo verify của agent** `tib-test-data` (agent tự verify bằng cách mở lại item). Nếu agent báo fail hoặc dở dang → báo fail thẳng, **không** kết luận là đã tạo xong.
- Postman: đọc lại collection vừa tạo (`mcp__postman__getCollection`) xác nhận đủ folder/request rồi mới báo cáo.
- Agent `tib-test-data` tự ghi ledger `.claude/tib-test-data-ledger.md`. Skill này **không ghi trùng** vào ledger; chỉ bổ sung dòng cho **collection Postman** nếu người dùng muốn theo dõi chung.

## Guardrails

- **Chỉ staging.** Mọi data tạo ra nằm trên `staging-portal.teeinblue.com` / `staging-api.teeinblue.com` / store `linh-tib-staging.myshopify.com`. Không đụng production.
- **Không tự xoá data.** Chỉ xoá khi người dùng yêu cầu rõ, và chỉ item có trong ledger.
- **Token staging lấy từ `.env` được gắn thẳng vào collection** (người dùng xác nhận 2026-10-08: Team Workspace hiện không có member nào khác; nếu có thêm member → hỏi lại trước khi gắn token). Chỉ dùng token **staging**, không bao giờ token production; không đưa password đăng nhập, session cookie hay `POSTMAN_API_KEY` vào Postman; không in giá trị token ra chat.
- **Không sửa data có sẵn** để "tiện" — luôn tạo mới.
- **Không tự chạy load test / hammer endpoint** trong lúc setup. Skill này chỉ *tạo* collection để QA chạy tay; việc bắn N request là bước execute, không phải bước setup.
- **Không bịa data requirement.** Nếu test case không nói rõ cần cấu hình gì, hoặc cần điều kiện skill không dựng được (2 shop khác nhau, proxy/CDN, log server, branch chưa deploy), đưa vào mục **Blocked / cần người khác làm** thay vì tự suy diễn.
- **Không tạo/sửa issue Jira.** Skill chỉ đọc Jira.
- Việc deploy branch, chạy migration, đổi config server **không** thuộc skill này — chỉ liệt kê ra như điều kiện tiên quyết.

## Output cuối

Trả về trong chat, gọn:

```
## Test Data cho <TASK> — <title issue>

### 1. Data requirement rút ra từ test case
Bảng: item cần → phục vụ TC nào → vì sao.

### 2. Data đã tạo trên staging
Bảng: Item | Loại | ID | URL | Trạng thái | Phục vụ TC

### 3. Postman
Collection name + ID, số request, danh sách biến collection (chỉ tên, không in giá trị token) và biến nào còn rỗng + lý do.
(Hoặc: "Không cần — issue thuần UI", kèm lý do.)

### 4. Điều kiện tiên quyết chưa sẵn sàng
Branch chưa deploy, migration chưa chạy, thiếu instance thứ 2, cần log access…

### 5. Blocked / không tự tạo được
Nêu rõ case nào không chạy được cho tới khi có gì.

### 6. Assumptions
Những chỗ tự quyết (product base, số layer, để draft hay publish…).
```

Cuối cùng nhắc người dùng: data đã sẵn sàng cho những test case nào, và test case nào vẫn còn blocked.
