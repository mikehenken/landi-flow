# Client controllers

Intent dispatchers that call REST/MCP-backed APIs. Views never mutate stores directly — they invoke controller methods that:

1. Apply optimistic updates via domain stores
2. POST/PATCH to `/api/v1/workspaces/{wid}/stories|epics|…`
3. Reconcile on response or roll back on error (OBS-001 correlation_id in error toasts)

Implemented in Phase 09 (`task-09a-frontend`).
