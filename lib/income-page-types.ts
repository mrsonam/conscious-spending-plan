export interface FundAllocation {
  id: string
  fixedCostsType: string
  fixedCostsValue: number
  savingsType: string
  savingsValue: number
  investmentType: string
  investmentValue: number
  guiltFreeSpendingType: string
  guiltFreeSpendingValue: number
}

export interface IncomeBreakdown {
  income: number
  fixedCosts: number
  savings: number
  investment: number
  guiltFreeSpending: number
  total: number
  depositedToAccountName?: string | null
  /** True when deposit account is cash (informational; allocation still follows fund rules when not excluded). */
  isCashAccount?: boolean
  isExcludedFromAllocation?: boolean
  incomeEntryId?: string
}

export interface IncomeEntry {
  id: string
  amount: number
  description: string | null
  date: string
  periodStart: string
  periodEnd: string
  createdAt: string
  excludeFromAllocation?: boolean
  account?: {
    id: string
    name: string
    bankName: string
    accountType: string
  } | null
}

export interface IncomeMonthlyTotal {
  /** Calendar month `YYYY-MM` */
  month: string
  total: number
}

/** Hero + comparison metrics from GET /api/income-entries (paginated list). */
export interface IncomePageStats {
  currentMonthTotal: number
  ytdTotal: number
  monthOverMonthPct: number | null
  lastMonthIncome: number
  /** Last 6 calendar months, oldest → newest */
  monthlyTotals: IncomeMonthlyTotal[]
}

export interface IncomePageAccount {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  isDefault: boolean
}

export const INCOME_PAGE_ERROR_SOFT = "#ffb4ab"
export const INCOME_PAGE_WARN_SURFACE = "#e8c547"
