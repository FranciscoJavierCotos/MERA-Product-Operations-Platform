"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface NavigationState {
  path: string;
  scrollPosition: number;
  timestamp: number;
  state?: Record<string, any>;
}

interface NavigationHistory {
  stack: NavigationState[];
  currentIndex: number;
}

// Global navigation history that persists across component remounts
let globalHistory: NavigationHistory = {
  stack: [],
  currentIndex: -1,
};

// Session storage key for persistence
const HISTORY_KEY = "app_navigation_history";

// Load history from session storage on initialization
if (typeof window !== "undefined") {
  try {
    const stored = sessionStorage.getItem(HISTORY_KEY);
    if (stored) {
      globalHistory = JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load navigation history:", error);
  }
}

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);
  const isInitialMount = useRef(true);
  const lastPathname = useRef(pathname);

  // Save current scroll position before navigation
  const saveScrollPosition = () => {
    if (typeof window === "undefined") return;

    const currentScroll = window.scrollY;
    if (
      globalHistory.currentIndex >= 0 &&
      globalHistory.stack[globalHistory.currentIndex]
    ) {
      globalHistory.stack[globalHistory.currentIndex].scrollPosition =
        currentScroll;
      persistHistory();
    }
  };

  // Persist history to session storage
  const persistHistory = () => {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(globalHistory));
    } catch (error) {
      console.error("Failed to persist navigation history:", error);
    }
  };

  // Save page state (like search queries, filters)
  const savePageState = (state: Record<string, any>) => {
    if (
      globalHistory.currentIndex >= 0 &&
      globalHistory.stack[globalHistory.currentIndex]
    ) {
      globalHistory.stack[globalHistory.currentIndex].state = {
        ...globalHistory.stack[globalHistory.currentIndex].state,
        ...state,
      };
      persistHistory();
    }
  };

  // Get saved page state
  const getPageState = (): Record<string, any> | undefined => {
    if (
      globalHistory.currentIndex >= 0 &&
      globalHistory.stack[globalHistory.currentIndex]
    ) {
      return globalHistory.stack[globalHistory.currentIndex].state;
    }
    return undefined;
  };

  // Track pathname changes
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;

      // Initialize with current page if history is empty
      if (globalHistory.stack.length === 0) {
        globalHistory.stack.push({
          path: pathname,
          scrollPosition: 0,
          timestamp: Date.now(),
        });
        globalHistory.currentIndex = 0;
        persistHistory();
      }

      lastPathname.current = pathname;
      setCanGoBack(globalHistory.currentIndex > 0);
      return;
    }

    // Detect pathname change (forward navigation)
    if (pathname !== lastPathname.current) {
      saveScrollPosition();

      // Check if we're going back in history
      const existingIndex = globalHistory.stack.findIndex(
        (item, index) =>
          index < globalHistory.currentIndex && item.path === pathname
      );

      if (existingIndex === -1) {
        // New navigation - add to stack and trim any forward history
        globalHistory.stack = globalHistory.stack.slice(
          0,
          globalHistory.currentIndex + 1
        );
        globalHistory.stack.push({
          path: pathname,
          scrollPosition: 0,
          timestamp: Date.now(),
        });
        globalHistory.currentIndex = globalHistory.stack.length - 1;
      } else {
        // This shouldn't happen with router.back(), but handle it anyway
        globalHistory.currentIndex = existingIndex;
      }

      persistHistory();
      lastPathname.current = pathname;
      setCanGoBack(globalHistory.currentIndex > 0);
    }
  }, [pathname]);

  // Save scroll position on scroll
  useEffect(() => {
    if (typeof window === "undefined") return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveScrollPosition();
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Restore scroll position when component mounts
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Small delay to ensure page is rendered
    const timeoutId = setTimeout(() => {
      const currentState = globalHistory.stack[globalHistory.currentIndex];
      if (currentState && currentState.scrollPosition > 0) {
        window.scrollTo(0, currentState.scrollPosition);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [pathname]);

  // Go back function
  const goBack = async () => {
    if (!canGoBack) {
      // No history, go to home
      router.push("/dashboard");
      return;
    }

    saveScrollPosition();

    // Move back in history
    globalHistory.currentIndex--;
    const previousState = globalHistory.stack[globalHistory.currentIndex];

    if (previousState) {
      persistHistory();
      router.back();
    } else {
      // Fallback to home
      router.push("/dashboard");
    }
  };

  // Clear history (e.g., on logout)
  const clearHistory = () => {
    globalHistory = {
      stack: [],
      currentIndex: -1,
    };
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(HISTORY_KEY);
    }
  };

  // Get previous page path
  const getPreviousPath = (): string | null => {
    if (globalHistory.currentIndex > 0) {
      return globalHistory.stack[globalHistory.currentIndex - 1].path;
    }
    return null;
  };

  return {
    goBack,
    canGoBack,
    savePageState,
    getPageState,
    clearHistory,
    getPreviousPath,
    currentPath: pathname,
  };
}
