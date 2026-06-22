"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  invalidateCategoryTrackingAndDashboardCaches,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import {
  type InvestmentAccountSummary,
  type InvestmentHolding,
  type InvestmentPurchase,
  type InvestmentsApiPayload,
  type RecentDividendRow,
  type EditingPurchase,
  type ChartRange,
} from "@/components/investments/investment-shared"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { tryParseMoneyInput } from "@/lib/money-input"
import { parseSharesInput } from "@/lib/shares"
import { toastError, toastSuccess } from "@/lib/app-toast"
import {
  applyOptimisticDividend,
  applyOptimisticInvestmentPurchase,
  applyOptimisticPurchaseUpdate,
  applyOptimisticPurchaseDelete,
  cloneInvestmentState,
} from "@/lib/investment-optimistic"

/** Same cache key as dashboard secondary load — warm cache when navigating between pages. */
const INVESTMENTS_CACHE_KEY = "dashboard:investments"

export type InvestmentMessage = {
  type: "success" | "error"
  text: string
} | null

export type InvestmentLogFieldKey =
  | "logAccount"
  | "logInvestment"
  | "logPrice"
  | "logShares"
  | "logDate"

export type InvestmentDividendFieldKey =
  | "divAccount"
  | "divSymbol"
  | "divAmount"
  | "divDate"

export type InvestmentFieldErrors = Partial<
  Record<InvestmentLogFieldKey | InvestmentDividendFieldKey, string>
>

export function useInvestmentsPage(status: string) {
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const investmentSearchRef = useRef<HTMLDivElement | null>(null)
  const [accounts, setAccounts] = useState<InvestmentAccountSummary[]>([])
  const [dividendYtd, setDividendYtd] = useState(0)
  const [dividendAllTime, setDividendAllTime] = useState(0)
  const [recentDividends, setRecentDividends] = useState<RecentDividendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [panelMode, setPanelMode] = useState<"analytics" | "reports">("analytics")
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingMarketPrices, setLoadingMarketPrices] = useState(false)
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [message, setMessage] = useState<InvestmentMessage>(null)
  const [fieldErrors, setFieldErrors] = useState<InvestmentFieldErrors>({})

  const [selectedInvestmentAccountId, setSelectedInvestmentAccountId] = useState("")
  const [investmentName, setInvestmentName] = useState("")
  const [investmentSearchQuery, setInvestmentSearchQuery] = useState("")
  const [investmentSearchResults, setInvestmentSearchResults] = useState<
    Array<{ symbol: string; name: string }>
  >([])
  const [investmentSearchLoading, setInvestmentSearchLoading] = useState(false)
  const [showInvestmentDropdown, setShowInvestmentDropdown] = useState(false)
  const [investmentMarket, setInvestmentMarket] = useState<"all" | "AU">("all")
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [numberOfShares, setNumberOfShares] = useState("")
  const [brokerageFee, setBrokerageFee] = useState("")
  const [date, setDate] = useState("")
  const [dividendAccountId, setDividendAccountId] = useState("")
  const [dividendSymbol, setDividendSymbol] = useState("")
  const [dividendAmount, setDividendAmount] = useState("")
  const [dividendDate, setDividendDate] = useState("")
  const [submittingDividend, setSubmittingDividend] = useState(false)
  const [chartRange, setChartRange] = useState<ChartRange>("3M")
  const [editingPurchase, setEditingPurchase] = useState<EditingPurchase | null>(null)
  const [editPricePerUnit, setEditPricePerUnit] = useState("")
  const [editNumberOfShares, setEditNumberOfShares] = useState("")
  const [editBrokerageFee, setEditBrokerageFee] = useState("")
  const [editDate, setEditDate] = useState("")
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [submittingDelete, setSubmittingDelete] = useState(false)
  const [confirmDeletePurchase, setConfirmDeletePurchase] = useState<{
    id: string
    accountId: string
    holdingName: string
    amount: number
  } | null>(null)

  const clearFieldError = useCallback(
    (key: InvestmentLogFieldKey | InvestmentDividendFieldKey) => {
      setFieldErrors((prev) => {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    },
    [],
  )

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({})
  }, [])

  useEffect(() => {
    const d = new Date().toISOString().split("T")[0]
    setDate(d)
    setDividendDate(d)
  }, [])

  useLayoutEffect(() => {
    if (status !== "authenticated") return
    const cached = peekCachedJson<InvestmentsApiPayload>(INVESTMENTS_CACHE_KEY, 45_000)
    if (cached?.accounts) {
      setAccounts(cached.accounts)
      setDividendYtd(cached.dividendYtd ?? 0)
      setDividendAllTime(cached.dividendAllTime ?? 0)
      setRecentDividends(cached.recentDividends ?? [])
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false

    async function load() {
      const cached = peekCachedJson<InvestmentsApiPayload>(
        INVESTMENTS_CACHE_KEY,
        45_000,
      )
      if (!cached?.accounts) {
        setLoading(true)
      }
      const t = Date.now()
      try {
        const data = await fetchJsonAndCache<InvestmentsApiPayload>(
          INVESTMENTS_CACHE_KEY,
          `/api/investments?t=${t}`,
        )

        if (cancelled) return

        setAccounts(data.accounts || [])
        setDividendYtd(data.dividendYtd ?? 0)
        setDividendAllTime(data.dividendAllTime ?? 0)
        setRecentDividends(data.recentDividends ?? [])
      } catch (e) {
        console.error("Investments load error:", e)
        if (!cancelled) {
          setAccounts([])
          setDividendYtd(0)
          setDividendAllTime(0)
          setRecentDividends([])
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
      const data = await fetchJsonAndCache<InvestmentsApiPayload>(
        INVESTMENTS_CACHE_KEY,
        `/api/investments?t=${t}`,
      )
      setAccounts(data.accounts || [])
      setDividendYtd(data.dividendYtd ?? 0)
      setDividendAllTime(data.dividendAllTime ?? 0)
      setRecentDividends(data.recentDividends ?? [])
    } catch {
      setAccounts([])
      setDividendYtd(0)
      setDividendAllTime(0)
      setRecentDividends([])
    }
  }

  const dividendSymbolOptions = useMemo(() => {
    const s = new Set<string>()
    for (const a of accounts) {
      for (const h of a.holdings) {
        const t = h.name.trim()
        if (t) s.add(t)
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [accounts])

  const handleDividendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const nextErrors: InvestmentFieldErrors = {}
    if (!dividendAccountId) {
      nextErrors.divAccount = "Select an investment account."
    }
    const sym = dividendSymbol.trim()
    if (!sym) {
      nextErrors.divSymbol =
        "Enter the stock or fund name (same as your holding)."
    }
    const amt = tryParseMoneyInput(dividendAmount, currencyCode)
    if (amt === null || amt <= 0) {
      nextErrors.divAmount = "Enter a valid dividend amount."
    }
    if (!dividendDate) {
      nextErrors.divDate = "Select the payment date."
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return false
    }
    setFieldErrors({})

    const snapshot = cloneInvestmentState(
      accounts,
      dividendYtd,
      dividendAllTime,
      recentDividends
    )
    const payload = {
      investmentAccountId: dividendAccountId,
      name: sym,
      amount: amt!,
      date: dividendDate,
    }
    const dividendPatch = applyOptimisticDividend(
      accounts,
      dividendYtd,
      dividendAllTime,
      recentDividends,
      {
        accountId: payload.investmentAccountId,
        symbol: payload.name,
        amount: payload.amount,
        date: payload.date,
      }
    )
    setAccounts(dividendPatch.accounts)
    setDividendYtd(dividendPatch.dividendYtd)
    setDividendAllTime(dividendPatch.dividendAllTime)
    setRecentDividends(dividendPatch.recentDividends)
    toastSuccess(
      "Dividend recorded. Cash updated; income logged (not allocated to budget) and visible on Statements."
    )
    setDividendSymbol("")
    setDividendAmount("")
    setDividendDate(new Date().toISOString().split("T")[0])

    void (async () => {
      setSubmittingDividend(true)
      try {
        const res = await fetch("/api/investments/dividends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setAccounts(snapshot.accounts)
          setDividendYtd(snapshot.dividendYtd)
          setDividendAllTime(snapshot.dividendAllTime)
          setRecentDividends(snapshot.recentDividends)
          setMessage({ type: "error", text: data.error || "Could not record dividend." })
          toastError(data.error || "Could not record dividend.")
          return
        }
        invalidateCachedJson(INVESTMENTS_CACHE_KEY)
        invalidateCachedJson("statement:")
        invalidateCachedJson(/^income:/)
        invalidateCategoryTrackingAndDashboardCaches()
        await refetchAccounts()
      } catch {
        setAccounts(snapshot.accounts)
        setDividendYtd(snapshot.dividendYtd)
        setDividendAllTime(snapshot.dividendAllTime)
        setRecentDividends(snapshot.recentDividends)
        setMessage({ type: "error", text: "Something went wrong while saving." })
        toastError("Something went wrong while saving.")
      } finally {
        setSubmittingDividend(false)
      }
    })()

    return true
  }

  const startEditPurchase = useCallback(
    (purchase: InvestmentPurchase, accountId: string, holdingName: string) => {
      setEditingPurchase({
        purchaseId: purchase.id,
        accountId,
        holdingName,
        originalAmount: purchase.amount,
      })
      setEditPricePerUnit(purchase.pricePerUnit != null ? String(purchase.pricePerUnit) : "")
      setEditNumberOfShares(purchase.numberOfShares ?? "")
      setEditBrokerageFee(purchase.brokerageFee ? String(purchase.brokerageFee) : "")
      setEditDate(
        purchase.date
          ? new Date(purchase.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      )
      setFieldErrors({})
    },
    []
  )

  const editCalculatedTotal = useMemo(() => {
    const price = tryParseMoneyInput(editPricePerUnit, currencyCode)
    const shares = parseFloat(editNumberOfShares)
    const fee = editBrokerageFee ? tryParseMoneyInput(editBrokerageFee, currencyCode) : 0
    if (price === null || Number.isNaN(shares) || price <= 0 || shares <= 0)
      return ""
    const total = price * shares + (fee === null || fee < 0 ? 0 : fee)
    return total.toFixed(2)
  }, [editPricePerUnit, editNumberOfShares, editBrokerageFee, currencyCode])

  const handleUpdatePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPurchase) return false
    setMessage(null)

    const nextErrors: InvestmentFieldErrors = {}
    const numPrice = tryParseMoneyInput(editPricePerUnit, currencyCode)
    let sharesStr = ""
    try {
      sharesStr = parseSharesInput(editNumberOfShares)
    } catch {
      nextErrors.logShares = "Enter a valid share count."
    }
    const numFee = editBrokerageFee ? tryParseMoneyInput(editBrokerageFee, currencyCode) ?? 0 : 0
    if (numPrice === null || numPrice <= 0) {
      nextErrors.logPrice = "Enter a valid price per unit."
    }
    if (!editDate) {
      nextErrors.logDate = "Select the investment date."
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return false
    }
    setFieldErrors({})

    const sharesNum = Number.parseFloat(sharesStr)
    const snapshot = cloneInvestmentState(accounts, dividendYtd, dividendAllTime, recentDividends)

    setAccounts(
      applyOptimisticPurchaseUpdate(accounts, editingPurchase.accountId, editingPurchase.purchaseId, {
        pricePerUnit: numPrice!,
        numberOfShares: sharesNum,
        brokerageFee: numFee > 0 ? numFee : 0,
        date: editDate,
      })
    )
    toastSuccess("Purchase updated.")
    setEditingPurchase(null)

    void (async () => {
      setSubmittingEdit(true)
      try {
        const res = await fetch(`/api/investments/${editingPurchase.purchaseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pricePerUnit: numPrice!,
            numberOfShares: sharesStr,
            brokerageFee: numFee > 0 ? numFee : 0,
            date: editDate,
          }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setAccounts(snapshot.accounts)
          setMessage({ type: "error", text: data.error || "Failed to update purchase." })
          toastError(data.error || "Failed to update purchase.")
          return
        }
        invalidateCachedJson(INVESTMENTS_CACHE_KEY)
        invalidateCategoryTrackingAndDashboardCaches()
        await refetchAccounts()
      } catch {
        setAccounts(snapshot.accounts)
        setMessage({ type: "error", text: "Something went wrong while saving." })
        toastError("Something went wrong while saving.")
      } finally {
        setSubmittingEdit(false)
      }
    })()

    return true
  }

  const handleDeletePurchase = () => {
    if (!confirmDeletePurchase) return

    const { id: purchaseId, accountId } = confirmDeletePurchase
    const snapshot = cloneInvestmentState(accounts, dividendYtd, dividendAllTime, recentDividends)

    setAccounts(applyOptimisticPurchaseDelete(accounts, accountId, purchaseId))
    toastSuccess("Purchase deleted. Funds returned to account.")
    setConfirmDeletePurchase(null)

    void (async () => {
      setSubmittingDelete(true)
      try {
        const res = await fetch(`/api/investments/${purchaseId}`, {
          method: "DELETE",
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setAccounts(snapshot.accounts)
          setMessage({ type: "error", text: data.error || "Failed to delete purchase." })
          toastError(data.error || "Failed to delete purchase.")
          return
        }
        invalidateCachedJson(INVESTMENTS_CACHE_KEY)
        invalidateCategoryTrackingAndDashboardCaches()
        await refetchAccounts()
      } catch {
        setAccounts(snapshot.accounts)
        setMessage({ type: "error", text: "Something went wrong while deleting." })
        toastError("Something went wrong while deleting.")
      } finally {
        setSubmittingDelete(false)
      }
    })()
  }

  const totalInvested = useMemo(
    () => accounts.reduce((sum, acc) => sum + acc.investedAmount, 0),
    [accounts],
  )
  const totalCash = useMemo(
    () => accounts.reduce((sum, acc) => sum + acc.balance, 0),
    [accounts],
  )
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
    const divMap = new Map<string, number>()
    for (const h of allHoldings) {
      const k = h.name.trim().toUpperCase()
      map.set(k, (map.get(k) ?? 0) + h.totalAmount)
      divMap.set(k, (divMap.get(k) ?? 0) + (h.dividendIncome ?? 0))
    }
    const rows = [...map.entries()]
      .map(([symbol, amount]) => ({
        symbol,
        amount,
        dividends: divMap.get(symbol) ?? 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
    const total = rows.reduce((s, r) => s + r.amount, 0)
    return { rows, total }
  }, [allHoldings])

  const recentActivity = useMemo(() => {
    const buys = accounts.flatMap((acc) =>
      acc.holdings.flatMap((h) =>
        h.purchases.map((p) => ({
          id: p.id,
          date: p.date,
          symbol: h.name,
          account: acc.name,
          amount: p.amount,
          shares: p.numberOfShares,
          price: p.pricePerUnit,
          kind: "buy" as const,
        })),
      ),
    )
    const divs = recentDividends.map((d) => ({
      id: d.id,
      date: d.date,
      symbol: d.name,
      account: accounts.find((a) => a.id === d.accountId)?.name ?? "—",
      amount: d.amount,
      shares: null as number | null,
      price: null as number | null,
      kind: "dividend" as const,
    }))
    return [...buys, ...divs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
  }, [accounts, recentDividends])

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
        monthLabel: new Date(t)
          .toLocaleDateString("en-US", { month: "short", year: "numeric" })
          .toUpperCase(),
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
        monthLabel: new Date(now)
          .toLocaleDateString("en-US", { month: "short", year: "numeric" })
          .toUpperCase(),
      })
    } else {
      out[out.length - 1] = { ...last, value: endValue, t: now }
    }
    return out
  }, [accounts, portfolioMarkValue])

  const portfolioChartData = useMemo(() => {
    const ms: Record<ChartRange, number | null> = {
      "1W": 7 * 86400000,
      "3M": 90 * 86400000,
      "1Y": 365 * 86400000,
      ALL: null,
    }
    const cutoff =
      ms[chartRange] != null ? Date.now() - (ms[chartRange] as number) : null
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
      return `${top?.symbol ?? "Top position"} is ${topPct.toFixed(0)}% of deployed capital. Review concentration when adding size.`
    }
    if (liquidityPct < 5 && totalCash >= 0) {
      return "Liquidity buffer is thin versus portfolio value. Consider keeping more cash in investment accounts for fees and opportunities."
    }
    if (
      pricedHoldingsCount < holdingsWithSymbols.length &&
      holdingsWithSymbols.length > 0
    ) {
      return "Some tickers lack live prices. Refresh to tighten profit/loss and chart context."
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

  const calculatedTotal = useMemo(() => {
    const price = tryParseMoneyInput(pricePerUnit, currencyCode)
    const shares = parseFloat(numberOfShares)
    const fee = brokerageFee ? tryParseMoneyInput(brokerageFee, currencyCode) : 0
    if (price === null || Number.isNaN(shares) || price <= 0 || shares <= 0)
      return ""
    const total = price * shares + (fee === null || fee < 0 ? 0 : fee)
    return total.toFixed(2)
  }, [pricePerUnit, numberOfShares, brokerageFee, currencyCode])

  const fetchMarketPrices = useCallback(async () => {
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
  }, [accounts, loadingMarketPrices])

  useEffect(() => {
    if (accounts.length === 0 || loading || loadingMarketPrices) return
    const hasShares = accounts.some((acc) =>
      acc.holdings.some((h) => h.totalShares > 0 && h.name.trim().length > 0),
    )
    if (hasShares && Object.keys(marketPrices).length === 0) {
      void fetchMarketPrices()
    }
  }, [accounts, loading, loadingMarketPrices, marketPrices, fetchMarketPrices])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const nextErrors: InvestmentFieldErrors = {}
    if (!selectedInvestmentAccountId) {
      nextErrors.logAccount = "Select an investment account."
    }
    if (!investmentName.trim()) {
      nextErrors.logInvestment = "Enter an investment name or ticker."
    }
    const numPrice = tryParseMoneyInput(pricePerUnit, currencyCode)
    let sharesStr = ""
    try {
      sharesStr = parseSharesInput(numberOfShares)
    } catch {
      nextErrors.logShares = "Enter a valid share count."
    }
    const numFee = brokerageFee ? tryParseMoneyInput(brokerageFee, currencyCode) ?? 0 : 0
    if (numPrice === null || numPrice <= 0) {
      nextErrors.logPrice = "Enter a valid price per unit."
    }
    if (!date) {
      nextErrors.logDate = "Select the investment date."
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return false
    }
    setFieldErrors({})

    const sharesNum = Number.parseFloat(sharesStr)
    const snapshot = cloneInvestmentState(
      accounts,
      dividendYtd,
      dividendAllTime,
      recentDividends
    )
    const payload = {
      investmentAccountId: selectedInvestmentAccountId,
      investmentName: investmentName.trim(),
      pricePerUnit: numPrice!,
      numberOfShares: sharesStr,
      brokerageFee: numFee > 0 ? numFee : 0,
      date,
    }

    setAccounts(
      applyOptimisticInvestmentPurchase(accounts, {
        accountId: payload.investmentAccountId,
        investmentName: payload.investmentName,
        pricePerUnit: payload.pricePerUnit,
        numberOfShares: sharesNum,
        brokerageFee: payload.brokerageFee,
        date: payload.date,
      })
    )

    toastSuccess("Investment created successfully.")
    setSelectedInvestmentAccountId("")
    setInvestmentName("")
    setInvestmentSearchQuery("")
    setInvestmentSearchResults([])
    setShowInvestmentDropdown(false)
    setPricePerUnit("")
    setNumberOfShares("")
    setBrokerageFee("")

    void (async () => {
      setSubmitting(true)
      try {
        const response = await fetch("/api/investments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = (await response.json()) as { error?: string }
        if (!response.ok) {
          setAccounts(snapshot.accounts)
          setDividendYtd(snapshot.dividendYtd)
          setDividendAllTime(snapshot.dividendAllTime)
          setRecentDividends(snapshot.recentDividends)
          setMessage({ type: "error", text: data.error || "Failed to create investment." })
          toastError(data.error || "Failed to create investment.")
          return
        }
        invalidateCachedJson(INVESTMENTS_CACHE_KEY)
        invalidateCategoryTrackingAndDashboardCaches()
        await refetchAccounts()
      } catch {
        setAccounts(snapshot.accounts)
        setDividendYtd(snapshot.dividendYtd)
        setDividendAllTime(snapshot.dividendAllTime)
        setRecentDividends(snapshot.recentDividends)
        setMessage({ type: "error", text: "Something went wrong while saving." })
        toastError("Something went wrong while saving.")
      } finally {
        setSubmitting(false)
      }
    })()

    return true
  }

  const chartSubtitle =
    chartRange === "1W"
      ? "Last week (deployed capital → portfolio value)"
      : chartRange === "3M"
        ? "Last 90 days performance"
        : chartRange === "1Y"
          ? "Last 12 months performance"
          : "Full history (deployed capital → portfolio value)"

  const filteredRecentActivity = useMemo(() => {
    return recentActivity.filter((r) => {
      const q = searchQuery.trim().toLowerCase()
      if (!q) return true
      return (
        r.symbol.toLowerCase().includes(q) ||
        r.account.toLowerCase().includes(q)
      )
    })
  }, [recentActivity, searchQuery])

  return {
    formatCurrency,
    investmentSearchRef,
    accounts,
    dividendYtd,
    dividendAllTime,
    loading,
    submitting,
    panelMode,
    setPanelMode,
    searchQuery,
    setSearchQuery,
    loadingMarketPrices,
    marketPrices,
    lastUpdated,
    message,
    setMessage,
    fieldErrors,
    clearFieldError,
    clearFieldErrors,
    selectedInvestmentAccountId,
    setSelectedInvestmentAccountId,
    investmentName,
    investmentSearchQuery,
    setInvestmentSearchQuery,
    setInvestmentName,
    investmentSearchResults,
    investmentSearchLoading,
    showInvestmentDropdown,
    setShowInvestmentDropdown,
    investmentMarket,
    setInvestmentMarket,
    pricePerUnit,
    setPricePerUnit,
    numberOfShares,
    setNumberOfShares,
    brokerageFee,
    setBrokerageFee,
    date,
    setDate,
    dividendAccountId,
    setDividendAccountId,
    dividendSymbol,
    setDividendSymbol,
    dividendAmount,
    setDividendAmount,
    dividendDate,
    setDividendDate,
    submittingDividend,
    chartRange,
    setChartRange,
    dividendSymbolOptions,
    handleDividendSubmit,
    totalInvested,
    totalCash,
    totalHoldings,
    allocationBySymbol,
    recentActivity,
    filteredRecentActivity,
    portfolioGains,
    portfolioMarkValue,
    portfolioChartData,
    liquidityPct,
    concentrationStdev,
    sovereignInsight,
    topHoldingsList,
    calculatedTotal,
    fetchMarketPrices,
    handleSubmit,
    chartSubtitle,
    editingPurchase,
    setEditingPurchase,
    editPricePerUnit,
    setEditPricePerUnit,
    editNumberOfShares,
    setEditNumberOfShares,
    editBrokerageFee,
    setEditBrokerageFee,
    editDate,
    setEditDate,
    editCalculatedTotal,
    submittingEdit,
    submittingDelete,
    startEditPurchase,
    handleUpdatePurchase,
    confirmDeletePurchase,
    setConfirmDeletePurchase,
    handleDeletePurchase,
  }
}

export type UseInvestmentsPageResult = ReturnType<typeof useInvestmentsPage>
