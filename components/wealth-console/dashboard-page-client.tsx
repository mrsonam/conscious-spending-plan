"use client"

import { useEffect, useLayoutEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  fetchJsonAndCache,
  invalidateDashboardConsoleCaches,
  peekCachedJson,
  withCacheBust,
} from "@/lib/client-fetch-cache"
import type {
  DashboardConsoleCorePayload,
  DashboardConsoleSecondaryPayload,
} from "@/lib/dashboard-console-types"
import { EMPTY_DASHBOARD_CONSOLE, mergeDashboardConsolePayload } from "@/lib/dashboard-console-types"
import {
  applyConsoleCorePayload,
  applyConsolePayload,
  applyConsoleSecondaryPayload,
  fetchStockPrices,
} from "@/lib/dashboard-console-client"
import {
  DASHBOARD_CONSOLE_CACHE_KEY,
  DASHBOARD_CONSOLE_CORE_CACHE_KEY,
  DASHBOARD_CONSOLE_SECONDARY_CACHE_KEY,
  peekDashboardConsoleBlob,
  seedDashboardCoreShardCaches,
  seedDashboardSecondaryShardCaches,
  seedDashboardShardCaches,
} from "@/lib/dashboard-console-cache"
import { seedCachedJson } from "@/lib/client-fetch-cache"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { WealthConsoleView } from "@/components/wealth-console/WealthConsoleView"
import {
  patchDashboardForExpenseLog,
  patchDashboardForIncomeLog,
  type DashboardConsoleSnapshot,
  type DashboardExpenseLogPatch,
  type DashboardIncomeLogPatch,
} from "@/lib/dashboard-console-optimistic"
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
  const [savingGoals, setSavingGoals] = useState(
    EMPTY_DASHBOARD_CONSOLE.savingGoals,
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
      setSavingGoals,
    }),
    [],
  )

  useLayoutEffect(() => {
    const cached = peekDashboardConsoleBlob()
    if (cached) {
      seedDashboardShardCaches(cached)
      applyConsolePayload(cached, payloadSetters)
      setLoading(false)
      return
    }

    const core = peekCachedJson<DashboardConsoleCorePayload>(
      DASHBOARD_CONSOLE_CORE_CACHE_KEY,
    )
    if (core) {
      seedDashboardCoreShardCaches(core)
      applyConsoleCorePayload(core, payloadSetters)
      setLoading(false)
    }

    const secondary = peekCachedJson<DashboardConsoleSecondaryPayload>(
      DASHBOARD_CONSOLE_SECONDARY_CACHE_KEY,
    )
    if (secondary) {
      seedDashboardSecondaryShardCaches(secondary)
      applyConsoleSecondaryPayload(secondary, payloadSetters)
    }
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

    async function loadSecondary(core: DashboardConsoleCorePayload) {
      try {
        const secondary = await fetchJsonAndCache<DashboardConsoleSecondaryPayload>(
          DASHBOARD_CONSOLE_SECONDARY_CACHE_KEY,
          "/api/dashboard/console/secondary",
        )
        if (isCancelled()) return

        seedDashboardSecondaryShardCaches(secondary)
        applyConsoleSecondaryPayload(secondary, payloadSetters)
        seedCachedJson(
          DASHBOARD_CONSOLE_CACHE_KEY,
          mergeDashboardConsolePayload(core, secondary),
        )
        fetchStockPrices(secondary.investmentAccounts, setMarketPrices, isCancelled)
      } catch (e) {
        console.error("Wealth console secondary load error:", e)
      }
    }

    async function load() {
      const cached = peekDashboardConsoleBlob()
      const coreCached = peekCachedJson<DashboardConsoleCorePayload>(
        DASHBOARD_CONSOLE_CORE_CACHE_KEY,
      )
      const secondaryCached = peekCachedJson<DashboardConsoleSecondaryPayload>(
        DASHBOARD_CONSOLE_SECONDARY_CACHE_KEY,
      )

      if (cached) {
        applyConsolePayload(cached, payloadSetters)
        setLoading(false)
        fetchStockPrices(cached.investmentAccounts, setMarketPrices, isCancelled)
      } else if (coreCached) {
        applyConsoleCorePayload(coreCached, payloadSetters)
        setLoading(false)
        if (secondaryCached) {
          applyConsoleSecondaryPayload(secondaryCached, payloadSetters)
          fetchStockPrices(secondaryCached.investmentAccounts, setMarketPrices, isCancelled)
        }
      } else {
        setLoading(true)
      }

      try {
        const core = await fetchJsonAndCache<DashboardConsoleCorePayload>(
          DASHBOARD_CONSOLE_CORE_CACHE_KEY,
          "/api/dashboard/console",
        )
        if (isCancelled()) return

        seedDashboardCoreShardCaches(core)
        applyConsoleCorePayload(core, payloadSetters)
        setLoading(false)

        void loadSecondary(core)
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

  const getConsoleSnapshot = useCallback((): DashboardConsoleSnapshot => {
    return {
      breakdown,
      accounts,
      expenses,
      expensesTotalForMonth,
      categoryTracking,
      ytdSummary,
    }
  }, [
    breakdown,
    accounts,
    expenses,
    expensesTotalForMonth,
    categoryTracking,
    ytdSummary,
  ])

  const applyConsoleSnapshot = useCallback((snapshot: DashboardConsoleSnapshot) => {
    setBreakdown(snapshot.breakdown)
    setAccounts(snapshot.accounts)
    setExpenses(snapshot.expenses)
    setExpensesTotalForMonth(snapshot.expensesTotalForMonth)
    setCategoryTracking(snapshot.categoryTracking)
    setYtdSummary(snapshot.ytdSummary)
  }, [])

  const applyOptimisticIncomeLog = useCallback(
    (input: DashboardIncomeLogPatch) => {
      const snapshot = getConsoleSnapshot()
      applyConsoleSnapshot(patchDashboardForIncomeLog(snapshot, input))
      return snapshot
    },
    [applyConsoleSnapshot, getConsoleSnapshot],
  )

  const applyOptimisticExpenseLog = useCallback(
    (input: DashboardExpenseLogPatch) => {
      const snapshot = getConsoleSnapshot()
      applyConsoleSnapshot(patchDashboardForExpenseLog(snapshot, input))
      return snapshot
    },
    [applyConsoleSnapshot, getConsoleSnapshot],
  )

  const rollbackConsoleSnapshot = useCallback(
    (snapshot: DashboardConsoleSnapshot) => {
      applyConsoleSnapshot(snapshot)
    },
    [applyConsoleSnapshot],
  )

  const refreshConsole = useCallback(async () => {
    invalidateDashboardConsoleCaches()
    try {
      const core = await fetchJsonAndCache<DashboardConsoleCorePayload>(
        DASHBOARD_CONSOLE_CORE_CACHE_KEY,
        withCacheBust("/api/dashboard/console"),
        undefined,
        { force: true },
      )
      seedDashboardCoreShardCaches(core)
      applyConsoleCorePayload(core, payloadSetters)

      const secondary = await fetchJsonAndCache<DashboardConsoleSecondaryPayload>(
        DASHBOARD_CONSOLE_SECONDARY_CACHE_KEY,
        withCacheBust("/api/dashboard/console/secondary"),
        undefined,
        { force: true },
      )
      seedDashboardSecondaryShardCaches(secondary)
      applyConsoleSecondaryPayload(secondary, payloadSetters)
      seedCachedJson(
        DASHBOARD_CONSOLE_CACHE_KEY,
        mergeDashboardConsolePayload(core, secondary),
      )
      fetchStockPrices(secondary.investmentAccounts, setMarketPrices, () => false)
    } catch (e) {
      console.error("Wealth console refresh error:", e)
    }
  }, [payloadSetters])

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
      savingGoals={savingGoals}
      loading={showLoading || (isSessionPending && breakdown == null)}
      onActivityLogged={refreshConsole}
      onOptimisticIncomeLog={applyOptimisticIncomeLog}
      onOptimisticExpenseLog={applyOptimisticExpenseLog}
      onOptimisticRollback={rollbackConsoleSnapshot}
    />
  )
}
