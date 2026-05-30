export const TRACKING_CATEGORIES = ["fixedCosts", "investment", "guiltFreeSpending", "savings"] as const

export type TrackingCategory = (typeof TRACKING_CATEGORIES)[number]

export type CategoryBalanceInput = {
  category: string
  balance: number | null
}

export type CategorizedAmountInput = {
  category: string | null
  amount: number
}

export type InvestmentAmountInput = {
  amount: number
}

export type CategoryTrackingValue = {
  allocated: number
  spent: number
  transferred: number
  income: number
  carryover: number
  overspending: number
  available: number
  remaining: number
  overspent: number
  overspentFromTransfer: number
}

type CategoryStat = {
  allocated: number
  spent: number
  transferred: number
}

export function calculateCategoryTracking({
  categoryBalances,
  expenses,
  transfers,
  carryoverByCategory,
  overspentByCategory,
  incomeAllocatedByCategory,
}: {
  categoryBalances: CategoryBalanceInput[]
  expenses: CategorizedAmountInput[]
  transfers: CategorizedAmountInput[]
  investments: InvestmentAmountInput[]
  carryoverByCategory: Record<string, number>
  overspentByCategory: Record<string, number>
  /** When set, used for `allocated` (this month's income splits). Caps ignore carryover. */
  incomeAllocatedByCategory?: Record<string, number>
}): Record<TrackingCategory, CategoryTrackingValue> {
  const categoryStats = createCategoryStats()

  for (const balance of categoryBalances) {
    if (isTrackingCategory(balance.category)) {
      categoryStats[balance.category].allocated += balance.balance || 0
    }
  }

  for (const expense of expenses) {
    if (expense.category && isTrackingCategory(expense.category) && expense.category !== "investment") {
      categoryStats[expense.category].spent += expense.amount
    }
  }

  for (const transfer of transfers) {
    if (transfer.category && isTrackingCategory(transfer.category)) {
      categoryStats[transfer.category].transferred += transfer.amount
    }
  }

  const tracking = {} as Record<TrackingCategory, CategoryTrackingValue>

  for (const category of TRACKING_CATEGORIES) {
    const carryover = carryoverByCategory[category] ?? 0
    const overspending = overspentByCategory[category] ?? 0
    const current = categoryStats[category]
    const available = current.allocated - overspending
    const allocatedFromIncome =
      incomeAllocatedByCategory?.[category] ??
      Math.max(0, current.allocated - carryover)
    const remaining =
      category === "investment"
        ? available - current.transferred
        : available - current.spent - current.transferred
    const overspentTotal = remaining < 0 ? Math.abs(remaining) : 0
    const overspentFromTransfer =
      category !== "investment" && overspentTotal > 0 ? Math.min(current.transferred, overspentTotal) : 0

    tracking[category] = {
      allocated: round2(allocatedFromIncome),
      spent: round2(category === "investment" ? current.transferred : current.spent),
      transferred: round2(current.transferred),
      income: 0,
      carryover: round2(carryover),
      overspending: round2(overspending),
      available: round2(available),
      remaining: round2(Math.max(0, remaining)),
      overspent: round2(overspentTotal),
      overspentFromTransfer: round2(overspentFromTransfer),
    }
  }

  return tracking
}

export function calculateMonthClosing({
  categoryBalances,
  expenses,
  transfers,
  previousOverspentByCategory,
}: {
  categoryBalances: CategoryBalanceInput[]
  expenses: CategorizedAmountInput[]
  transfers: CategorizedAmountInput[]
  investments: InvestmentAmountInput[]
  previousOverspentByCategory: Record<string, number>
}) {
  const remaining = {} as Record<TrackingCategory, number>
  const overspent = {} as Record<TrackingCategory, number>

  for (const category of TRACKING_CATEGORIES) {
    const balance = categoryBalances.reduce((sum, current) => {
      return current.category === category ? sum + (current.balance ?? 0) : sum
    }, 0)
    const allocatedAfterPrevOverspent = Math.max(0, balance - (previousOverspentByCategory[category] ?? 0))
    const spent = calculateBucketSpend(category, expenses, transfers)
    const net = allocatedAfterPrevOverspent - spent

    remaining[category] = net >= 0 ? net : 0
    overspent[category] = net < 0 ? Math.abs(net) : 0
  }

  return { remaining, overspent }
}

function createCategoryStats(): Record<TrackingCategory, CategoryStat> {
  return Object.fromEntries(
    TRACKING_CATEGORIES.map((category) => [category, { allocated: 0, spent: 0, transferred: 0 }]),
  ) as Record<TrackingCategory, CategoryStat>
}

function calculateBucketSpend(
  category: TrackingCategory,
  expenses: CategorizedAmountInput[],
  transfers: CategorizedAmountInput[],
) {
  if (category === "investment") {
    return transfers.reduce((sum, transfer) => {
      return transfer.category === "investment" ? sum + transfer.amount : sum
    }, 0)
  }

  const expenseTotal = expenses.reduce((sum, expense) => {
    return expense.category === category ? sum + expense.amount : sum
  }, 0)
  const transferTotal = transfers.reduce((sum, transfer) => {
    return transfer.category === category ? sum + transfer.amount : sum
  }, 0)

  return expenseTotal + transferTotal
}

function isTrackingCategory(category: string): category is TrackingCategory {
  return TRACKING_CATEGORIES.includes(category as TrackingCategory)
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}
