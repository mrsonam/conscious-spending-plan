import { BENTO } from "@/lib/app-routes"

export type CommandPaletteItem = {
  id: string
  title: string
  href: string
  group: string
  /** Extra tokens for search (lowercase). */
  keywords: string[]
}

/** All dashboard destinations for the Wealth Console shell. */
export function getCommandPaletteItems(): CommandPaletteItem[] {
  return [
    {
      id: "dashboard",
      title: "Dashboard",
      href: BENTO.dashboard,
      group: "Overview",
      keywords: ["home", "overview", "wealth", "console", "summary"],
    },
    {
      id: "income",
      title: "Income",
      href: BENTO.income,
      group: "Activity",
      keywords: ["money", "salary", "pay", "earn", "log"],
    },
    {
      id: "expenses",
      title: "Expenses",
      href: BENTO.expenses,
      group: "Activity",
      keywords: ["spend", "spending", "cost", "purchase"],
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      href: BENTO.subscriptions,
      group: "Activity",
      keywords: ["recurring", "bills", "netflix", "renewal"],
    },
    {
      id: "statement",
      title: "Statement",
      href: BENTO.statement,
      group: "Activity",
      keywords: ["transactions", "history", "ledger", "export"],
    },
    {
      id: "category-tracking",
      title: "Category Tracking",
      href: BENTO.categoryTracking,
      group: "Plan",
      keywords: ["budget", "buckets", "csp", "categories", "tracking"],
    },
    {
      id: "funds",
      title: "Fund Settings",
      href: BENTO.funds,
      group: "Plan",
      keywords: ["allocation", "percent", "fixed", "savings", "investment split"],
    },
    {
      id: "saving-goals",
      title: "Savings Goals",
      href: BENTO.savingGoals,
      group: "Plan",
      keywords: ["goals", "target", "phone", "emergency fund", "savings split"],
    },
    {
      id: "investments",
      title: "Investments",
      href: BENTO.investments,
      group: "Balance sheet",
      keywords: ["stocks", "shares", "portfolio", "holdings"],
    },
    {
      id: "accounts",
      title: "Accounts",
      href: BENTO.accounts,
      group: "Balance sheet",
      keywords: ["bank", "checking", "balance", "cards"],
    },
    {
      id: "loans",
      title: "Loans",
      href: BENTO.loans,
      group: "Balance sheet",
      keywords: ["lend", "borrow", "debt", "repay"],
    },
    {
      id: "profile",
      title: "Profile",
      href: BENTO.profile,
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
