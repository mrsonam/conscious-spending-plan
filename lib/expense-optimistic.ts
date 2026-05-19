import type { ExpenseEntry, ExpensePageStats } from "@/lib/expense-page-types"

export type ExpenseListFilters = {
  startDate?: string
  endDate?: string
  fundCategory?: string
  expenseCategory?: string
  accountId?: string
}

const FUND_KEYS = [
  "fixedCosts",
  "investment",
  "savings",
  "guiltFreeSpending",
] as const

type FundKey = (typeof FUND_KEYS)[number]

function isFundKey(value: string | null): value is FundKey {
  return value != null && (FUND_KEYS as readonly string[]).includes(value)
}

export function createOptimisticExpenseId(): string {
  return `optimistic-${crypto.randomUUID()}`
}

export function expenseMatchesListFilters(
  expense: Pick<
    ExpenseEntry,
    "accountId" | "category" | "expenseCategory" | "date"
  >,
  filters: ExpenseListFilters,
): boolean {
  const day = expense.date.slice(0, 10)
  if (filters.accountId && expense.accountId !== filters.accountId) return false
  if (filters.fundCategory && expense.category !== filters.fundCategory) return false
  if (filters.expenseCategory && expense.expenseCategory !== filters.expenseCategory) {
    return false
  }
  if (filters.startDate && day < filters.startDate) return false
  if (filters.endDate && day > filters.endDate) return false
  return true
}

export function buildOptimisticExpenseEntry(input: {
  id: string
  accountId: string
  amount: number
  description: string | null
  category: string | null
  expenseCategory: string | null
  date: string
  account: ExpenseEntry["account"]
}): ExpenseEntry {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  }
}

export function applyOptimisticSummaryDelta(
  stats: ExpensePageStats,
  expense: Pick<
    ExpenseEntry,
    "amount" | "category" | "expenseCategory" | "date"
  >,
): ExpensePageStats {
  const expenseDay = expense.date.slice(0, 10)
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const monthStart = `${now.getFullYear()}-${month}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${now.getFullYear()}-${month}-${String(lastDay).padStart(2, "0")}`

  if (expenseDay < monthStart || expenseDay > monthEnd) return stats

  const fundBreakdown = { ...stats.fundBreakdownCurrentMonth }
  if (isFundKey(expense.category)) {
    fundBreakdown[expense.category] += expense.amount
  }

  return {
    ...stats,
    currentMonthTotal: stats.currentMonthTotal + expense.amount,
    fundBreakdownCurrentMonth: fundBreakdown,
  }
}

export function normalizeExpenseFromApi(expense: ExpenseEntry): ExpenseEntry {
  return {
    ...expense,
    date:
      typeof expense.date === "string"
        ? expense.date.slice(0, 10)
        : expense.date,
  }
}
