export interface ExpensePageAccount {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  isDefault: boolean
}

export interface ExpenseEntry {
  id: string
  accountId: string
  amount: number
  description: string | null
  category: string | null
  expenseCategory: string | null
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
  startDate: string
  endDate: string | null
  isActive: boolean
  account: { id: string; name: string; bankName: string }
}

export interface ExpensePageStats {
  currentMonthTotal: number
  ytdTotal: number
  monthOverMonthPct: number | null
  lastMonthExpenses: number
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
    topCategories: Array<{
      category: string
      label: string
      amount: number
      count: number
      sharePct: number
      averageAmount: number
      momentumPct: number | null
      previousAmount: number
    }>
  }
}

export type ExpenseMessage = { type: "success" | "error"; text: string } | null
