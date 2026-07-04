import { TOKENS } from "@/lib/wealth-console-tokens"

/** Manifest / install defaults (brand indigo). */
export const PWA_THEME_COLOR_MANIFEST = "#6366f1"

/** Wealth Console, matches `TOKENS.surface` for status / Island surround. */
export const PWA_THEME_COLOR_CONSOLE = TOKENS.surface

export function pwaThemeColorForShell(): string {
  return PWA_THEME_COLOR_CONSOLE
}
