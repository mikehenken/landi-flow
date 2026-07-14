import { describe, expect, it } from 'vitest';
import {
  createBoardCardPointerState,
  shouldOpenBoardCardOnClick,
  updateBoardCardPointerMoved,
} from './board-card-pointer';

describe('board-card-pointer', () => {
  it('opens on click when the pointer did not move past threshold', () => {
    const start = createBoardCardPointerState(10, 20);
    const movedSlightly = updateBoardCardPointerMoved(start, 12, 22);
    expect(shouldOpenBoardCardOnClick(movedSlightly)).toBe(true);
  });

  it('does not open when the pointer dragged past threshold', () => {
    const start = createBoardCardPointerState(10, 20);
    const dragged = updateBoardCardPointerMoved(start, 40, 20);
    expect(shouldOpenBoardCardOnClick(dragged)).toBe(false);
  });

  it('does not open when pointer state is missing', () => {
    expect(shouldOpenBoardCardOnClick(null)).toBe(false);
  });
});
