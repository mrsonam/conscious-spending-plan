/**
 * File-based routes for theme shells.
 * Classic: light UI under `/classic/*`
 * Bento (Wealth Console): dark institutional UI under `/bento/*`
 *
 * Keep feature pages in **both** trees when the feature exists for both themes
 * (separate files), even if behavior is shared via hooks/components.
 */
export const CLASSIC = {
  dashboard: "/classic/dashboard",
  categoryTracking: "/classic/category-tracking",
  income: "/classic/income",
  expenses: "/classic/expenses",
  loans: "/classic/loans",
  statement: "/classic/statement",
  investments: "/classic/investments",
  accounts: "/classic/accounts",
  funds: "/classic/funds",
  profile: "/classic/profile",
} as const

export const BENTO = {
  dashboard: "/bento/dashboard",
  income: "/bento/income",
  expenses: "/bento/expenses",
  statement: "/bento/statement",
  categoryTracking: "/bento/category-tracking",
  funds: "/bento/funds",
  investments: "/bento/investments",
  accounts: "/bento/accounts",
  loans: "/bento/loans",
  profile: "/bento/profile",
} as const
