'use client';

import * as React from 'react';
import type { CustomerRequest } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { linkCustomerRequest } from '@/controllers/settings-completion-controller';

export interface CustomerRequestsPanelProps {
  workspaceId: string;
  requests: CustomerRequest[];
  stories: Array<{ id: string; identifier: string; title: string }>;
  className?: string;
  onRequestLinked?: (request: CustomerRequest) => void;
}

export function CustomerRequestsPanel({
  workspaceId,
  requests,
  stories,
  className,
  onRequestLinked,
}: CustomerRequestsPanelProps): React.ReactElement {
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleLinkStory = React.useCallback(
    async (requestId: string, storyId: string) => {
      setBusyId(requestId);
      try {
        const linked = await linkCustomerRequest({ workspaceId, requestId, storyId });
        onRequestLinked?.(linked);
      } finally {
        setBusyId(null);
      }
    },
    [workspaceId, onRequestLinked],
  );

  return (
    <section
      className={cn('rounded-lg border border-border bg-card', className)}
      data-testid="customer-requests-panel"
    >
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Customer requests</h3>
      </header>
      {requests.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground" data-testid="customer-requests-empty">
          No customer requests yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {requests.map((request) => (
            <li key={request.id} className="space-y-2 px-4 py-3" data-testid="customer-request-row">
              <p className="text-sm text-foreground">{request.quote}</p>
              <p className="text-xs text-muted-foreground">
                {request.requester_name ?? 'Anonymous'} · {request.source}
              </p>
              {request.story_ids.length > 0 ? (
                <p className="text-xs text-muted-foreground" data-testid={`linked-stories-${request.id}`}>
                  Linked stories: {request.story_ids.join(', ')}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Link to story:</span>
                  {stories.slice(0, 3).map((story) => (
                    <Button
                      key={story.id}
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === request.id}
                      data-testid={`link-request-${request.id}-to-${story.id}`}
                      onClick={() => void handleLinkStory(request.id, story.id)}
                    >
                      {story.identifier}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
