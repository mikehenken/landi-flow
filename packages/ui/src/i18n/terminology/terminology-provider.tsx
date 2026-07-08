'use client';

import * as React from 'react';
import type { WorkspaceTerminologySettings } from '@landi-flow/core/types';
import { useTranslations } from 'next-intl';

/** Resolved entity labels after merging workspace overrides with i18n defaults. */
export interface ResolvedEntityTerminology {
  story: string;
  stories: string;
  epic: string;
  epics: string;
  workspace: string;
}

/** Translation keys exposed by `useTerminology().t()`. */
export type EntityTerminologyKey =
  | 'entity.story'
  | 'entity.stories'
  | 'entity.epic'
  | 'entity.epics'
  | 'entity.workspace';

const ENTITY_KEY_MAP: Record<EntityTerminologyKey, keyof ResolvedEntityTerminology> = {
  'entity.story': 'story',
  'entity.stories': 'stories',
  'entity.epic': 'epic',
  'entity.epics': 'epics',
  'entity.workspace': 'workspace',
};

export interface TerminologyContextValue {
  labels: ResolvedEntityTerminology;
  t: (key: EntityTerminologyKey) => string;
}

const TerminologyContext = React.createContext<TerminologyContextValue | null>(null);

export interface TerminologyProviderProps {
  /** Workspace/agency terminology overrides from `settings.terminology`. */
  terminology?: WorkspaceTerminologySettings;
  children: React.ReactNode;
}

function resolveEntityTerminology(
  defaults: ResolvedEntityTerminology,
  overrides: WorkspaceTerminologySettings | undefined,
): ResolvedEntityTerminology {
  return {
    story: overrides?.story ?? defaults.story,
    stories: overrides?.stories ?? defaults.stories,
    epic: overrides?.epic ?? defaults.epic,
    epics: overrides?.epics ?? defaults.epics,
    workspace: overrides?.workspace ?? defaults.workspace,
  };
}

/**
 * Resolves entity labels from workspace settings with i18n fallbacks (CR-09r-011).
 * Must render inside NextIntlClientProvider.
 */
export function TerminologyProvider({
  terminology,
  children,
}: TerminologyProviderProps): React.ReactElement {
  const tEntity = useTranslations('entity');

  const labels = React.useMemo(
    () =>
      resolveEntityTerminology(
        {
          story: tEntity('story'),
          stories: tEntity('stories'),
          epic: tEntity('epic'),
          epics: tEntity('epics'),
          workspace: tEntity('workspace'),
        },
        terminology,
      ),
    [tEntity, terminology],
  );

  const value = React.useMemo<TerminologyContextValue>(
    () => ({
      labels,
      t: (key: EntityTerminologyKey) => labels[ENTITY_KEY_MAP[key]],
    }),
    [labels],
  );

  return (
    <TerminologyContext.Provider value={value}>{children}</TerminologyContext.Provider>
  );
}

export function useTerminology(): TerminologyContextValue {
  const ctx = React.useContext(TerminologyContext);
  if (!ctx) {
    throw new Error('useTerminology must be used within TerminologyProvider');
  }
  return ctx;
}

/** Safe variant when terminology context is optional (e.g. Storybook). */
export function useTerminologyOptional(): TerminologyContextValue | null {
  return React.useContext(TerminologyContext);
}

export { resolveEntityTerminology };
