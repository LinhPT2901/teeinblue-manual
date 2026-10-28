# teeinblue-manual

Bộ công cụ QA cho teeinblue chạy trên Claude Code: các skill và agent phủ toàn bộ quy trình test, từ đọc ticket Jira tới chạy test case trên staging và ghi kết quả về Testlane. Kèm theo là Postman collection, Playwright test và script hỗ trợ.

## Quy trình

```
Jira ticket
  └─ qa-requirement-analysis   phân tích requirement, câu hỏi cho PO/Dev, Readiness Score
       └─ gen-testcase         sinh test case, tạo thẳng lên Testlane
            └─ create-test-data   dựng data trên staging (agent tib-test-data) + Postman collection
                 └─ tib-execute-testcase   chạy case bằng Playwright, cập nhật status về Testlane
```

## Thành phần

| Đường dẫn | Nội dung |
|---|---|
| `.claude/skills/qa-requirement-analysis` | Phân tích Jira/user story trước khi viết test case. Thư mục `rules/` chứa rule nghiệp vụ theo từng module |
| `.claude/skills/gen-testcase` | Sinh test case và tạo lên Testlane (Project → Task → Test Case). Có script xuất xlsx / Google Sheets |
| `.claude/skills/create-test-data` | Suy ra test data cần cho một task Testlane, gọi agent `tib-test-data`, tạo Postman collection |
| `.claude/skills/create-ccr` | Soạn Context Change Request từ ticket đã ship để cập nhật QA context |
| `.claude/skills/jira-create-automation-task` | Tạo task Jira cho phần việc automation vừa làm |
| `.claude/agents/tib-test-data.md` | Tạo campaign/artwork/layer trên staging portal qua UI (Playwright MCP) |
| `.claude/agents/tib-execute-testcase.md` | Chạy test case trên Testlane, verify trên staging, ghi status + actual result |
| `.claude/agents/tib-genai-timing.md` | Đo thời gian upload và xử lý GenAI trên storefront, xác định model AI |
| `.claude/tib-portal-flows.md` | Ghi chú các luồng UI portal mà agent dùng khi điều khiển browser |
| `apis/` | Postman collection theo ticket, cùng script sinh collection từ Redoc |
| `tests/`, `playwright.config.ts` | Playwright test (upload ảnh, server-side upload) |
| `scripts/` | Tạo token Open API, đẩy collection/environment lên Postman, login Shopify |
| `docs/` | QA checklist (artwork 2.0, layer, paragraph, checkout extensions) |
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
