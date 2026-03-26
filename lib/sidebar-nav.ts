import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  DollarSign,
  User,
  Wallet,
  CreditCard,
  TrendingDown,
  FileText,
  TrendingUp,
  BarChart3,
  HandCoins,
} from "lucide-react"
import { DASHBOARD_HOME } from "@/lib/dashboard-theme"
import { BENTO, CLASSIC } from "@/lib/app-routes"

export type SidebarNavItem = { name: string; href: string; icon: LucideIcon }

export type SidebarNavGroup = {
  id: string
  /** Short label for bento rail (uppercase, tracked) */
  label: string
  items: SidebarNavItem[]
}

function navGroups(
  dashboardHref: string,
  theme: "classic" | "console",
): SidebarNavGroup[] {
  const incomeHref = theme === "console" ? BENTO.income : CLASSIC.income
  const expensesHref =
    theme === "console" ? BENTO.expenses : CLASSIC.expenses
  const statementHref =
    theme === "console" ? BENTO.statement : CLASSIC.statement
  return [
    {
      id: "overview",
      label: "Overview",
      items: [
        { name: "Dashboard", href: dashboardHref, icon: LayoutDashboard },
      ],
    },
    {
      id: "activity",
      label: "Activity",
      items: [
        { name: "Income", href: incomeHref, icon: DollarSign },
        { name: "Expenses", href: expensesHref, icon: TrendingDown },
        { name: "Statement", href: statementHref, icon: FileText },
      ],
    },
    {
      id: "plan",
      label: "Plan",
      items: [
        {
          name: "Category Tracking",
          href: CLASSIC.categoryTracking,
          icon: BarChart3,
        },
        { name: "Fund Settings", href: CLASSIC.funds, icon: Wallet },
      ],
    },
    {
      id: "balance",
      label: "Balance sheet",
      items: [
        { name: "Investments", href: CLASSIC.investments, icon: TrendingUp },
        { name: "Accounts", href: CLASSIC.accounts, icon: CreditCard },
        { name: "Loans", href: CLASSIC.loans, icon: HandCoins },
      ],
    },
    {
      id: "account",
      label: "You",
      items: [{ name: "Profile", href: CLASSIC.profile, icon: User }],
    },
  ]
}

export function buildSidebarNavigationGroups(
  dashboardTheme: string | undefined
): SidebarNavGroup[] {
  const theme = dashboardTheme === "console" ? "console" : "classic"
  const dashboardHref = DASHBOARD_HOME[theme]
  return navGroups(dashboardHref, theme)
}

/** Flat list in a stable order (classic sidebar). */
export function buildSidebarNavigation(
  dashboardTheme: string | undefined
): SidebarNavItem[] {
  return buildSidebarNavigationGroups(dashboardTheme).flatMap((g) => g.items)
}
