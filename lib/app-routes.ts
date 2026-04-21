/**
 * File-based routes for theme shells.
 * Classic: light UI under `/classic/*`
 * Bento (Wealth Console): now the default shell (no `/bento` prefix).
 *
 * Keep feature pages in **both** trees when the feature exists for both themes
 * (separate files), even if behavior is shared via hooks/components.
 */
export const CLASSIC = {
  dashboard: "/classic/dashboard",
  categoryTracking: "/classic/category-tracking",
  income: "/classic/income",
  expenses: "/classic/expenses",
  subscriptions: "/classic/subscriptions",
  loans: "/classic/loans",
  statement: "/classic/statement",
  investments: "/classic/investments",
  accounts: "/classic/accounts",
  funds: "/classic/funds",
  profile: "/classic/profile",
} as const

export const BENTO = {
  dashboard: "/dashboard",
  income: "/income",
  expenses: "/expenses",
  subscriptions: "/subscriptions",
  statement: "/statement",
  categoryTracking: "/category-tracking",
  funds: "/funds",
  investments: "/investments",
  accounts: "/accounts",
  loans: "/loans",
  profile: "/profile",
  shortcuts: "/shortcuts",
} as const
