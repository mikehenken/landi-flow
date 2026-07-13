'use client';

import * as React from 'react';
import { isLiveblocksVendorBadgeVisible } from '@/lib/liveblocks/config';

const VENDOR_BADGE_SELECTOR =
  'a[href*="lblcks.io/badge"], a[href*="liveblocks.io/badge"]';

function removeVendorBadgeNodes(root: ParentNode): void {
  root.querySelectorAll(VENDOR_BADGE_SELECTOR).forEach((node) => {
    node.remove();
  });
}

/**
 * Strips Liveblocks "Powered by" badge links from the DOM when production copy-hygiene
 * requires hiding vendor watermarks. Collaboration remains active — only branding is removed.
 */
export function LiveblocksVendorBadgeGate(): React.ReactElement | null {
  const badgeVisible = isLiveblocksVendorBadgeVisible();

  React.useEffect(() => {
    if (badgeVisible || typeof document === 'undefined') {
      return;
    }

    removeVendorBadgeNodes(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }
          if (node.matches(VENDOR_BADGE_SELECTOR)) {
            node.remove();
            return;
          }
          removeVendorBadgeNodes(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [badgeVisible]);

  return null;
}
