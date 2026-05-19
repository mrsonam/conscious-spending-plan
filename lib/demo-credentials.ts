/** Public demo account — seeded with rich sample data for exploration. */
export const DEMO_ACCOUNT = {
  email: "demo@try.conscious-spending.plan",
  password: "DemoTour2026!",
} as const

export function isDemoAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === DEMO_ACCOUNT.email.toLowerCase()
}

/**
 * When this exact query pair is present on `/login`, the “Use demo account”
 * control is visually emphasized (e.g. link from your portfolio site).
 *
 * Example: `/login?csp_portfolio_ref=explore_demo_v1`
 */
export const PORTFOLIO_DEMO_QUERY_KEY = "csp_portfolio_ref" as const
export const PORTFOLIO_DEMO_QUERY_VALUE = "explore_demo_v1" as const

