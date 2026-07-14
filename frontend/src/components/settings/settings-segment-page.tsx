'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { SettingsPageShell } from '@/components/settings/settings-page-shell';
import {
  AiGuidancePanel,
  AiLoopsPanel,
  AiSettingsPanel,
  ApplicationsSettingsPanel,
  AsksSettingsPanel,
  IntegrationSettingsPanel,
  McpSettingsPanel,
  PulseSchedulesSettingsPanel,
  SlaRulesPanel,
  TeamWorkflowStatesPanel,
  UpdatesSettingsPanel,
  WorkspaceApiSettingsPanel,
} from '@/components/settings/settings-fhitm-panels';
import {
  CustomEmojiSection,
  DocumentTemplatesSection,
  EpicLabelsSection,
  EpicStatusGroupsSection,
  EpicTemplatesSection,
  ReleasesSection,
  StoryLabelsSection,
  StoryTemplatesSection,
} from '@/components/settings/taxonomy-cap-sections';

type SegmentConfig = {
  title: string;
  breadcrumb: string;
  content: React.ReactElement;
};

const SEGMENT_ROUTES: Record<string, SegmentConfig> = {
  'issue-templates': {
    title: 'Issue templates',
    breadcrumb: 'Issue templates',
    content: <StoryTemplatesSection />,
  },
  pulse: {
    title: 'Pulse settings',
    breadcrumb: 'Pulse',
    content: <PulseSchedulesSettingsPanel />,
  },
  asks: {
    title: 'Asks',
    breadcrumb: 'Asks',
    content: <AsksSettingsPanel />,
  },
  sla: {
    title: 'SLA rules',
    breadcrumb: 'SLA',
    content: <SlaRulesPanel />,
  },
  labels: {
    title: 'Labels',
    breadcrumb: 'Labels',
    content: <StoryLabelsSection />,
  },
  'epic-labels': {
    title: 'Epic labels',
    breadcrumb: 'Epic labels',
    content: <EpicLabelsSection />,
  },
  'epic-status': {
    title: 'Epic status',
    breadcrumb: 'Epic status',
    content: <EpicStatusGroupsSection />,
  },
  'epic-templates': {
    title: 'Epic templates',
    breadcrumb: 'Epic templates',
    content: <EpicTemplatesSection />,
  },
  'document-templates': {
    title: 'Document templates',
    breadcrumb: 'Document templates',
    content: <DocumentTemplatesSection />,
  },
  updates: {
    title: 'Updates',
    breadcrumb: 'Updates',
    content: <UpdatesSettingsPanel />,
  },
  releases: {
    title: 'Releases',
    breadcrumb: 'Releases',
    content: <ReleasesSection />,
  },
  emojis: {
    title: 'Emoji',
    breadcrumb: 'Emoji',
    content: <CustomEmojiSection />,
  },
  mcp: {
    title: 'MCP',
    breadcrumb: 'MCP',
    content: <McpSettingsPanel />,
  },
  applications: {
    title: 'Applications',
    breadcrumb: 'Applications',
    content: <ApplicationsSettingsPanel />,
  },
  api: {
    title: 'API',
    breadcrumb: 'API',
    content: <WorkspaceApiSettingsPanel />,
  },
};

export interface SettingsSegmentPageProps {
  segment: string;
}

export function SettingsSegmentPage({ segment }: SettingsSegmentPageProps): React.ReactElement {
  const config = SEGMENT_ROUTES[segment];
  if (!config) {
    notFound();
  }

  return (
    <SettingsPageShell
      viewTitle={config.title}
      breadcrumbs={['Workspace', 'Workspace settings', config.breadcrumb]}
    >
      {config.content}
    </SettingsPageShell>
  );
}

export interface SettingsAiPageProps {
  subpath: string[];
}

export function SettingsAiPage({ subpath }: SettingsAiPageProps): React.ReactElement {
  const pathKey = subpath.join('/') || 'root';

  let title = 'AI';
  let breadcrumb = 'AI';
  let content: React.ReactElement = <AiSettingsPanel />;

  if (pathKey === 'guidance') {
    title = 'AI guidance';
    breadcrumb = 'AI guidance';
    content = <AiGuidancePanel />;
  } else if (pathKey === 'loops') {
    title = 'AI loops';
    breadcrumb = 'AI loops';
    content = <AiLoopsPanel />;
  } else if (pathKey !== 'root') {
    notFound();
  }

  return (
    <SettingsPageShell
      viewTitle={title}
      breadcrumbs={['Workspace', 'Workspace settings', breadcrumb]}
    >
      {content}
    </SettingsPageShell>
  );
}

export interface SettingsIntegrationPageProps {
  provider: string;
}

export function SettingsIntegrationPage({
  provider,
}: SettingsIntegrationPageProps): React.ReactElement {
  if (provider !== 'github' && provider !== 'slack') {
    notFound();
  }

  const title = provider === 'github' ? 'GitHub' : 'Slack';

  return (
    <SettingsPageShell
      viewTitle={`${title} integration`}
      breadcrumbs={['Workspace', 'Workspace settings', 'Integrations', title]}
    >
      <IntegrationSettingsPanel provider={provider} />
    </SettingsPageShell>
  );
}

export interface TeamSettingsPageProps {
  teamId: string;
}

export function TeamSettingsPage({ teamId }: TeamSettingsPageProps): React.ReactElement {
  return (
    <SettingsPageShell
      viewTitle="Team settings"
      breadcrumbs={['Workspace', 'Workspace settings', 'Teams', teamId]}
    >
      <TeamWorkflowStatesPanel teamId={teamId} />
    </SettingsPageShell>
  );
}
