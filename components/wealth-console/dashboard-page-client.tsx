"use client"

import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchJsonAndCache } from "@/lib/client-fetch-cache"
import type { DashboardConsolePayload } from "@/lib/dashboard-console-types"
import { EMPTY_DASHBOARD_CONSOLE } from "@/lib/dashboard-console-types"
import {
  applyConsolePayload,
  fetchStockPrices,
} from "@/lib/dashboard-console-client"
import {
  DASHBOARD_CONSOLE_CACHE_KEY,
  peekDashboardConsoleBlob,
  seedDashboardShardCaches,
} from "@/lib/dashboard-console-cache"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { WealthConsoleView } from "@/components/wealth-console/WealthConsoleView"
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

export default function DashboardPageClient() {
  const { status, isSessionPending } = useHydratedSession()
  const router = useRouter()

  const [breakdown, setBreakdown] = useState<Breakdown | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesTotalForMonth, setExpensesTotalForMonth] = useState<number | null>(
    null,
  )
  const [categoryTracking, setCategoryTracking] = useState<
    Record<string, CategoryTracking>
  >({})
  const [investmentAccounts, setInvestmentAccounts] = useState<InvestmentAccount[]>(
    [],
  )
  const [ytdSummary, setYtdSummary] = useState<YtdSummary | null>(null)
  const [lastMonthIncome, setLastMonthIncome] = useState(0)
  const [lastMonthExpenses, setLastMonthExpenses] = useState(0)
  const [trajectorySeries, setTrajectorySeries] = useState<TrajectoryPoint[]>([])
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({})
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null)
  const [subscriptionDash, setSubscriptionDash] = useState(
    EMPTY_DASHBOARD_CONSOLE.subscriptionDash,
  )
  const [loading, setLoading] = useState(true)

  const payloadSetters = useMemo(
    () => ({
      setBreakdown,
      setLastMonthIncome,
      setAccounts,
      setExpenses,
      setExpensesTotalForMonth,
      setLastMonthExpenses,
      setCategoryTracking,
      setInvestmentAccounts,
      setYtdSummary,
      setTrajectorySeries,
      setLoanSummary,
      setSubscriptionDash,
    }),
    [],
  )

  useLayoutEffect(() => {
    const cached = peekDashboardConsoleBlob()
    if (!cached) return

    seedDashboardShardCaches(cached)
    applyConsolePayload(cached, payloadSetters)
    setLoading(false)
  }, [payloadSetters])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false
    const isCancelled = () => cancelled

    async function load() {
      const cached = peekDashboardConsoleBlob()
      if (cached) {
        applyConsolePayload(cached, payloadSetters)
        setLoading(false)
        fetchStockPrices(cached.investmentAccounts, setMarketPrices, isCancelled)
      } else {
        setLoading(true)
      }

      try {
        const payload = await fetchJsonAndCache<DashboardConsolePayload>(
          DASHBOARD_CONSOLE_CACHE_KEY,
          "/api/dashboard/console",
        )
        if (isCancelled()) return

        seedDashboardShardCaches(payload)
        applyConsolePayload(payload, payloadSetters)
        fetchStockPrices(payload.investmentAccounts, setMarketPrices, isCancelled)
      } catch (e) {
        console.error("Wealth console load error:", e)
      } finally {
        if (!isCancelled()) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [status, payloadSetters])

  const incomeChangePct = useMemo(() => {
    if (!breakdown || lastMonthIncome <= 0) return null
    return ((breakdown.income - lastMonthIncome) / lastMonthIncome) * 100
  }, [breakdown, lastMonthIncome])

  const showLoading = loading && breakdown == null

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
      loading={showLoading || (isSessionPending && breakdown == null)}
    />
  )
}
