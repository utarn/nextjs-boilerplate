"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The visual theme preset key (e.g. "modern-minimal", "catppuccin"). */
type Theme = string;

/** Color mode preference. */
type ColorMode = "light" | "dark" | "system";

interface ThemeContextValue {
  /** Currently active theme preset key. */
  theme: Theme;
  /** Currently active color mode. */
  colorMode: ColorMode;
  /**
   * Whether the resolved appearance is dark.
   * Useful for components that need to know the effective dark state
   * regardless of whether it comes from an explicit "dark" choice or
   * the system media query while in "system" mode.
   */
  isDark: boolean;
  /** Switch to a different theme preset. Optionally persist to server DB. */
  setTheme: (theme: Theme, persist?: boolean) => void;
  /** Switch color mode. Optionally persist to server DB. */
  setColorMode: (mode: ColorMode, persist?: boolean) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_THEME = "theme";
const STORAGE_KEY_COLOR_MODE = "colorMode";
const DEFAULT_THEME = "modern-minimal";
const DEFAULT_COLOR_MODE: ColorMode = "system";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helper: resolve whether the effective appearance should be dark
// ---------------------------------------------------------------------------

function resolveIsDark(mode: ColorMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  // "system" — check the media query
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// ---------------------------------------------------------------------------
// Helper: apply attributes to <html>
// ---------------------------------------------------------------------------

function applyThemeToDocument(theme: Theme, isDark: boolean): void {
  const root = document.documentElement;

  root.setAttribute("data-theme", theme);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// ---------------------------------------------------------------------------
// Fire-and-forget API call to persist preferences server-side
// ---------------------------------------------------------------------------

function syncPreferencesToServer(payload: {
  theme?: string;
  colorMode?: string;
}): void {
  fetch("/api/user/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Non-critical: preferences are already in localStorage
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Server-passed theme preference. When provided this is used as the initial
   * value so that server-rendered HTML already matches the user's stored
   * preference. The provider still falls back to localStorage when this is
   * undefined (e.g. for unauthenticated users).
   */
  defaultTheme?: Theme;
  /**
   * Server-passed color mode preference. Same fallback logic as defaultTheme.
   */
  defaultColorMode?: ColorMode;
}

/**
 * Theme context provider that manages the active theme preset and color mode.
 *
 * - Initialises from server-passed props (for SSR match) or localStorage.
 * - Applies `data-theme` attribute and `.dark` class on `<html>`.
 * - Listens for system `prefers-color-scheme` changes in "system" mode.
 * - Persists preferences to localStorage and optionally to the server DB.
 *
 * @example
 * ```tsx
 * // In root layout.tsx
 * <ThemeProvider>
 *   {children}
 * </ThemeProvider>
 *
 * // With server-side preferences (from DB)
 * <ThemeProvider defaultTheme={user.theme} defaultColorMode={user.colorMode}>
 *   {children}
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme,
  defaultColorMode,
}: ThemeProviderProps) {
  // ----- State ----------------------------------------------------------------
  // We initialise from the server-passed props synchronously so the first
  // client render matches the server and avoids a hydration mismatch.
  const [theme, setThemeState] = useState<Theme>(
    () => defaultTheme ?? DEFAULT_THEME,
  );
  const [colorMode, setColorModeState] = useState<ColorMode>(
    () => defaultColorMode ?? DEFAULT_COLOR_MODE,
  );
  const [isDark, setIsDark] = useState<boolean>(() =>
    resolveIsDark(defaultColorMode ?? DEFAULT_COLOR_MODE),
  );

  // ----- Derived: sync with localStorage on mount -----------------------------
  // On first mount, prefer server props. If server props are absent, read
  // from localStorage (which was already set by the FOUC script or a prior
  // session).
  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    const storedColorMode = localStorage.getItem(STORAGE_KEY_COLOR_MODE) as
      | ColorMode
      | null;

    if (!defaultTheme && storedTheme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(storedTheme);
    }
    if (!defaultColorMode && storedColorMode) {
      setColorModeState(storedColorMode);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Side-effect: apply to DOM whenever theme / colorMode changes ---------
  useEffect(() => {
    const dark = resolveIsDark(colorMode);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(dark);
    applyThemeToDocument(theme, dark);
  }, [theme, colorMode]);

  // ----- Side-effect: listen for system dark-mode changes in "system" mode ----
  useEffect(() => {
    if (colorMode !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e: MediaQueryListEvent) => {
      const dark = e.matches;
      setIsDark(dark);
      applyThemeToDocument(theme, dark);
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [colorMode, theme]);

  // ----- Callbacks ------------------------------------------------------------
  const setTheme = useCallback((next: Theme, persist = false) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY_THEME, next);
    if (persist) {
      syncPreferencesToServer({ theme: next });
    }
  }, []);

  const setColorMode = useCallback((next: ColorMode, persist = false) => {
    setColorModeState(next);
    localStorage.setItem(STORAGE_KEY_COLOR_MODE, next);
    if (persist) {
      syncPreferencesToServer({ colorMode: next });
    }
  }, []);

  // ----- Render ---------------------------------------------------------------
  return (
    <ThemeContext.Provider
      value={{ theme, colorMode, isDark, setTheme, setColorMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current theme context values.
 * Must be called within a `<ThemeProvider>`.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useTheme } from '@/components/providers/ThemeProvider'
 *
 * function ThemeSwitcher() {
 *   const { theme, colorMode, isDark, setTheme, setColorMode } = useTheme()
 *
 *   return (
 *     <div>
 *       <p>Current theme: {theme}</p>
 *       <p>Dark mode: {isDark ? 'Yes' : 'No'}</p>
 *       <button onClick={() => setTheme('catppuccin', true)}>
 *         Switch to Catppuccin
 *       </button>
 *       <button onClick={() => setColorMode('dark', true)}>
 *         Dark Mode
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}
