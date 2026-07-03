import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"

/** pt-5 + min-h-11 content + pb-4 — matches sidebar brand band height. */
export const SHELL_HEADER_BAND_CLASS = cn(
  "flex shrink-0 flex-col justify-center border-b pt-5 pb-4 min-h-20",
)

/** Sticky page header: same band height, with safe-area folded into top padding on mobile. */
export const SHELL_HEADER_STICKY_BAND_CLASS = cn(
  SHELL_HEADER_BAND_CLASS,
  "pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] min-h-[calc(5rem+env(safe-area-inset-top,0px))] lg:pt-5 lg:min-h-20",
)

export const SHELL_HEADER_INNER_CLASS =
  "flex min-h-11 items-center justify-between gap-3"

export const shellHeaderBorderStyle = {
  borderColor: TOKENS.outlineGhost,
} as const
