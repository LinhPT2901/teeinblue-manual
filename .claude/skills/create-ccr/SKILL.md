---
name: create-ccr
description: "Tạo một (hoặc nhiều) Context Change Request (CCR) hoàn chỉnh từ một/nhiều ticket Jira đã ship (hoặc mô tả thay đổi tự do), để gửi cho một QA context-builder agent (vd `qa-context-lifecycle-orchestrator`) cập nhật canonical QA context (Product KB/Feature Profile/Checklist) của một product bất kỳ. Dùng khi người dùng nói \"tạo CCR\", \"viết CCR từ ticket này\", \"context change request cho...\", \"canon context bị cũ/thiếu do ticket X/Y/Z đã ship\", \"gửi update context cho object...\", hoặc dán vào 1-nhiều key/link Jira kèm yêu cầu đưa vào QA context. Mục tiêu cốt lõi: CCR sinh ra phải đủ chi tiết để agent nhận CCR KHÔNG CẦN mở lại Jira để đọc/phân tích, và phải nêu rõ ràng cần explore surface nào, thay đổi gì, ảnh hưởng tới object/feature/checklist nào. Skill chỉ ĐỌC Jira (không tạo/sửa/comment issue nào) và chỉ tạo ra file CCR cục bộ — không tự submit lên bất kỳ hệ thống nào."
---

# Create CCR (Context Change Request)

Bạn là agent soạn CCR — cầu nối giữa "có ticket đã ship" và "canonical QA context được cập nhật đúng, đủ, không cần ai mở lại Jira lần nữa". Output là **file Markdown CCR hoàn chỉnh**, sẵn sàng đính kèm vào task của hệ thống quản lý context (QA Hub hoặc tương đương) và chờ người gửi bấm Submit.

**Không phải việc của skill này:** submit CCR, tạo/sửa/comment Jira issue, quyết authority/urgency thay con người, tự chọn phía khi có mâu thuẫn với canon, publish gì vào `knowledge/`. Skill dừng lại ở việc SOẠN file.

## Vị trí trong quy trình

1. **`create-ccr`** (skill này) → tổng hợp từ Jira + canon, sinh file CCR hoàn chỉnh.
2. Người gửi review, trả lời các mục `[BẠN]`, tự đính kèm vào task + bấm Submit trên hệ thống quản lý context.
3. Context-builder agent (vd `qa-context-lifecycle-orchestrator`) nhặt Proposal, xử lý theo pipeline riêng của nó — **ngoài phạm vi skill này**.

## Bước 0 — Xác định repo/knowledge base đích

Trước khi viết bất cứ gì, xác định CCR này nhắm tới knowledge base nào (vì skill này global, dùng cho nhiều product khác nhau):

- **Khuôn CCR chuẩn là `references/ccr-template.md` của skill này — LUÔN dùng nó, cho mọi product.** Đừng đi tìm một khuôn đầy đủ khác trong repo đích.
  > Trước đây luật là ngược lại ("ưu tiên template của repo đích"), và nó hỏng: skill tìm ở `contracts/context-change-request.template.md`, nhưng QA member lại nhận template ở `how-to-request/` trong bản clone của họ — nên khi chạy ở repo consumer, skill không tìm thấy và **âm thầm** rơi về bundled. Hai khuôn đầy đủ song song thì trôi xa nhau, và tên mục lệch nhau làm lời `NEEDS_INFO` của orchestrator trỏ vào mục không tồn tại. Giờ: một khuôn (ở đây), một phụ lục (ở repo đích).
- **Tìm phụ lục product-specific** trong repo đích, theo thứ tự: `contracts/ccr-product-appendix.md` → `how-to-request/ccr-product-appendix.md`. Nó cấp những thứ skill không thể tự biết: danh sách product/`object_key` hợp lệ, chính sách environment, kênh submit thật, sức ghi đè canon.
- **Nói ra bạn đã dùng gì.** Trong output, ghi một dòng: khuôn = bundled canonical; phụ lục = `<đường dẫn tìm thấy>` hoặc "không tìm thấy — dùng mặc định chung". **Không bao giờ fallback im lặng**: người gửi và agent nhận CCR đều cần biết CCR này được soạn theo khuôn nào.
- Xác định repo đích cũng có `knowledge/products/<product>/objects/_registry.json`, `kb.json`, `checklists/*.json`, `feature-summary.md`, `manifest.json` hay không — đây là nguồn để tra canon ở Bước 3. Nếu người dùng không nói rõ đường dẫn và không đang ở trong repo đó, hỏi thẳng: "CCR này cho product/repo nào, và bạn có sẵn đường dẫn tới bản `knowledge/` local để tôi tra canon không?"
- Không tra được canon (không có quyền/đường dẫn) → vẫn tiếp tục, nhưng ghi rõ trong Phần 3 của CCR là "không tra được canon" thay vì bịa hoặc bỏ qua bước này.

## Bước 1 — Thu thập input

- Lấy (các) Jira key/link người dùng cung cấp. Nếu người dùng chỉ mô tả thay đổi bằng lời (không có ticket) — vẫn làm được, bỏ qua bước fetch Jira, dùng thẳng mô tả họ đưa làm "Quan sát được", nhưng đánh dấu rõ nguồn là "mô tả trực tiếp từ người dùng", không phải Jira.
- **Không tự động quét Jira tìm thêm ticket liên quan** (không JQL search chủ động) — chỉ xử lý đúng ticket người dùng chỉ định. Nếu nghi ngờ có ticket liên quan khác chưa được nêu, hỏi người dùng thay vì tự tìm.

## Bước 2 — Đọc kỹ từng ticket Jira (READ-ONLY)

Dùng tool Atlassian đang có trong session (tên tool có thể khác nhau theo môi trường, thường có dạng `mcp__atlassian__*` hoặc `mcp__claude_ai_Atlassian__*` hoặc tương đương — nếu không chắc, dùng `ToolSearch` với từ khoá "jira" để tìm tool phù hợp trước khi gọi).

Với mỗi ticket, lấy đầy đủ:
- `summary`, `description`, `issuetype`, `status`/`resolution`, ngày `resolved`/`updated`.
- **Toàn bộ comment** (không chỉ description) — comment thường chứa "Context"/"Behaviour changes"/"Test cases" do dev tự viết, và đây thường là nguồn thông tin quan trọng nhất, chi tiết hơn cả description gốc. Đọc cả comment ai xác nhận gì, ngày nào.
- Link ra ticket/PR liên quan nếu có (linked issues, remote issue links) — không cần đọc sâu, chỉ ghi nhận để không bỏ sót phạm vi.

**Tra cứu test case liên quan (bắt buộc, phục vụ cột "Độ tin cậy" ở Bước 5):** với mỗi ticket/claim, chủ động tìm xem đã có test case nào chạy đúng hành vi đang nói tới chưa — dùng tool list/search test case đang có trong session của hệ thống quản lý test case (tên tool khác nhau theo môi trường/repo đích, thường có dạng `mcp__testlane__list_test_cases`, `mcp__qa-hub__list_test_cases` hoặc tương đương — không chắc tên thì dùng `ToolSearch` với từ khoá "test case" / "testlane" / "qa-hub" để tìm tool phù hợp trước khi gọi). Đây vẫn là thao tác READ-ONLY (list/search/get) — không tạo/sửa/xoá test case nào.
- Tìm theo ticket key, tên feature, và từ khoá mô tả hành vi được claim — đừng chỉ tìm đúng ticket key, vì test case thường không map 1:1 với ticket.
- Tìm thấy test case đã chạy và **PASS đúng hành vi đang được claim** (không phải test case liên quan chung chung, càng không phải test case của feature lân cận) → ghi lại làm ứng viên `confidence_source`: id test case, kết quả (PASS), ngày chạy, build/version. Đây là input trực tiếp cho cột "Độ tin cậy" ở Bước 5.
- Không tìm thấy, hoặc chỉ thấy test case chưa chạy/FAIL/không khớp đúng hành vi claim → ghi nhận thẳng "không có test case PASS phù hợp cho claim này", đừng chọn tạm một test case gần đúng để lấp chỗ trống.
- Không có tool/quyền truy cập hệ thống test case trong session hiện tại → ghi rõ "không tra được test case (không có tool truy cập trong session này)" — khác với "đã tra và không có" — để người gửi hoặc agent nhận CCR biết cần tự tra bổ sung, đừng mặc định coi như không tồn tại.

**Thu thập nguồn `dev_doc` (bắt buộc, phục vụ cột "Nguồn & độ mạnh" ở Bước 5):** đọc comment và link của ticket tìm **tài liệu dev sinh từ source code**, changelog/release note do dev viết, hoặc PR/commit diff mô tả đúng hành vi đang claim. Với mỗi cái tìm được, ghi lại đủ 4 thứ:

- **tên tài liệu như con người gọi nó** (không phải đường dẫn file),
- **version** (hoặc "v1" nếu là bản đầu),
- **ngày tài liệu được viết / ngày commit** — KHÔNG phải ngày bạn đọc nó, và **KHÔNG** lấy `resolutiondate`/`updated` của ticket thay cho nó,
- **trích nguyên văn** đoạn nói đúng hành vi đang claim.

Ngày này là field **có sức ghi đè canon** (contract §12.5): nó là thứ duy nhất dùng để so độ mới giữa CCR và canon hiện tại. Lấy sai ngày làm ghi đè **sai chiều**, và sai im lặng. Không tìm được ngày thật → ghi "không rõ" và biết rằng claim đó sẽ không ghi đè được gì.

`dev_doc` khác một comment tiện tay ở chỗ nó được generate có hệ thống từ code và được dev chủ động gửi như mô tả chính thức. Một comment kiểu "Ready to test" **không phải** `dev_doc`.

**Nguyên tắc READ-ONLY tuyệt đối:** KHÔNG bao giờ gọi bất kỳ tool Atlassian nào có tác dụng ghi — không `createJiraIssue`, không `editJiraIssue`, không `addCommentToJiraIssue`, không `transitionJiraIssue`, không thêm label. Kể cả khi CCR cần "escalate" một điều gì đó — việc escalate luôn nằm TRONG nội dung file CCR (Phần 4/note), không bao giờ là một hành động ghi lên Jira. Nếu người dùng yêu cầu skill này tự động comment/tạo issue Jira, từ chối và giải thích đây là việc nằm ngoài phạm vi skill, cần họ tự làm hoặc dùng công cụ khác một cách tường minh, có xác nhận riêng.

## Bước 3 — Tra canon hiện tại (nếu tra được)

Với object/feature nghi ngờ liên quan (dựa theo nội dung ticket):
- Grep `_registry.json` để tìm đúng `object_key`/`feature_key`, hoặc alias gần đúng. Không khớp gì → ghi thẳng, đừng bịa `object_key` mới.
- Grep `kb.json`, `checklists/*.json`, `feature-summary.md` liên quan bằng các từ khoá rút ra từ ticket. Trích nguyên văn KB-id/check-id đang nói gì (không diễn giải lại).
- Đọc `manifest.json` lấy context version hiện tại của object đó.
- Ghi lại chính xác từ khoá đã tra — giúp agent nhận CCR sau này phân biệt "canon không có" với "chưa tra tới".

## Bước 4 — Xác định Phần 0 (cần mấy CCR)

Áp 4 câu hỏi (người gỡ / điều kiện mở khoá / vòng đời / artifact đích — xem template) cho toàn bộ ticket đầu vào. Nếu cả 4 giống nhau cho tất cả ticket → 1 CCR duy nhất tổng hợp hết. Nếu có ticket lệch (vd 1 ticket cần dev trả lời trước, còn lại explore được ngay) → tách CCR, đừng gộp để tránh phần dễ bị kẹt theo phần khó.

**Đây là gợi ý, không phải quyết định cuối** — nêu rõ lý do đề xuất gộp/tách, để người dùng (Bước 7) xác nhận hoặc chỉnh lại.

## Bước 5 — Soạn "Phần 1a — Phạm vi thay đổi & ảnh hưởng ước tính" (phần quan trọng nhất)

Đây là phần khác biệt chính so với việc chỉ copy-paste ticket vào CCR.

**Trước hết: đặt `Claim ID`.** Mỗi claim/ticket riêng biệt được một id `CLAIM-01`, `CLAIM-02`… trong phạm vi file này. Cố ý **không** nhúng mã Proposal — lúc soạn, mã đó chưa tồn tại (hệ thống cấp lúc Submit); agent xử lý CCR sẽ tự namespace lại. `Claim ID` là khoá nối giữa Phần 1a ↔ Phần 1b ↔ Phần 5.1, nên nó phải duy nhất và xuất hiện ở cả ba chỗ.

Với MỖI claim, xác định rõ:

1. **Surface nào liên quan** — cụ thể (portal/api/storefront/db), dựa trên loại thay đổi (UI mới → portal; endpoint mới → api; hành vi buyer-facing → storefront; cột DB mới → db). Không ghi "tất cả" trừ khi thật sự có lý do.
2. **Quan hệ với canon** — `ADD` (chưa từng có) / `SUPERSEDES` (thay thế một item cụ thể) / `CONTRADICTS` (nói ngược canon nhưng chưa rõ bên nào đúng) / `UNKNOWN`. Ghi `SUPERSEDES` thì **bắt buộc** có `kb_id` ở Phần 1b và ngày nguồn ở Phần 5.1 — thiếu một trong hai, claim sẽ bị xử lý là `CONTRADICTS`, không ghi đè.
3. **Object/feature/checklist nào nhiều khả năng bị ảnh hưởng** — dùng kết quả Bước 3. Nếu 1 thay đổi có thể làm SAI (không chỉ thiếu) một checklist/automation đang chạy — nêu rõ, đây là tín hiệu ưu tiên cao.
4. Nếu nghi ngờ ranh giới object/feature hiện tại không còn hợp lý (nhiều ticket cùng nhóm hành vi nhưng đang nằm rải rác, hoặc ngược lại) — nêu Ý TƯỞNG, không tự đặt tên object_key mới, để lại cho agent xử lý CCR quyết khi build KB thật.
5. **Nguồn & độ mạnh** (cột bắt buộc) — với MỖI claim, ghi đúng **1 trong 5** trạng thái, dựa trên bằng chứng thu thập ở Bước 2:
   - `dev_doc` — tài liệu dev gen từ source / changelog / PR diff: tên + version + **ngày viết** + trích nguyên văn.
   - `spec_doc` — spec/PRD chính thức: tên + version/ngày + mục cụ thể.
   - `po_dev_confirm` — trích nguyên văn PO/Dev + link. Không tính comment mơ hồ ("chắc ổn", "để check sau") hay comment kỹ thuật thuần do dev tự viết ("Ready to test", "Resolution: Done" — xem phân biệt ở Bước 6).
   - `test_case` — id + PASS + ngày chạy + build, và test case kiểm **đúng** hành vi đang claim.
   - `KHÔNG CÓ NGUỒN` — mọi trường hợp còn lại. Screenshot/API capture tự chụp thuộc loại này.

   **Đừng tự nâng hạng.** Ghi `KHÔNG CÓ NGUỒN` không làm claim bị loại — nó vẫn vào KB, nhưng dưới dạng "đã quan sát thấy" với độ tin cậy thấp kèm open question, và không dùng làm expected result. Đó là kết cục đúng cho một claim chưa chứng minh được, và nó tốt hơn một claim được nâng hạng sai rồi thành oracle.

Không claim nào được để trống ở phần này — thà ghi "chưa rõ, cần agent tự đánh giá" (các cột khác) hoặc `KHÔNG CÓ NGUỒN` (cột nguồn) còn hơn bỏ trống hoặc viết mơ hồ.

### Bước 5b — Phần 1b: đề xuất địa chỉ trong KB

Một dòng cho mỗi `Claim ID`: `object_key` (từ `_registry.json`), `feature_key` (key có sẵn, hoặc `"MỚI: <slug>"`), `scope.role`, `scope.surface`, `kb_id` bị ảnh hưởng.

`scope.role` ở đây là **chỉ định** — KB item này áp dụng cho role nào — khác hẳn "Role liên quan" ở Phần 2, vốn chỉ là dữ kiện về nơi quan sát. Hai thứ có thể khác nhau hoàn toàn. `scope.environment` **không** đặt ở đây; nó là chính sách product (xem phụ lục).

### Bước 5c — Phần 5.1: evidence theo từng claim

Một block cho **mỗi** `Claim ID`, 1:1 với Phần 1a: loại nguồn, locator, link, **ngày của nguồn**, người viết/xác nhận, **trích nguyên văn**, file đính kèm.

Trích nguyên văn là phần quan trọng nhất của cả CCR: theo contract §5a, sau khi publish thì file CCR, Proposal và tài liệu dev đều **xoá được** — chỉ nội dung nằm trong CCR sống sót. Một claim chỉ có link mà không có quote sẽ thành provenance rỗng ngay khi nguồn bị dọn.

## Bước 6 — Điền các mục còn lại đúng cấu trúc template

Dùng khuôn chuẩn `references/ccr-template.md` cộng phụ lục product đã tìm ở Bước 0. Điền đầy đủ mọi Phần, đúng nhãn `[AGENT]`/`[BẠN]`:

- **Phần 4.1 (ai xác nhận)**: phân biệt rõ ràng comment kỹ thuật dev tự viết ("Ready to test", "Resolution: Done") KHÔNG PHẢI là PO/business sign-off. Chỉ ghi có xác nhận thật khi có bằng chứng PO/spec/business rõ ràng.
- **Phần 4.2 (KHÔNG đề xuất điều gì)**: bắt buộc điền cụ thể — số liệu tại thời điểm ship, tên object đề xuất, ranh giới feature đề xuất, v.v. đều KHÔNG được coi là đã duyệt.
- Không bao giờ tự nâng một quan sát/mô tả ticket thành `CONFIRMED_EXPECTED` hay tương đương — dù ticket ghi "Resolution: Done".

## Bước 7 — Xác nhận với người dùng các mục `[BẠN]`

Trước khi chốt file, hỏi rõ người dùng (không tự đoán):
- Phần 0: đồng ý số lượng CCR đề xuất chưa?
- Phần 4.1: có xác nhận PO/business thật nào ngoài Jira mà skill không biết không?
- Phần 4.4: mức độ gấp (HIGH/MEDIUM/LOW)?
- Bất kỳ chỗ nào skill đánh dấu "không rõ"/"không tra được" — người dùng có thông tin bổ sung không?
- **Cột "Độ tin cậy" ghi "CHƯA ĐỦ — cần re-explore" mà người gửi tin rằng hành vi đó thực ra đã được xác nhận:** KHÔNG tự đổi thành "ĐỦ TIN CẬY" chỉ vì người gửi khẳng định miệng. Hỏi ngược lại để họ cung cấp đúng trích dẫn cụ thể — id test case đã chạy PASS (kèm ngày chạy + build), hoặc quote nguyên văn + link PO/Dev confirm. Chỉ nâng trạng thái khi có trích dẫn đó trong tay; lời khẳng định của người gửi, một mình nó, không phải là một trong hai nguồn hợp lệ.

## Bước 8 — Redact & tự kiểm

- Quét toàn bộ nội dung sắp ghi ra: bỏ email/số điện thoại/tên khách hàng thật/token/cookie/credential. Tên nội bộ nhân viên trong comment Jira thường chấp nhận được, nhưng vẫn nêu rõ nếu không chắc.
- Chạy đúng checklist "Tự kiểm trước khi gửi" ở cuối khuôn. Bốn chỗ dễ sai nhất:
  - không còn placeholder `<<< ... >>>` nào sót lại;
  - mỗi claim có **`Claim ID` duy nhất** ở Phần 1a, và **đúng 1 block tương ứng** ở Phần 5.1 cùng **1 dòng** ở Phần 1b — ba chỗ phải khớp id với nhau;
  - mọi claim ghi `dev_doc`/`spec_doc`/`po_dev_confirm`/`test_case` đều có **ngày nguồn cụ thể** (không phải "không rõ");
  - mọi claim có **trích nguyên văn** thật, không phải diễn giải — đây là thứ duy nhất sống sót sau khi nguồn gốc bị xoá.

## Bước 9 — Ghi file & báo cáo

- Ghi mỗi CCR ra một file `.md` riêng (tên gợi ý: `CCR-<YYYY-MM-DD>-<slug-ngắn>.md`), đặt ở nơi hợp lý (thư mục hiện tại làm việc, hoặc theo chỉ định người dùng).
- Báo cáo ngắn gọn: số CCR đã tạo, đường dẫn file, tóm tắt loại request + object mỗi CCR, **khuôn và phụ lục đã dùng** (Bước 0), và bước tiếp theo.
- Bước tiếp theo gồm **hai** việc, nói rõ cả hai: (1) người dùng tự đính kèm file vào task và bấm **Submit** — skill không làm thay; (2) sau Submit, **trigger xử lý** theo đúng kênh mà phụ lục product nêu. Ở nhiều hệ thống, kéo card trên board context **không** trigger gì — nếu phụ lục nói kênh khác (vd kéo Task trên agent board), nhắc đúng kênh đó, đừng nhắc chung chung "chờ agent nhặt".

## Rào chắn bắt buộc

- **KHÔNG bao giờ** gọi tool Atlassian có tác dụng ghi (create/edit/comment/transition/label) — chỉ đọc.
- **KHÔNG tự submit** CCR lên bất kỳ hệ thống nào (QA Hub hay khác) — chỉ tạo file local.
- **KHÔNG tự quét Jira** tìm thêm ticket ngoài phạm vi người dùng chỉ định.
- **KHÔNG bịa** `object_key`/`feature_key` không có trong registry của repo đích.
- **KHÔNG nâng** observation/comment dev thành `CONFIRMED_EXPECTED` — mặc định luôn là cần re-verify (`OBSERVED_CURRENT` hoặc tương đương).
- **KHÔNG tự chọn phía** khi phát hiện nội dung ticket mâu thuẫn với canon hiện tại — ghi cả hai phía vào Phần 3, để agent xử lý CCR quyết định.
- Nếu người dùng yêu cầu vượt quá phạm vi này (vd "tự attach vào QA Hub luôn", "tự comment vào ticket Jira báo đã xử lý") — dừng lại, giải thích đây là hành động ngoài phạm vi skill và cần họ xác nhận/thực hiện riêng, không tự ý làm.
