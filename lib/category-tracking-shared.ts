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
  /** When set, UI shows this instead of envelope headroom (liquid reconciliation). */
  displayRemaining?: number
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

export function trackingFundLabel(key: string): string {
  return TRACKING_FUND_CATEGORIES.find((c) => c.key === key)?.label ?? key
}

export function trackingFundShort(key: string): string {
  return TRACKING_FUND_CATEGORIES.find((c) => c.key === key)?.short ?? key
}

/** True headroom for one pillar: remaining minus any current-month breach. */
export function netPillarHeadroom(
  row: Pick<CategoryTrackingRow, "remaining" | "overspent">
): number {
  return Math.round((row.remaining - (row.overspent ?? 0)) * 100) / 100
}

/**
 * Savings you can still spend or move — total in the savings bucket minus
 * amounts assigned to saving goals, capped by envelope headroom after spend.
 */
export function savingsSpendableAmount(
  row: Pick<CategoryTrackingRow, "remaining" | "overspent">,
  savingsAssignedToGoals: number,
  savingsGeneralAvailable: number
): number {
  const headroom = netPillarHeadroom(row)
  const bucketTotal =
    Math.round((Math.max(0, savingsGeneralAvailable) + Math.max(0, savingsAssignedToGoals)) * 100) /
    100
  const afterGoals = Math.max(
    0,
    Math.round((bucketTotal - Math.max(0, savingsAssignedToGoals)) * 100) / 100
  )
  return Math.round(Math.min(headroom, afterGoals) * 100) / 100
}

function pillarDisplayRemaining(
  key: TrackingFundKey,
  row: CategoryTrackingRow,
  savingsGeneralAvailable?: number,
  savingsAssignedToGoals?: number
): number {
  if (key === "savings") {
    const goals = Math.max(0, savingsAssignedToGoals ?? 0)
    const total =
      row.displayRemaining ??
      (savingsGeneralAvailable != null
        ? savingsGeneralAvailable + goals
        : netPillarHeadroom(row))
    return Math.max(0, Math.round((total - goals) * 100) / 100)
  }
  if (row.displayRemaining != null) {
    return row.displayRemaining
  }
  return netPillarHeadroom(row)
}

/** Deployable balance across all pillars (can be negative when net overspent). */
export function sumDeployableBalance(
  tracking: Record<string, CategoryTrackingRow>,
  savingsGeneralAvailable?: number,
  savingsAssignedToGoals?: number
): number {
  return Math.round(
    FUND_KEYS.reduce((sum, key) => {
      const row = tracking[key]
      return (
        sum +
        (row
          ? pillarDisplayRemaining(key, row, savingsGeneralAvailable, savingsAssignedToGoals)
          : 0)
      )
    }, 0) * 100
  ) / 100
}

/**
 * For the current month, assign any unallocated liquid to savings so pillar
 * residuals sum to the non-investment account balance (display only).
 */
export function reconcileTrackingDisplayToLiquid(
  tracking: Record<string, CategoryTrackingRow>,
  liquidTotal: number,
): Record<string, CategoryTrackingRow> {
  if (liquidTotal <= 0) return tracking

  const fixed = netPillarHeadroom(tracking.fixedCosts ?? { remaining: 0, overspent: 0 })
  const investment = netPillarHeadroom(tracking.investment ?? { remaining: 0, overspent: 0 })
  const guilt = netPillarHeadroom(tracking.guiltFreeSpending ?? { remaining: 0, overspent: 0 })
  const otherSum = Math.round((fixed + investment + guilt) * 100) / 100
  const savingsDisplay = Math.round((liquidTotal - otherSum) * 100) / 100

  const next: Record<string, CategoryTrackingRow> = { ...tracking }

  if (tracking.fixedCosts) {
    next.fixedCosts = { ...tracking.fixedCosts, displayRemaining: fixed }
  }
  if (tracking.investment) {
    next.investment = { ...tracking.investment, displayRemaining: investment }
  }
  if (tracking.guiltFreeSpending) {
    next.guiltFreeSpending = { ...tracking.guiltFreeSpending, displayRemaining: guilt }
  }
  if (tracking.savings) {
    next.savings = { ...tracking.savings, displayRemaining: savingsDisplay }
  }

  return next
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
