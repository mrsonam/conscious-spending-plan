import { TOKENS } from "@/lib/wealth-console-tokens"

/** Focus ring for Wealth Console interactive elements (see globals.css). */
export const consoleFocus = "console-focus-visible"

/** 10–11px uppercase micro-labels on dark cards (AA contrast on surfaceContainer). */
export const consoleMicroLabel = {
  color: TOKENS.onSurfaceMutedElevated,
} as const

/** Budget / allocation bar fill; uses transform (see globals.css). */
export const consoleBudgetFill = "console-budget-fill"

/**
 * Page-level period total (month income, month spend, statement net, etc.).
 * Locked typography: do not downscale in audit, quieter, or polish passes.
 * See DESIGN.md (Console hero figures) and PRODUCT.md (Dominant period totals).
 */
export const consoleHeroFigureClass =
  "text-4xl font-black leading-none tracking-tight sm:text-5xl lg:text-[3.6rem]"

/** Pass to MajorFigureCurrency / ScrambleCurrencyValue inside `consoleHeroFigureClass`. */
export const consoleHeroFigureInnerClass = "font-black!"

/**
 * Dashboard overview strip (income, net savings): display scale, fits 3-column row.
 */
export const consoleOverviewFigureClass =
  "text-3xl font-black leading-none tracking-tight sm:text-4xl lg:text-[2.75rem]"
