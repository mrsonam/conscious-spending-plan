import { BENTO, CLASSIC } from "@/lib/app-routes"
import { DASHBOARD_HOME, type DashboardTheme } from "@/lib/dashboard-theme"

export type CommandPaletteItem = {
  id: string
  title: string
  href: string
  group: string
  /** Extra tokens for search (lowercase). */
  keywords: string[]
}

function route(shell: "classic" | "console") {
  return shell === "classic" ? CLASSIC : BENTO
}

/** All dashboard destinations for the user’s current shell (classic vs Wealth Console). */
export function getCommandPaletteItems(
  shell: DashboardTheme | undefined
): CommandPaletteItem[] {
  const s = shell === "classic" ? "classic" : "console"
  const R = route(s)
  const dashboardHref = DASHBOARD_HOME[shell === "classic" ? "classic" : "console"]

  return [
    {
      id: "dashboard",
      title: "Dashboard",
      href: dashboardHref,
      group: "Overview",
      keywords: ["home", "overview", "wealth", "console", "summary"],
    },
    {
      id: "income",
      title: "Income",
      href: R.income,
      group: "Activity",
      keywords: ["money", "salary", "pay", "earn", "log"],
    },
    {
      id: "expenses",
      title: "Expenses",
      href: R.expenses,
      group: "Activity",
      keywords: ["spend", "spending", "cost", "purchase"],
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      href: R.subscriptions,
      group: "Activity",
      keywords: ["recurring", "bills", "netflix", "renewal"],
    },
    {
      id: "statement",
      title: "Statement",
      href: R.statement,
      group: "Activity",
      keywords: ["transactions", "history", "ledger", "export"],
    },
    {
      id: "category-tracking",
      title: "Category Tracking",
      href: R.categoryTracking,
      group: "Plan",
      keywords: ["budget", "buckets", "csp", "categories", "tracking"],
    },
    {
      id: "funds",
      title: "Fund Settings",
      href: R.funds,
      group: "Plan",
      keywords: ["allocation", "percent", "fixed", "savings", "investment split"],
    },
    {
      id: "investments",
      title: "Investments",
      href: R.investments,
      group: "Balance sheet",
      keywords: ["stocks", "shares", "portfolio", "holdings"],
    },
    {
      id: "accounts",
      title: "Accounts",
      href: R.accounts,
      group: "Balance sheet",
      keywords: ["bank", "checking", "balance", "cards"],
    },
    {
      id: "loans",
      title: "Loans",
      href: R.loans,
      group: "Balance sheet",
      keywords: ["lend", "borrow", "debt", "repay"],
    },
    {
      id: "profile",
      title: "Profile",
      href: R.profile,
      group: "You",
      keywords: ["settings", "account", "currency", "preferences", "user"],
    },
    {
      id: "shortcuts",
      title: "Shortcuts",
      href: BENTO.shortcuts,
      group: "You",
      keywords: [
        "api",
        "token",
        "integration",
        "apple",
        "wallet",
        "automation",
        "ios",
      ],
    },
  ]
}

export function filterCommandPaletteItems(
  items: CommandPaletteItem[],
  query: string
): CommandPaletteItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items

  const words = q.split(/\s+/).filter(Boolean)

  return items.filter((item) => {
    const blob = `${item.title} ${item.group} ${item.keywords.join(" ")} ${item.href}`
      .toLowerCase()
      .replace(/[^\w\s/-]/g, " ")
    return words.every((w) => blob.includes(w))
  })
}
