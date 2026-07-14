'use client';

import * as React from 'react';

/** Subscribes to a CSS media query; false until mounted (SSR-safe). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    const sync = (): void => {
      setMatches(media.matches);
    };

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [query]);

  return matches;
}

/** Tailwind `sm` breakpoint — viewport width below 640px. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)');
}
