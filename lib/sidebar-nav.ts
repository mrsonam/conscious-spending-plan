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
  CalendarClock,
  Zap,
} from "lucide-react"
import { BENTO } from "@/lib/app-routes"

export type SidebarNavItem = { name: string; href: string; icon: LucideIcon }

export type SidebarNavGroup = {
  id: string
  /** Short label for bento rail (uppercase, tracked) */
  label: string
  items: SidebarNavItem[]
}

const SIDEBAR_NAV_GROUPS: SidebarNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { name: "Dashboard", href: BENTO.dashboard, icon: LayoutDashboard },
    ],
  },
  {
    id: "activity",
    label: "Activity",
    items: [
      { name: "Income", href: BENTO.income, icon: DollarSign },
      { name: "Expenses", href: BENTO.expenses, icon: TrendingDown },
      { name: "Subscriptions", href: BENTO.subscriptions, icon: CalendarClock },
      { name: "Statement", href: BENTO.statement, icon: FileText },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    items: [
      {
        name: "Category Tracking",
        href: BENTO.categoryTracking,
        icon: BarChart3,
      },
      { name: "Fund Settings", href: BENTO.funds, icon: Wallet },
    ],
  },
  {
    id: "balance",
    label: "Balance sheet",
    items: [
      { name: "Investments", href: BENTO.investments, icon: TrendingUp },
      { name: "Accounts", href: BENTO.accounts, icon: CreditCard },
      { name: "Loans", href: BENTO.loans, icon: HandCoins },
    ],
  },
  {
    id: "account",
    label: "You",
    items: [
      { name: "Profile", href: BENTO.profile, icon: User },
      { name: "Shortcuts", href: BENTO.shortcuts, icon: Zap },
    ],
  },
]

export function buildSidebarNavigationGroups(
  _dashboardTheme?: string
): SidebarNavGroup[] {
  return SIDEBAR_NAV_GROUPS
}

/** Flat list in a stable order. */
export function buildSidebarNavigation(
  dashboardTheme?: string
): SidebarNavItem[] {
  return buildSidebarNavigationGroups(dashboardTheme).flatMap((g) => g.items)
}
