export interface Breakdown {
  income: number
  fixedCosts: number
  savings: number
  investment: number
  guiltFreeSpending: number
  total: number
}

export interface Account {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
}

export interface Expense {
  id: string
  amount: number
  description: string | null
  category: string | null
  date: string
}

export interface CategoryTracking {
  allocated: number
  spent: number
  remaining: number
  overspent?: number
}

export interface InvestmentHolding {
  name: string
  totalAmount: number
  totalShares: number
  purchases: Array<{ amount: number; date: string }>
}

export interface InvestmentAccount {
  name: string
  bankName: string
  investedAmount: number
  holdings: InvestmentHolding[]
}

export interface LoanSummary {
  activeCount: number
  outstandingPrincipal: number
}

export interface SubscriptionDashboardSnapshot {
  monthlyActiveTotal: number
  upcoming: Array<{
    subscriptionId: string
    label: string
    provider: string | null
    amount: number
    date: string
    kind: "renewal" | "trial"
  }>
}

export interface YtdSummary {
  year: number
  totalIncome: number
  totalExpenses: number
  totalInvested: number
}

export interface TrajectoryPoint {
  month: string
  value: number
}

export type SpendingAlert = {
  category: string
  message: string
  severity: "warning" | "danger"
}

export type PulseMetrics = {
  investedThisMonth: number
  budgetUsedPct: number
  daysRemaining: number
  avgDailySpending: number
  cashBalance: number
  investmentValue: number
  superBalance: number
  netWorth: number
}

export type DetailRow = { label: string; amount: number }
