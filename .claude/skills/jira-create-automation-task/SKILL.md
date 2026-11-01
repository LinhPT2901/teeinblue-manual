---
name: jira-create-automation-task
description: This skill should be used when the user asks to create a Jira issue, ticket, or task for automation work just done, including requests such as "create issue for this test", "tạo Jira task", "đưa test case vừa làm lên Jira", or "log this in Jira". Creates a new TeeInBlue automation Task in Jira project QA with a structured test-case and implementation Description derived from the current automation work.
---

# Jira Create Automation Task

Create one new Jira Task for the automation work in the current conversation. Do not update or reuse an existing issue unless the user explicitly asks.

## Fixed Jira configuration

Use these values without asking the user to repeat them:

- Project: `QA - Testing Management` (`QA`)
- Board: `QA - Automation Testing`
- Issue type: `Task`
- Summary: `[TIB] <concise task content>`
- Assignee: current user, verified as `Linh Pham`
- Components:
  - `QA - Automation UI testing`
  - `QA - teeinblue`
- Final status: `In Progress`

A Jira board is not an issue field. Use the board only to validate that the created issue matches the board filter or appears on the board; never invent a `board` field in the create payload.

## Required tools

Use the Atlassian MCP tools (`mcp__atlassian__*` in this environment; some environments name them `mcp__claude_ai_Atlassian__*` — use whichever is present) for Jira operations:

1. `getAccessibleAtlassianResources` / `getVisibleJiraProjects` — resolve the Jira cloud site and the `QA` project.
2. `getJiraProjectIssueTypesMetadata` or `getJiraIssueTypeMetaWithFields` — resolve the `Task` issue type and required fields.
3. `atlassianUserInfo` and/or `lookupJiraAccountId` — resolve the current user and verify the display name is `Linh Pham`.
4. Resolve both component names (`QA - Automation UI testing`, `QA - teeinblue`) to their Jira values/IDs via the issue-type field metadata.
5. `createJiraIssue` — create the issue.
6. `getTransitionsForJiraIssue` then `transitionJiraIssue` — move the issue to `In Progress`.
7. `getJiraIssue` — fetch the created issue and verify all saved fields.
8. `searchJiraIssuesUsingJql` — when board membership needs checking, query the board's underlying filter/JQL; there is no dedicated board-membership tool.

Use focused local repository reads (via the Bash tool) for implementation context:

- `rg --files`
- `rg "<feature keyword>"`
- `sed -n '<start>,<end>p' <file>` (or the Read tool)
- `git status --short`

Never read or expose secret values (e.g. `.env` contents).

## Workflow

1. Derive the task content from the user's request, the current conversation, and the automation files just created or updated.
2. Inspect the relevant implementation files. Prioritize:
   - `tests/`
   - `pages/`
   - `components/`
   - `fixtures/`
   - `helpers/`
   - `playwright.config.ts`
   - API clients and test-data helpers when relevant.
3. Determine the test flow, preconditions, test data, assertions, async behavior, cleanup expectations, related files, run command, and actual verification status.
4. Build a concise Summary:
   - Start with `[TIB] ` exactly once.
   - Describe the task outcome, not a generic label such as "Automation task".
   - Example: `[TIB] Auto-dismiss portal popup notifications in UI tests`.
5. Build the Description using the template below.
6. Resolve all Jira metadata before creating the issue. Do not guess user, component, issue-type, transition, or project IDs.
7. Create the Task in project `QA` with the Summary, Description, assignee, and both components.
8. Transition the created issue to `In Progress`. If `In Progress` is already the initial status, do not transition it again.
9. Read the issue back and verify:
   - Project key is `QA`.
   - Issue type is `Task`.
   - Summary starts with `[TIB] `.
   - Assignee is `Linh Pham`.
   - Both required components are present.
   - Status is `In Progress`.
   - Description contains the expected structured sections.
10. Verify board membership when supported. If board membership cannot be checked, state that clearly without treating `Board` as an issue field.

## Description template

Use this structure by default:

```markdown
## Overview
<Short summary of the feature/test and user value.>

## Automation Coverage
- Spec: `<path/to/spec.ts>`
- Project: `<playwright project or test suite>`
- Flow covered: <happy path/regression/API/etc.>

## Preconditions
- <Required account/env vars/permissions/store/setup>
- <Required feature flags or existing data>

## Test Data
- <How data is selected/created>
- <Generated data naming rule, if any>
- <Cleanup expectation, if any>

## Test Case
1. <Step 1>
2. <Step 2>
3. <Step 3>

## Expected Results
- <Expected result 1>
- <Expected result 2>

## Assertions
- <Assertion 1>
- <Assertion 2>

## Implementation Notes
- <Page Object/component/helper responsibilities>
- <Async handling/polling/waits>
- <Error handling or known risk>

## Related Files
- `<path>` - <why it matters>
- `<path>` - <why it matters>

## Run / Verification
- `<command>`
- Verification status: <listed only / run passed / not run>

## Notes / Risks
- <Flakiness risk, external dependency, long-running job, persistent data, or follow-up>
```

## Description rules

- Use Atlassian Document Format (ADF) by default when the `createJiraIssue`/`editJiraIssue` tools support it.
- Represent section titles with level-2 `heading` nodes.
- Represent steps with `orderedList` and other lists with `bulletList`.
- Put each list item inside a `listItem` containing a `paragraph`.
- Use `code` and `strong` text marks instead of literal Markdown delimiters.
- If only Markdown is supported, use simple Markdown headings and lists; do not use Jira wiki markup such as `h2.`.
- Include concrete UI labels, statuses, file paths, timeouts, polling, generated data, and cleanup behavior when relevant.
- Mention environment variable names only, never their values.
- Do not claim a test passed unless it was actually run successfully.
- If a section is not applicable, omit it rather than adding filler.

## TeeInBlue automation defaults

- Portal E2E project: `portal-e2e`
- Storefront E2E project: `storefront-e2e`
- API project: `api`
- Portal credential variables:
  - `TIB_PORTAL_EMAIL`
  - `TIB_PORTAL_PASSWORD`
- Common run command:
  - `npx playwright test <spec-path> --project=<project-name>`

## Failure handling

- If the current Jira user is not verified as `Linh Pham`, stop before creation and ask the user to confirm the correct assignee.
- If either required component cannot be resolved, stop before creation and report which component is missing.
- If issue creation succeeds but transition or verification fails, keep the created issue, report its key/link, and explain the incomplete step. Do not create a duplicate.
- If an equivalent issue already exists, do not silently reuse it; the requested default is to create a new issue.

## Final response

Include:

- Created issue key and link.
- Summary.
- Assignee, components, and final status.
- Whether board membership was verified.
- Main Description sections added.
- Files inspected and whether repository files were changed.
