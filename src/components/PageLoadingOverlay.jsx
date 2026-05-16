'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const FADE_DURATION = 300; // Duration for fade out animation

/**
 * PageLoadingOverlay - Client-side loader for navigation transitions
 * 
 * This component shows the loading screen on ALL client-side navigations
 * and works together with the server-rendered #initial-loader in layout.js
 */
function PageLoadingOverlayContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const timeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const hasHydrated = useRef(false);
  const showTimeRef = useRef(null); // Track when loader was shown
  const MIN_DISPLAY_TIME = 700; // Minimum 0.7 second display time

  const navigationKey = useMemo(() => {
    const search = searchParams?.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  // Show/hide loader functions with smooth fade animations
  const showLoader = () => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    // Wait for body to be available
    const checkAndShow = () => {
      const loader = document.getElementById('initial-loader');
      const body = document?.body;
      
      if (!body || !body.classList) {
        // Body not ready yet, try again in next frame
        requestAnimationFrame(checkAndShow);
        return;
      }
      
      if (loader && body && body.classList) {
        try {
          // Reset opacity to 0 first for smooth fade in
          loader.style.opacity = '0';
          loader.style.visibility = 'visible';
          loader.style.pointerEvents = 'auto';
          body.classList.remove('loaded');
          // Trigger fade in by setting opacity to 1 after a brief moment
          requestAnimationFrame(() => {
            if (loader) {
              loader.style.opacity = '1';
            }
          });
        } catch (error) {
          console.error('Error showing loader:', error);
        }
      }
      setIsVisible(true);
      setShouldRender(true);
      showTimeRef.current = Date.now(); // Record when loader was shown
    };
    
    checkAndShow();
  };

  const hideLoader = () => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const loader = document.getElementById('initial-loader');
    const body = document?.body;
    if (loader && body && body.classList) {
      // Start fade out
      loader.style.opacity = '0';
      // Wait for transition to complete before hiding
      setTimeout(() => {
        if (loader && body && body.classList) {
          loader.style.pointerEvents = 'none';
          loader.style.visibility = 'hidden';
          body.classList.add('loaded');
        }
      }, 300); // Match the CSS transition duration
    }
    setIsVisible(false);
    // Remove from DOM after fade out completes
    setTimeout(() => {
      setShouldRender(false);
    }, 300);
  };

  // On initial mount, mark as hydrated
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      hasHydrated.current = true;
      // Initial load is handled by server loader, so don't show here
      return;
    }
  }, []);

  // Handle navigation transitions (only after hydration)
  useEffect(() => {
    // Don't show on initial mount (server loader handles that)
    if (!hasHydrated.current || isInitialMount.current) {
      return;
    }

    // Ensure we're in browser environment before proceeding
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Show loading screen for navigation (showLoader will handle body check internally)
    showLoader();

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Hide when DOM is ready, but ensure minimum display time of 1 second
    const hideLoaderWhenReady = () => {
      if (showTimeRef.current) {
        const elapsed = Date.now() - showTimeRef.current;
        const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);
        timeoutRef.current = setTimeout(() => {
          hideLoader();
        }, remaining);
      } else {
        // Fallback: wait full minimum time if showTime wasn't recorded
        timeoutRef.current = setTimeout(() => {
          hideLoader();
        }, MIN_DISPLAY_TIME);
      }
    };

    // Check if DOM is already ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      // Ensure minimum display time
      hideLoaderWhenReady();
    } else {
      // Wait for DOMContentLoaded
      const handleDOMReady = () => {
        hideLoaderWhenReady();
      };
      document.addEventListener('DOMContentLoaded', handleDOMReady, { once: true });
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (typeof document !== 'undefined') {
          document.removeEventListener('DOMContentLoaded', handleDOMReady);
        }
      };
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigationKey]);

  // This component doesn't render anything - it just controls the #initial-loader
  return null;
}

/**
 * Wrapper component with Suspense boundary for useSearchParams
 * This prevents build errors during static generation
 */
export default function PageLoadingOverlay() {
  return <PageLoadingOverlayContent />;
}

