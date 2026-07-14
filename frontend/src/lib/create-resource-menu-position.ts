export const CREATE_MENU_MIN_WIDTH_PX = 220;
export const CREATE_MENU_VIEWPORT_PADDING_PX = 8;
export const CREATE_MENU_GAP_PX = 4;
/** Above shell header / main stacking so the portal menu is not covered. */
export const CREATE_MENU_Z_INDEX = 100;

export interface CreateMenuFixedStyle {
  position: 'fixed';
  top: number;
  left: number;
  minWidth: number;
  zIndex: number;
}

/**
 * Position the Create menu under the trigger, end-aligned, clamped to the viewport.
 * Pure helper so portal placement can be unit-tested without DOM rendering.
 */
export function getCreateMenuFixedStyle(
  triggerRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width'>,
  viewportWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1280,
  menuWidth: number = CREATE_MENU_MIN_WIDTH_PX,
): CreateMenuFixedStyle {
  const preferredLeft = triggerRect.right - menuWidth;
  const maxLeft = Math.max(
    CREATE_MENU_VIEWPORT_PADDING_PX,
    viewportWidth - menuWidth - CREATE_MENU_VIEWPORT_PADDING_PX,
  );
  const left = Math.min(
    Math.max(CREATE_MENU_VIEWPORT_PADDING_PX, preferredLeft),
    maxLeft,
  );

  return {
    position: 'fixed',
    top: triggerRect.bottom + CREATE_MENU_GAP_PX,
    left,
    minWidth: menuWidth,
    zIndex: CREATE_MENU_Z_INDEX,
  };
}
