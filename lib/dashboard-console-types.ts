import type {
  Account,
  Breakdown,
  CategoryTracking,
  DashboardRecentTransaction,
  Expense,
  InvestmentAccount,
  YtdSummary,
} from "@/components/wealth-console/types"

export type DashboardConsolePayload = {
  breakdown: Breakdown | null
  lastMonthIncome: number
  accounts: Account[]
  expenses: Expense[]
  expensesTotalForMonth: number | null
  lastMonthExpenses: number
  tracking: Record<string, CategoryTracking>
  investmentAccounts: InvestmentAccount[]
  ytd: YtdSummary
  history: Record<string, { month: string; remaining: number }[]>
  loans: Array<{ amount: number; repaidAmount: number }>
  subscriptionDash: {
    monthlyActiveTotal: number
    upcoming: Array<{
      subscriptionId: string
      label: string
      provider: string | null
      amount: number
      date: string
      kind: "renewal" | "trial" | "bill"
    }>
  }
  recentTransactions: DashboardRecentTransaction[]
  savingGoals: Array<{
    id: string
    name: string
    current: number
    target: number | null
    percent: number
    status: string
  }>
  superBalance: number
}

/** Fast path — above-the-fold dashboard widgets. */
export type DashboardConsoleCorePayload = Pick<
  DashboardConsolePayload,
  | "breakdown"
  | "lastMonthIncome"
  | "accounts"
  | "expenses"
  | "expensesTotalForMonth"
  | "lastMonthExpenses"
  | "tracking"
  | "ytd"
>

/** Deferred — trajectory, investments, loans, subscriptions, recent activity, goals, super. */
export type DashboardConsoleSecondaryPayload = Pick<
  DashboardConsolePayload,
  | "history"
  | "investmentAccounts"
  | "loans"
  | "subscriptionDash"
  | "recentTransactions"
  | "savingGoals"
  | "superBalance"
>

export function mergeDashboardConsolePayload(
  core: DashboardConsoleCorePayload,
  secondary: DashboardConsoleSecondaryPayload,
): DashboardConsolePayload {
  return { ...core, ...secondary }
}

export const EMPTY_DASHBOARD_CONSOLE: DashboardConsolePayload = {
  breakdown: null,
  lastMonthIncome: 0,
  accounts: [],
  expenses: [],
  expensesTotalForMonth: null,
  lastMonthExpenses: 0,
  tracking: {},
  investmentAccounts: [],
  ytd: {
    year: new Date().getFullYear(),
    totalIncome: 0,
    totalExpenses: 0,
    totalInvested: 0,
  },
  history: {},
  loans: [],
  subscriptionDash: {
    monthlyActiveTotal: 0,
    upcoming: [],
  },
  recentTransactions: [],
  savingGoals: [],
  superBalance: 0,
}
