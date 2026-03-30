"use client";

import { useEffect, useState } from "react";

// Console capture — runs at module scope for immediate capture (before React hydration)
import "@/lib/console-capture";
// Screenshot capture utility — auto-initializes on import
import "@/utils/screenshot-capture";

export function AppGenProvider({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if splash has been shown before in this session
    const splashShown = sessionStorage.getItem('splashShown');
    
    if (splashShown) {
      setShowSplash(false);
    } else {
      // Show splash for minimum 1.5 seconds, or until content loads
      const splashTimer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('splashShown', 'true');
      }, 1500);

      // Mark as shown when content is interactive
      const contentReady = () => {
        setShowSplash(false);
        sessionStorage.setItem('splashShown', 'true');
      };

      // Also hide on first meaningful interaction or when document is fully loaded
      document.addEventListener('load', contentReady, { once: true });
      
      return () => {
        clearTimeout(splashTimer);
        document.removeEventListener('load', contentReady);
      };
    }
  }, []);

  useEffect(() => {
    // Hide Next.js error overlay - runs periodically to catch dynamically injected overlays
    const hideErrorOverlay = () => {
      // Target Next.js error overlay elements
      const selectors = [
        'nextjs-portal',
        '[data-nextjs-dialog]',
        '[data-nextjs-dialog-overlay]', 
        '[data-nextjs-toast]',
        '#__next-build-indicator',
        '[data-nextjs-scroll]',
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });
      });

      // Also hide the "1 Issue" button at the bottom
      document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent?.includes('Issue')) {
          (btn as HTMLElement).style.display = 'none';
          btn.parentElement && ((btn.parentElement as HTMLElement).style.display = 'none');
        }
      });
    };

    // Run immediately and set up observer for dynamic elements
    hideErrorOverlay();
    const interval = setInterval(hideErrorOverlay, 1000);
    
    // Use MutationObserver to catch new elements
    const observer = new MutationObserver(hideErrorOverlay);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {showSplash && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
          <img
            src="https://app-cdn.appgen.com/b3df0d9a-96ef-45eb-83f3-fc43af4afc56/assets/uploaded_1774208539477_qp24t1.png"
            alt="ServicePilot"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {children}
    </>
  );
}
