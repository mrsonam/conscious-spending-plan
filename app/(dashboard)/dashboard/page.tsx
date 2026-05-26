"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  fetchJsonAndCache,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import {
  WealthConsoleView,
  type Account,
  type Breakdown,
  type CategoryTracking,
  type Expense,
  type InvestmentAccount,
  type LoanSummary,
  type TrajectoryPoint,
  type YtdSummary,
} from "@/components/wealth-console/WealthConsoleView"

function buildTrajectorySeries(
  history: Record<string, { month: string; remaining: number }[]> | undefined
): TrajectoryPoint[] {
  if (!history) return []
  const fc = history.fixedCosts
  if (!fc?.length) return []
  const cats = ["fixedCosts", "investment", "savings", "guiltFreeSpending"] as const
  return fc.map((row, i) => ({
    month: row.month,
    value: cats.reduce(
      (sum, c) => sum + (history[c]?.[i]?.remaining ?? 0),
      0
    ),
  }))
}

export default function ConsoleV2Page() {
  const { status } = useSession()
  const router = useRouter()
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesTotalForMonth, setExpensesTotalForMonth] = useState<number | null>(
    null
  )
  const [categoryTracking, setCategoryTracking] = useState<
    Record<string, CategoryTracking>
  >({})
  const [investmentAccounts, setInvestmentAccounts] = useState<
    InvestmentAccount[]
  >([])
  const [ytdSummary, setYtdSummary] = useState<YtdSummary | null>(null)
  const [lastMonthIncome, setLastMonthIncome] = useState(0)
  const [lastMonthExpenses, setLastMonthExpenses] = useState(0)
  const [trajectorySeries, setTrajectorySeries] = useState<TrajectoryPoint[]>([])
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({})
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null)
  const [subscriptionDash, setSubscriptionDash] = useState<{
    monthlyActiveTotal: number
    upcoming: Array<{
      subscriptionId: string
      label: string
      provider: string | null
      amount: number
      date: string
      kind: "renewal" | "trial"
    }>
  }>({
    monthlyActiveTotal: 0,
    upcoming: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false
    // Do not AbortController.abort() in cleanup: Next.js dev overlay surfaces
    // fetch AbortError as a runtime error. Use `cancelled` only to ignore results.
    const withCache = async <T,>(
      key: string,
      path: string,
      maxAgeMs: number,
    ) => {
      const cached = peekCachedJson<T>(key, maxAgeMs)
      return {
        cached,
        fresh: fetchJsonAndCache<T>(key, path),
      }
    }

    async function load() {
      setLoading(true)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      )
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      )
      const t = Date.now()

      try {
        const coreRequests = {
          incomeMonth: await withCache<{ breakdown?: Breakdown | null }>(
            "dashboard:income-month",
            `/api/income-entries?currentMonth=true&t=${t}`,
            45_000,
          ),
          incomeMeta: await withCache<{ lastMonthIncome?: number }>(
            "dashboard:income-meta",
            `/api/income-entries?t=${t}`,
            45_000,
          ),
          accounts: await withCache<{ accounts?: Account[] }>(
            "dashboard:accounts",
            `/api/accounts?t=${t}`,
            45_000,
          ),
          expenses: await withCache<{ expenses?: Expense[]; total?: number }>(
            "dashboard:expenses-current",
            `/api/expenses?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}&t=${t}`,
            30_000,
          ),
        }

        if (coreRequests.incomeMonth.cached) {
          setBreakdown(coreRequests.incomeMonth.cached.breakdown ?? null)
        }
        if (typeof coreRequests.incomeMeta.cached?.lastMonthIncome === "number") {
          setLastMonthIncome(coreRequests.incomeMeta.cached.lastMonthIncome)
        }
        if (coreRequests.accounts.cached?.accounts) {
          setAccounts(coreRequests.accounts.cached.accounts)
        }
        if (coreRequests.expenses.cached) {
          setExpenses(coreRequests.expenses.cached.expenses || [])
          setExpensesTotalForMonth(
            typeof coreRequests.expenses.cached.total === "number"
              ? coreRequests.expenses.cached.total
              : null,
          )
        }
        if (coreRequests.incomeMonth.cached?.breakdown) {
          setLoading(false)
        }

        const [incomeMonthData, incomeMetaData, accountsData, expensesData] =
          await Promise.all([
            coreRequests.incomeMonth.fresh,
            coreRequests.incomeMeta.fresh,
            coreRequests.accounts.fresh,
            coreRequests.expenses.fresh,
          ])

        if (cancelled) return

        setBreakdown(incomeMonthData.breakdown ?? null)
        if (typeof incomeMetaData.lastMonthIncome === "number") {
          setLastMonthIncome(incomeMetaData.lastMonthIncome)
        }
        setAccounts(accountsData.accounts || [])
        setExpenses(expensesData.expenses || [])
        setExpensesTotalForMonth(
          typeof expensesData.total === "number" ? expensesData.total : null,
        )
        setLoading(false)

        void (async () => {
          try {
            const [
              lastMonthExpensesData,
              trackingData,
              investmentsData,
              ytdData,
              historyData,
              loansData,
              subscriptionsData,
            ] = await Promise.all([
              fetchJsonAndCache<{ expenses?: Expense[]; total?: number }>(
                "dashboard:expenses-last-month",
                `/api/expenses?startDate=${lastMonthStart.toISOString()}&endDate=${lastMonthEnd.toISOString()}&t=${t}`,
              ),
              fetchJsonAndCache<{ tracking?: Record<string, CategoryTracking> }>(
                "dashboard:tracking",
                `/api/category-tracking?t=${t}`,
              ),
              fetchJsonAndCache<{
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
              }>(
                "dashboard:investments",
                `/api/investments?t=${t}`,
              ),
              fetchJsonAndCache<YtdSummary>(
                "dashboard:ytd",
                `/api/dashboard/ytd?t=${t}`,
              ),
              fetchJsonAndCache<{ history?: Record<string, { month: string; remaining: number }[]> }>(
                "dashboard:history",
                `/api/category-tracking/history?t=${t}`,
              ),
              fetchJsonAndCache<{ loans?: Array<{ amount: number; repaidAmount: number }> }>(
                "dashboard:loans",
                `/api/loans?status=active&t=${t}`,
              ),
              fetchJsonAndCache<{
                monthlyActiveTotal?: number
                upcoming?: Array<{
                  subscriptionId: string
                  label: string
                  provider: string | null
                  amount: number
                  date: string
                  kind: "renewal" | "trial"
                }>
              }>(
                "dashboard:subscriptions",
                `/api/subscriptions?upcomingDays=14&t=${t}`,
              ),
            ])

            if (cancelled) return

            const list: Expense[] = lastMonthExpensesData.expenses || []
            const total =
              typeof lastMonthExpensesData.total === "number"
                ? lastMonthExpensesData.total
                : list.reduce((s, e) => s + e.amount, 0)
            setLastMonthExpenses(total)

            const raw = trackingData.tracking || {}
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
            setCategoryTracking(slim)

            const investmentList: InvestmentAccount[] = (investmentsData.accounts || []).map(
              (acc) => ({
                name: acc.name,
                bankName: acc.bankName,
                investedAmount: acc.investedAmount ?? 0,
                holdings: (acc.holdings || []).map((h) => ({
                  name: h.name,
                  totalAmount: h.totalAmount ?? 0,
                  totalShares: h.totalShares ?? 0,
                  purchases: h.purchases || [],
                })),
              }),
            )
            setInvestmentAccounts(investmentList)
            setYtdSummary({
              year: ytdData.year,
              totalIncome: ytdData.totalIncome ?? 0,
              totalExpenses: ytdData.totalExpenses ?? 0,
              totalInvested: ytdData.totalInvested ?? 0,
            })
            setTrajectorySeries(buildTrajectorySeries(historyData.history))

            const loans = loansData.loans || []
            const outstanding = loans.reduce(
              (s, l) => s + Math.max(0, l.amount - (l.repaidAmount ?? 0)),
              0,
            )
            setLoanSummary({
              activeCount: loans.length,
              outstandingPrincipal: outstanding,
            })

            setSubscriptionDash({
              monthlyActiveTotal: subscriptionsData.monthlyActiveTotal ?? 0,
              upcoming: subscriptionsData.upcoming ?? [],
            })

            const symbols = new Set<string>()
            investmentList.forEach((acc) => {
              acc.holdings.forEach((h) => {
                if (h.totalShares > 0) {
                  symbols.add(h.name.trim().toUpperCase())
                }
              })
            })

            if (symbols.size > 0) {
              fetch("/api/stock-prices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbols: Array.from(symbols) }),
                credentials: "same-origin",
              })
                .then((res) => res.json())
                .then((d) => {
                  if (!cancelled && d.prices) setMarketPrices(d.prices)
                })
                .catch(() => {})
            }
          } catch (e) {
            console.error("Wealth console secondary load error:", e)
          }
        })()
      } catch (e) {
        console.error("Wealth console load error:", e)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [status])

  const incomeChangePct = useMemo(() => {
    if (!breakdown || lastMonthIncome <= 0) return null
    return ((breakdown.income - lastMonthIncome) / lastMonthIncome) * 100
  }, [breakdown, lastMonthIncome])

  if (status === "unauthenticated") {
    return null
  }

  return (
    <WealthConsoleView
      breakdown={breakdown}
      accounts={accounts}
      expenses={expenses}
      expensesTotalForMonth={expensesTotalForMonth}
      categoryTracking={categoryTracking}
      investmentAccounts={investmentAccounts}
      ytdSummary={ytdSummary}
      trajectorySeries={trajectorySeries}
      incomeChangePct={incomeChangePct}
      lastMonthIncome={lastMonthIncome}
      lastMonthExpenses={lastMonthExpenses}
      marketPrices={marketPrices}
      loanSummary={loanSummary}
      subscriptionDash={subscriptionDash}
      loading={loading || status === "loading"}
    />
  )
}
