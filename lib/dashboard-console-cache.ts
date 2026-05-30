import {
  fetchJsonAndCache,
  peekCachedJson,
  seedCachedJson,
} from "@/lib/client-fetch-cache"
import {
  buildTrajectorySeries,
  loanSummaryFromPayload,
} from "@/lib/dashboard-console-client"
import type { DashboardConsolePayload } from "@/lib/dashboard-console-types"
import type {
  Account,
  Breakdown,
  CategoryTracking,
  Expense,
  InvestmentAccount,
  LoanSummary,
  TrajectoryPoint,
  YtdSummary,
} from "@/components/wealth-console/types"

export const DASHBOARD_CONSOLE_CACHE_KEY = "dashboard:console"
export const DASHBOARD_CONSOLE_CACHE_MS = 45_000

const INCOME_MONTH_MS = 45_000
const INCOME_META_MS = 45_000
const ACCOUNTS_MS = 45_000
const EXPENSES_MS = 30_000
const SECONDARY_MS = 45_000

export function dashboardMonthRange(now = new Date()) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999,
  )
  return { startOfMonth, endOfMonth, lastMonthStart, lastMonthEnd }
}

export type DashboardCoreSnapshot = {
  breakdown: Breakdown | null
  lastMonthIncome: number
  accounts: Account[]
  expenses: Expense[]
  expensesTotalForMonth: number | null
  hasCore: boolean
}

export function peekDashboardConsoleBlob(
  maxAgeMs = DASHBOARD_CONSOLE_CACHE_MS,
) {
  return peekCachedJson<DashboardConsolePayload>(
    DASHBOARD_CONSOLE_CACHE_KEY,
    maxAgeMs,
  )
}

/** Warm console JSON before navigation (deduped via fetchJsonAndCache). */
export function prefetchDashboardConsole() {
  if (peekDashboardConsoleBlob()) return
  void fetchJsonAndCache<DashboardConsolePayload>(
    DASHBOARD_CONSOLE_CACHE_KEY,
    "/api/dashboard/console",
  )
    .then((payload) => {
      seedDashboardShardCaches(payload)
    })
    .catch(() => {})
}

export function seedDashboardShardCaches(payload: DashboardConsolePayload) {
  seedCachedJson(DASHBOARD_CONSOLE_CACHE_KEY, payload)
  seedCachedJson("dashboard:income-month", { breakdown: payload.breakdown })
  seedCachedJson("dashboard:income-meta", {
    lastMonthIncome: payload.lastMonthIncome,
  })
  seedCachedJson("dashboard:accounts", { accounts: payload.accounts })
  seedCachedJson("dashboard:expenses-current", {
    expenses: payload.expenses,
    total: payload.expensesTotalForMonth,
  })
  seedCachedJson("dashboard:expenses-last-month", {
    total: payload.lastMonthExpenses,
  })
  seedCachedJson("dashboard:tracking", { tracking: payload.tracking })
  seedCachedJson("dashboard:investments", { accounts: payload.investmentAccounts })
  seedCachedJson("dashboard:ytd", payload.ytd)
  seedCachedJson("dashboard:history", { history: payload.history })
  seedCachedJson("dashboard:loans", { loans: payload.loans })
  seedCachedJson("dashboard:subscriptions", payload.subscriptionDash)
}

export function peekDashboardCoreSnapshot(now = new Date()): DashboardCoreSnapshot {
  const blob = peekDashboardConsoleBlob()
  if (blob) {
    return {
      breakdown: blob.breakdown,
      lastMonthIncome: blob.lastMonthIncome,
      accounts: blob.accounts,
      expenses: blob.expenses,
      expensesTotalForMonth: blob.expensesTotalForMonth,
      hasCore: blob.breakdown != null,
    }
  }

  const incomeMonth = peekCachedJson<{ breakdown?: Breakdown | null }>(
    "dashboard:income-month",
    INCOME_MONTH_MS,
  )
  const incomeMeta = peekCachedJson<{ lastMonthIncome?: number }>(
    "dashboard:income-meta",
    INCOME_META_MS,
  )
  const accountsData = peekCachedJson<{ accounts?: Account[] }>(
    "dashboard:accounts",
    ACCOUNTS_MS,
  )
  const expensesData = peekCachedJson<{ expenses?: Expense[]; total?: number }>(
    "dashboard:expenses-current",
    EXPENSES_MS,
  )

  const breakdown = incomeMonth?.breakdown ?? null
  return {
    breakdown,
    lastMonthIncome:
      typeof incomeMeta?.lastMonthIncome === "number" ? incomeMeta.lastMonthIncome : 0,
    accounts: accountsData?.accounts ?? [],
    expenses: expensesData?.expenses ?? [],
    expensesTotalForMonth:
      typeof expensesData?.total === "number" ? expensesData.total : null,
    hasCore: breakdown != null,
  }
}

export type DashboardSecondarySnapshot = {
  lastMonthExpenses: number
  categoryTracking: Record<string, CategoryTracking>
  investmentAccounts: InvestmentAccount[]
  ytdSummary: YtdSummary | null
  trajectorySeries: TrajectoryPoint[]
  loanSummary: LoanSummary | null
  subscriptionDash: {
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
}

function slimTracking(
  raw: Record<string, CategoryTracking> | undefined,
): Record<string, CategoryTracking> {
  if (!raw) return {}
  const slim: Record<string, CategoryTracking> = {}
  for (const key of Object.keys(raw)) {
    const tr = raw[key]
    slim[key] = {
      allocated: tr.allocated ?? 0,
      spent: tr.spent ?? 0,
      remaining: tr.remaining ?? 0,
      overspent: tr.overspent ?? 0,
    }
  }
  return slim
}

export function peekDashboardSecondarySnapshot(): DashboardSecondarySnapshot {
  const blob = peekDashboardConsoleBlob()
  if (blob) {
    return {
      lastMonthExpenses: blob.lastMonthExpenses,
      categoryTracking: blob.tracking,
      investmentAccounts: blob.investmentAccounts,
      ytdSummary: blob.ytd,
      trajectorySeries: buildTrajectorySeries(blob.history),
      loanSummary: loanSummaryFromPayload(blob),
      subscriptionDash: blob.subscriptionDash,
    }
  }

  const lastMonthExpensesData = peekCachedJson<{
    expenses?: Expense[]
    total?: number
  }>("dashboard:expenses-last-month", SECONDARY_MS)

  const trackingData = peekCachedJson<{ tracking?: Record<string, CategoryTracking> }>(
    "dashboard:tracking",
    SECONDARY_MS,
  )

  const investmentsData = peekCachedJson<{
    accounts?: Array<{
      name: string
      bankName: string
      investedAmount?: number
      holdings?: Array<{
        name: string
        totalAmount?: number
        totalShares?: number
        purchases?: Array<{ amount: number; date: string }>
      }>
    }>
  }>("dashboard:investments", SECONDARY_MS)

  const ytdData = peekCachedJson<YtdSummary>("dashboard:ytd", SECONDARY_MS)
  const historyData = peekCachedJson<{
    history?: Record<string, { month: string; remaining: number }[]>
  }>("dashboard:history", SECONDARY_MS)

  const loansData = peekCachedJson<{
    loans?: Array<{ amount: number; repaidAmount: number }>
  }>("dashboard:loans", SECONDARY_MS)

  const subscriptionsData = peekCachedJson<{
    monthlyActiveTotal?: number
    upcoming?: DashboardSecondarySnapshot["subscriptionDash"]["upcoming"]
  }>("dashboard:subscriptions", SECONDARY_MS)

  const list: Expense[] = lastMonthExpensesData?.expenses ?? []
  const lastMonthTotal =
    typeof lastMonthExpensesData?.total === "number"
      ? lastMonthExpensesData.total
      : list.reduce((s, e) => s + e.amount, 0)

  const investmentList: InvestmentAccount[] = (investmentsData?.accounts ?? []).map(
    (acc) => ({
      name: acc.name,
      bankName: acc.bankName,
      investedAmount: acc.investedAmount ?? 0,
      holdings: (acc.holdings ?? []).map((h) => ({
        name: h.name,
        totalAmount: h.totalAmount ?? 0,
        totalShares: h.totalShares ?? 0,
        purchases: h.purchases ?? [],
      })),
    }),
  )

  const shardPayload: DashboardConsolePayload = {
    breakdown: null,
    lastMonthIncome: 0,
    accounts: [],
    expenses: [],
    expensesTotalForMonth: null,
    lastMonthExpenses: lastMonthTotal,
    tracking: slimTracking(trackingData?.tracking),
    investmentAccounts: investmentList,
    ytd: ytdData ?? {
      year: new Date().getFullYear(),
      totalIncome: 0,
      totalExpenses: 0,
      totalInvested: 0,
    },
    history: historyData?.history ?? {},
    loans: loansData?.loans ?? [],
    subscriptionDash: {
      monthlyActiveTotal: subscriptionsData?.monthlyActiveTotal ?? 0,
      upcoming: subscriptionsData?.upcoming ?? [],
    },
    savingGoals: [],
  }

  return {
    lastMonthExpenses: shardPayload.lastMonthExpenses,
    categoryTracking: shardPayload.tracking,
    investmentAccounts: shardPayload.investmentAccounts,
    ytdSummary: shardPayload.ytd,
    trajectorySeries: buildTrajectorySeries(shardPayload.history),
    loanSummary: loanSummaryFromPayload(shardPayload),
    subscriptionDash: shardPayload.subscriptionDash,
  }
}

export function dashboardCoreApiPaths(now = new Date()) {
  const { startOfMonth, endOfMonth } = dashboardMonthRange(now)
  return {
    incomeMonth: "/api/income-entries?currentMonth=true",
    incomeMeta: "/api/income-entries",
    accounts: "/api/accounts",
    expensesCurrent: `/api/expenses?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`,
  }
}

export function dashboardSecondaryApiPaths(now = new Date()) {
  const { lastMonthStart, lastMonthEnd } = dashboardMonthRange(now)
  return {
    expensesLastMonth: `/api/expenses?startDate=${lastMonthStart.toISOString()}&endDate=${lastMonthEnd.toISOString()}`,
    tracking: "/api/category-tracking",
    investments: "/api/investments",
    ytd: "/api/dashboard/ytd",
    history: "/api/category-tracking/history",
    loans: "/api/loans?status=active",
    subscriptions: "/api/subscriptions?upcomingDays=14",
  }
}
