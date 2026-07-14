/**
 * Distinguishes a click (open detail) from a drag start on board cards.
 * HTML5 DnD suppresses click after a real drag; this also ignores tiny jiggles
 * that some browsers treat as drag without a clean click.
 */

export const BOARD_CARD_DRAG_THRESHOLD_PX = 6;

export interface BoardCardPointerState {
  startX: number;
  startY: number;
  moved: boolean;
}

export function createBoardCardPointerState(
  clientX: number,
  clientY: number,
): BoardCardPointerState {
  return { startX: clientX, startY: clientY, moved: false };
}

export function updateBoardCardPointerMoved(
  state: BoardCardPointerState,
  clientX: number,
  clientY: number,
  thresholdPx: number = BOARD_CARD_DRAG_THRESHOLD_PX,
): BoardCardPointerState {
  if (state.moved) {
    return state;
  }
  const dx = Math.abs(clientX - state.startX);
  const dy = Math.abs(clientY - state.startY);
  if (dx > thresholdPx || dy > thresholdPx) {
    return { ...state, moved: true };
  }
  return state;
}

export function shouldOpenBoardCardOnClick(state: BoardCardPointerState | null): boolean {
  return state !== null && !state.moved;
}
