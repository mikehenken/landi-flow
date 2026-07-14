'use client';

import * as React from 'react';
import type { Epic, Story } from '@landi-flow/core/types';
import { Button } from '@landi-flow/ui';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { SEED_CUSTOMERS } from '@/lib/seed-data';
import {
  linkCustomerToEpic,
  listEpicCustomerLinks,
} from '@/lib/epic-surfaces/epic-surfaces-store';
import { useWorkspace } from '@/lib/workspace';

export interface EpicCustomersTabProps {
  epic: Epic;
}

/** Epic Customers tab. */
export function EpicCustomersTab({ epic }: EpicCustomersTabProps): React.ReactElement {
  const [links, setLinks] = React.useState(() => listEpicCustomerLinks(epic.id));

  const reload = (): void => {
    setLinks(listEpicCustomerLinks(epic.id));
  };

  const customers = links
    .map((link) => SEED_CUSTOMERS.find((customer) => customer.id === link.customer_id))
    .filter((customer): customer is NonNullable<typeof customer> => customer !== undefined);

  return (
    <div className="p-6" data-testid="epic-customers-tab" data-cap="CAP-045">
      <h2 className="text-sm font-semibold mb-3">Customers</h2>
      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No customers linked.</p>
      ) : (
        <ul className="space-y-2">
          {customers.map((customer) => (
            <li
              key={customer.id}
              className="rounded-md border border-border px-3 py-2 text-sm"
              data-testid="epic-customer-row"
            >
              {customer.name} · {customer.domain}
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="mt-4"
        onClick={() => {
          linkCustomerToEpic(epic.id, 'customer-acme');
          reload();
        }}
        data-testid="epic-customer-link"
      >
        Link Acme Corp
      </Button>
    </div>
  );
}

export interface EpicTeamSubTabsProps {
  epic: Epic;
  stories: Story[];
  activeTeamId: string;
  onTeamChange: (teamId: string) => void;
  children: React.ReactNode;
}

/** Multi-team epic sub-tabs filter stories by team — labels from live roster. */
export function EpicTeamSubTabs({
  epic,
  stories,
  activeTeamId,
  onTeamChange,
  children,
}: EpicTeamSubTabsProps): React.ReactElement {
  const { workspace } = useWorkspace();
  const { teams } = useWorkspaceTeams(workspace.id);

  const teamIds = React.useMemo(() => {
    const fromStories = new Set(
      stories.filter((s) => s.epic_id === epic.id).map((s) => s.team_id),
    );
    for (const team of teams) {
      fromStories.add(team.id);
    }
    return [...fromStories];
  }, [epic.id, stories, teams]);

  const labelForTeam = (teamId: string): string => {
    const match = teams.find((team) => team.id === teamId);
    if (match?.name?.trim()) {
      return match.name.trim();
    }
    // Demo slug fallbacks without hardcoding a wrong live name.
    if (teamId === 'team-design') {
      return 'Design';
    }
    if (teamId === 'team-engineering') {
      return 'Engineering';
    }
    return 'Team';
  };

  return (
    <div data-testid="epic-team-subtabs" data-cap="CAP-047">
      <div className="flex gap-1 border-b border-border px-6 pb-2 pt-4" role="tablist">
        {teamIds.map((teamId) => (
          <Button
            key={teamId}
            type="button"
            role="tab"
            size="sm"
            variant={activeTeamId === teamId ? 'default' : 'ghost'}
            onClick={() => onTeamChange(teamId)}
            data-testid={`epic-team-tab-${teamId}`}
          >
            {labelForTeam(teamId)}
          </Button>
        ))}
      </div>
      {children}
    </div>
  );
}
