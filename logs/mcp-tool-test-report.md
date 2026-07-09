# Landi Flow MCP Tool Test Report

**Date:** 2026-07-09T07:08:17.382Z
**Base URL:** http://127.0.0.1:8787
**Workspace:** 454e8fba-98cf-4097-b3b2-a40b72da10c2
**Tools:** 21

| Tool | Write | Status | Detail |
|------|-------|--------|--------|
| collab.join_story_room | no | pass | ok |
| collab.broadcast_typing | no | pass | ok |
| flow.search | no | pass | ok |
| epic.list | no | pass | ok |
| epic.get | no | pass | ok |
| epic.create | yes | pass | ok |
| epic.update | yes | pass | ok |
| story.list | no | pass | ok |
| story.get | no | pass | ok |
| story.create | yes | pass | ok |
| story.update | yes | pass | ok |
| story.assign | yes | pass | ok |
| epic.assign | yes | pass | ok |
| story.decompose | yes | pass | ok |
| comment.create | yes | pass | ok |
| comment.reply | yes | pass | ok |
| comment.create_as_proxy | yes | pass | ok |
| signal.attach | yes | pass | ok |
| ai.draft_story | no | skip-config | AI Gateway request failed (403): {"success":false,"result":[],"messages":[],"error":[{"code":2036,"message":"This featur |
| agent.list | no | pass | ok |
| members.list | no | pass | ok |

**Pass:** 20 | **Skip:** 1 | **Fail:** 0

## Cursor MCP verification

- Workspace server: `project-2-landi-flow-landi-flow-local` (HTTP `http://127.0.0.1:8787/mcp`, Bearer `LANDI_FLOW_MCP_TOKEN`).
- Tool names use **dots** (e.g. `story.list`, not `story_list`).
- This run exercised the same JSON-RPC `tools/call` path as Cursor Streamable HTTP MCP (harness: `scripts/test-mcp-tools.mjs`).

## Skipped tools (external dependency)

| Tool | Reason | Remediation |
|------|--------|-------------|
| `ai.draft_story` | Cloudflare AI Gateway HTTP 403, internal code **2036**: *This feature is not enabled for this gateway* | In Cloudflare dashboard, enable the required AI Gateway feature for gateway id `CLOUDFLARE_AI_GATEWAY_ID` (vars present in `.dev.vars`). Not a landi-flow MCP bug. |

## Harness fix (2026-07-09)

`comment.reply` now chains `parent_id` from the preceding `comment.create` result so FK validation passes in dev.
