import type {
  Account,
  Breakdown,
  CategoryTracking,
  Expense,
  YtdSummary,
} from "@/components/wealth-console/types"
import { TRACKING_CATEGORIES } from "@/lib/category-tracking-calculation"
import type { FundAllocation } from "@/lib/income-page-types"
import {
  computeOptimisticBreakdown,
  isInCurrentMonth,
  isInCurrentYear,
} from "@/lib/income-optimistic"

export type DashboardConsoleSnapshot = {
  breakdown: Breakdown | null
  accounts: Account[]
  expenses: Expense[]
  expensesTotalForMonth: number | null
  categoryTracking: Record<string, CategoryTracking>
  ytdSummary: YtdSummary | null
}

export type DashboardIncomeLogPatch = {
  amount: number
  date: string
  accountId: string | null
  allocateToBudget: boolean
  allocation: FundAllocation
  account: Pick<Account, "id" | "name" | "bankName" | "accountType"> | null
}

export type DashboardExpenseLogPatch = {
  id: string
  accountId: string
  amount: number
  description: string | null
  category: string | null
  date: string
}

function isTrackingCategory(category: string): boolean {
  return (TRACKING_CATEGORIES as readonly string[]).includes(category)
}

function mergeBreakdownDelta(
  current: Breakdown | null,
  delta: Breakdown,
): Breakdown {
  if (!current) return { ...delta }
  return {
    income: current.income + delta.income,
    fixedCosts: current.fixedCosts + delta.fixedCosts,
    savings: current.savings + delta.savings,
    investment: current.investment + delta.investment,
    guiltFreeSpending: current.guiltFreeSpending + delta.guiltFreeSpending,
    total: current.total + delta.total,
  }
}

function patchTrackingAllocated(
  tracking: Record<string, CategoryTracking>,
  slice: Pick<
    Breakdown,
    "fixedCosts" | "savings" | "investment" | "guiltFreeSpending"
  >,
): Record<string, CategoryTracking> {
  const next = { ...tracking }
  const deltas: Array<[string, number]> = [
    ["fixedCosts", slice.fixedCosts],
    ["savings", slice.savings],
    ["investment", slice.investment],
    ["guiltFreeSpending", slice.guiltFreeSpending],
  ]

  for (const [category, delta] of deltas) {
    if (delta <= 0) continue
    const current = next[category] ?? {
      allocated: 0,
      spent: 0,
      remaining: 0,
    }
    const allocated = current.allocated + delta
    const remaining = allocated - current.spent
    next[category] = {
      ...current,
      allocated,
      remaining: Math.max(0, remaining),
      ...(remaining < 0 ? { overspent: Math.abs(remaining) } : {}),
    }
  }

  return next
}

function patchTrackingSpent(
  tracking: Record<string, CategoryTracking>,
  category: string,
  amount: number,
): Record<string, CategoryTracking> {
  const current = tracking[category] ?? {
    allocated: 0,
    spent: 0,
    remaining: 0,
  }
  const spent = current.spent + amount
  const remaining = current.allocated - spent
  return {
    ...tracking,
    [category]: {
      ...current,
      spent,
      remaining: Math.max(0, remaining),
      ...(remaining < 0 ? { overspent: Math.abs(remaining) } : {}),
    },
  }
}

export function patchDashboardForIncomeLog(
  state: DashboardConsoleSnapshot,
  input: DashboardIncomeLogPatch,
): DashboardConsoleSnapshot {
  const slice = computeOptimisticBreakdown(input.amount, input.allocation, {
    allocateToBudget: input.allocateToBudget,
    account: input.account,
  })

  const breakdown = mergeBreakdownDelta(state.breakdown, slice)

  const accounts =
    input.accountId != null
      ? state.accounts.map((row) =>
          row.id === input.accountId
            ? { ...row, balance: row.balance + input.amount }
            : row,
        )
      : state.accounts

  let categoryTracking = state.categoryTracking
  if (input.allocateToBudget && isInCurrentMonth(input.date)) {
    categoryTracking = patchTrackingAllocated(categoryTracking, slice)
  }

  let ytdSummary = state.ytdSummary
  if (isInCurrentYear(input.date) && ytdSummary) {
    ytdSummary = {
      ...ytdSummary,
      totalIncome: ytdSummary.totalIncome + input.amount,
    }
  }

  return {
    ...state,
    breakdown,
    accounts,
    categoryTracking,
    ytdSummary,
  }
}

export function patchDashboardForExpenseLog(
  state: DashboardConsoleSnapshot,
  input: DashboardExpenseLogPatch,
): DashboardConsoleSnapshot {
  const day = input.date.slice(0, 10)
  const inMonth = isInCurrentMonth(day)

  const accounts = state.accounts.map((row) =>
    row.id === input.accountId
      ? { ...row, balance: row.balance - input.amount }
      : row,
  )

  let expenses = state.expenses
  let expensesTotalForMonth = state.expensesTotalForMonth
  if (inMonth) {
    const entry: Expense = {
      id: input.id,
      amount: input.amount,
      description: input.description,
      category: input.category,
      date: day,
    }
    expenses = [entry, ...expenses.filter((row) => row.id !== input.id)]
    expensesTotalForMonth = (expensesTotalForMonth ?? 0) + input.amount
  }

  let categoryTracking = state.categoryTracking
  if (
    inMonth &&
    input.category &&
    isTrackingCategory(input.category)
  ) {
    categoryTracking = patchTrackingSpent(
      categoryTracking,
      input.category,
      input.amount,
    )
  }

  let ytdSummary = state.ytdSummary
  if (isInCurrentYear(day) && ytdSummary) {
    ytdSummary = {
      ...ytdSummary,
      totalExpenses: ytdSummary.totalExpenses + input.amount,
    }
  }

  return {
    ...state,
    accounts,
    expenses,
    expensesTotalForMonth,
    categoryTracking,
    ytdSummary,
  }
}
