'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { StoryDetailLayoutProvider } from '@/components/story-detail-layout-context';
import { AccountPageShell } from '@/components/account/account-page-shell';
import {
  NotificationPrefsPanel,
  PersonalApiKeysPanel,
  PersonalPreferencesPanel,
  PersonalProfilePanel,
} from '@/components/settings/personal-settings-panels';

type SegmentConfig = {
  title: string;
  content: React.ReactElement;
};

const SEGMENT_ROUTES: Record<string, SegmentConfig> = {
  preferences: {
    title: 'Preferences',
    content: (
      <StoryDetailLayoutProvider>
        <PersonalPreferencesPanel />
      </StoryDetailLayoutProvider>
    ),
  },
  profile: {
    title: 'Profile',
    content: <PersonalProfilePanel initialDisplayName="Demo User" />,
  },
  notifications: {
    title: 'Notifications',
    content: <NotificationPrefsPanel />,
  },
  security: {
    title: 'Security',
    content: <PersonalApiKeysPanel />,
  },
};

export interface AccountSegmentPageProps {
  segment: string;
}

export function AccountSegmentPage({ segment }: AccountSegmentPageProps): React.ReactElement {
  const config = SEGMENT_ROUTES[segment];
  if (!config) {
    notFound();
  }

  return (
    <AccountPageShell viewTitle={config.title} segment={segment}>
      {config.content}
    </AccountPageShell>
  );
}
