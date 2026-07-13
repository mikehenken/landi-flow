import { describe, expect, it } from 'vitest';
import {
  CREATE_MENU_GAP_PX,
  CREATE_MENU_MIN_WIDTH_PX,
  CREATE_MENU_Z_INDEX,
  getCreateMenuFixedStyle,
} from './create-resource-menu-position';

describe('getCreateMenuFixedStyle', () => {
  it('end-aligns under the trigger and escapes overflow clipping via fixed + high z-index', () => {
    const style = getCreateMenuFixedStyle(
      { top: 8, bottom: 40, left: 1000, right: 1100, width: 100 },
      1200,
    );

    expect(style.position).toBe('fixed');
    expect(style.top).toBe(40 + CREATE_MENU_GAP_PX);
    expect(style.left).toBe(1100 - CREATE_MENU_MIN_WIDTH_PX);
    expect(style.minWidth).toBe(CREATE_MENU_MIN_WIDTH_PX);
    expect(style.zIndex).toBe(CREATE_MENU_Z_INDEX);
  });

  it('clamps to the viewport when the trigger is near the left edge', () => {
    const style = getCreateMenuFixedStyle(
      { top: 0, bottom: 32, left: 4, right: 80, width: 76 },
      400,
    );
    expect(style.left).toBe(8);
  });
});
