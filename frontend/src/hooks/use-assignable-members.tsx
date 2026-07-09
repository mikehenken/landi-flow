'use client';

import * as React from 'react';
import type { AssignableMember } from '@landi-flow/core/types';
import type { PickerMember } from '@landi-flow/ui';
import {
  fetchAssignableMembers,
  getAgentNameFromMembers,
  getHumanNameFromMembers,
  getMemberByIdFromMembers,
  isMockAuthEnabled,
} from '@/lib/agents/roster-client';
import { MOCK_ASSIGNABLE_MEMBERS } from '@/lib/agents/mock-roster';
import { isWorkspaceUuid, useWorkspace } from '@/lib/workspace';

export interface AssignableMembersContextValue {
  members: AssignableMember[];
  pickerMembers: PickerMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getMemberById: (id: string | null | undefined) => AssignableMember | undefined;
  getHumanName: (userId: string | null | undefined) => string | null;
  getAgentName: (agentId: string | null | undefined) => string | null;
}

const AssignableMembersContext = React.createContext<AssignableMembersContextValue | null>(
  null,
);

let cachedRosterWorkspaceId: string | null = null;
let cachedRosterMembers: AssignableMember[] | null = null;

function toPickerMembers(members: AssignableMember[]): PickerMember[] {
  return members.map((member) => ({
    kind: member.kind,
    id: member.id,
    name: member.name,
    avatar_url: member.avatar_url,
    presence: member.presence,
    subtitle: member.subtitle,
    runtime: member.runtime ?? undefined,
    vendor: member.vendor ?? undefined,
    connection_state: member.connection_state ?? undefined,
    is_builtin: member.is_builtin,
  }));
}

function initialRosterState(): AssignableMember[] {
  if (isMockAuthEnabled()) {
    return MOCK_ASSIGNABLE_MEMBERS;
  }
  if (cachedRosterMembers !== null) {
    return cachedRosterMembers;
  }
  return [];
}

export function AssignableMembersProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { workspace } = useWorkspace();
  const [members, setMembers] = React.useState<AssignableMember[]>(initialRosterState);
  const [loading, setLoading] = React.useState(
    () =>
      !isMockAuthEnabled() &&
      !(cachedRosterWorkspaceId !== null && cachedRosterMembers !== null),
  );
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!isMockAuthEnabled() && !isWorkspaceUuid(workspace.id)) {
      if (cachedRosterWorkspaceId !== workspace.id) {
        setLoading(true);
      }
      setError(null);
      return;
    }

    if (cachedRosterWorkspaceId === workspace.id && cachedRosterMembers !== null) {
      setMembers(cachedRosterMembers);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const roster = await fetchAssignableMembers(workspace.id);
      cachedRosterWorkspaceId = workspace.id;
      cachedRosterMembers = roster;
      setMembers(roster);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
      setMembers(isMockAuthEnabled() ? MOCK_ASSIGNABLE_MEMBERS : cachedRosterMembers ?? []);
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const value = React.useMemo((): AssignableMembersContextValue => {
    return {
      members,
      pickerMembers: toPickerMembers(members),
      loading,
      error,
      refresh: load,
      getMemberById: (id) => getMemberByIdFromMembers(members, id),
      getHumanName: (userId) => getHumanNameFromMembers(members, userId),
      getAgentName: (agentId) => getAgentNameFromMembers(members, agentId),
    };
  }, [members, loading, error, load]);

  return (
    <AssignableMembersContext.Provider value={value}>
      {children}
    </AssignableMembersContext.Provider>
  );
}

export function useAssignableMembers(): AssignableMembersContextValue {
  const ctx = React.useContext(AssignableMembersContext);
  if (!ctx) {
    throw new Error('useAssignableMembers must be used within AssignableMembersProvider');
  }
  return ctx;
}
