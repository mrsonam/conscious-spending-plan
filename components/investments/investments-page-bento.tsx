"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import {
  Activity,
  BarChart3,
  FileText,
  Briefcase,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react"

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

export function InvestmentsPageBento() {
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

  useEffect(() => {
    void fetchData()
    setDate(new Date().toISOString().split("T")[0])
  }, [])

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

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/investments")
      if (!res.ok) {
        setAccounts([])
      } else {
        const data = (await res.json()) as { accounts?: InvestmentAccountSummary[] }
        setAccounts(data.accounts || [])
      }
    } catch {
      setAccounts([])
    } finally {
      setLoading(false)
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
  const totalValue = useMemo(() => accounts.reduce((sum, acc) => sum + acc.totalValue, 0), [accounts])
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
      await fetchData()
    } catch {
      setMessage({ type: "error", text: "Something went wrong while saving." })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl border border-white/10 bg-white/5" />
      </div>
    )
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: TOKENS.primary, boxShadow: CARD_INSET }} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.onSurfaceMuted }}>
              Investment ledger
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary, background: TOKENS.surfaceHigh }}>
            <Activity className="h-3.5 w-3.5" />
            {totalHoldings} holdings
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: TOKENS.onSurface }}>
              Track positions and deploy cash
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              Record each purchase from an investment account. Balances are deducted automatically and holdings are merged by ticker.
            </p>
          </div>
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
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border p-4" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>Invested</p>
          <div className="mt-2"><MajorFigureCurrency amount={totalInvested} variant="income" className="text-lg font-bold!" decimalEm={0.45} /></div>
        </div>
        <div className="rounded-xl border p-4" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>Available cash</p>
          <div className="mt-2"><MajorFigureCurrency amount={totalCash} variant="neutral" className="text-lg font-bold!" decimalEm={0.45} /></div>
        </div>
        <div className="rounded-xl border p-4" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>Total value</p>
          <div className="mt-2"><MajorFigureCurrency amount={totalValue} variant="prosperity" className="text-lg font-bold!" decimalEm={0.45} /></div>
        </div>
        <div className="rounded-xl border p-4" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>Profit / loss</p>
          <div className="mt-2">
            <MajorFigureCurrency
              amount={portfolioGains.totalGainLoss}
              variant={portfolioGains.totalGainLoss >= 0 ? "prosperity" : "loss"}
              className="text-lg font-bold!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-1 text-[11px]" style={{ color: portfolioGains.totalGainLoss >= 0 ? TOKENS.primary : ERROR_SOFT }}>
            {portfolioGains.totalGainLossPercent >= 0 ? "+" : ""}
            {portfolioGains.totalGainLossPercent.toFixed(2)}% on priced holdings
          </p>
        </div>
      </div>

      <section className="rounded-xl border px-4 py-3 sm:px-5" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span style={{ color: TOKENS.onSurfaceMuted }}>
              Accounts: <span style={{ color: TOKENS.onSurface }}>{accounts.length}</span>
            </span>
            <span style={{ color: TOKENS.onSurfaceMuted }}>
              Price coverage:{" "}
              <span style={{ color: TOKENS.onSurface }}>
                {pricedHoldingsCount}/{holdingsWithSymbols.length}
              </span>
            </span>
            <span style={{ color: TOKENS.onSurfaceMuted }}>
              Last update:{" "}
              <span style={{ color: TOKENS.onSurface }}>
                {lastUpdated ? lastUpdated.toLocaleTimeString("en-US") : "—"}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void fetchMarketPrices()}
            disabled={loadingMarketPrices}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-60"
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary, background: TOKENS.surfaceLow }}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loadingMarketPrices && "animate-spin")} />
            Refresh prices
          </button>
        </div>
      </section>

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
          <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            Recent executions
          </p>
          <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            Latest investment purchases across accounts
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}>
                  <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Date</th>
                  <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Symbol</th>
                  <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Account</th>
                  <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Shares</th>
                  <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Price</th>
                  <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.primary }}>Amount</th>
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
                      <td className="px-2 py-2" style={{ color: TOKENS.onSurfaceMuted }}>{formatDateShort(row.date)}</td>
                      <td className="px-2 py-2 font-semibold" style={{ color: TOKENS.onSurface }}>{row.symbol}</td>
                      <td className="px-2 py-2" style={{ color: TOKENS.onSurface }}>{row.account}</td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                        {row.shares ? row.shares.toFixed(2) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                        {row.price ? formatCurrency(row.price) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums" style={{ color: TOKENS.secondary }}>
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
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
                <select
                  value={selectedInvestmentAccountId}
                  onChange={(e) => setSelectedInvestmentAccountId(e.target.value)}
                  className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                  }}
                  required
                >
                  <option value="">Select investment account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName}) · Cash {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={investmentSearchRef} className="relative">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Ticker / name *
                  </label>
                  <select
                    value={investmentMarket}
                    onChange={(e) => {
                      setInvestmentMarket(e.target.value as "all" | "AU")
                      setShowInvestmentDropdown(false)
                      setInvestmentSearchResults([])
                    }}
                    className="rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: TOKENS.surfaceLow,
                      color: TOKENS.onSurfaceMuted,
                    }}
                  >
                    <option value="all">All markets</option>
                    <option value="AU">Australia (ASX)</option>
                  </select>
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
                    className={cn(consoleField, "border-transparent scheme-light dark:scheme-dark")}
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
