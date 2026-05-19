import type {
  FundAllocation,
  IncomeBreakdown,
  IncomeEntry,
  IncomePageAccount,
  IncomePageStats,
} from "@/lib/income-page-types"

export function createOptimisticIncomeId(): string {
  return `optimistic-${crypto.randomUUID()}`
}

export function isInCurrentMonth(date: string): boolean {
  const day = date.slice(0, 10)
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const monthStart = `${now.getFullYear()}-${month}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${now.getFullYear()}-${month}-${String(lastDay).padStart(2, "0")}`
  return day >= monthStart && day <= monthEnd
}

export function isInCurrentYear(date: string): boolean {
  return date.slice(0, 4) === String(new Date().getFullYear())
}

export function buildOptimisticIncomeEntry(input: {
  id: string
  amount: number
  description: string | null
  date: string
  periodStart: string
  periodEnd: string
  excludeFromAllocation: boolean
  account?: IncomeEntry["account"]
}): IncomeEntry {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  }
}

export function applyOptimisticIncomeSummaryDelta(
  stats: IncomePageStats,
  amount: number,
  date: string,
): IncomePageStats {
  const next = { ...stats }
  if (isInCurrentMonth(date)) {
    next.currentMonthTotal = stats.currentMonthTotal + amount
  }
  if (isInCurrentYear(date)) {
    next.ytdTotal = stats.ytdTotal + amount
  }
  return next
}

function categorySlice(income: number, type: string, value: number): number {
  if (type === "fixed") return value
  if (type === "percentage") return (income * value) / 100
  return 0
}

/** Approximate breakdown for instant UI; server response replaces it after save. */
export function computeOptimisticBreakdown(
  incomeAmount: number,
  allocation: FundAllocation,
  options: {
    allocateToBudget: boolean
    account: IncomePageAccount | null
  },
): IncomeBreakdown {
  const { allocateToBudget, account } = options
  const accountLabel = account
    ? `${account.name} (${account.bankName})`
    : null

  if (!allocateToBudget) {
    return {
      income: incomeAmount,
      fixedCosts: 0,
      savings: 0,
      investment: 0,
      guiltFreeSpending: 0,
      total: incomeAmount,
      depositedToAccountName: accountLabel,
      isCashAccount: account?.accountType === "cash",
      isExcludedFromAllocation: true,
    }
  }

  let fixedCosts = categorySlice(
    incomeAmount,
    allocation.fixedCostsType,
    allocation.fixedCostsValue,
  )
  let savings = categorySlice(
    incomeAmount,
    allocation.savingsType,
    allocation.savingsValue,
  )
  let investment = categorySlice(
    incomeAmount,
    allocation.investmentType,
    allocation.investmentValue,
  )
  let guiltFreeSpending = categorySlice(
    incomeAmount,
    allocation.guiltFreeSpendingType,
    allocation.guiltFreeSpendingValue,
  )

  const remainder =
    incomeAmount - (fixedCosts + savings + investment + guiltFreeSpending)
  savings += remainder

  return {
    income: incomeAmount,
    fixedCosts,
    savings,
    investment,
    guiltFreeSpending,
    total: incomeAmount,
    depositedToAccountName: accountLabel,
    isCashAccount: account?.accountType === "cash",
    isExcludedFromAllocation: false,
  }
}

export function incomeEntryFromCalculateResponse(
  data: IncomeBreakdown & { incomeEntryId?: string },
  input: {
    description: string | null
    date: string
    periodStart: string
    periodEnd: string
    account: IncomePageAccount | null
  },
): IncomeEntry | null {
  if (!data.incomeEntryId) return null
  return {
    id: data.incomeEntryId,
    amount: data.income,
    description: input.description,
    date: input.date.slice(0, 10),
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    createdAt: new Date().toISOString(),
    excludeFromAllocation: data.isExcludedFromAllocation,
    account: input.account
      ? {
          id: input.account.id,
          name: input.account.name,
          bankName: input.account.bankName,
          accountType: input.account.accountType,
        }
      : null,
  }
}
