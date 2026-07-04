'use client';

import * as React from 'react';
import { epicStore } from '@/stores/epic-store';
import { storyStore } from '@/stores/story-store';
import { SEED_EPICS, SEED_STORIES } from '@/lib/seed-data';

/** Hydrates domain stores with seed data on first mount. */
export function StoreHydrator({ children }: { children: React.ReactNode }): React.ReactElement {
  React.useEffect(() => {
    epicStore.hydrate(SEED_EPICS);
    storyStore.hydrate(SEED_STORIES);
  }, []);

  return <>{children}</>;
}
