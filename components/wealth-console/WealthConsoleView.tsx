"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/layout/header"
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Coffee,
  Gem,
  PiggyBank,
  TrendingUp,
} from "lucide-react"
import dynamic from "next/dynamic"
import { BENTO } from "@/lib/app-routes"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

const PieChart = dynamic(
  () => import("recharts").then((m) => m.PieChart),
  { ssr: false }
)
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false })
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false })

export { TOKENS } from "@/lib/wealth-console-tokens"

export interface Breakdown {
  income: number
  fixedCosts: number
  savings: number
  investment: number
  guiltFreeSpending: number
  total: number
}

export interface Account {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
}

export interface Expense {
  id: string
  amount: number
  description: string | null
  category: string | null
  date: string
}

export interface CategoryTracking {
  allocated: number
  spent: number
  remaining: number
  overspent?: number
}

export interface InvestmentHolding {
  name: string
  totalAmount: number
  totalShares: number
  purchases: Array<{ amount: number; date: string }>
}

export interface InvestmentAccount {
  name: string
  bankName: string
  investedAmount: number
  holdings: InvestmentHolding[]
}

export interface LoanSummary {
  activeCount: number
  outstandingPrincipal: number
}

export interface YtdSummary {
  year: number
  totalIncome: number
  totalExpenses: number
  totalInvested: number
}

export interface TrajectoryPoint {
  month: string
  value: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function accountTypeDisplay(accountType: string) {
  const t = accountType.toLowerCase()
  if (t === "checking") return "Primary Checking"
  if (t === "savings") return "Savings"
  if (t === "investment") return "Investment"
  if (t === "cash") return "Cash"
  return accountType.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Expenses whose `date` is in the current calendar month (local time). */
function filterExpensesCurrentMonth(expenses: Expense[]): Expense[] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  ).getTime()
  return expenses.filter((e) => {
    const t = new Date(e.date).getTime()
    return !Number.isNaN(t) && t >= start && t <= end
  })
}

function groupExpensesByDescription(
  expenses: Expense[],
  category: string,
  limit: number
): { label: string; amount: number }[] {
  const map = new Map<string, number>()
  for (const e of expenses) {
    if (e.category !== category) continue
    const label = (e.description?.trim() || "Uncategorized").slice(0, 48)
    map.set(label, (map.get(label) || 0) + e.amount)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, amount]) => ({ label, amount }))
}

function SegmentedPillarBar({
  fixedCosts,
  savings,
  investment,
  guiltFree,
}: {
  fixedCosts: number
  savings: number
  investment: number
  guiltFree: number
}) {
  const total = fixedCosts + savings + investment + guiltFree
  if (total <= 0) {
    return (
      <div
        className="h-4 w-full rounded-lg opacity-30"
        style={{ background: TOKENS.surfaceHigh }}
      />
    )
  }
  const pct = (v: number) => `${Math.max(0, (v / total) * 100)}%`

  return (
    <div className="flex h-4 w-full gap-px overflow-hidden rounded-lg">
      {fixedCosts > 0 && (
        <div
          className="h-full min-w-[6px] transition-all"
          style={{ width: pct(fixedCosts), background: TOKENS.secondary }}
        />
      )}
      {savings > 0 && (
        <div
          className="h-full min-w-[6px] transition-all"
          style={{ width: pct(savings), background: TOKENS.primary }}
        />
      )}
      {investment > 0 && (
        <div
          className="h-full min-w-[6px] transition-all"
          style={{ width: pct(investment), background: TOKENS.tertiary }}
        />
      )}
      {guiltFree > 0 && (
        <div
          className="h-full min-w-[6px] transition-all"
          style={{ width: pct(guiltFree), background: TOKENS.primary }}
        />
      )}
    </div>
  )
}

function PillarLegend({
  items,
  total,
}: {
  items: { label: string; shortLabel: string; amount: number; color: string }[]
  total: number
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
      {items.map((row) => {
        const pct =
          total > 0 ? ((row.amount / total) * 100).toFixed(0) : "0"
        return (
          <div key={row.label} className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {row.shortLabel}
              </span>
              <span
                className="text-[10px] tabular-nums"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {pct}%
              </span>
            </div>
            <div className="mt-1.5 pl-4 text-base font-semibold tabular-nums tracking-tight">
              <MajorFigureCurrency
                amount={row.amount}
                variant="neutral"
                decimalEm={0.55}
                className="font-semibold!"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TrajectorySparkline({ series }: { series: TrajectoryPoint[] }) {
  const w = 140
  const h = 44
  const pad = 2
  const values = series.map((s) => s.value)
  if (values.length < 2) {
    return (
      <div
        className="flex h-11 w-[140px] items-end justify-between gap-0.5 opacity-40"
        aria-hidden
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-sm"
            style={{
              height: `${20 + (i % 3) * 8}%`,
              background: TOKENS.primary,
            }}
          />
        ))}
      </div>
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values, min + 1)
  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2)
    const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2)
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={TOKENS.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  )
}

function DetailCard({
  title,
  total,
  icon: Icon,
  rows,
  accent,
  size = "default",
}: {
  title: string
  total: number
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  rows: { label: string; amount: number }[]
  accent: string
  size?: "default" | "hero" | "compact"
}) {
  const isHero = size === "hero"
  const isCompact = size === "compact"

  return (
    <div
      className={`rounded-xl ${isHero ? "p-6 sm:p-7" : isCompact ? "p-4 sm:p-5" : "p-5"}`}
      style={{
        background: TOKENS.surfaceContainer,
        boxShadow: CARD_INSET,
      }}
    >
      <div className={`flex items-start justify-between gap-3 ${isHero ? "mb-5" : "mb-4"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg ${isHero ? "h-12 w-12" : isCompact ? "h-9 w-9" : "h-10 w-10"}`}
            style={{ background: TOKENS.surfaceLow, color: accent }}
          >
            <Icon className={isHero ? "h-6 w-6" : isCompact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
          <div className="min-w-0">
            <p
              className={`font-semibold uppercase tracking-wider ${isHero ? "text-[11px] tracking-[0.15em]" : "text-[10px]"}`}
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {title}
            </p>
            <div
              className={`tabular-nums tracking-tight ${isHero ? "mt-2 text-xl sm:text-2xl" : isCompact ? "mt-1 text-base" : "mt-1 text-lg"}`}
            >
              <MajorFigureCurrency
                amount={total}
                variant="neutral"
                decimalEm={isCompact ? 0.52 : 0.5}
                className={
                  isHero
                    ? ""
                    : isCompact
                      ? "font-bold!"
                      : "font-semibold!"
                }
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-white/5"
          style={{ color: TOKENS.onSurfaceMuted }}
          aria-label="Expand"
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
      <div className={`space-y-2 ${isCompact ? "text-[13px]" : ""}`}>
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            No line items this month
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[1fr_auto] gap-3 text-sm leading-tight"
            >
              <span className="truncate" style={{ color: TOKENS.onSurfaceMuted }}>
                {r.label}
              </span>
              <span
                className="text-right tabular-nums font-medium"
                style={{ color: TOKENS.onSurface }}
              >
                {formatCurrency(r.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function SkeletonBlock({
  className = "",
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: TOKENS.surfaceLow, ...style }}
    />
  )
}

function useScrambleNumber({
  min,
  max,
  intervalMs = 90,
}: {
  min: number
  max: number
  intervalMs?: number
}) {
  const [displayValue, setDisplayValue] = useState(min)

  useEffect(() => {
    const updateValue = () => {
      setDisplayValue(min + Math.random() * (max - min))
    }

    updateValue()
    const timer = window.setInterval(updateValue, intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs, max, min])

  return displayValue
}

function ScrambleCurrencyValue({
  variant = "neutral",
  min = 1500,
  max = 12000,
  className,
  colorMain,
  colorDecimal,
}: {
  variant?: "income" | "neutral" | "prosperity" | "loss"
  min?: number
  max?: number
  className?: string
  colorMain?: string
  colorDecimal?: string
}) {
  const displayValue = useScrambleNumber({ min, max })

  return (
    <span aria-hidden className={className}>
      <MajorFigureCurrency
        amount={displayValue}
        variant={variant}
        colorMain={colorMain}
        colorDecimal={colorDecimal}
      />
    </span>
  )
}

function ScramblePercentValue({
  className,
  color,
}: {
  className?: string
  color?: string
}) {
  const value = useScrambleNumber({ min: 12, max: 96 })

  return (
    <span
      aria-hidden
      className={className}
      style={{ color }}
    >
      {value.toFixed(0)}
      <span
        className="ml-0.5 text-xl font-bold"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        %
      </span>
    </span>
  )
}

function ScrambleIntegerValue({
  className,
  color,
  min = 3,
  max = 28,
}: {
  className?: string
  color?: string
  min?: number
  max?: number
}) {
  const value = useScrambleNumber({ min, max })

  return (
    <span aria-hidden className={className} style={{ color }}>
      {value.toFixed(0)}
    </span>
  )
}

function PillarAllocationLoading() {
  const fixedCosts = useScrambleNumber({ min: 900, max: 2400 })
  const savings = useScrambleNumber({ min: 300, max: 1400 })
  const investment = useScrambleNumber({ min: 200, max: 1200 })
  const guiltFree = useScrambleNumber({ min: 250, max: 1600 })
  const total = fixedCosts + savings + investment + guiltFree

  return (
    <div className="mt-6">
      <SegmentedPillarBar
        fixedCosts={fixedCosts}
        savings={savings}
        investment={investment}
        guiltFree={guiltFree}
      />
      <PillarLegend
        total={total}
        items={[
          {
            label: "Fixed Costs",
            shortLabel: "Fixed",
            amount: fixedCosts,
            color: TOKENS.secondary,
          },
          {
            label: "Savings",
            shortLabel: "Savings",
            amount: savings,
            color: TOKENS.primary,
          },
          {
            label: "Investment",
            shortLabel: "Invest",
            amount: investment,
            color: TOKENS.tertiary,
          },
          {
            label: "Guilt-Free",
            shortLabel: "Guilt-free",
            amount: guiltFree,
            color: TOKENS.primary,
          },
        ]}
      />
    </div>
  )
}

function DetailCardSkeleton({
  title,
  icon: Icon,
  accent,
  size = "default",
}: {
  title: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  accent: string
  size?: "default" | "hero" | "compact"
}) {
  const isHero = size === "hero"
  const isCompact = size === "compact"

  return (
    <div
      className={`rounded-xl ${isHero ? "p-6 sm:p-7" : isCompact ? "p-4 sm:p-5" : "p-5"}`}
      style={{
        background: TOKENS.surfaceContainer,
        boxShadow: CARD_INSET,
      }}
    >
      <div className={`flex items-start justify-between gap-3 ${isHero ? "mb-5" : "mb-4"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg ${isHero ? "h-12 w-12" : isCompact ? "h-9 w-9" : "h-10 w-10"}`}
            style={{ background: TOKENS.surfaceLow, color: accent }}
          >
            <Icon className={isHero ? "h-6 w-6" : isCompact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
          <div className="min-w-0">
            <p
              className={`font-semibold uppercase tracking-wider ${isHero ? "text-[11px] tracking-[0.15em]" : "text-[10px]"}`}
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {title}
            </p>
            <div
              className={`tabular-nums tracking-tight ${isHero ? "mt-2 text-xl sm:text-2xl" : isCompact ? "mt-1 text-base" : "mt-1 text-lg"}`}
            >
              <ScrambleCurrencyValue
                min={300}
                max={3200}
                className={isHero ? "" : isCompact ? "font-bold!" : "font-semibold!"}
              />
            </div>
          </div>
        </div>
        <SkeletonBlock className="h-7 w-7 rounded-md" />
      </div>
      <div className={`space-y-2 ${isCompact ? "text-[13px]" : ""}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_auto] gap-3 text-sm leading-tight"
          >
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-20 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function WealthConsoleView({
  breakdown,
  accounts,
  expenses,
  expensesTotalForMonth,
  categoryTracking,
  investmentAccounts,
  ytdSummary,
  trajectorySeries,
  incomeChangePct,
  lastMonthIncome,
  lastMonthExpenses,
  marketPrices,
  loanSummary,
  loading,
}: {
  breakdown: Breakdown | null
  accounts: Account[]
  expenses: Expense[]
  expensesTotalForMonth: number | null
  categoryTracking: Record<string, CategoryTracking>
  investmentAccounts: InvestmentAccount[]
  ytdSummary: YtdSummary | null
  trajectorySeries: TrajectoryPoint[]
  incomeChangePct: number | null
  lastMonthIncome: number
  lastMonthExpenses: number
  marketPrices: Record<string, number>
  loanSummary: LoanSummary | null
  loading: boolean
}) {
  const totalExpenses =
    expensesTotalForMonth !== null
      ? expensesTotalForMonth
      : expenses.reduce((s, e) => s + e.amount, 0)

  const pulseMetrics = useMemo(() => {
    const n = new Date()
    const startOfMonth = new Date(n.getFullYear(), n.getMonth(), 1).getTime()
    const endOfMonth = new Date(
      n.getFullYear(),
      n.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ).getTime()
    let investedThisMonth = 0
    for (const acc of investmentAccounts) {
      for (const h of acc.holdings) {
        for (const p of h.purchases) {
          const t = new Date(p.date).getTime()
          if (t >= startOfMonth && t <= endOfMonth) {
            investedThisMonth += p.amount || 0
          }
        }
      }
    }
    const totalAllocated = breakdown?.total ?? 0
    const totalUsedFromBudget = totalExpenses + investedThisMonth
    const remainingBudget = totalAllocated - totalUsedFromBudget
    const budgetUsedPct =
      totalAllocated > 0
        ? Math.min(100, (totalUsedFromBudget / totalAllocated) * 100)
        : 0
    const daysInMonth = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()
    const currentDay = n.getDate()
    const daysRemaining = daysInMonth - currentDay
    const avgDailySpending = currentDay > 0 ? totalExpenses / currentDay : 0
    const cashBalance = accounts.reduce((s, a) => s + a.balance, 0)
    let investmentValue = 0
    for (const acc of investmentAccounts) {
      for (const h of acc.holdings) {
        if (h.totalShares > 0) {
          const sym = h.name.trim().toUpperCase()
          const px = marketPrices[sym] || 0
          if (px > 0) {
            investmentValue += h.totalShares * px
          } else {
            investmentValue += h.totalAmount
          }
        } else {
          investmentValue += h.totalAmount
        }
      }
    }
    if (investmentValue === 0 && investmentAccounts.length > 0) {
      investmentValue = investmentAccounts.reduce(
        (s, a) => s + (a.investedAmount || 0),
        0
      )
    }
    const netWorth = cashBalance + investmentValue
    return {
      investedThisMonth,
      totalUsedFromBudget,
      remainingBudget,
      budgetUsedPct,
      daysRemaining,
      avgDailySpending,
      cashBalance,
      /** Holdings value (quotes when available, else cost basis) */
      investmentValue,
      netWorth,
    }
  }, [
    breakdown?.total,
    totalExpenses,
    investmentAccounts,
    accounts,
    marketPrices,
  ])

  const investmentAllocated =
    categoryTracking.investment?.allocated ?? breakdown?.investment ?? 0

  const expenseChangePct =
    lastMonthExpenses > 0
      ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      : null

  const netSavings = useMemo(() => {
    if (!breakdown) return 0
    return breakdown.income - totalExpenses
  }, [breakdown, totalExpenses])

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const guilt = categoryTracking.guiltFreeSpending
  const guiltAllocated = breakdown?.guiltFreeSpending ?? guilt?.allocated ?? 0
  const dailyLimit = daysInMonth > 0 ? guiltAllocated / daysInMonth : 0

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const spentGuiltToday = expenses
    .filter(
      (e) =>
        e.category === "guiltFreeSpending" &&
        new Date(e.date).getTime() >= startOfToday
    )
    .reduce((s, e) => s + e.amount, 0)

  const remainingToday = Math.max(0, dailyLimit - spentGuiltToday)
  const dailyPct =
    dailyLimit > 0 ? Math.min(100, (spentGuiltToday / dailyLimit) * 100) : 0

  const expensesThisMonth = useMemo(
    () => filterExpensesCurrentMonth(expenses),
    [expenses]
  )

  const fixedRows = useMemo(
    () => groupExpensesByDescription(expensesThisMonth, "fixedCosts", 5),
    [expensesThisMonth]
  )
  const savingsRows = useMemo(
    () => groupExpensesByDescription(expensesThisMonth, "savings", 5),
    [expensesThisMonth]
  )
  const guiltRows = useMemo(
    () => groupExpensesByDescription(expensesThisMonth, "guiltFreeSpending", 5),
    [expensesThisMonth]
  )

  const investmentRows = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ).getTime()
    const map = new Map<string, number>()
    for (const acc of investmentAccounts) {
      for (const h of acc.holdings) {
        for (const p of h.purchases) {
          const t = new Date(p.date).getTime()
          if (Number.isNaN(t) || t < start || t > end) continue
          const label = h.name.trim().slice(0, 48) || "Holding"
          map.set(label, (map.get(label) || 0) + p.amount)
        }
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, amount]) => ({ label, amount }))
  }, [investmentAccounts])

  const savingsDisplayRows =
    savingsRows.length > 0
      ? savingsRows
      : breakdown && breakdown.savings > 0
        ? [{ label: "Monthly allocation", amount: breakdown.savings }]
        : []

  const projectionValue = useMemo(() => {
    if (!breakdown || breakdown.income <= 0) return null
    const month = new Date().getMonth()
    const monthsRemaining = Math.max(1, 12 - month)
    const monthlyWealth = breakdown.savings + breakdown.investment
    const projected = monthlyWealth * monthsRemaining
    if (projected <= 0) return null
    return projected
  }, [breakdown])

  const pillarTotal = breakdown
    ? breakdown.fixedCosts +
      breakdown.savings +
      breakdown.investment +
      breakdown.guiltFreeSpending
    : 0

  const spendingAlerts = useMemo(() => {
    const alerts: Array<{
      category: string
      message: string
      severity: "warning" | "danger"
    }> = []
    Object.entries(categoryTracking).forEach(([cat, tracking]) => {
      const categoryName =
        cat === "fixedCosts"
          ? "Fixed Costs"
          : cat === "investment"
            ? "Investment"
            : cat === "guiltFreeSpending"
              ? "Guilt-Free Spending"
              : "Savings"
      const overspent = tracking.overspent ?? 0
      if (overspent > 0) {
        alerts.push({
          category: categoryName,
          message: `Overspent by ${formatCurrency(overspent)}`,
          severity: "danger",
        })
      } else if (
        tracking.allocated > 0 &&
        tracking.remaining < tracking.allocated * 0.2 &&
        tracking.remaining > 0
      ) {
        alerts.push({
          category: categoryName,
          message: `Only ${formatCurrency(tracking.remaining)} remaining (${((tracking.remaining / tracking.allocated) * 100).toFixed(0)}%)`,
          severity: "warning",
        })
      }
    })
    return alerts
  }, [categoryTracking])

  const changeLabel =
    incomeChangePct === null
      ? "— vs last month"
      : `${incomeChangePct >= 0 ? "+" : ""}${incomeChangePct.toFixed(1)}% vs last month`

  const breakdownData: Breakdown = breakdown ?? {
    income: 0,
    fixedCosts: 0,
    savings: 0,
    investment: 0,
    guiltFreeSpending: 0,
    total: 0,
  }
  const hasBreakdown = breakdown !== null
  const showBreakdownSkeleton = loading && !hasBreakdown
  const showNetWorthSkeleton =
    loading && accounts.length === 0 && investmentAccounts.length === 0
  const showExpenseSkeleton =
    loading && expenses.length === 0 && expensesTotalForMonth === null
  const showHeadroomSkeleton = showBreakdownSkeleton || showExpenseSkeleton
  const showInvestmentMonthSkeleton = loading && investmentAccounts.length === 0
  const showSafeToSpendSkeleton = showBreakdownSkeleton || showExpenseSkeleton

  return (
    <div
      className="min-h-[100dvh] pb-10"
      style={{
        background: TOKENS.surface,
        color: TOKENS.onSurface,
      }}
    >
      <Header
        title="Wealth Console"
        description="Monthly flow, allocation, and balances in one view."
        variant="console"
      />
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        {!hasBreakdown && !loading && (
          <div
            className="mb-8 rounded-xl p-10 text-center"
            style={{ background: TOKENS.surfaceContainer }}
          >
            <p className="text-lg font-medium">No allocation data</p>
            <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Add income for the current month to see your Conscious Spending Plan.
            </p>
            <Link
              href={BENTO.income}
              className="mt-8 inline-flex rounded-md px-5 py-2.5 text-sm font-semibold"
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
              }}
            >
              Go to Income
            </Link>
          </div>
        )}
          <>
            <div id="console-overview" className="scroll-mt-28 space-y-10">
              <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
                  <div className="lg:col-span-4">
                    {showBreakdownSkeleton ? (
                      <div aria-hidden>
                        <p
                          className="text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Monthly income
                        </p>
                        <div className="mt-1 text-3xl sm:text-4xl">
                          <ScrambleCurrencyValue variant="income" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          className="text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Monthly income
                        </p>
                        <div className="mt-1 text-3xl sm:text-4xl">
                          <MajorFigureCurrency
                            amount={breakdownData.income}
                            variant="income"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="lg:col-span-4">
                    {showBreakdownSkeleton ? (
                      <div aria-hidden>
                        <p
                          className="text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Net savings
                        </p>
                        <div className="mt-1 text-3xl sm:text-4xl">
                          <ScrambleCurrencyValue variant="prosperity" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          className="text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Net savings
                        </p>
                        <div className="mt-1 text-3xl sm:text-4xl">
                          <MajorFigureCurrency
                            amount={netSavings}
                            variant={netSavings >= 0 ? "prosperity" : "loss"}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="lg:col-span-4">
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: TOKENS.surfaceContainer,
                        boxShadow:
                          "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                      }}
                    >
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        Plan trajectory
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        {loading && trajectorySeries.length === 0 ? (
                          <>
                            <div
                              className="h-11 w-[140px] rounded-md"
                              style={{ background: TOKENS.surfaceLow }}
                            />
                            <div
                              className="h-8 w-28 rounded-md"
                              style={{ background: TOKENS.surfaceLow }}
                            />
                          </>
                        ) : (
                          <>
                            <TrajectorySparkline series={trajectorySeries} />
                            <p
                              className="text-right text-sm font-semibold tabular-nums leading-tight"
                              style={{
                                color:
                                  incomeChangePct !== null && incomeChangePct >= 0
                                    ? TOKENS.primary
                                    : incomeChangePct !== null
                                      ? "#ffb4ab"
                                      : TOKENS.onSurface,
                              }}
                            >
                              {changeLabel}
                            </p>
                          </>
                        )}
                      </div>
                      <p
                        className="mt-2 text-[10px] leading-snug"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        Combined category remaining, last 6 months
                      </p>
                    </div>
                  </div>
                </div>

              <div
                id="console-pulse"
                className="scroll-mt-28 space-y-10 lg:space-y-14"
              >
                <div className="lg:ml-[min(5vw,3rem)] lg:max-w-2xl">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Operational intelligence
                  </p>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                    Position & runway
                  </h2>
                  <p
                    className="mt-3 text-sm leading-relaxed sm:text-[0.9375rem]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Budget load includes this month&apos;s investment purchases.
                    Net worth uses live quotes when symbols resolve.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
                  <div className="flex flex-col gap-4 lg:col-span-5">
                    <div
                      className="flex min-h-[280px] flex-col justify-between rounded-xl p-6 sm:p-8"
                      style={{
                        background: TOKENS.surfaceContainer,
                        boxShadow:
                          "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                      }}
                    >
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Aggregate
                        </p>
                        <p
                          className="mt-4 text-xs font-medium uppercase tracking-widest"
                          style={{ color: TOKENS.secondary }}
                        >
                          Net worth
                        </p>
                        <div className="mt-2 text-3xl leading-[1.05] tracking-tight sm:text-4xl lg:text-[2.65rem]">
                          {showNetWorthSkeleton ? (
                            <ScrambleCurrencyValue min={2500} max={28000} />
                          ) : (
                            <MajorFigureCurrency
                              amount={pulseMetrics.netWorth}
                              variant="neutral"
                            />
                          )}
                        </div>
                      </div>
                      <div
                        className="mt-8 rounded-lg p-4 sm:p-5"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <div>
                          <p
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            Liquid · all accounts
                          </p>
                          <div className="mt-2 text-xl sm:text-2xl">
                            {showNetWorthSkeleton ? (
                              <ScrambleCurrencyValue min={1200} max={14000} className="font-bold!" />
                            ) : (
                              <MajorFigureCurrency
                                amount={pulseMetrics.cashBalance}
                                variant="neutral"
                                className="font-bold!"
                              />
                            )}
                          </div>
                        </div>
                        <div
                          className="mt-4 border-t pt-4"
                          style={{ borderColor: TOKENS.outlineGhost }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            Invested · holdings
                          </p>
                          <div className="mt-2 text-xl sm:text-2xl">
                            {showNetWorthSkeleton ? (
                              <ScrambleCurrencyValue
                                min={600}
                                max={16000}
                                className="font-bold!"
                                colorMain={TOKENS.tertiary}
                                colorDecimal={TOKENS.onSurfaceMuted}
                              />
                            ) : (
                              <MajorFigureCurrency
                                amount={pulseMetrics.investmentValue}
                                variant="neutral"
                                colorMain={TOKENS.tertiary}
                                colorDecimal={TOKENS.onSurfaceMuted}
                                className="font-bold!"
                              />
                            )}
                          </div>
                          <p
                            className="mt-2 text-[10px] leading-snug"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            Uses live quotes when ticker symbols resolve; otherwise
                            cost basis.
                          </p>
                        </div>
                      </div>
                      {loanSummary && loanSummary.activeCount > 0 && (
                        <div
                          className="mt-4 flex items-end justify-between gap-3 rounded-lg px-4 py-3"
                          style={{ background: TOKENS.surfaceHigh }}
                        >
                          <div>
                            <p
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              Active loans · {loanSummary.activeCount} open
                            </p>
                            <div className="mt-1 text-lg">
                              <MajorFigureCurrency
                                amount={loanSummary.outstandingPrincipal}
                                variant="neutral"
                                colorMain={TOKENS.tertiary}
                                colorDecimal={TOKENS.onSurfaceMuted}
                                className="font-bold!"
                              />
                            </div>
                          </div>
                          <Link
                            href={BENTO.loans}
                            className="shrink-0 text-[10px] font-bold uppercase tracking-wide"
                            style={{ color: TOKENS.primary }}
                          >
                            Manage →
                          </Link>
                        </div>
                      )}
                      {loading && !loanSummary && (
                        <div
                          className="mt-4 h-[72px] rounded-lg"
                          style={{ background: TOKENS.surfaceHigh }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 lg:col-span-7">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                      <div
                        className="sm:col-span-7 rounded-xl p-5 sm:p-6"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow:
                            "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Outflow
                        </p>
                        <div className="mt-3 text-2xl leading-none sm:text-3xl lg:text-[2.125rem]">
                          {showExpenseSkeleton ? (
                            <ScrambleCurrencyValue min={400} max={5400} variant="loss" />
                          ) : (
                            <MajorFigureCurrency
                              amount={totalExpenses}
                              variant="loss"
                            />
                          )}
                        </div>
                        <p
                          className="mt-2 text-[11px] leading-snug"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Total expenses · this month
                        </p>
                      </div>
                      <div
                        className="flex flex-col justify-end rounded-xl p-5 sm:col-span-5 sm:p-6"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Headroom
                        </p>
                        <div className="mt-2 text-xl leading-tight sm:text-2xl">
                          {showHeadroomSkeleton ? (
                            <ScrambleCurrencyValue min={150} max={2800} variant="prosperity" />
                          ) : (
                            <MajorFigureCurrency
                              amount={pulseMetrics.remainingBudget}
                              variant={
                                pulseMetrics.remainingBudget >= 0
                                  ? "prosperity"
                                  : "loss"
                              }
                            />
                          )}
                        </div>
                        <p
                          className="mt-2 text-[10px] leading-snug"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Allocated − expenses − invested
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex flex-col gap-5 rounded-xl p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"
                      style={{
                        background: TOKENS.surfaceContainer,
                        boxShadow:
                          "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Budget load
                        </p>
                        {showHeadroomSkeleton ? (
                          <>
                            <SkeletonBlock className="mt-4 h-2.5 w-full rounded-full" />
                            <p
                              className="mt-2 text-[10px]"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              Expenses + invested vs monthly allocation
                            </p>
                          </>
                        ) : (
                          <>
                            <div
                              className="mt-4 h-2 overflow-hidden rounded-full sm:h-2.5"
                              style={{ background: TOKENS.surfaceLow }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, pulseMetrics.budgetUsedPct)}%`,
                                  background:
                                    pulseMetrics.budgetUsedPct >= 100
                                      ? "#ffb4ab"
                                      : pulseMetrics.budgetUsedPct >= 80
                                        ? "#e8c547"
                                        : TOKENS.primary,
                                }}
                              />
                            </div>
                            <p
                              className="mt-2 text-[10px]"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              Expenses + invested vs monthly allocation
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 items-baseline sm:pl-6">
                        {showHeadroomSkeleton ? (
                          <ScramblePercentValue
                            className="text-4xl font-black tabular-nums leading-none sm:text-5xl lg:text-[3.25rem]"
                            color={TOKENS.primary}
                          />
                        ) : (
                          <>
                            <span
                              className="text-4xl font-black tabular-nums leading-none sm:text-5xl lg:text-[3.25rem]"
                              style={{
                                color:
                                  pulseMetrics.budgetUsedPct >= 100
                                    ? "#ffb4ab"
                                    : pulseMetrics.budgetUsedPct >= 80
                                      ? "#e8c547"
                                      : TOKENS.primary,
                              }}
                            >
                              {pulseMetrics.budgetUsedPct.toFixed(0)}
                            </span>
                            <span
                              className="ml-0.5 text-xl font-bold"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              %
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3 sm:gap-4">
                      <div
                        className="col-span-12 rounded-xl p-4 sm:col-span-4 sm:p-5"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Invested · month to date
                        </p>
                        <div className="mt-2 text-base sm:text-lg">
                          {showInvestmentMonthSkeleton ? (
                            <ScrambleCurrencyValue min={80} max={1800} className="font-bold!" />
                          ) : (
                            <MajorFigureCurrency
                              amount={pulseMetrics.investedThisMonth}
                              variant="neutral"
                              className="font-bold!"
                            />
                          )}
                        </div>
                        {!showInvestmentMonthSkeleton && investmentAllocated > 0 && (
                          <div
                            className="mt-3 h-1 overflow-hidden rounded-full"
                            style={{ background: TOKENS.surfaceHigh }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (pulseMetrics.investedThisMonth /
                                    investmentAllocated) *
                                    100
                                )}%`,
                                background: TOKENS.primary,
                              }}
                            />
                          </div>
                        )}
                        {showInvestmentMonthSkeleton ? (
                          <SkeletonBlock className="mt-3 h-1 w-full rounded-full" />
                        ) : null}
                        {showInvestmentMonthSkeleton ? (
                          <div className="mt-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                            allocation syncing
                          </div>
                        ) : null}
                        {!showInvestmentMonthSkeleton && investmentAllocated > 0 && (
                          <p
                            className="mt-2 text-[10px]"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            of {formatCurrency(investmentAllocated)} allocated
                          </p>
                        )}
                      </div>
                      <div
                        className="col-span-12 -translate-y-0 rounded-xl p-5 sm:col-span-4 sm:-translate-y-2 sm:p-6 lg:p-7"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow:
                            "inset 0 1px 0 0 rgba(218,226,253,0.08), 0 18px 40px rgba(0,0,0,0.22)",
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.primary }}
                        >
                          Burn rate
                        </p>
                        <div className="mt-3 text-2xl sm:text-3xl">
                          {showExpenseSkeleton ? (
                            <ScrambleCurrencyValue min={20} max={260} />
                          ) : (
                            <MajorFigureCurrency
                              amount={pulseMetrics.avgDailySpending}
                              variant="neutral"
                            />
                          )}
                        </div>
                        <p
                          className="mt-2 text-[10px] leading-snug"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Daily average · month to date
                        </p>
                      </div>
                      <div
                        className="col-span-12 flex flex-col justify-end rounded-xl p-4 text-right sm:col-span-4 sm:p-5"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Runway
                        </p>
                        {showExpenseSkeleton ? (
                          <>
                            <ScrambleIntegerValue
                              className="mt-1 text-4xl font-black tabular-nums leading-none sm:text-5xl"
                              color={TOKENS.secondary}
                            />
                            <p
                              className="mt-1 text-[10px]"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              days after today
                            </p>
                          </>
                        ) : (
                          <>
                            <p
                              className="mt-1 text-4xl font-black tabular-nums leading-none sm:text-5xl"
                              style={{ color: TOKENS.secondary }}
                            >
                              {pulseMetrics.daysRemaining}
                            </p>
                            <p
                              className="mt-1 text-[10px]"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              days after today
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
                  <div
                    className="flex flex-col justify-between rounded-xl p-6 sm:p-8 lg:col-span-8"
                    style={{
                      background: TOKENS.surfaceContainer,
                      boxShadow:
                        "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Compared to last month
                        </p>
                        <p
                          className="mt-2 text-xs font-medium uppercase tracking-widest"
                          style={{ color: TOKENS.onSurface }}
                        >
                          Income
                        </p>
                      </div>
                      {lastMonthIncome > 0 && incomeChangePct !== null && (
                        <div className="text-right">
                          <p
                            className="text-[10px] uppercase tracking-wider"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            Delta
                          </p>
                          <p
                            className="text-3xl font-black tabular-nums leading-none sm:text-4xl"
                            style={{
                              color:
                                incomeChangePct >= 0
                                  ? TOKENS.primary
                                  : "#ffb4ab",
                            }}
                          >
                            {incomeChangePct >= 0 ? "+" : ""}
                            {incomeChangePct.toFixed(1)}
                            <span
                              className="text-lg font-bold"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              %
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 text-3xl leading-none sm:text-4xl lg:text-[2.75rem]">
                      {showBreakdownSkeleton ? (
                        <ScrambleCurrencyValue min={1800} max={12000} variant="income" />
                      ) : (
                        <MajorFigureCurrency
                          amount={breakdownData.income}
                          variant="income"
                        />
                      )}
                    </div>
                    {showBreakdownSkeleton ? (
                      <div className="mt-4 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                        Last month syncing
                      </div>
                    ) : (
                      <p
                        className="mt-3 text-sm"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        Last month{" "}
                        <span
                          className="font-semibold tabular-nums"
                          style={{ color: TOKENS.onSurface }}
                        >
                          {formatCurrency(lastMonthIncome)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div
                    className="flex flex-col justify-between rounded-xl p-6 sm:p-6 lg:col-span-4"
                    style={{ background: TOKENS.surfaceLow }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Expense velocity
                    </p>
                    <div className="mt-4 text-2xl leading-tight sm:text-3xl">
                      <MajorFigureCurrency
                        amount={totalExpenses}
                        variant="loss"
                      />
                    </div>
                    {lastMonthExpenses > 0 && expenseChangePct !== null && (
                      <p
                        className="mt-2 text-lg font-bold tabular-nums"
                        style={{
                          color:
                            expenseChangePct <= 0
                              ? TOKENS.primary
                              : "#ffb4ab",
                        }}
                      >
                        {expenseChangePct >= 0 ? "+" : ""}
                        {expenseChangePct.toFixed(1)}% vs last month
                      </p>
                    )}
                    <p
                      className="mt-4 text-xs leading-relaxed"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Last month{" "}
                      <span className="font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                        {formatCurrency(lastMonthExpenses)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
                  {spendingAlerts.length > 0 && (
                    <aside
                      className="lg:col-span-4 lg:order-none"
                      style={{
                        borderLeft: `3px solid ${TOKENS.primary}`,
                        background: TOKENS.surfaceLow,
                        borderRadius: "0.75rem",
                        padding: "1.25rem 1.25rem 1.25rem 1.35rem",
                      }}
                    >
                      <p
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        <AlertTriangle
                          className="h-4 w-4 shrink-0"
                          style={{ color: "#e8c547" }}
                        />
                        Signals
                      </p>
                      <ul className="mt-4 space-y-3">
                        {spendingAlerts.map((a, i) => (
                          <li
                            key={i}
                            className="text-sm leading-snug"
                            style={{
                              color:
                                a.severity === "danger"
                                  ? "#ffb4ab"
                                  : TOKENS.onSurface,
                            }}
                          >
                            <span className="text-xs font-bold uppercase tracking-wide opacity-80">
                              {a.category}
                            </span>
                            <br />
                            <span className="mt-0.5 inline-block">
                              {a.message}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </aside>
                  )}
                  <div
                    className={
                      spendingAlerts.length > 0 ? "lg:col-span-8" : "lg:col-span-12"
                    }
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Workspace
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
                      <Link
                        href={BENTO.income}
                        className="group relative col-span-2 flex flex-col justify-between overflow-hidden rounded-xl p-5 transition-all duration-200 ease-out hover:scale-[1.02] hover:brightness-105 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1326] sm:col-span-3 lg:col-span-2 lg:min-h-[140px]"
                        style={{
                          background: TOKENS.primary,
                          color: TOKENS.surface,
                        }}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">
                          Primary
                        </span>
                        <span className="mt-4 text-lg font-bold leading-tight">
                          Record income
                        </span>
                        <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                      <Link
                        href={BENTO.expenses}
                        className="group relative col-span-1 flex flex-col justify-center overflow-hidden rounded-xl p-4 text-center transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-white/[0.08] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1326] lg:col-span-1"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow:
                            "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                        }}
                      >
                        <ArrowUpRight
                          className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-70"
                          style={{ color: TOKENS.onSurfaceMuted }}
                          aria-hidden
                        />
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Spend
                        </span>
                        <span
                          className="mt-2 text-xs font-semibold"
                          style={{ color: TOKENS.onSurface }}
                        >
                          Expenses
                        </span>
                      </Link>
                      <Link
                        href={BENTO.categoryTracking}
                        className="group relative col-span-1 flex flex-col justify-center overflow-hidden rounded-xl p-4 text-center transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-white/[0.08] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1326] lg:col-span-1"
                        style={{
                          background: TOKENS.surfaceLow,
                        }}
                      >
                        <ArrowUpRight
                          className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-70"
                          style={{ color: TOKENS.onSurfaceMuted }}
                          aria-hidden
                        />
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Track
                        </span>
                        <span
                          className="mt-2 text-xs font-semibold"
                          style={{ color: TOKENS.onSurface }}
                        >
                          Categories
                        </span>
                      </Link>
                      <Link
                        href={BENTO.statement}
                        className="group relative col-span-2 flex flex-col justify-center overflow-hidden rounded-xl p-4 transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-white/[0.06] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89ceff]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1326] sm:col-span-1 lg:col-span-2"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow:
                            "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                        }}
                      >
                        <ArrowUpRight
                          className="pointer-events-none absolute right-3 top-3 h-4 w-4 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-80"
                          style={{ color: TOKENS.secondary }}
                          aria-hidden
                        />
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: TOKENS.secondary }}
                        >
                          Ledger
                        </span>
                        <span
                          className="mt-2 text-sm font-bold"
                          style={{ color: TOKENS.onSurface }}
                        >
                          Full statement
                        </span>
                      </Link>
                      <Link
                        href={BENTO.investments}
                        className="group relative col-span-1 flex flex-col justify-center overflow-hidden rounded-xl p-4 text-center transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-white/[0.08] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1326] lg:col-span-1"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <ArrowUpRight
                          className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-70"
                          style={{ color: TOKENS.onSurfaceMuted }}
                          aria-hidden
                        />
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Holdings
                        </span>
                        <span
                          className="mt-2 text-xs font-semibold"
                          style={{ color: TOKENS.onSurface }}
                        >
                          Invest
                        </span>
                      </Link>
                      <Link
                        href={BENTO.loans}
                        className="group relative col-span-1 flex flex-col justify-center overflow-hidden rounded-xl p-4 text-center transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-white/[0.08] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9c8de]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1326] lg:col-span-1"
                        style={{
                          background: TOKENS.surfaceHigh,
                        }}
                      >
                        <ArrowUpRight
                          className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-70"
                          style={{ color: TOKENS.tertiary }}
                          aria-hidden
                        />
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: TOKENS.tertiary }}
                        >
                          Credit
                        </span>
                        <span
                          className="mt-2 text-xs font-semibold"
                          style={{ color: TOKENS.onSurface }}
                        >
                          Loans
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 lg:items-stretch">
                <div className="flex flex-col lg:col-span-5">
                  <div
                    className="flex h-full min-h-[280px] flex-col rounded-xl p-5 sm:p-6 lg:-translate-y-1"
                    style={{
                      background: TOKENS.surfaceLow,
                      boxShadow: CARD_INSET,
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Safe to spend
                    </p>
                    <div className="mt-4 flex flex-1 flex-col items-center justify-center">
                      {showSafeToSpendSkeleton ? (
                        <div className="relative h-[168px] w-[168px] shrink-0">
                          <SkeletonBlock className="h-full w-full rounded-full" />
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                            <p
                              className="text-[9px] font-bold uppercase leading-tight tracking-wider"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              Daily limit
                            </p>
                            <div className="mt-3 text-xl leading-tight sm:text-2xl">
                              <ScrambleCurrencyValue min={8} max={95} variant="income" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-[168px] w-[168px] shrink-0">
                          <PieChart width={168} height={168}>
                            <Pie
                              data={[
                                { name: "used", value: dailyPct },
                                {
                                  name: "rest",
                                  value: Math.max(0.001, 100 - dailyPct),
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={56}
                              outerRadius={78}
                              startAngle={90}
                              endAngle={-270}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={TOKENS.primary} />
                              <Cell fill={TOKENS.surfaceHigh} />
                            </Pie>
                          </PieChart>
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                            <p
                              className="text-[9px] font-bold uppercase leading-tight tracking-wider"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              Daily limit
                            </p>
                            <div className="text-xl leading-tight sm:text-2xl">
                              <MajorFigureCurrency
                                amount={dailyLimit}
                                variant="income"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {showSafeToSpendSkeleton ? (
                      <div className="mt-4 flex justify-center">
                        <p
                          aria-hidden
                          className="text-center text-sm"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Remaining today:{" "}
                          <ScrambleCurrencyValue
                            min={4}
                            max={72}
                            variant="prosperity"
                            className="inline-block text-sm font-semibold!"
                          />
                        </p>
                      </div>
                    ) : (
                      <p
                        className="mt-4 text-center text-sm"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        Remaining today:{" "}
                        <MajorFigureCurrency
                          amount={remainingToday}
                          variant="prosperity"
                          className="text-sm font-semibold!"
                          decimalEm={0.5}
                        />
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col lg:col-span-7">
                  <div
                    className="h-full min-h-[280px] flex-1 rounded-xl p-6 sm:p-7 lg:translate-y-1"
                    style={{
                      background: TOKENS.surfaceContainer,
                      boxShadow: CARD_INSET,
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Pillar allocation
                        </p>
                        <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                          Conscious Spending Plan
                        </h2>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          background: TOKENS.surfaceLow,
                          color: TOKENS.primary,
                        }}
                      >
                        Active strategy
                      </span>
                    </div>
                    <div className="mt-6">
                      {showBreakdownSkeleton ? (
                        <PillarAllocationLoading />
                      ) : (
                        <>
                          <SegmentedPillarBar
                            fixedCosts={breakdownData.fixedCosts}
                            savings={breakdownData.savings}
                            investment={breakdownData.investment}
                            guiltFree={breakdownData.guiltFreeSpending}
                          />
                          <PillarLegend
                            total={pillarTotal}
                            items={[
                              {
                                label: "Fixed Costs",
                                shortLabel: "Fixed",
                                amount: breakdownData.fixedCosts,
                                color: TOKENS.secondary,
                              },
                              {
                                label: "Savings",
                                shortLabel: "Savings",
                                amount: breakdownData.savings,
                                color: TOKENS.primary,
                              },
                              {
                                label: "Investment",
                                shortLabel: "Invest",
                                amount: breakdownData.investment,
                                color: TOKENS.tertiary,
                              },
                              {
                                label: "Guilt-Free",
                                shortLabel: "Guilt-free",
                                amount: breakdownData.guiltFreeSpending,
                                color: TOKENS.primary,
                              },
                            ]}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              id="console-spending"
              className="scroll-mt-28 mt-12 space-y-4 lg:space-y-5"
            >
              <div className="lg:ml-[min(4vw,2rem)]">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Pillar detail
                </p>
                <p
                  className="mt-2 text-xs leading-relaxed sm:text-sm"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Line items for the current calendar month
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
                <div className="lg:col-span-7">
                  {showBreakdownSkeleton ? (
                    <DetailCardSkeleton
                      title="Fixed Costs"
                      icon={Building2}
                      accent={TOKENS.secondary}
                      size="hero"
                    />
                  ) : (
                    <DetailCard
                      title="Fixed Costs"
                      total={breakdownData.fixedCosts}
                      icon={Building2}
                      rows={fixedRows}
                      accent={TOKENS.secondary}
                      size="hero"
                    />
                  )}
                </div>
                <div className="lg:col-span-5">
                  {showBreakdownSkeleton ? (
                    <DetailCardSkeleton
                      title="Savings"
                      icon={PiggyBank}
                      accent={TOKENS.primary}
                      size="compact"
                    />
                  ) : (
                    <DetailCard
                      title="Savings"
                      total={breakdownData.savings}
                      icon={PiggyBank}
                      rows={savingsDisplayRows}
                      accent={TOKENS.primary}
                      size="compact"
                    />
                  )}
                </div>
                <div className="lg:col-span-5">
                  {showBreakdownSkeleton ? (
                    <DetailCardSkeleton
                      title="Investment"
                      icon={TrendingUp}
                      accent={TOKENS.tertiary}
                      size="compact"
                    />
                  ) : (
                    <DetailCard
                      title="Investment"
                      total={breakdownData.investment}
                      icon={TrendingUp}
                      rows={
                        investmentRows.length > 0
                          ? investmentRows
                          : breakdownData.investment > 0
                            ? [
                                {
                                  label: "Allocated this month",
                                  amount: breakdownData.investment,
                                },
                              ]
                            : []
                      }
                      accent={TOKENS.tertiary}
                      size="compact"
                    />
                  )}
                </div>
                <div className="lg:col-span-7">
                  {showBreakdownSkeleton ? (
                    <DetailCardSkeleton
                      title="Guilt-Free"
                      icon={Coffee}
                      accent={TOKENS.primary}
                      size="hero"
                    />
                  ) : (
                    <DetailCard
                      title="Guilt-Free"
                      total={breakdownData.guiltFreeSpending}
                      icon={Coffee}
                      rows={guiltRows}
                      accent={TOKENS.primary}
                      size="hero"
                    />
                  )}
                </div>
              </div>
            </div>

            <div
              id="console-accounts"
              className="scroll-mt-28 mt-12 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 lg:items-stretch"
            >
              <div
                className="overflow-hidden rounded-xl lg:col-span-8"
                style={{
                  background: TOKENS.surfaceLow,
                  border: `1px solid ${TOKENS.outlineGhost}`,
                }}
              >
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider">
                    Bank sync · Connected
                  </h3>
                </div>
                <div className="overflow-x-auto px-2 py-2">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr>
                        <th
                          className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Institution
                        </th>
                        <th
                          className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Account type
                        </th>
                        <th
                          className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && accounts.length === 0 ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={3} className="px-3 py-3">
                              <div
                                className="h-12 rounded-lg"
                                style={{ background: TOKENS.surfaceContainer }}
                              />
                            </td>
                          </tr>
                        ))
                      ) : accounts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-8 text-center"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            No accounts linked yet.
                          </td>
                        </tr>
                      ) : (
                        accounts.map((a) => (
                          <tr key={a.id}>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                                  style={{
                                    background: TOKENS.surfaceContainer,
                                    color: TOKENS.secondary,
                                  }}
                                >
                                  {a.bankName.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{a.bankName}</p>
                                  <p
                                    className="truncate text-xs"
                                    style={{ color: TOKENS.onSurfaceMuted }}
                                  >
                                    {a.name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td
                              className="px-3 py-3 capitalize"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              {accountTypeDisplay(a.accountType)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-semibold">
                              {formatCurrency(a.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                id="console-wealth"
                className="scroll-mt-28 flex flex-col gap-3 lg:col-span-4"
              >
                {ytdSummary && (
                  <div className="space-y-3">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.22em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Year to date · {ytdSummary.year}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div
                        className="rounded-xl p-4 sm:col-span-2 sm:p-5 lg:col-span-1"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow: CARD_INSET,
                        }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Income
                        </p>
                        <div className="mt-2 text-xl tracking-tight sm:text-2xl">
                          <MajorFigureCurrency
                            amount={ytdSummary.totalIncome}
                            variant="income"
                          />
                        </div>
                      </div>
                      <div
                        className="rounded-xl p-4 sm:p-5"
                        style={{
                          background: TOKENS.surfaceLow,
                          boxShadow: CARD_INSET,
                        }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Expenses
                        </p>
                        <div className="mt-2 text-lg">
                          <MajorFigureCurrency
                            amount={ytdSummary.totalExpenses}
                            variant="loss"
                            className="font-bold!"
                          />
                        </div>
                      </div>
                      <div
                        className="rounded-xl p-4 sm:p-5"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow: CARD_INSET,
                        }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Invested
                        </p>
                        <div className="mt-2 text-lg">
                          <MajorFigureCurrency
                            amount={ytdSummary.totalInvested}
                            variant="prosperity"
                            className="font-bold!"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {loading && !ytdSummary && (
                  <div className="space-y-3">
                    <div
                      className="h-4 w-32 rounded"
                      style={{ background: TOKENS.surfaceLow }}
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div
                        className="h-24 rounded-xl"
                        style={{ background: TOKENS.surfaceContainer }}
                      />
                      <div
                        className="h-24 rounded-xl"
                        style={{ background: TOKENS.surfaceLow }}
                      />
                      <div
                        className="h-24 rounded-xl"
                        style={{ background: TOKENS.surfaceContainer }}
                      />
                    </div>
                  </div>
                )}

                {projectionValue != null && (
                  <div
                    className="relative overflow-hidden rounded-xl p-6 sm:p-8"
                    style={{
                      background: TOKENS.primary,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
                    }}
                  >
                    <Gem
                      className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 sm:h-44 sm:w-44 lg:h-52 lg:w-52"
                      strokeWidth={1}
                      style={{
                        color: "rgba(11, 19, 38, 0.07)",
                      }}
                      aria-hidden
                    />
                    <div className="relative z-[1] max-w-xl">
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.28em]"
                        style={{ color: "rgba(11, 19, 38, 0.55)" }}
                      >
                        Wealth status
                      </p>
                      <p
                        className="mt-5 text-xl font-black leading-[1.25] tracking-tight sm:text-2xl lg:text-[1.65rem] lg:leading-snug"
                        style={{ color: TOKENS.surface }}
                      >
                        You are on track to save{" "}
                        <MajorFigureCurrency
                          amount={projectionValue}
                          variant="neutral"
                          colorMain={TOKENS.surface}
                          colorDecimal="rgba(11, 19, 38, 0.62)"
                        />{" "}
                        by Q4.
                      </p>
                      <p
                        className="mt-4 max-w-md text-sm font-normal leading-relaxed sm:text-[0.9375rem]"
                        style={{ color: "rgba(11, 19, 38, 0.68)" }}
                      >
                        Based on current trajectory and conscious spending
                        efficiency.
                      </p>
                    </div>
                    <Link
                      href={BENTO.statement}
                      className="relative z-[1] mt-8 block w-full rounded-xl py-3.5 text-center text-[10px] font-bold uppercase tracking-[0.22em] transition-opacity hover:opacity-95 sm:py-4 sm:text-[11px]"
                      style={{
                        background: TOKENS.surface,
                        color: "#f0fdf4",
                      }}
                    >
                      Optimization report
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
      </div>

    </div>
  )
}
