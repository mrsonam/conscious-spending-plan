"use client"

import { useMemo } from "react"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import {
  buildInvestmentRows,
  buildPulseMetrics,
  buildSpendingAlerts,
  EMPTY_BREAKDOWN,
  filterExpensesCurrentMonth,
  groupExpensesByDescription,
} from "@/components/wealth-console/dashboard-utils"
import type {
  Account,
  Breakdown,
  CategoryTracking,
  DetailRow,
  Expense,
  InvestmentAccount,
  LoanSummary,
  PulseMetrics,
  SpendingAlert,
  SubscriptionDashboardSnapshot,
  TrajectoryPoint,
  YtdSummary,
} from "@/components/wealth-console/types"

export type WealthConsoleDerived = {
  formatCurrency: (amount: number) => string
  totalExpenses: number
  pulseMetrics: PulseMetrics
  investmentAllocated: number
  expenseChangePct: number | null
  netSavings: number
  savingsRatePct: number | null
  fixedRows: DetailRow[]
  savingsRows: DetailRow[]
  guiltRows: DetailRow[]
  investmentRows: DetailRow[]
  savingsDisplayRows: DetailRow[]
  spendingAlerts: SpendingAlert[]
  changeLabel: string
  breakdownData: Breakdown
  hasBreakdown: boolean
  showBreakdownSkeleton: boolean
  showNetWorthSkeleton: boolean
  showExpenseSkeleton: boolean
  showHeadroomSkeleton: boolean
  showInvestmentMonthSkeleton: boolean
}

export function useWealthConsoleDerived({
  breakdown,
  accounts,
  expenses,
  expensesTotalForMonth,
  categoryTracking,
  investmentAccounts,
  incomeChangePct,
  lastMonthExpenses,
  marketPrices,
  loading,
  savingGoals = [],
}: {
  breakdown: Breakdown | null
  accounts: Account[]
  expenses: Expense[]
  expensesTotalForMonth: number | null
  categoryTracking: Record<string, CategoryTracking>
  investmentAccounts: InvestmentAccount[]
  incomeChangePct: number | null
  lastMonthExpenses: number
  marketPrices: Record<string, number>
  superBalance?: number
  loading: boolean
  savingGoals?: Array<{
    id: string
    name: string
    current: number
    target: number | null
    percent: number
    status: string
  }>
}): WealthConsoleDerived {
  const { formatCurrency } = useFormatCurrency()

  const totalExpenses =
    expensesTotalForMonth !== null
      ? expensesTotalForMonth
      : expenses.reduce((s, e) => s + e.amount, 0)

  const pulseMetrics = useMemo(
    () =>
      buildPulseMetrics({
        breakdownTotal: breakdown?.total ?? 0,
        totalExpenses,
        investmentAccounts,
        accounts,
        marketPrices,
        superBalance: superBalance ?? 0,
      }),
    [breakdown?.total, totalExpenses, investmentAccounts, accounts, marketPrices, superBalance],
  )

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

  const savingsRatePct = useMemo(() => {
    if (!breakdown || breakdown.income <= 0) return null
    return (netSavings / breakdown.income) * 100
  }, [breakdown, netSavings])

  const expensesThisMonth = useMemo(
    () => filterExpensesCurrentMonth(expenses),
    [expenses],
  )

  const fixedRows = useMemo(
    () => groupExpensesByDescription(expensesThisMonth, "fixedCosts", 5),
    [expensesThisMonth],
  )
  const savingsRows = useMemo(
    () => groupExpensesByDescription(expensesThisMonth, "savings", 5),
    [expensesThisMonth],
  )
  const guiltRows = useMemo(
    () => groupExpensesByDescription(expensesThisMonth, "guiltFreeSpending", 5),
    [expensesThisMonth],
  )

  const investmentRows = useMemo(
    () => buildInvestmentRows(investmentAccounts),
    [investmentAccounts],
  )

  const goalDisplayRows = useMemo(
    () =>
      savingGoals.slice(0, 2).map((g) => ({
        label: g.name,
        amount: g.current,
      })),
    [savingGoals],
  )

  const savingsDisplayRows =
    goalDisplayRows.length > 0
      ? goalDisplayRows
      : savingsRows.length > 0
        ? savingsRows
        : breakdown && breakdown.savings > 0
          ? [{ label: "Monthly allocation", amount: breakdown.savings }]
          : []

  const spendingAlerts = useMemo(
    () => buildSpendingAlerts(categoryTracking, formatCurrency),
    [categoryTracking, formatCurrency],
  )

  const changeLabel =
    incomeChangePct === null
      ? "— vs last month"
      : `${incomeChangePct >= 0 ? "+" : ""}${incomeChangePct.toFixed(1)}% vs last month`

  const breakdownData: Breakdown = breakdown ?? EMPTY_BREAKDOWN
  const hasBreakdown = breakdown !== null
  const showBreakdownSkeleton = loading && !hasBreakdown
  const showNetWorthSkeleton =
    loading && accounts.length === 0 && investmentAccounts.length === 0
  const showExpenseSkeleton =
    loading && expenses.length === 0 && expensesTotalForMonth === null
  const showHeadroomSkeleton = showBreakdownSkeleton || showExpenseSkeleton
  const showInvestmentMonthSkeleton = loading && investmentAccounts.length === 0

  return {
    formatCurrency,
    totalExpenses,
    pulseMetrics,
    investmentAllocated,
    expenseChangePct,
    netSavings,
    savingsRatePct,
    fixedRows,
    savingsRows,
    guiltRows,
    investmentRows,
    savingsDisplayRows,
    spendingAlerts,
    changeLabel,
    breakdownData,
    hasBreakdown,
    showBreakdownSkeleton,
    showNetWorthSkeleton,
    showExpenseSkeleton,
    showHeadroomSkeleton,
    showInvestmentMonthSkeleton,
  }
}

export type WealthConsoleDashboardVM = WealthConsoleViewProps & WealthConsoleDerived

export function useWealthConsoleDashboard(
  props: WealthConsoleViewProps,
): WealthConsoleDashboardVM {
  const derived = useWealthConsoleDerived({
    breakdown: props.breakdown,
    accounts: props.accounts,
    expenses: props.expenses,
    expensesTotalForMonth: props.expensesTotalForMonth,
    categoryTracking: props.categoryTracking,
    investmentAccounts: props.investmentAccounts,
    incomeChangePct: props.incomeChangePct,
    lastMonthExpenses: props.lastMonthExpenses,
    marketPrices: props.marketPrices,
    superBalance: props.superBalance,
    loading: props.loading,
    savingGoals: props.savingGoals,
  })
  return { ...props, ...derived }
}

export type WealthConsoleViewProps = {
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
  subscriptionDash: SubscriptionDashboardSnapshot
  savingGoals: Array<{
    id: string
    name: string
    current: number
    target: number | null
    percent: number
    status: string
  }>
  superBalance: number
  loading: boolean
}
