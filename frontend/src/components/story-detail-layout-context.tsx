'use client';

import * as React from 'react';
import { useStoryDetailLayoutPreference } from '@/hooks/use-story-detail-layout-preference';
import type { StoryDetailLayoutMode } from '@/lib/story-detail-layout-preference';

interface StoryDetailLayoutContextValue {
  layout: StoryDetailLayoutMode;
  setLayout: (mode: StoryDetailLayoutMode) => void;
  isSidebar: boolean;
  isModal: boolean;
  isPinned: boolean;
  setPinned: React.Dispatch<React.SetStateAction<boolean>>;
  isExpanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

const StoryDetailLayoutContext = React.createContext<StoryDetailLayoutContextValue | null>(
  null,
);

export function useStoryDetailLayout(): StoryDetailLayoutContextValue {
  const context = React.useContext(StoryDetailLayoutContext);
  if (!context) {
    throw new Error('useStoryDetailLayout must be used within StoryDetailLayoutProvider');
  }
  return context;
}

export interface StoryDetailLayoutProviderProps {
  children: React.ReactNode;
}

/** Supplies layout preference + pin/expand modal state to the workspace shell. */
export function StoryDetailLayoutProvider({
  children,
}: StoryDetailLayoutProviderProps): React.ReactElement {
  const { layout, setLayout, isSidebar, isModal } = useStoryDetailLayoutPreference();
  const [isPinned, setPinned] = React.useState(false);
  const [isExpanded, setExpanded] = React.useState(false);

  const contextValue = React.useMemo(
    (): StoryDetailLayoutContextValue => ({
      layout,
      setLayout,
      isSidebar,
      isModal,
      isPinned,
      setPinned,
      isExpanded,
      setExpanded,
    }),
    [layout, setLayout, isSidebar, isModal, isPinned, isExpanded],
  );

  return (
    <StoryDetailLayoutContext.Provider value={contextValue}>
      {children}
    </StoryDetailLayoutContext.Provider>
  );
}
