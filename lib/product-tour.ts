/** DOM target via `[data-tour="…"]` on sidebar links and shell chrome. */
export type ProductTourTargetId =
  | "nav-dashboard"
  | "nav-income"
  | "nav-expenses"
  | "nav-funds"
  | "nav-category-tracking"
  | "nav-accounts"

export type ProductTourStep = {
  id: string
  title: string
  body: string
  /** When omitted, tooltip is centered (welcome / finish). */
  target?: ProductTourTargetId
  placement?: "right" | "bottom"
}

export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    id: "welcome",
    title: "Your Wealth Console",
    body: "Quick tour of the main areas, like level markers on a map. Each step highlights a tab in the sidebar.",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    target: "nav-dashboard",
    placement: "right",
    body: "Your home base: net worth pulse, monthly flow, and how your four buckets are doing at a glance.",
  },
  {
    id: "income",
    title: "Income",
    target: "nav-income",
    placement: "right",
    body: "Log paychecks and other inflows. Each entry splits automatically across your conscious spending buckets.",
  },
  {
    id: "expenses",
    title: "Expenses",
    target: "nav-expenses",
    placement: "right",
    body: "Track day-to-day spending and tie purchases to the right bucket so guilt-free stays guilt-free.",
  },
  {
    id: "funds",
    title: "Fund settings",
    target: "nav-funds",
    placement: "right",
    body: "Adjust the percentage or fixed amount that flows into fixed costs, savings, investments, and guilt-free spending.",
  },
  {
    id: "category-tracking",
    title: "Category tracking",
    target: "nav-category-tracking",
    placement: "right",
    body: "See how real spending compares to your plan month by month. Spot drift before it becomes a habit.",
  },
  {
    id: "accounts",
    title: "Accounts",
    target: "nav-accounts",
    placement: "right",
    body: "Linked banks and balances live here. Transfers between accounts keep your ledger honest.",
  },
  {
    id: "finish",
    title: "You're ready to plan",
    body: "Start on the dashboard, log your next paycheck, and watch your plan come alive. You can replay this tour anytime from Profile.",
  },
]

/** Sidebar nav label → tour target id */
export const NAV_ITEM_TOUR_IDS: Record<string, ProductTourTargetId> = {
  Dashboard: "nav-dashboard",
  Income: "nav-income",
  Expenses: "nav-expenses",
  "Fund Settings": "nav-funds",
  "Category Tracking": "nav-category-tracking",
  Accounts: "nav-accounts",
}

export const CSP_OPEN_SIDEBAR_EVENT = "csp:open-sidebar"

export function dispatchOpenSidebar(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CSP_OPEN_SIDEBAR_EVENT))
}
