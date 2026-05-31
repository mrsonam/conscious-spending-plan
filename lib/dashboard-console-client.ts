import type {
  DashboardConsoleCorePayload,
  DashboardConsolePayload,
  DashboardConsoleSecondaryPayload,
} from "@/lib/dashboard-console-types"
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

export function buildTrajectorySeries(
  history: Record<string, { month: string; remaining: number }[]> | undefined,
): TrajectoryPoint[] {
  if (!history) return []
  const fc = history.fixedCosts
  if (!fc?.length) return []
  const cats = ["fixedCosts", "investment", "savings", "guiltFreeSpending"] as const
  return fc.map((row, i) => ({
    month: row.month,
    value: cats.reduce(
      (sum, c) => sum + (history[c]?.[i]?.remaining ?? 0),
      0,
    ),
  }))
}

export function loanSummaryFromPayload(
  payload: DashboardConsolePayload,
): LoanSummary | null {
  const loans = payload.loans ?? []
  if (loans.length === 0) return null
  const outstanding = loans.reduce(
    (s, l) => s + Math.max(0, l.amount - (l.repaidAmount ?? 0)),
    0,
  )
  return {
    activeCount: loans.length,
    outstandingPrincipal: outstanding,
  }
}

export type ConsolePayloadSetters = {
  setBreakdown: (v: Breakdown | null) => void
  setLastMonthIncome: (n: number) => void
  setAccounts: (v: Account[]) => void
  setExpenses: (v: Expense[]) => void
  setExpensesTotalForMonth: (v: number | null) => void
  setLastMonthExpenses: (n: number) => void
  setCategoryTracking: (v: Record<string, CategoryTracking>) => void
  setInvestmentAccounts: (v: InvestmentAccount[]) => void
  setYtdSummary: (v: YtdSummary) => void
  setTrajectorySeries: (v: TrajectoryPoint[]) => void
  setLoanSummary: (v: LoanSummary | null) => void
  setSubscriptionDash: (v: DashboardConsolePayload["subscriptionDash"]) => void
  setSavingGoals: (v: DashboardConsolePayload["savingGoals"]) => void
}

export function applyConsoleCorePayload(
  payload: DashboardConsoleCorePayload,
  setters: ConsolePayloadSetters,
) {
  setters.setBreakdown(payload.breakdown)
  setters.setLastMonthIncome(payload.lastMonthIncome)
  setters.setAccounts(payload.accounts)
  setters.setExpenses(payload.expenses)
  setters.setExpensesTotalForMonth(payload.expensesTotalForMonth)
  setters.setLastMonthExpenses(payload.lastMonthExpenses)
  setters.setCategoryTracking(payload.tracking)
  setters.setYtdSummary(payload.ytd)
}

export function applyConsoleSecondaryPayload(
  payload: DashboardConsoleSecondaryPayload,
  setters: ConsolePayloadSetters,
) {
  setters.setInvestmentAccounts(payload.investmentAccounts)
  setters.setTrajectorySeries(buildTrajectorySeries(payload.history))
  setters.setLoanSummary(loanSummaryFromPayload({ loans: payload.loans } as DashboardConsolePayload))
  setters.setSubscriptionDash(payload.subscriptionDash)
  setters.setSavingGoals(payload.savingGoals ?? [])
}

export function applyConsolePayload(
  payload: DashboardConsolePayload,
  setters: ConsolePayloadSetters,
) {
  applyConsoleCorePayload(payload, setters)
  applyConsoleSecondaryPayload(payload, setters)
}

export function fetchStockPrices(
  investmentAccounts: InvestmentAccount[],
  onPrices: (prices: Record<string, number>) => void,
  isCancelled: () => boolean,
) {
  const symbols = new Set<string>()
  investmentAccounts.forEach((acc) => {
    acc.holdings.forEach((h) => {
      if (h.totalShares > 0) {
        symbols.add(h.name.trim().toUpperCase())
      }
    })
  })
  if (symbols.size === 0) return

  fetch("/api/stock-prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: Array.from(symbols) }),
    credentials: "same-origin",
  })
    .then((res) => res.json())
    .then((d) => {
      if (!isCancelled() && d.prices) onPrices(d.prices)
    })
    .catch(() => {})
}

export function initialStateFromConsole(payload: DashboardConsolePayload) {
  return {
    breakdown: payload.breakdown,
    lastMonthIncome: payload.lastMonthIncome,
    accounts: payload.accounts,
    expenses: payload.expenses,
    expensesTotalForMonth: payload.expensesTotalForMonth,
    lastMonthExpenses: payload.lastMonthExpenses,
    categoryTracking: payload.tracking,
    investmentAccounts: payload.investmentAccounts,
    ytdSummary: payload.ytd,
    trajectorySeries: buildTrajectorySeries(payload.history),
    loanSummary: loanSummaryFromPayload(payload),
    subscriptionDash: payload.subscriptionDash,
    savingGoals: payload.savingGoals ?? [],
    loading: payload.breakdown == null,
  }
}
