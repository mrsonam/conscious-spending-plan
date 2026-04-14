"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  invalidateCategoryTrackingAndDashboardCaches,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import { InvestmentsPageBentoLoading } from "@/components/investments/investments-page-bento-loading"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateInput } from "@/components/ui/date-input"
import { AppSelect } from "@/components/ui/app-select"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import {
  Activity,
  BarChart3,
  Briefcase,
  FileText,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface InvestmentPurchase {
  id: string
  pricePerUnit: number | null
  numberOfShares: number | null
  amount: number
  date: string
}

interface InvestmentHolding {
  name: string
  totalShares: number
  totalAmount: number
  averagePrice: number
  purchases: InvestmentPurchase[]
  firstPurchaseDate: string
  lastPurchaseDate: string
}

interface InvestmentAccountSummary {
  id: string
  name: string
  bankName: string
  balance: number
  investedAmount: number
  totalValue: number
  holdings: InvestmentHolding[]
}

const consoleField =
  "w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** Same cache key as dashboard secondary load — warm cache when navigating between pages. */
const INVESTMENTS_CACHE_KEY = "dashboard:investments"

export function InvestmentsPageBento() {
  const { status } = useSession()
  const investmentSearchRef = useRef<HTMLDivElement | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [accounts, setAccounts] = useState<InvestmentAccountSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [panelMode, setPanelMode] = useState<"analytics" | "reports">("analytics")
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingMarketPrices, setLoadingMarketPrices] = useState(false)
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [selectedInvestmentAccountId, setSelectedInvestmentAccountId] = useState("")
  const [investmentName, setInvestmentName] = useState("")
  const [investmentSearchQuery, setInvestmentSearchQuery] = useState("")
  const [investmentSearchResults, setInvestmentSearchResults] = useState<Array<{ symbol: string; name: string }>>([])
  const [investmentSearchLoading, setInvestmentSearchLoading] = useState(false)
  const [showInvestmentDropdown, setShowInvestmentDropdown] = useState(false)
  const [investmentMarket, setInvestmentMarket] = useState<"all" | "AU">("all")
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [numberOfShares, setNumberOfShares] = useState("")
  const [brokerageFee, setBrokerageFee] = useState("")
  const [date, setDate] = useState("")
  const [chartRange, setChartRange] = useState<"1W" | "3M" | "1Y" | "ALL">("3M")

  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0])
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false

    async function load() {
      setLoading(true)
      const t = Date.now()
      try {
        const cached = peekCachedJson<{ accounts?: InvestmentAccountSummary[] }>(
          INVESTMENTS_CACHE_KEY,
          45_000,
        )
        if (cached?.accounts) {
          setAccounts(cached.accounts)
          setLoading(false)
        }

        const data = await fetchJsonAndCache<{ accounts?: InvestmentAccountSummary[] }>(
          INVESTMENTS_CACHE_KEY,
          `/api/investments?t=${t}`,
        )

        if (cancelled) return

        setAccounts(data.accounts || [])
      } catch (e) {
        console.error("Investments load error:", e)
        if (!cancelled) {
          setAccounts([])
        }
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

  useEffect(() => {
    if (accounts.length === 0 || loading || loadingMarketPrices) return
    const hasShares = accounts.some((acc) =>
      acc.holdings.some((h) => h.totalShares > 0 && h.name.trim().length > 0),
    )
    if (hasShares && Object.keys(marketPrices).length === 0) {
      void fetchMarketPrices()
    }
  }, [accounts, loading, loadingMarketPrices, marketPrices])

  useEffect(() => {
    if (!investmentSearchQuery.trim()) {
      setInvestmentSearchResults([])
      setShowInvestmentDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setInvestmentSearchLoading(true)
      try {
        const params = new URLSearchParams({
          q: investmentSearchQuery,
          limit: "10",
        })
        if (investmentMarket === "AU") params.set("region", "AU")
        const res = await fetch(`/api/stock-search?${params.toString()}`)
        const data = (await res.json()) as {
          results?: Array<{ symbol: string; name: string }>
        }
        setInvestmentSearchResults(data.results || [])
        setShowInvestmentDropdown(true)
      } catch {
        setInvestmentSearchResults([])
      } finally {
        setInvestmentSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [investmentSearchQuery, investmentMarket])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        investmentSearchRef.current &&
        !investmentSearchRef.current.contains(e.target as Node)
      ) {
        setShowInvestmentDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const refetchAccounts = async () => {
    const t = Date.now()
    try {
      const data = await fetchJsonAndCache<{ accounts?: InvestmentAccountSummary[] }>(
        INVESTMENTS_CACHE_KEY,
        `/api/investments?t=${t}`,
      )
      setAccounts(data.accounts || [])
    } catch {
      setAccounts([])
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount || 0)

  const totalInvested = useMemo(
    () => accounts.reduce((sum, acc) => sum + acc.investedAmount, 0),
    [accounts],
  )
  const totalCash = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts])
  const totalHoldings = useMemo(
    () => accounts.reduce((sum, acc) => sum + acc.holdings.length, 0),
    [accounts],
  )

  const allHoldings = useMemo(
    () =>
      accounts.flatMap((acc) =>
        acc.holdings.map((h) => ({
          ...h,
          accountId: acc.id,
          accountName: acc.name,
          accountBank: acc.bankName,
        })),
      ),
    [accounts],
  )

  const allocationBySymbol = useMemo(() => {
    const map = new Map<string, number>()
    for (const h of allHoldings) {
      const k = h.name.trim().toUpperCase()
      map.set(k, (map.get(k) ?? 0) + h.totalAmount)
    }
    const rows = [...map.entries()]
      .map(([symbol, amount]) => ({ symbol, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
    const total = rows.reduce((s, r) => s + r.amount, 0)
    return { rows, total }
  }, [allHoldings])

  const recentExecutions = useMemo(() => {
    return accounts
      .flatMap((acc) =>
        acc.holdings.flatMap((h) =>
          h.purchases.map((p) => ({
            id: p.id,
            date: p.date,
            symbol: h.name,
            account: acc.name,
            amount: p.amount,
            shares: p.numberOfShares,
            price: p.pricePerUnit,
          })),
        ),
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 14)
  }, [accounts])

  const holdingsWithSymbols = useMemo(() => {
    const out: Array<InvestmentHolding & { symbol: string }> = []
    for (const acc of accounts) {
      for (const h of acc.holdings) {
        const symbol = h.name.trim().toUpperCase()
        if (!symbol || h.totalShares <= 0) continue
        out.push({ ...h, symbol })
      }
    }
    return out
  }, [accounts])

  const pricedHoldingsCount = useMemo(() => {
    let count = 0
    for (const h of holdingsWithSymbols) {
      const p = marketPrices[h.symbol]
      if (p && p > 0) count++
    }
    return count
  }, [holdingsWithSymbols, marketPrices])

  const portfolioGains = useMemo(() => {
    let totalCostBasis = 0
    let totalCurrentValue = 0
    for (const h of holdingsWithSymbols) {
      const currentPrice = marketPrices[h.symbol]
      if (!currentPrice || currentPrice <= 0) continue
      totalCostBasis += h.totalAmount
      totalCurrentValue += currentPrice * h.totalShares
    }
    const totalGainLoss = totalCurrentValue - totalCostBasis
    const totalGainLossPercent =
      totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0
    return {
      totalCostBasis,
      totalCurrentValue,
      totalGainLoss,
      totalGainLossPercent,
    }
  }, [holdingsWithSymbols, marketPrices])

  /** Cash plus holdings marked to market when prices exist; otherwise book (cost) value. */
  const portfolioMarkValue = useMemo(() => {
    let holdingsValue = 0
    for (const h of allHoldings) {
      const symbol = h.name.trim().toUpperCase()
      const p = marketPrices[symbol]
      if (h.totalShares > 0 && p != null && p > 0) {
        holdingsValue += p * h.totalShares
      } else {
        holdingsValue += h.totalAmount
      }
    }
    return totalCash + holdingsValue
  }, [allHoldings, marketPrices, totalCash])

  /** Cumulative deployed capital by calendar day, ending at mark-to-market portfolio value (cash + priced positions). */
  const portfolioChartFullSeries = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const acc of accounts) {
      for (const h of acc.holdings) {
        for (const p of h.purchases) {
          const d = new Date(p.date)
          const key = d.toISOString().slice(0, 10)
          byDay.set(key, (byDay.get(key) ?? 0) + p.amount)
        }
      }
    }
    const days = [...byDay.keys()].sort()
    const out: { t: number; value: number; monthLabel: string }[] = []
    let cum = 0
    for (const key of days) {
      cum += byDay.get(key) ?? 0
      const t = new Date(key + "T12:00:00").getTime()
      out.push({
        t,
        value: cum,
        monthLabel: new Date(t).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase(),
      })
    }
    const now = Date.now()
    const endValue = portfolioMarkValue
    if (out.length === 0) {
      return [{ t: now, value: endValue, monthLabel: "NOW" }]
    }
    const last = out[out.length - 1]
    if (Math.abs(last.value - endValue) > 0.01 || last.t < now - 86400000) {
      out.push({
        t: now,
        value: endValue,
        monthLabel: new Date(now).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase(),
      })
    } else {
      out[out.length - 1] = { ...last, value: endValue, t: now }
    }
    return out
  }, [accounts, portfolioMarkValue])

  const portfolioChartData = useMemo(() => {
    const ms: Record<typeof chartRange, number | null> = {
      "1W": 7 * 86400000,
      "3M": 90 * 86400000,
      "1Y": 365 * 86400000,
      ALL: null,
    }
    const cutoff = ms[chartRange] != null ? Date.now() - (ms[chartRange] as number) : null
    const filtered =
      cutoff == null
        ? portfolioChartFullSeries
        : portfolioChartFullSeries.filter((p) => p.t >= cutoff)
    if (filtered.length === 0 && portfolioChartFullSeries.length > 0) {
      return [portfolioChartFullSeries[portfolioChartFullSeries.length - 1]]
    }
    return filtered.length > 0 ? filtered : portfolioChartFullSeries
  }, [portfolioChartFullSeries, chartRange])

  const liquidityPct = useMemo(
    () => (portfolioMarkValue > 0 ? (totalCash / portfolioMarkValue) * 100 : 0),
    [totalCash, portfolioMarkValue],
  )

  const concentrationStdev = useMemo(() => {
    const amounts = allHoldings.map((h) => h.totalAmount).filter((a) => a > 0)
    if (amounts.length < 2) return 0
    const total = amounts.reduce((s, a) => s + a, 0)
    if (total <= 0) return 0
    const weights = amounts.map((a) => a / total)
    const mean = weights.reduce((s, w) => s + w, 0) / weights.length
    const variance =
      weights.reduce((s, w) => s + (w - mean) ** 2, 0) / weights.length
    return Math.sqrt(variance) * 100
  }, [allHoldings])

  const sovereignInsight = useMemo(() => {
    const top = allocationBySymbol.rows[0]
    const topPct =
      totalInvested > 0 && top ? (top.amount / totalInvested) * 100 : 0
    if (topPct >= 45) {
      return `${top?.symbol ?? "Top position"} is ${topPct.toFixed(0)}% of deployed capital — review concentration when adding size.`
    }
    if (liquidityPct < 5 && totalCash >= 0) {
      return "Liquidity buffer is thin versus portfolio value. Consider keeping more cash in investment accounts for fees and opportunities."
    }
    if (pricedHoldingsCount < holdingsWithSymbols.length && holdingsWithSymbols.length > 0) {
      return "Some tickers lack live prices — refresh to tighten profit/loss and chart context."
    }
    return "Allocation is within typical guardrails. Rebalance when any sleeve drifts more than a few points from intent."
  }, [
    allocationBySymbol.rows,
    totalInvested,
    liquidityPct,
    totalCash,
    pricedHoldingsCount,
    holdingsWithSymbols.length,
  ])

  /** All symbols by invested amount (not capped at 8) for allocation cards. */
  const topHoldingsList = useMemo(() => {
    const map = new Map<string, number>()
    for (const h of allHoldings) {
      const k = h.name.trim().toUpperCase()
      map.set(k, (map.get(k) ?? 0) + h.totalAmount)
    }
    return [...map.entries()]
      .map(([symbol, amount]) => ({ symbol, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [allHoldings])

  const amount = useMemo(() => {
    const price = parseFloat(pricePerUnit)
    const shares = parseFloat(numberOfShares)
    const fee = parseFloat(brokerageFee)
    if (Number.isNaN(price) || Number.isNaN(shares) || price <= 0 || shares <= 0) return ""
    const total = price * shares + (Number.isNaN(fee) || fee < 0 ? 0 : fee)
    return total.toFixed(2)
  }, [pricePerUnit, numberOfShares, brokerageFee])

  const fetchMarketPrices = async () => {
    if (loadingMarketPrices) return
    setLoadingMarketPrices(true)
    try {
      const symbols = Array.from(
        new Set(
          accounts.flatMap((acc) =>
            acc.holdings
              .map((h) => h.name.trim().toUpperCase())
              .filter((s) => s.length > 0),
          ),
        ),
      )
      if (symbols.length === 0) {
        setLoadingMarketPrices(false)
        return
      }

      const response = await fetch("/api/stock-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        setMessage({
          type: "error",
          text: data.error || "Could not refresh market prices.",
        })
        return
      }
      const data = (await response.json()) as { prices?: Record<string, number> }
      if (data.prices && Object.keys(data.prices).length > 0) {
        setMarketPrices(data.prices)
        setLastUpdated(new Date())
      }
    } catch {
      setMessage({ type: "error", text: "Could not refresh market prices." })
    } finally {
      setLoadingMarketPrices(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!selectedInvestmentAccountId) {
      setMessage({ type: "error", text: "Select an investment account." })
      return
    }
    if (!investmentName.trim()) {
      setMessage({ type: "error", text: "Enter an investment name or ticker." })
      return
    }
    const numPrice = parseFloat(pricePerUnit)
    const numShares = parseFloat(numberOfShares)
    const numFee = brokerageFee ? parseFloat(brokerageFee) : 0
    if (!numPrice || numPrice <= 0 || !numShares || numShares <= 0) {
      setMessage({ type: "error", text: "Enter valid price and share values." })
      return
    }
    if (!date) {
      setMessage({ type: "error", text: "Select the investment date." })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investmentAccountId: selectedInvestmentAccountId,
          investmentName: investmentName.trim(),
          pricePerUnit: numPrice,
          numberOfShares: numShares,
          brokerageFee: numFee > 0 ? numFee : 0,
          date,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Failed to create investment." })
        return
      }

      setMessage({ type: "success", text: "Investment created successfully." })
      setSelectedInvestmentAccountId("")
      setInvestmentName("")
      setInvestmentSearchQuery("")
      setInvestmentSearchResults([])
      setShowInvestmentDropdown(false)
      setPricePerUnit("")
      setNumberOfShares("")
      setBrokerageFee("")
      invalidateCachedJson(INVESTMENTS_CACHE_KEY)
      invalidateCategoryTrackingAndDashboardCaches()
      await refetchAccounts()
    } catch {
      setMessage({ type: "error", text: "Something went wrong while saving." })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <InvestmentsPageBentoLoading />
  }

  if (accounts.length === 0) {
    return (
      <section
        className="rounded-xl border p-10 text-center"
        style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
      >
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl"
          style={{ background: TOKENS.surfaceHigh, border: `1px solid ${TOKENS.outlineGhost}` }}
        >
          <TrendingUp className="h-7 w-7" style={{ color: TOKENS.secondary }} />
        </div>
        <h2 className="mt-4 text-xl font-bold" style={{ color: TOKENS.onSurface }}>
          No investment accounts found
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
          Create an investment account on the Accounts page, transfer funds into it, then return here to log holdings.
        </p>
      </section>
    )
  }

  const chartSubtitle =
    chartRange === "1W"
      ? "Last week (deployed capital → portfolio value)"
      : chartRange === "3M"
        ? "Last 90 days performance"
        : chartRange === "1Y"
          ? "Last 12 months performance"
          : "Full history (deployed capital → portfolio value)"

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary, background: TOKENS.surfaceHigh }}>
            <Activity className="h-3.5 w-3.5" />
            {totalHoldings} positions
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: TOKENS.onSurfaceMuted }}>
              Total portfolio value
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <MajorFigureCurrency
                amount={portfolioMarkValue}
                variant="prosperity"
                colorDecimal={TOKENS.secondary}
                className="text-3xl font-black tracking-tight sm:text-4xl!"
                decimalEm={0.45}
              />
              {portfolioGains.totalCostBasis > 0 ? (
                <span
                  className="mb-1 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums"
                  style={
                    portfolioGains.totalGainLossPercent >= 0
                      ? {
                          borderColor: TOKENS.primary,
                          color: TOKENS.primary,
                          background: "color-mix(in srgb, #4edea3 12%, transparent)",
                        }
                      : {
                          borderColor: ERROR_SOFT,
                          color: ERROR_SOFT,
                          background: "color-mix(in srgb, #ffb4ab 14%, transparent)",
                        }
                  }
                >
                  {portfolioGains.totalGainLossPercent >= 0 ? "+" : ""}
                  {portfolioGains.totalGainLossPercent.toFixed(1)}% (P/L)
                </span>
              ) : (
                <span
                  className="mb-1 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold"
                  style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
                >
                  P/L n/a
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
              Last market refresh{" "}
              {lastUpdated
                ? lastUpdated.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setMessage(null)
                setLogOpen(true)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em]"
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              <Plus className="h-4 w-4" />
              Add investment
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="rounded-xl border p-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Invested
          </p>
          <div className="mt-2">
            <MajorFigureCurrency
              amount={totalInvested}
              variant="income"
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Available cash
          </p>
          <div className="mt-2">
            <MajorFigureCurrency
              amount={totalCash}
              variant="neutral"
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Profit / loss
          </p>
          <div className="mt-2">
            {portfolioGains.totalCostBasis > 0 ? (
              <MajorFigureCurrency
                amount={portfolioGains.totalGainLoss}
                variant={portfolioGains.totalGainLoss >= 0 ? "prosperity" : "loss"}
                colorDecimal={
                  portfolioGains.totalGainLoss >= 0 ? TOKENS.secondary : TOKENS.onSurfaceMuted
                }
                className="text-xl font-bold! sm:text-2xl!"
                decimalEm={0.45}
              />
            ) : (
              <span className="text-xl font-bold tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                —
              </span>
            )}
          </div>
          {portfolioGains.totalCostBasis > 0 ? (
            <p
              className="mt-1.5 text-[11px] tabular-nums"
              style={{
                color:
                  portfolioGains.totalGainLossPercent >= 0 ? TOKENS.primary : ERROR_SOFT,
              }}
            >
              {portfolioGains.totalGainLossPercent >= 0 ? "+" : ""}
              {portfolioGains.totalGainLossPercent.toFixed(2)}% on priced holdings
            </p>
          ) : (
            <p className="mt-1.5 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
              Add priced positions to see P/L
            </p>
          )}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <section
          className="rounded-xl border p-4 sm:p-5 lg:col-span-8"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Portfolio value
              </p>
              <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                {chartSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(["1W", "3M", "1Y", "ALL"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setChartRange(r)}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{
                    color: chartRange === r ? TOKENS.primary : TOKENS.onSurfaceMuted,
                    borderBottom: chartRange === r ? `2px solid ${TOKENS.primary}` : "2px solid transparent",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-[240px] w-full min-h-[220px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioChartData.map((d, i) => ({ ...d, i }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TOKENS.primary} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={TOKENS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={TOKENS.outlineGhost} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-US", { month: "short", year: "2-digit" }).toUpperCase()
                  }
                  stroke={TOKENS.onSurfaceMuted}
                  tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 10 }}
                  axisLine={{ stroke: TOKENS.outlineGhost }}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                  stroke={TOKENS.onSurfaceMuted}
                  tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 10 }}
                  axisLine={{ stroke: TOKENS.outlineGhost }}
                  width={52}
                />
                <Tooltip
                  contentStyle={{
                    background: TOKENS.surfaceHigh,
                    border: `1px solid ${TOKENS.outlineGhost}`,
                    borderRadius: 12,
                    fontSize: 12,
                    color: TOKENS.onSurface,
                  }}
                  labelFormatter={(v) => new Date(v as number).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    "Value",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  baseValue={0}
                  stroke={TOKENS.primary}
                  strokeWidth={2}
                  fill="url(#portfolioValueFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: TOKENS.primary }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Curve uses cumulative purchases through each day, then snaps to current portfolio value (cash plus holdings at live prices where available, else cost).
          </p>
        </section>

        <aside
          className="flex flex-col gap-4 rounded-xl border p-4 sm:p-5 lg:col-span-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Risk profile
          </p>
          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span style={{ color: TOKENS.onSurfaceMuted }}>Liquidity coverage</span>
              <span className="font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                {liquidityPct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, liquidityPct)}%`,
                  background: TOKENS.primary,
                }}
              />
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase" style={{ color: TOKENS.secondary }}>
              {liquidityPct >= 15 ? "Optimal" : liquidityPct >= 5 ? "Moderate" : "Lean"}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span style={{ color: TOKENS.onSurfaceMuted }}>Concentration (σ of weights)</span>
              <span className="font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                {concentrationStdev.toFixed(1)}
              </span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, concentrationStdev * 2)}%`,
                  background: TOKENS.secondary,
                }}
              />
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase" style={{ color: TOKENS.secondary }}>
              {concentrationStdev < 18 ? "Diversified" : concentrationStdev < 28 ? "Moderate" : "Concentrated"}
            </p>
          </div>
          <div
            className="rounded-lg border p-3 text-xs leading-relaxed"
            style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow, color: TOKENS.onSurfaceMuted }}
          >
            <span className="font-semibold uppercase tracking-wider" style={{ color: TOKENS.primary }}>
              Console insight
            </span>
            <p className="mt-2">{sovereignInsight}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchMarketPrices()}
            disabled={loadingMarketPrices}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-60"
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary, background: TOKENS.surfaceLow }}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loadingMarketPrices && "animate-spin")} />
            Refresh prices
          </button>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TOKENS.onSurfaceMuted }}>
              Core positions
            </p>
            <span className="text-xs font-bold tabular-nums" style={{ color: TOKENS.primary }}>
              {totalInvested > 0 && topHoldingsList[0]
                ? `${((topHoldingsList[0].amount / totalInvested) * 100).toFixed(0)}%`
                : "—"}
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {topHoldingsList.slice(0, 3).map((row) => (
              <li key={row.symbol} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold" style={{ color: TOKENS.onSurface }}>
                  {row.symbol}
                </span>
                <span className="tabular-nums" style={{ color: TOKENS.secondary }}>
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
            {topHoldingsList.length === 0 ? (
              <li className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                No positions yet.
              </li>
            ) : null}
          </ul>
          <button
            type="button"
            onClick={() => setPanelMode("analytics")}
            className="mt-4 w-full text-center text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: TOKENS.secondary }}
          >
            View all assets
          </button>
        </div>
        <div className="rounded-xl border p-4" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TOKENS.onSurfaceMuted }}>
              Secondary sleeve
            </p>
            <span className="text-xs font-bold" style={{ color: TOKENS.onSurfaceMuted }}>
              Next tier
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {topHoldingsList.slice(3, 6).map((row) => (
              <li key={row.symbol} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold" style={{ color: TOKENS.onSurface }}>
                  {row.symbol}
                </span>
                <span className="tabular-nums" style={{ color: TOKENS.secondary }}>
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
            {topHoldingsList.length <= 3 ? (
              <li className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                Add more tickers to populate this sleeve.
              </li>
            ) : null}
          </ul>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="mt-4 w-full text-center text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: TOKENS.secondary }}
          >
            Add position
          </button>
        </div>
        <div className="rounded-xl border p-4" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TOKENS.onSurfaceMuted }}>
              Cash &amp; sweep
            </p>
            <span className="text-xs font-bold tabular-nums" style={{ color: TOKENS.primary }}>
              {portfolioMarkValue > 0 ? `${((totalCash / portfolioMarkValue) * 100).toFixed(0)}%` : "—"}
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {accounts.map((acc) => (
              <li key={acc.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-semibold" style={{ color: TOKENS.onSurface }}>
                  {acc.name}
                </span>
                <span className="tabular-nums" style={{ color: TOKENS.secondary }}>
                  {formatCurrency(acc.balance)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Uninvested cash in brokerage accounts
          </p>
        </div>
      </div>

      <section
        className="rounded-xl border p-4 sm:p-5"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: TOKENS.onSurfaceMuted }}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker or account…"
              className={cn(consoleField, "mt-0 pl-9")}
              style={{
                backgroundColor: TOKENS.surfaceLow,
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurface,
              }}
            />
          </div>
          <div
            className="inline-flex rounded-xl p-1"
            style={{ background: TOKENS.surfaceHigh, boxShadow: CARD_INSET }}
          >
            <button
              type="button"
              onClick={() => setPanelMode("analytics")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{
                background: panelMode === "analytics" ? TOKENS.surfaceContainer : "transparent",
                color: panelMode === "analytics" ? TOKENS.primary : TOKENS.onSurfaceMuted,
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </button>
            <button
              type="button"
              onClick={() => setPanelMode("reports")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{
                background: panelMode === "reports" ? TOKENS.surfaceContainer : "transparent",
                color: panelMode === "reports" ? TOKENS.primary : TOKENS.onSurfaceMuted,
              }}
            >
              <FileText className="h-3.5 w-3.5" />
              Reports
            </button>
          </div>
        </div>
      </section>

      {panelMode === "analytics" ? (
        <section
          className="rounded-xl border p-5 sm:p-6"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: CARD_INSET,
          }}
        >
          <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            Portfolio composition
          </p>
          <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            Top holdings by invested amount
          </p>
          <div className="mt-4 space-y-3">
            {allocationBySymbol.rows.length === 0 ? (
              <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                No holdings yet.
              </p>
            ) : (
              allocationBySymbol.rows.map((row) => {
                const pct = allocationBySymbol.total > 0 ? (row.amount / allocationBySymbol.total) * 100 : 0
                return (
                  <div key={row.symbol}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span style={{ color: TOKENS.onSurface }}>{row.symbol}</span>
                      <span className="tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                        {formatCurrency(row.amount)}{" "}
                        <span style={{ color: TOKENS.onSurfaceMuted }}>({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: TOKENS.secondary, boxShadow: CARD_INSET }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      ) : (
        <section
          className="rounded-xl border p-5 sm:p-6"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: CARD_INSET,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Transaction ledger
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            Recent activity
          </p>
          <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            Buys and adds across your investment accounts
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}>
                  <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Asset</th>
                  <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Action</th>
                  <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Reference</th>
                  <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Account</th>
                  <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.primary }}>Amount</th>
                  <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentExecutions
                  .filter((r) => {
                    const q = searchQuery.trim().toLowerCase()
                    if (!q) return true
                    return (
                      r.symbol.toLowerCase().includes(q) ||
                      r.account.toLowerCase().includes(q)
                    )
                  })
                  .slice(0, 12)
                  .map((row) => (
                    <tr key={row.id} style={{ borderBottom: `1px solid color-mix(in srgb, ${TOKENS.outlineGhost} 55%, transparent)` }}>
                      <td className="px-2 py-2.5">
                        <span className="font-semibold" style={{ color: TOKENS.onSurface }}>{row.symbol}</span>
                        <span className="ml-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>{formatDateShort(row.date)}</span>
                      </td>
                      <td className="px-2 py-2.5 font-semibold uppercase tracking-wide" style={{ color: TOKENS.secondary }}>Buy</td>
                      <td className="px-2 py-2.5 font-mono text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>{row.id.slice(0, 8)}…</td>
                      <td className="px-2 py-2.5" style={{ color: TOKENS.onSurface }}>{row.account}</td>
                      <td className="px-2 py-2.5 text-right font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TOKENS.primary }} />
                          <span className="font-semibold uppercase tracking-wide" style={{ color: TOKENS.primary }}>Executed</span>
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Showing the 12 most recent purchases. Use search to narrow the list.
          </p>
        </section>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <section className="lg:col-span-12 rounded-xl border p-5 sm:p-6" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            <Briefcase className="h-4 w-4" style={{ color: TOKENS.secondary }} />
            Holdings by account
          </p>
          <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            Merged positions with latest purchase activity.
          </p>

          <div className="mt-4 space-y-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="rounded-xl border p-4" style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow, boxShadow: CARD_INSET }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>{acc.name}</p>
                    <p className="text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>{acc.bankName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Cash</p>
                    <p className="text-sm font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>{formatCurrency(acc.balance)}</p>
                  </div>
                </div>

                {acc.holdings.filter((h) => {
                  const q = searchQuery.trim().toLowerCase()
                  if (!q) return true
                  return (
                    h.name.toLowerCase().includes(q) ||
                    acc.name.toLowerCase().includes(q) ||
                    acc.bankName.toLowerCase().includes(q)
                  )
                }).length === 0 ? (
                  <p className="mt-3 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>No holdings yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {acc.holdings
                      .filter((h) => {
                        const q = searchQuery.trim().toLowerCase()
                        if (!q) return true
                        return (
                          h.name.toLowerCase().includes(q) ||
                          acc.name.toLowerCase().includes(q) ||
                          acc.bankName.toLowerCase().includes(q)
                        )
                      })
                      .slice(0, 6)
                      .map((h) => {
                      const symbol = h.name.trim().toUpperCase()
                      const currentPrice = marketPrices[symbol]
                      const hasMarket = !!currentPrice && currentPrice > 0 && h.totalShares > 0
                      const currentValue = hasMarket ? currentPrice * h.totalShares : 0
                      const gainLoss = hasMarket ? currentValue - h.totalAmount : 0
                      const gainLossPct = hasMarket && h.totalAmount > 0 ? (gainLoss / h.totalAmount) * 100 : 0
                      return (
                      <li key={`${acc.id}-${h.name}`} className="rounded-lg border px-3 py-2.5" style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceContainer }}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold" style={{ color: TOKENS.onSurface }}>{h.name}</p>
                            <p className="text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                              {h.totalShares > 0 ? `${h.totalShares.toFixed(2)} shares · avg ${formatCurrency(h.averagePrice)}` : "Amount-only holding"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold tabular-nums" style={{ color: TOKENS.secondary }}>{formatCurrency(h.totalAmount)}</p>
                            {hasMarket ? (
                              <p className="text-[10px] tabular-nums" style={{ color: gainLoss >= 0 ? TOKENS.primary : ERROR_SOFT }}>
                                {gainLoss >= 0 ? "+" : ""}
                                {formatCurrency(gainLoss)} ({gainLossPct >= 0 ? "+" : ""}
                                {gainLossPct.toFixed(2)}%)
                              </p>
                            ) : null}
                            <p className="text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                              Last {formatDateShort(h.lastPurchaseDate)}
                            </p>
                          </div>
                        </div>
                      </li>
                    )})}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow:
              "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => setLogOpen(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
                Add investment
              </DialogTitle>
              <DialogDescription
                className="text-sm leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Record a position purchase from an investment account.
              </DialogDescription>
            </DialogHeader>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {message ? (
                <div
                  className="rounded-xl border px-3 py-2 text-xs"
                  style={{
                    borderColor: message.type === "success" ? TOKENS.primary : ERROR_SOFT,
                    color: message.type === "success" ? TOKENS.primary : ERROR_SOFT,
                    background: TOKENS.surfaceLow,
                  }}
                >
                  {message.text}
                </div>
              ) : null}

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Account *
                </label>
                <AppSelect
                  value={selectedInvestmentAccountId}
                  onValueChange={setSelectedInvestmentAccountId}
                  required
                  variant="console"
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  placeholder="Select investment account"
                  options={[
                    { value: "", label: "Select investment account" },
                    ...accounts.map((acc) => ({
                      value: acc.id,
                      label: `${acc.name} (${acc.bankName}) · Cash ${formatCurrency(acc.balance)}`,
                    })),
                  ]}
                />
              </div>

              <div ref={investmentSearchRef} className="relative">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Ticker / name *
                  </label>
                  <AppSelect
                    value={investmentMarket}
                    onValueChange={(v) => {
                      setInvestmentMarket(v as "all" | "AU")
                      setShowInvestmentDropdown(false)
                      setInvestmentSearchResults([])
                    }}
                    variant="console"
                    className="!h-auto min-h-8 w-auto shrink-0 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: TOKENS.surfaceLow,
                      color: TOKENS.onSurfaceMuted,
                    }}
                    options={[
                      { value: "all", label: "All markets" },
                      { value: "AU", label: "Australia (ASX)" },
                    ]}
                  />
                </div>
                <Input
                  value={investmentSearchQuery || investmentName}
                  onChange={(e) => {
                    const v = e.target.value
                    setInvestmentSearchQuery(v)
                    setInvestmentName(v)
                    setShowInvestmentDropdown(!!v.trim())
                  }}
                  onFocus={() => investmentSearchQuery.trim() && setShowInvestmentDropdown(true)}
                  placeholder={investmentMarket === "AU" ? "e.g. BHP, CBA" : "e.g. AAPL, TSLA"}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  required
                  autoComplete="off"
                />
                {investmentSearchLoading ? (
                  <div
                    className="absolute right-3 top-10 text-[10px] font-semibold"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Searching…
                  </div>
                ) : null}
                {showInvestmentDropdown && investmentSearchResults.length > 0 ? (
                  <ul
                    className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border py-1"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: TOKENS.surfaceContainer,
                      boxShadow: "0 20px 30px rgba(0,0,0,0.35)",
                    }}
                    role="listbox"
                  >
                    {investmentSearchResults.map((item) => (
                      <li
                        key={item.symbol}
                        role="option"
                        className="cursor-pointer px-3 py-2 text-sm transition-colors"
                        style={{ color: TOKENS.onSurface }}
                        onMouseDown={() => {
                          setInvestmentName(item.symbol)
                          setInvestmentSearchQuery(item.symbol)
                          setShowInvestmentDropdown(false)
                        }}
                      >
                        <span className="font-semibold">{item.symbol}</span>
                        {item.name && item.name !== item.symbol ? (
                          <span className="ml-2 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                            {item.name}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {showInvestmentDropdown &&
                !investmentSearchLoading &&
                investmentSearchQuery.trim() &&
                investmentSearchResults.length === 0 ? (
                  <div
                    className="absolute z-30 mt-1 w-full rounded-xl border px-3 py-2 text-xs"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: TOKENS.surfaceContainer,
                      color: TOKENS.onSurfaceMuted,
                    }}
                  >
                    No symbols found. You can still use what you typed.
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Price per unit *
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    className={cn(consoleField, "border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Shares *
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={numberOfShares}
                    onChange={(e) => setNumberOfShares(e.target.value)}
                    className={cn(consoleField, "border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Brokerage (optional)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={brokerageFee}
                    onChange={(e) => setBrokerageFee(e.target.value)}
                    className={cn(consoleField, "border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Date *
                  </label>
                  <DateInput
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={cn(consoleField, "border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                    required
                  />
                </div>
              </div>

              <div className="rounded-xl border px-3 py-2" style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Calculated total</p>
                <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                  {amount ? formatCurrency(Number(amount)) : "—"}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-50"
                style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
              >
                <Plus className="h-4 w-4" />
                {submitting ? "Saving…" : "Create investment"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
