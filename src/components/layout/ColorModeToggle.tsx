"use client"

import { useTheme } from "@/components/providers/ThemeProvider"
import type { ColorMode } from "@/lib/theme-catalog"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTranslations } from "next-intl"

const MODES: { mode: ColorMode; icon: typeof Sun }[] = [
  { mode: "light", icon: Sun },
  { mode: "dark", icon: Moon },
  { mode: "system", icon: Monitor },
]

export function ColorModeToggle() {
  const { colorMode, setColorMode } = useTheme()
  const t = useTranslations("Navbar")

  // Cycle through: system -> light -> dark -> system
  function cycle() {
    const idx = MODES.findIndex((m) => m.mode === colorMode)
    const next = MODES[(idx + 1) % MODES.length]
    setColorMode(next.mode, true)
  }

  const CurrentIcon = MODES.find((m) => m.mode === colorMode)?.icon ?? Monitor

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycle}
            title={t("colorModeTitle", { mode: colorMode })}
          >
            <CurrentIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <span className="capitalize">
            {colorMode === "light" ? t("lightMode") : colorMode === "dark" ? t("darkMode") : t("systemMode")}
          </span>
          <span className="text-muted-foreground ml-1">{t("clickToCycle")}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
