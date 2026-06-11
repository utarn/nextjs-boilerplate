"use client"

import { useEffect } from "react"
import { useTheme } from "@/components/providers/ThemeProvider"
import type { ColorMode } from "@/lib/theme-catalog"

/**
 * Client component that synchronizes server-side (DB) theme/colorMode
 * preferences into the ThemeProvider context on mount.
 *
 * This handles the cross-device scenario: when a user logs in on a new device,
 * the server layout reads preferences from the database and passes them here.
 * On mount, we apply them via the ThemeProvider's setTheme/setColorMode.
 * We pass persist=false to avoid writing back to the DB since the values
 * already came from there.
 */
export function ThemeInitializer({
  theme,
  colorMode,
}: {
  theme?: string | null
  colorMode?: string | null
}) {
  const { setTheme, setColorMode } = useTheme()

  useEffect(() => {
    if (theme) {
      setTheme(theme, false)
    }
    if (colorMode && (colorMode === "light" || colorMode === "dark" || colorMode === "system")) {
      setColorMode(colorMode as ColorMode, false)
    }
    // Only run once on mount with server-provided values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
