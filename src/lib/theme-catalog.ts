/**
 * Theme catalog data and validation utilities.
 * Sourced from scripts/theme-catalog.json at build time.
 */

export interface ThemeCatalogEntry {
  key: string
  label: string
  category: string
  preview: {
    background: string
    primary: string
    foreground: string
  }
}

/** All categories used in the theme catalog */
export const THEME_CATEGORIES = [
  "professional",
  "minimal",
  "vibrant",
  "dark",
  "playful",
  "nature",
  "editorial",
  "other",
] as const

export type ThemeCategory = (typeof THEME_CATEGORIES)[number]

/** Human-readable labels for categories */
export const CATEGORY_LABELS: Record<string, string> = {
  professional: "Professional",
  minimal: "Minimal",
  vibrant: "Vibrant",
  dark: "Dark",
  playful: "Playful",
  nature: "Nature",
  editorial: "Editorial",
  other: "Other",
}

/** Valid color mode values */
export const VALID_COLOR_MODES = ["light", "dark", "system"] as const
export type ColorMode = (typeof VALID_COLOR_MODES)[number]

// Inline the catalog so both client and server can import it without fs reads
export const THEME_CATALOG: ThemeCatalogEntry[] = [
  { key: "modern-minimal", label: "Modern Minimal", category: "minimal", preview: { background: "#ffffff", primary: "#3b82f6", foreground: "#333333" } },
  { key: "violet-bloom", label: "Violet Bloom", category: "vibrant", preview: { background: "#fdfdfd", primary: "#7033ff", foreground: "#000000" } },
  { key: "t3-chat", label: "T3 Chat", category: "playful", preview: { background: "#faf5fa", primary: "#a84370", foreground: "#501854" } },
  { key: "twitter", label: "Twitter", category: "professional", preview: { background: "#ffffff", primary: "#1e9df1", foreground: "#0f1419" } },
  { key: "mocha-mousse", label: "Mocha Mousse", category: "vibrant", preview: { background: "#F1F0E5", primary: "#A37764", foreground: "#56453F" } },
  { key: "bubblegum", label: "Bubblegum", category: "vibrant", preview: { background: "#f6e6ee", primary: "#d04f99", foreground: "#5b5b5b" } },
  { key: "amethyst-haze", label: "Amethyst Haze", category: "editorial", preview: { background: "#f8f7fa", primary: "#8a79ab", foreground: "#3d3c4f" } },
  { key: "notebook", label: "Notebook", category: "editorial", preview: { background: "#f9f9f9", primary: "#606060", foreground: "#3a3a3a" } },
  { key: "doom-64", label: "Doom 64", category: "editorial", preview: { background: "#cccccc", primary: "#b71c1c", foreground: "#1f1f1f" } },
  { key: "catppuccin", label: "Catppuccin", category: "other", preview: { background: "#eff1f5", primary: "#8839ef", foreground: "#4c4f69" } },
  { key: "graphite", label: "Graphite", category: "other", preview: { background: "#f0f0f0", primary: "#606060", foreground: "#333333" } },
  { key: "perpetuity", label: "Perpetuity", category: "other", preview: { background: "#e8f0f0", primary: "#06858e", foreground: "#0a4a55" } },
  { key: "kodama-grove", label: "Kodama Grove", category: "other", preview: { background: "#e4d7b0", primary: "#8d9d4f", foreground: "#5c4b3e" } },
  { key: "cosmic-night", label: "Cosmic Night", category: "other", preview: { background: "#f5f5ff", primary: "#6e56cf", foreground: "#2a2a4a" } },
  { key: "tangerine", label: "Tangerine", category: "other", preview: { background: "#e8ebed", primary: "#e05d38", foreground: "#333333" } },
  { key: "quantum-rose", label: "Quantum Rose", category: "other", preview: { background: "#fff0f8", primary: "#e6067a", foreground: "#91185c" } },
  { key: "nature", label: "Nature", category: "other", preview: { background: "#f8f5f0", primary: "#2e7d32", foreground: "#3e2723" } },
  { key: "bold-tech", label: "Bold Tech", category: "other", preview: { background: "#ffffff", primary: "#8b5cf6", foreground: "#312e81" } },
  { key: "elegant-luxury", label: "Elegant Luxury", category: "other", preview: { background: "#faf7f5", primary: "#9b2c2c", foreground: "#1a1a1a" } },
  { key: "amber-minimal", label: "Amber Minimal", category: "other", preview: { background: "#ffffff", primary: "#f59e0b", foreground: "#262626" } },
  { key: "supabase", label: "Supabase", category: "other", preview: { background: "#fcfcfc", primary: "#72e3ad", foreground: "#171717" } },
  { key: "neo-brutalism", label: "Neo Brutalism", category: "other", preview: { background: "#ffffff", primary: "#ff3333", foreground: "#000000" } },
  { key: "solar-dusk", label: "Solar Dusk", category: "other", preview: { background: "#FDFBF7", primary: "#B45309", foreground: "#4A3B33" } },
  { key: "claymorphism", label: "Claymorphism", category: "other", preview: { background: "#e7e5e4", primary: "#6366f1", foreground: "#1e293b" } },
  { key: "cyberpunk", label: "Cyberpunk", category: "other", preview: { background: "#f8f9fa", primary: "#ff00c8", foreground: "#0c0c1d" } },
  { key: "pastel-dreams", label: "Pastel Dreams", category: "other", preview: { background: "#f7f3f9", primary: "#a78bfa", foreground: "#374151" } },
  { key: "clean-slate", label: "Clean Slate", category: "other", preview: { background: "#f8fafc", primary: "#6366f1", foreground: "#1e293b" } },
  { key: "caffeine", label: "Caffeine", category: "other", preview: { background: "#f9f9f9", primary: "#644a40", foreground: "#202020" } },
  { key: "ocean-breeze", label: "Ocean Breeze", category: "other", preview: { background: "#f0f8ff", primary: "#22c55e", foreground: "#374151" } },
  { key: "retro-arcade", label: "Retro Arcade", category: "other", preview: { background: "#fdf6e3", primary: "#d33682", foreground: "#073642" } },
  { key: "midnight-bloom", label: "Midnight Bloom", category: "other", preview: { background: "#f9f9f9", primary: "#6c5ce7", foreground: "#333333" } },
  { key: "candyland", label: "Candyland", category: "other", preview: { background: "#f7f9fa", primary: "#ffc0cb", foreground: "#333333" } },
  { key: "northern-lights", label: "Northern Lights", category: "other", preview: { background: "#f9f9fa", primary: "#34a85a", foreground: "#333333" } },
  { key: "vintage-paper", label: "Vintage Paper", category: "other", preview: { background: "#f5f1e6", primary: "#a67c52", foreground: "#4a3f35" } },
  { key: "sunset-horizon", label: "Sunset Horizon", category: "other", preview: { background: "#fff9f5", primary: "#ff7e5f", foreground: "#3d3436" } },
  { key: "starry-night", label: "Starry Night", category: "playful", preview: { background: "#f5f7fa", primary: "#3a5ba0", foreground: "#1a2238" } },
  { key: "claude", label: "Claude", category: "professional", preview: { background: "#faf9f5", primary: "#c96442", foreground: "#3d3929" } },
  { key: "vercel", label: "Vercel", category: "professional", preview: { background: "oklch(0.99 0 0)", primary: "oklch(0 0 0)", foreground: "oklch(0 0 0)" } },
  { key: "darkmatter", label: "Darkmatter", category: "minimal", preview: { background: "#ffffff", primary: "#d87943", foreground: "#111827" } },
  { key: "mono", label: "Mono", category: "minimal", preview: { background: "#ffffff", primary: "#737373", foreground: "#0a0a0a" } },
  { key: "soft-pop", label: "Soft Pop", category: "playful", preview: { background: "#f7f9f3", primary: "#4f46e5", foreground: "#000000" } },
  { key: "sage-garden", label: "Sage Garden", category: "nature", preview: { background: "#f8f7f4", primary: "#7c9082", foreground: "#1a1f2e" } },
]

/** Set of all valid theme keys for fast lookup */
export const VALID_THEME_KEYS = new Set(THEME_CATALOG.map((t) => t.key))

/**
 * Validate a theme key against the catalog.
 */
export function isValidThemeKey(key: string): boolean {
  return VALID_THEME_KEYS.has(key)
}

/**
 * Validate a color mode value.
 */
export function isValidColorMode(mode: string): boolean {
  return VALID_COLOR_MODES.includes(mode as ColorMode)
}

/**
 * Group theme catalog entries by category.
 */
export function getThemesByCategory(): Record<string, ThemeCatalogEntry[]> {
  const grouped: Record<string, ThemeCatalogEntry[]> = {}
  for (const theme of THEME_CATALOG) {
    const cat = theme.category
    if (!grouped[cat]) {
      grouped[cat] = []
    }
    grouped[cat].push(theme)
  }
  return grouped
}
