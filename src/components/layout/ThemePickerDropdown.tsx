"use client"

import { useTheme } from "@/components/providers/ThemeProvider"
import { THEME_CATALOG, CATEGORY_LABELS } from "@/lib/theme-catalog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Palette, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

export function ThemePickerDropdown() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations("ThemeGallery")

  // Show a condensed list organized by category
  const categories = Array.from(new Set(THEME_CATALOG.map((t) => t.category)))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t("title")}>
          <Palette className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {categories.map((cat, catIdx) => (
          <div key={cat}>
            {catIdx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[cat] || cat}
            </DropdownMenuLabel>
            {THEME_CATALOG.filter((entry) => entry.category === cat).map((entry) => (
              <DropdownMenuItem
                key={entry.key}
                onClick={() => setTheme(entry.key, true)}
                className={theme === entry.key ? "bg-accent" : ""}
              >
                <span
                  className="inline-block w-3 h-3 rounded-sm border mr-2 shrink-0"
                  style={{ backgroundColor: entry.preview.primary }}
                />
                <span className="truncate">{entry.label}</span>
                {theme === entry.key && (
                  <span className="ml-auto text-primary">
                    <Check className="size-4" />
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
