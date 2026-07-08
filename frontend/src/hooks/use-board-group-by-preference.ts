'use client';

import * as React from 'react';
import {
  DEFAULT_BOARD_GROUP_BY,
  readBoardGroupByPreference,
  writeBoardGroupByPreference,
  type BoardGroupBy,
} from '@/lib/board-swimlane-preference';

/** Reads/writes `landi-flow:board-group-by` from localStorage (CAP-031). */
export function useBoardGroupByPreference(): {
  groupBy: BoardGroupBy;
  setGroupBy: (value: BoardGroupBy) => void;
} {
  const [groupBy, setGroupByState] = React.useState<BoardGroupBy>(DEFAULT_BOARD_GROUP_BY);

  React.useEffect(() => {
    setGroupByState(readBoardGroupByPreference());
  }, []);

  const setGroupBy = React.useCallback((value: BoardGroupBy) => {
    setGroupByState(value);
    writeBoardGroupByPreference(value);
  }, []);

  return { groupBy, setGroupBy };
}
