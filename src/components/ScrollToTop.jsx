"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const isMobileViewport = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia) {
    return window.matchMedia('(max-width: 767px)').matches;
  }
  return window.innerWidth < 768;
};

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect navigation type (reload, back/forward, navigate)
    let navigationType;
    const navEntries = window.performance?.getEntriesByType?.('navigation');
    if (navEntries && navEntries.length > 0) {
      navigationType = navEntries[0].type;
    } else if (window.performance?.navigation) {
      // Fallback for older browsers
      const legacyType = window.performance.navigation.type;
      navigationType = legacyType === 1 ? 'reload' : legacyType === 2 ? 'back_forward' : 'navigate';
    }

    // Only force scroll to top for SPA navigations, not reloads/back
    if (navigationType === 'reload' || navigationType === 'back_forward') {
      return;
    }

    // Skip forcing scroll on narrow/mobile viewports to preserve reading position
    if (isMobileViewport()) {
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}


