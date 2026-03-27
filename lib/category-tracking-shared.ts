import type { LucideIcon } from "lucide-react"
import {
  Wallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  PiggyBank as PiggyBankIcon,
  CreditCard as CreditCardIcon,
} from "lucide-react"
import { EXPENSE_CATEGORIES } from "@/lib/expense-page-constants"

export interface CategoryTrackingRow {
  allocated: number
  spent: number
  transferred: number
  income: number
  carryover: number
  overspending: number
  available: number
  remaining: number
  overspent: number
  overspentFromTransfer?: number
}

export const FUND_KEYS = [
  "fixedCosts",
  "investment",
  "savings",
  "guiltFreeSpending",
] as const

export type TrackingFundKey = (typeof FUND_KEYS)[number]

export type TrackingFundCategoryMeta = {
  key: TrackingFundKey
  label: string
  short: string
  colorHex: string
  Icon: LucideIcon
  iconClass: string
  borderClass: string
}

export const TRACKING_FUND_CATEGORIES: TrackingFundCategoryMeta[] = [
  {
    key: "fixedCosts",
    label: "Fixed costs",
    short: "Fixed",
    colorHex: "#ef4444",
    Icon: WalletIcon,
    iconClass: "text-red-600",
    borderClass: "border-red-200",
  },
  {
    key: "investment",
    label: "Investment",
    short: "Invest",
    colorHex: "#3b82f6",
    Icon: TrendingUpIcon,
    iconClass: "text-blue-600",
    borderClass: "border-blue-200",
  },
  {
    key: "savings",
    label: "Savings",
    short: "Save",
    colorHex: "#10b981",
    Icon: PiggyBankIcon,
    iconClass: "text-emerald-600",
    borderClass: "border-emerald-200",
  },
  {
    key: "guiltFreeSpending",
    label: "Guilt-free",
    short: "Fun",
    colorHex: "#8b5cf6",
    Icon: CreditCardIcon,
    iconClass: "text-violet-600",
    borderClass: "border-violet-200",
  },
]

export function expenseTypeLabel(value: string | null | undefined) {
  if (!value) return "Uncategorized"
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

/** Elapsed fraction of selected month for pace (0–1). Past months = 1, future = 0. */
export function getMonthElapsedFraction(month: number, year: number): number {
  const now = new Date()
  const cy = now.getFullYear()
  const cm = now.getMonth() + 1
  if (year < cy || (year === cy && month < cm)) return 1
  if (year > cy || (year === cy && month > cm)) return 0
  const dim = new Date(year, month, 0).getDate()
  return Math.min(1, now.getDate() / dim)
}
