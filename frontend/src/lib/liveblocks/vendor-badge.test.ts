import { describe, expect, it } from 'vitest';
import { isLiveblocksVendorBadgeVisible } from './config';

describe('isLiveblocksVendorBadgeVisible', () => {
  it('shows badge in development by default', () => {
    expect(
      isLiveblocksVendorBadgeVisible({ NODE_ENV: 'development' })
    ).toBe(true);
  });

  it('hides badge in production by default', () => {
    expect(
      isLiveblocksVendorBadgeVisible({ NODE_ENV: 'production' })
    ).toBe(false);
  });

  it('allows explicit opt-in on production via env flag', () => {
    expect(
      isLiveblocksVendorBadgeVisible({
        NODE_ENV: 'production',
        NEXT_PUBLIC_LIVEBLOCKS_SHOW_VENDOR_BADGE: '1',
      })
    ).toBe(true);
  });

  it('allows explicit opt-out in development via env flag', () => {
    expect(
      isLiveblocksVendorBadgeVisible({
        NODE_ENV: 'development',
        NEXT_PUBLIC_LIVEBLOCKS_SHOW_VENDOR_BADGE: '0',
      })
    ).toBe(false);
  });
});
