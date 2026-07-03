import { expenseLabel } from "@/components/expenses/expense-shared"
import type {
  Account,
  Breakdown,
  CategoryTracking,
  DetailRow,
  Expense,
  InvestmentAccount,
  PulseMetrics,
  SpendingAlert,
} from "@/components/wealth-console/types"

export type DashboardInsight = {
  text: string
  tone: "positive" | "caution" | "neutral"
}

/**
 * One-line, rules-based observation for the metrics band. Deliberately not an
 * LLM call: it must render instantly on every dashboard load. Priority:
 * runway risk → spend trend → top category → savings rate → budget load.
 */
export function buildDashboardInsight({
  expenses,
  totalExpenses,
  lastMonthExpenses,
  expenseChangePct,
  savingsRatePct,
  pulseMetrics,
  formatCurrency,
}: {
  expenses: Expense[]
  totalExpenses: number
  lastMonthExpenses: number
  expenseChangePct: number | null
  savingsRatePct: number | null
  pulseMetrics: PulseMetrics
  formatCurrency: (amount: number) => string
}): DashboardInsight | null {
  if (totalExpenses > 0 && pulseMetrics.daysRemaining < 10) {
    return {
      text: `At the current burn rate your liquid funds cover about ${pulseMetrics.daysRemaining} more days. Worth a look before new spending.`,
      tone: "caution",
    }
  }

  if (expenseChangePct !== null && lastMonthExpenses > 0) {
    const diff = Math.abs(totalExpenses - lastMonthExpenses)
    if (expenseChangePct <= -20) {
      return {
        text: `Outflow so far is ${Math.abs(expenseChangePct).toFixed(0)}% below last month's total, with ${formatCurrency(diff)} less out the door.`,
        tone: "positive",
      }
    }
    if (expenseChangePct >= 20) {
      return {
        text: `Outflow is already ${expenseChangePct.toFixed(0)}% above last month's total, ${formatCurrency(diff)} more than all of last month.`,
        tone: "caution",
      }
    }
  }

  if (totalExpenses > 0 && expenses.length > 0) {
    const sums = new Map<string, number>()
    for (const e of expenses) {
      const key = e.expenseCategory || "uncategorised"
      sums.set(key, (sums.get(key) ?? 0) + e.amount)
    }
    const [topKey, topAmount] = [...sums.entries()].sort((a, b) => b[1] - a[1])[0]
    const sharePct = (topAmount / totalExpenses) * 100
    if (sharePct >= 25) {
      const label =
        topKey === "uncategorised" ? "Uncategorised spending" : expenseLabel(topKey) || topKey
      return {
        text: `${label} is your biggest expense this month at ${formatCurrency(topAmount)}, ${sharePct.toFixed(0)}% of everything spent.`,
        tone: "neutral",
      }
    }
  }

  if (savingsRatePct !== null && savingsRatePct >= 40) {
    return {
      text: `You're keeping ${savingsRatePct.toFixed(0)}% of this month's income, well clear of the usual 20% guideline.`,
      tone: "positive",
    }
  }

  if (pulseMetrics.budgetUsedPct > 0) {
    return {
      text: `${pulseMetrics.budgetUsedPct.toFixed(0)}% of this month's allocation is used so far.`,
      tone: "neutral",
    }
  }

  return null
}

export function accountTypeDisplay(accountType: string) {
  const t = accountType.toLowerCase()
  if (t === "checking") return "Primary Checking"
  if (t === "savings") return "Savings"
  if (t === "investment") return "Investment"
  if (t === "cash") return "Cash"
  return accountType.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Expenses whose `date` is in the current calendar month (local time). */
export function filterExpensesCurrentMonth(expenses: Expense[]): Expense[] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime()
  return expenses.filter((e) => {
    const t = new Date(e.date).getTime()
    return !Number.isNaN(t) && t >= start && t <= end
  })
}

export function groupExpensesByDescription(
  expenses: Expense[],
  category: string,
  limit: number,
): DetailRow[] {
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

export function buildInvestmentRows(accounts: InvestmentAccount[]): DetailRow[] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime()
  const map = new Map<string, number>()
  for (const acc of accounts) {
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
}

export function buildSpendingAlerts(
  categoryTracking: Record<string, CategoryTracking>,
  formatCurrency: (amount: number) => string,
): SpendingAlert[] {
  const alerts: SpendingAlert[] = []
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
}

export function buildPulseMetrics({
  breakdownTotal,
  totalExpenses,
  investmentAccounts,
  accounts,
  marketPrices,
  superBalance = 0,
}: {
  breakdownTotal: number
  totalExpenses: number
  investmentAccounts: InvestmentAccount[]
  accounts: Account[]
  marketPrices: Record<string, number>
  superBalance?: number
}): PulseMetrics {
  const n = new Date()
  const startOfMonth = new Date(n.getFullYear(), n.getMonth(), 1).getTime()
  const endOfMonth = new Date(
    n.getFullYear(),
    n.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
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
  const totalUsedFromBudget = totalExpenses + investedThisMonth
  const budgetUsedPct =
    breakdownTotal > 0
      ? Math.min(100, (totalUsedFromBudget / breakdownTotal) * 100)
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
      0,
    )
  }
  return {
    investedThisMonth,
    budgetUsedPct,
    daysRemaining,
    avgDailySpending,
    cashBalance,
    investmentValue,
    superBalance,
    netWorth: cashBalance + investmentValue + superBalance,
  }
}

export const EMPTY_BREAKDOWN: Breakdown = {
  income: 0,
  fixedCosts: 0,
  savings: 0,
  investment: 0,
  guiltFreeSpending: 0,
  total: 0,
}
