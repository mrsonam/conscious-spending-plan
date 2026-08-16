import type { MonthlyTotal } from "@/lib/monthly-total"

export interface ExpensePageAccount {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  isDefault: boolean
}

export interface ExpensePageSavingGoal {
  id: string
  name: string
  status: string
  current: number
}

export interface ExpenseEntry {
  id: string
  accountId: string
  amount: number
  description: string | null
  category: string | null
  expenseCategory: string | null
  savingGoalId: string | null
  date: string
  createdAt?: string
  account: {
    id: string
    name: string
    bankName: string
  }
}

export interface RecurringExpense {
  id: string
  accountId: string
  amount: number
  description: string | null
  category: string | null
  expenseCategory: string | null
  frequency: string
  intervalDays: number | null
  startDate: string
  endDate: string | null
  isActive: boolean
  account: { id: string; name: string; bankName: string }
}

export interface ExpenseCategoryAggregate {
  category: string
  label: string
  amount: number
  count: number
  sharePct: number
  averageAmount: number
  momentumPct: number | null
  previousAmount: number
}

export interface ExpensePageStats {
  currentMonthTotal: number
  ytdTotal: number
  monthOverMonthPct: number | null
  lastMonthExpenses: number
  /** Mean monthly spend over the trailing 6 calendar months (months with spend only). */
  averageMonthlySpending: number
  /** Last 6 calendar months, oldest → newest */
  monthlyTotals: MonthlyTotal[]
  fundBreakdownCurrentMonth: {
    fixedCosts: number
    investment: number
    savings: number
    guiltFreeSpending: number
  }
  subcategoryInsights: {
    totalClassified: number
    unclassifiedAmount: number
    topSharePct: number
    topThreeSharePct: number
    averageEntryAmount: number
    /** Combined amount of all classified categories beyond the top N (see topCategories). */
    otherAmount: number
    otherCount: number
    otherSharePct: number
    topCategories: ExpenseCategoryAggregate[]
  }
}

export type ExpenseMessage = { type: "success" | "error"; text: string } | null
