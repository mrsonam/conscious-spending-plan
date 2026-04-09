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
  const categoryTrackingHref =
    theme === "console" ? BENTO.categoryTracking : CLASSIC.categoryTracking
  const fundsHref = theme === "console" ? BENTO.funds : CLASSIC.funds
  const investmentsHref =
    theme === "console" ? BENTO.investments : CLASSIC.investments
  const accountsHref = theme === "console" ? BENTO.accounts : CLASSIC.accounts
  const loansHref = theme === "console" ? BENTO.loans : CLASSIC.loans
  const profileHref = theme === "console" ? BENTO.profile : CLASSIC.profile
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
          href: categoryTrackingHref,
          icon: BarChart3,
        },
        { name: "Fund Settings", href: fundsHref, icon: Wallet },
      ],
    },
    {
      id: "balance",
      label: "Balance sheet",
      items: [
        { name: "Investments", href: investmentsHref, icon: TrendingUp },
        { name: "Accounts", href: accountsHref, icon: CreditCard },
        { name: "Loans", href: loansHref, icon: HandCoins },
      ],
    },
    {
      id: "account",
      label: "You",
      items: [{ name: "Profile", href: profileHref, icon: User }],
    },
  ]
}

export function buildSidebarNavigationGroups(
  _dashboardTheme: string | undefined
): SidebarNavGroup[] {
  const theme = "console"
  const dashboardHref = DASHBOARD_HOME[theme]
  return navGroups(dashboardHref, theme)
}

/** Flat list in a stable order (classic sidebar). */
export function buildSidebarNavigation(
  dashboardTheme: string | undefined
): SidebarNavItem[] {
  return buildSidebarNavigationGroups(dashboardTheme).flatMap((g) => g.items)
}
