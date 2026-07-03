import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"

/** Sidebar brand band — safe area is on the parent aside. */
export const SHELL_SIDEBAR_HEADER_BAND_CLASS = cn(
  "flex shrink-0 flex-col justify-center border-b pt-5 pb-4 lg:min-h-20",
)

/** Sticky page header — compact on mobile; matches sidebar band from lg up. */
export const SHELL_HEADER_STICKY_BAND_CLASS = cn(
  "flex shrink-0 flex-col justify-center border-b",
  "pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]",
  "lg:pb-4 lg:pt-5 lg:min-h-20",
)

export const SHELL_HEADER_INNER_CLASS = cn(
  "flex min-h-10 items-center justify-between gap-3",
  "sm:min-h-0 sm:items-start",
  "lg:min-h-11 lg:items-center",
)

export const shellHeaderBorderStyle = {
  borderColor: TOKENS.outlineGhost,
} as const
