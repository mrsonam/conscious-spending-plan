"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
  const { data: session, status } = useSession()
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false
    const ac = new AbortController()

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
      const signal = ac.signal
      const api = (path: string) =>
        fetch(path, { signal, credentials: "same-origin" })

      try {
        const [
          incomeMonthRes,
          incomeMetaRes,
          accountsRes,
          expensesRes,
          lastMonthExpensesRes,
          trackingRes,
          investmentsRes,
          ytdRes,
          historyRes,
          loansRes,
        ] = await Promise.all([
          api(`/api/income-entries?currentMonth=true&t=${t}`),
          api(`/api/income-entries?t=${t}`),
          api(`/api/accounts?t=${t}`),
          api(
            `/api/expenses?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}&t=${t}`
          ),
          api(
            `/api/expenses?startDate=${lastMonthStart.toISOString()}&endDate=${lastMonthEnd.toISOString()}&t=${t}`
          ),
          api(`/api/category-tracking?t=${t}`),
          api(`/api/investments?t=${t}`),
          api(`/api/dashboard/ytd?t=${t}`),
          api(`/api/category-tracking/history?t=${t}`),
          api(`/api/loans?status=active&t=${t}`),
        ])

        if (cancelled) return

        if (incomeMonthRes.ok) {
          const data = await incomeMonthRes.json()
          if (data.breakdown) {
            setBreakdown(data.breakdown)
          } else {
            setBreakdown(null)
          }
        }

        if (incomeMetaRes.ok) {
          const data = await incomeMetaRes.json()
          if (typeof data.lastMonthIncome === "number") {
            setLastMonthIncome(data.lastMonthIncome)
          }
        }

        if (accountsRes.ok) {
          const data = await accountsRes.json()
          setAccounts(data.accounts || [])
        }

        if (expensesRes.ok) {
          const data = await expensesRes.json()
          setExpenses(data.expenses || [])
          setExpensesTotalForMonth(
            typeof data.total === "number" ? data.total : null
          )
        }

        if (lastMonthExpensesRes.ok) {
          const data = await lastMonthExpensesRes.json()
          const list: Expense[] = data.expenses || []
          const total =
            typeof data.total === "number"
              ? data.total
              : list.reduce((s, e) => s + e.amount, 0)
          setLastMonthExpenses(total)
        }

        if (trackingRes.ok) {
          const data = await trackingRes.json()
          const raw = data.tracking || {}
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
        }

        if (investmentsRes.ok) {
          const data = await investmentsRes.json()
          const list: InvestmentAccount[] = (data.accounts || []).map(
            (acc: {
              name: string
              bankName: string
              investedAmount?: number
              holdings?: Array<{
                name: string
                totalAmount?: number
                totalShares?: number
                purchases?: Array<{ amount: number; date: string }>
              }>
            }) => ({
              name: acc.name,
              bankName: acc.bankName,
              investedAmount: acc.investedAmount ?? 0,
              holdings: (acc.holdings || []).map((h) => ({
                name: h.name,
                totalAmount: h.totalAmount ?? 0,
                totalShares: h.totalShares ?? 0,
                purchases: h.purchases || [],
              })),
            })
          )
          setInvestmentAccounts(list)

          const symbols = new Set<string>()
          list.forEach((acc) => {
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
              signal,
              credentials: "same-origin",
            })
              .then((res) => res.json())
              .then((d) => {
                if (!cancelled && d.prices) setMarketPrices(d.prices)
              })
              .catch(() => {})
          }
        }

        if (ytdRes.ok) {
          const data = await ytdRes.json()
          setYtdSummary({
            year: data.year,
            totalIncome: data.totalIncome ?? 0,
            totalExpenses: data.totalExpenses ?? 0,
            totalInvested: data.totalInvested ?? 0,
          })
        }

        if (historyRes.ok) {
          const data = await historyRes.json()
          setTrajectorySeries(buildTrajectorySeries(data.history))
        }

        if (loansRes.ok) {
          const data = await loansRes.json()
          const loans: Array<{ amount: number; repaidAmount: number }> =
            data.loans || []
          const outstanding = loans.reduce(
            (s, l) => s + Math.max(0, l.amount - (l.repaidAmount ?? 0)),
            0
          )
          setLoanSummary({
            activeCount: loans.length,
            outstandingPrincipal: outstanding,
          })
        }
      } catch (e) {
        const err = e as { name?: string }
        if (err?.name === "AbortError" || ac.signal.aborted) return
        console.error("Wealth console load error:", e)
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [status])

  const incomeChangePct = useMemo(() => {
    if (!breakdown || lastMonthIncome <= 0) return null
    return ((breakdown.income - lastMonthIncome) / lastMonthIncome) * 100
  }, [breakdown, lastMonthIncome])

  if (status === "loading") {
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
      loading={loading}
    />
  )
}
