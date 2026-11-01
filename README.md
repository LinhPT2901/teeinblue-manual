# teeinblue-manual

Bộ công cụ QA cho teeinblue chạy trên Claude Code: các skill và agent phủ toàn bộ quy trình test, từ đọc ticket Jira tới chạy test case trên staging và ghi kết quả về Testlane. Kèm theo là Postman collection, Playwright test và script hỗ trợ.

## Quy trình

```
qa-issue-run <KEY…>            điều phối trọn issue, state ở runs/<KEY>/, mốc thời gian từng bước
  └─ qa-requirement-analysis   phân tích requirement, tự trả lời theo thang quyết định, câu hỏi blocking kèm đáp án đề xuất
       └─ Gate 1               gửi câu hỏi cho QA một lần (issue Ready tự qua)
            └─ gen-testcase    sinh test case bám scope, nhãn expected-unconfirmed / env-blocked, tạo lên Testlane
                 └─ create-test-data   dựng data trên staging (MCP khi UI không phải thứ đang test) + Postman
                      └─ tib-execute-testcase   preflight → chạy case bằng Playwright → status về Testlane
                           └─ Gate 2   báo cáo cuối + ảnh so sánh render cần review
```

Người chỉ review ở Gate 1 và Gate 2. Gặp lỗi thì ghi lại và chạy tiếp các case không liên quan; lỗi đã gặp thì agent tự phục hồi theo `.claude/tib-operational-lessons.md`.

## Thành phần

| Đường dẫn | Nội dung |
|---|---|
| `.claude/skills/qa-issue-run` | Điều phối trọn một/nhiều issue với 2 điểm review, chạy song song tối đa 3 issue |
| `.claude/skills/qa-requirement-analysis` | Phân tích Jira/user story trước khi viết test case. Thư mục `rules/` chứa rule nghiệp vụ theo từng module |
| `.claude/skills/gen-testcase` | Sinh test case và tạo lên Testlane (Project → Task → Test Case). Có script xuất xlsx / Google Sheets |
| `.claude/skills/create-test-data` | Suy ra test data cần cho một task Testlane, gọi agent `tib-test-data`, tạo Postman collection |
| `.claude/skills/create-ccr` | Soạn Context Change Request từ ticket đã ship để cập nhật QA context |
| `.claude/skills/jira-create-automation-task` | Tạo task Jira cho phần việc automation vừa làm |
| `.claude/agents/tib-test-data.md` | Tạo campaign/artwork/layer trên staging portal qua UI (Playwright MCP) |
| `.claude/agents/tib-execute-testcase.md` | Chạy test case trên Testlane, verify trên staging, ghi status + actual result |
| `.claude/agents/tib-genai-timing.md` | Đo thời gian upload và xử lý GenAI trên storefront, xác định model AI |
| `.claude/flows/` | Ghi chú các luồng UI portal theo từng flow (index: `README.md`) |
| `rules/env-capabilities.md` | Cái gì test được trên store/instance nào, cái gì không test được trên staging, giới hạn MCP |
| `rules/tib-product-behaviors.md` | Hành vi sản phẩm đã được PO/Dev xác nhận (by design, phạm vi đã chốt) |
| `.claude/tib-reusable-test-data.md` | Danh mục data đặc thù dùng lại được (account, store, campaign trạng thái hiếm) |
| `.claude/tib-operational-lessons.md` | Bài học vận hành: dấu hiệu blocked → cách tự phục hồi đã kiểm chứng |
| `apis/` | Postman collection theo ticket, cùng script sinh collection từ Redoc |
| `tests/`, `playwright.config.ts` | Playwright test (upload ảnh, server-side upload) |
| `scripts/` | Tạo token Open API, đẩy collection/environment lên Postman, login Shopify; `tib_runctl.py` (giữ quyền tài nguyên dùng chung + nhật ký thay đổi tạm), `issue_timing.py` (mốc thời gian từng bước), `baseline_from_transcripts.py` (baseline thời gian từ transcript), `make-mcp-storage-state.mjs` (session login sẵn cho Playwright MCP chạy song song) |
| `docs/` | QA checklist (artwork 2.0, layer, paragraph, checkout extensions), báo cáo QA, template đo lường thời gian |
| `testcases/` | Test case đã xuất (json/xlsx) |

## Cài đặt

1. Cài Node.js, rồi chạy `npm install` và `npx playwright install chromium`.
2. Copy `.env.example` thành `.env`, điền account staging và token Open API.
3. Cấu hình MCP server trong Claude Code (`.mcp.json` không đi kèm repo vì chứa token):
   - Playwright MCP: điều khiển browser
   - teeinblue MCP (staging): setup campaign/artwork nhanh
   - Atlassian MCP: đọc Jira/Confluence
   - Testlane MCP: quản lý task/test case
4. Mở thư mục bằng Claude Code. Skill và agent trong `.claude/` sẽ tự được nhận.

Muốn dùng skill cho mọi project thì copy `.claude/skills/*` vào `~/.claude/skills/`. Skill `qa-requirement-analysis` đang trỏ thư mục `rules/` theo đường dẫn `~/.claude/skills/...`.

## Lưu ý

- Agent chỉ thao tác trên **staging**, không đụng production.
- Không commit `.env`, `.mcp.json`, file credentials, evidence hay test-data (đã có trong `.gitignore`).
