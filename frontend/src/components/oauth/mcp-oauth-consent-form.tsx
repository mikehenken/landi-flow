'use client';

import * as React from 'react';
import { Button, cn } from '@landi-flow/ui';
import { ShieldCheck } from 'lucide-react';
import { useWorkspaceMemberships } from '@/hooks/use-workspace-memberships';
import type { McpOAuthAuthorizeParams } from '@/lib/oauth/mcp-consent';
import {
  buildOAuthAccessDeniedRedirect,
  describeMcpOAuthScopes,
  serializeMcpOAuthParams,
} from '@/lib/oauth/mcp-consent';

export interface McpOAuthConsentFormProps {
  oauthParams: McpOAuthAuthorizeParams;
  clientName?: string | null;
  className?: string;
}

/**
 * Browser consent UI for MCP OAuth — workspace picker, scope summary, approve/deny.
 * Approve forwards to `/api/oauth/mcp/authorize` with the session cookie JWT.
 */
export function McpOAuthConsentForm({
  oauthParams,
  clientName,
  className,
}: McpOAuthConsentFormProps): React.ReactElement {
  const { workspaces, loading, error } = useWorkspaceMemberships();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);
  const scopeSummary = React.useMemo(
    () => describeMcpOAuthScopes(oauthParams.scope),
    [oauthParams.scope],
  );

  React.useEffect(() => {
    if (workspaces.length === 1 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0]!.id);
    }
  }, [selectedWorkspaceId, workspaces]);

  const displayClient = clientName?.trim() || oauthParams.client_id;

  const handleApprove = React.useCallback((): void => {
    if (!selectedWorkspaceId || submitting) {
      return;
    }
    setSubmitting(true);
    const query = serializeMcpOAuthParams(oauthParams, selectedWorkspaceId);
    window.location.assign(`/api/oauth/mcp/authorize?${query}`);
  }, [oauthParams, selectedWorkspaceId, submitting]);

  const handleDeny = React.useCallback((): void => {
    if (oauthParams.redirect_uri) {
      window.location.assign(
        buildOAuthAccessDeniedRedirect(oauthParams.redirect_uri, oauthParams.state),
      );
      return;
    }
    window.location.assign('/workspace/inbox');
  }, [oauthParams.redirect_uri, oauthParams.state]);

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-lg flex-col gap-6 rounded-lg border border-border bg-card p-8 shadow-sm',
        className,
      )}
      data-testid="mcp-oauth-consent"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-brand-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Authorize MCP access</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{displayClient}</span> is requesting
            access to your Landi Flow workspace via MCP.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Requested permissions
        </p>
        <ul className="space-y-1 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
          {scopeSummary.map((line) => (
            <li key={line} className="text-foreground">
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="mcp-oauth-workspace"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Workspace
        </label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading workspaces…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : workspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workspaces found. Create a workspace before authorizing MCP access.
          </p>
        ) : (
          <select
            id="mcp-oauth-workspace"
            data-testid="mcp-oauth-workspace-select"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={selectedWorkspaceId}
            onChange={(event) => setSelectedWorkspaceId(event.target.value)}
            disabled={submitting}
          >
            <option value="" disabled>
              Select a workspace…
            </option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" disabled={submitting} onClick={handleDeny}>
          Deny
        </Button>
        <Button
          type="button"
          disabled={submitting || !selectedWorkspaceId || loading || Boolean(error)}
          data-testid="mcp-oauth-approve"
          onClick={handleApprove}
        >
          {submitting ? 'Authorizing…' : 'Approve'}
        </Button>
      </div>
    </div>
  );
}
