import { useState, useLayoutEffect } from "react";

export type ViewMode = "display" | "mobile";

export interface ViewModeConfig {
  mode: ViewMode;
  isMobile: boolean;
  isDisplay: boolean;
  mobileBreakpoint: number; // Screen width in pixels below which mobile mode is used
  isMounted: boolean; // True after client-side hydration
}

/**
 * Hook that detects screen size and determines view mode
 * - Mobile mode: screens smaller than breakpoint (default 768px)
 * - Display mode: screens larger than breakpoint
 * - Prevents hydration mismatch by starting with display mode and updating after mount
 */
export const useViewMode = (
  mobileBreakpoint: number = 768
): ViewModeConfig => {
  // Always start with "display" to match SSR, then update after mount
  const [mode, setMode] = useState<ViewMode>("display");
  const [isMounted, setIsMounted] = useState(false);

  useLayoutEffect(() => {
    // Mark as mounted and set initial mode based on actual window size
    // Use useLayoutEffect to update before paint to prevent visual flash
    // This pattern is necessary to prevent hydration mismatches in Next.js SSR
    const handleResize = () => {
      const newMode = window.innerWidth < mobileBreakpoint ? "mobile" : "display";
      setMode(newMode);
    };

    // Set initial mode and mark as mounted
    // Note: Setting state in layout effect is necessary here to prevent hydration mismatch.
    // This is a required pattern for SSR hydration in Next.js - we must start with consistent
    // state on server/client, then update after mount. Use setTimeout to avoid synchronous setState.
    setTimeout(() => {
      setIsMounted(true);
      handleResize();
    }, 0);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileBreakpoint]);

  return {
    mode,
    isMobile: mode === "mobile",
    isDisplay: mode === "display",
    mobileBreakpoint,
    isMounted,
  };
};

