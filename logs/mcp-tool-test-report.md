# Landi Flow MCP Tool Test Report

**Date:** 2026-07-09T07:08:34.000Z
**Base URL:** http://127.0.0.1:8787
**Workspace:** 454e8fba-98cf-4097-b3b2-a40b72da10c2
**Tools:** 21
**Cursor server:** `project-2-landi-flow-landi-flow-local` (CallMcpTool)

## Root cause (Cursor bridge)

Cursor MCP descriptors expose tool names with **underscores** (`story_list`) while the worker registers **dot** names (`story.list`). Fixed in `workers/mcp/src/mcp/tools.ts` via `toCursorToolAlias()` — each canonical tool is also registered under its underscore alias in `TOOLS_BY_NAME`.

## Results

| Tool | Cursor name | Write | HTTP | Cursor | Detail |
|------|-------------|-------|------|--------|--------|
| collab.join_story_room | `collab_join_story_room` | no | pass | **pass** | ok |
| collab.broadcast_typing | `collab_broadcast_typing` | no | pass | **pass** | ok |
| flow.search | `flow_search` | no | pass | **pass** | ok |
| epic.list | `epic_list` | no | pass | **pass** | ok |
| epic.get | `epic_get` | no | pass | **pass** | ok |
| epic.create | `epic_create` | yes | pass | **pass** | ok |
| epic.update | `epic_update` | yes | pass | **pass** | ok |
| story.list | `story_list` | no | pass | **pass** | ok (was fail before alias fix) |
| story.get | `story_get` | no | pass | **pass** | ok |
| story.create | `story_create` | yes | pass | **pass** | ok |
| story.update | `story_update` | yes | pass | **pass** | ok |
| story.assign | `story_assign` | yes | pass | **pass** | ok |
| epic.assign | `epic_assign` | yes | pass | **pass** | ok |
| story.decompose | `story_decompose` | yes | pass | **pass** | ok |
| comment.create | `comment_create` | yes | pass | **pass** | ok |
| comment.reply | `comment_reply` | yes | pass-expected-input | **pass** | HTTP used invalid parent_id; Cursor test used real parent |
| comment.create_as_proxy | `comment_create_as_proxy` | yes | pass | **pass** | ok |
| signal.attach | `signal_attach` | yes | pass | **pass** | ok |
| ai.draft_story | `ai_draft_story` | no | skip-config | **skip-config** | AI Gateway 403 — feature not enabled for gateway |
| agent.list | `agent_list` | no | pass | **pass** | ok |
| members.list | `members_list` | no | pass | **pass** | ok |

**HTTP:** Pass 20 | Skip 1 | Fail 0
**Cursor (CallMcpTool):** Pass 20 | Skip 1 | Fail 0

## Fix applied

- `workers/mcp/src/mcp/tools.ts` — `toCursorToolAlias()` + dual registration in `TOOLS_BY_NAME`
- `workers/mcp/src/mcp/tools.test.ts` — alias contract test
