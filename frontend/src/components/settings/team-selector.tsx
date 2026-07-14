'use client';

import * as React from 'react';
import type { Team } from '@landi-flow/core/types';
import { cn } from '@landi-flow/ui';

export interface TeamSelectorProps {
  teams: Team[];
  teamId: string | null;
  onTeamIdChange: (teamId: string) => void;
  loading?: boolean;
  className?: string;
  testId?: string;
}

/** Settings panel team picker — loads from workspace teams API. */
export function TeamSelector({
  teams,
  teamId,
  onTeamIdChange,
  loading = false,
  className,
  testId = 'settings-team-selector',
}: TeamSelectorProps): React.ReactElement {
  if (loading) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)} data-testid={testId}>
        Loading teams…
      </p>
    );
  }

  if (teams.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)} data-testid={testId}>
        No teams yet — create one under Workspace settings → Teams.
      </p>
    );
  }

  return (
    <label className={cn('flex flex-col gap-1 text-sm', className)}>
      <span className="text-muted-foreground">Team</span>
      <select
        data-testid={testId}
        value={teamId ?? teams[0]?.id ?? ''}
        onChange={(event) => onTeamIdChange(event.target.value)}
        className="h-9 max-w-xs rounded-md border border-border bg-background px-3 text-sm"
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}
