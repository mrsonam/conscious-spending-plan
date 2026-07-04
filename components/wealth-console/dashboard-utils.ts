import { expenseLabel } from "@/components/expenses/expense-shared"
import type {
  Account,
  Breakdown,
  CategoryTracking,
  DashboardSavingGoal,
  DetailRow,
  Expense,
  InvestmentAccount,
  PulseMetrics,
  SpendingAlert,
  SubscriptionDashboardSnapshot,
} from "@/components/wealth-console/types"

export type DashboardInsight = {
  text: string
  tone: "positive" | "caution" | "neutral"
}

const PILLAR_LABELS: Record<string, string> = {
  fixedCosts: "Fixed costs",
  investment: "Investment",
  guiltFreeSpending: "Guilt-free spending",
  savings: "Savings",
}

function formatCompleteByMonth(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

function daysUntilIso(iso: string) {
  const target = new Date(iso)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  )
  return Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000,
  )
}

/**
 * Rules-based one-liners for the metrics band. Deliberately not an LLM call:
 * must render instantly on every dashboard load. Returns every insight that
 * qualifies so the tile can rotate through them.
 */
export function buildDashboardInsights({
  expenses,
  totalExpenses,
  lastMonthExpenses,
  expenseChangePct,
  incomeChangePct,
  lastMonthIncome,
  monthIncome,
  savingsRatePct,
  pulseMetrics,
  categoryTracking,
  subscriptionDash,
  savingGoals,
  formatCurrency,
}: {
  expenses: Expense[]
  totalExpenses: number
  lastMonthExpenses: number
  expenseChangePct: number | null
  incomeChangePct: number | null
  lastMonthIncome: number
  monthIncome: number
  savingsRatePct: number | null
  pulseMetrics: PulseMetrics
  categoryTracking: Record<string, CategoryTracking>
  subscriptionDash: SubscriptionDashboardSnapshot | null
  savingGoals: DashboardSavingGoal[] | null
  formatCurrency: (amount: number) => string
}): DashboardInsight[] {
  const insights: DashboardInsight[] = []

  if (totalExpenses > 0 && pulseMetrics.daysRemaining < 10) {
    insights.push({
      text: `At the current burn rate your liquid funds cover about ${pulseMetrics.daysRemaining} more days. Worth a look before new spending.`,
      tone: "caution",
    })
  }

  if (expenseChangePct !== null && lastMonthExpenses > 0) {
    const diff = Math.abs(totalExpenses - lastMonthExpenses)
    if (expenseChangePct <= -20) {
      insights.push({
        text: `Outflow so far is ${Math.abs(expenseChangePct).toFixed(0)}% below last month's total, with ${formatCurrency(diff)} less out the door.`,
        tone: "positive",
      })
    } else if (expenseChangePct >= 20) {
      insights.push({
        text: `Outflow is already ${expenseChangePct.toFixed(0)}% above last month's total, ${formatCurrency(diff)} more than all of last month.`,
        tone: "caution",
      })
    }
  }

  if (incomeChangePct !== null && lastMonthIncome > 0 && monthIncome > 0) {
    const diff = Math.abs(monthIncome - lastMonthIncome)
    if (incomeChangePct >= 20) {
      insights.push({
        text: `Income so far is ${incomeChangePct.toFixed(0)}% above last month's total, ${formatCurrency(diff)} more in the door.`,
        tone: "positive",
      })
    } else if (incomeChangePct <= -20) {
      insights.push({
        text: `Income so far is ${Math.abs(incomeChangePct).toFixed(0)}% below last month's total, ${formatCurrency(diff)} less than all of last month.`,
        tone: "caution",
      })
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
      insights.push({
        text: `${label} is your biggest expense this month at ${formatCurrency(topAmount)}, ${sharePct.toFixed(0)}% of everything spent.`,
        tone: "neutral",
      })
    }
  }

  let worstOverspend: { label: string; amount: number } | null = null
  let bestHeadroom: { label: string; amount: number; pct: number } | null = null
  for (const [cat, tracking] of Object.entries(categoryTracking)) {
    const label = PILLAR_LABELS[cat] ?? cat
    const overspent = tracking.overspent ?? 0
    if (overspent > 0 && (!worstOverspend || overspent > worstOverspend.amount)) {
      worstOverspend = { label, amount: overspent }
    }
    if (
      tracking.allocated > 0 &&
      tracking.remaining > 0 &&
      overspent <= 0
    ) {
      const pct = (tracking.remaining / tracking.allocated) * 100
      if (pct >= 40 && (!bestHeadroom || tracking.remaining > bestHeadroom.amount)) {
        bestHeadroom = { label, amount: tracking.remaining, pct }
      }
    }
  }
  if (worstOverspend) {
    insights.push({
      text: `${worstOverspend.label} is over by ${formatCurrency(worstOverspend.amount)} this month.`,
      tone: "caution",
    })
  } else if (bestHeadroom) {
    insights.push({
      text: `${bestHeadroom.label} still has ${formatCurrency(bestHeadroom.amount)} left (${bestHeadroom.pct.toFixed(0)}% of its allocation).`,
      tone: "positive",
    })
  }

  if (pulseMetrics.budgetUsedPct > 0) {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currentDay = now.getDate()
    const monthElapsedPct = (currentDay / daysInMonth) * 100
    const paceGap = pulseMetrics.budgetUsedPct - monthElapsedPct

    if (paceGap >= 15) {
      insights.push({
        text: `You've used ${pulseMetrics.budgetUsedPct.toFixed(0)}% of this month's allocation with only ${monthElapsedPct.toFixed(0)}% of the month gone.`,
        tone: "caution",
      })
    } else if (paceGap <= -15) {
      insights.push({
        text: `Only ${pulseMetrics.budgetUsedPct.toFixed(0)}% of this month's allocation is used, with ${monthElapsedPct.toFixed(0)}% of the month already gone.`,
        tone: "positive",
      })
    } else {
      insights.push({
        text: `${pulseMetrics.budgetUsedPct.toFixed(0)}% of this month's allocation is used so far.`,
        tone: "neutral",
      })
    }
  }

  if (savingsRatePct !== null && savingsRatePct >= 40) {
    insights.push({
      text: `You're keeping ${savingsRatePct.toFixed(0)}% of this month's income, well clear of the usual 20% guideline.`,
      tone: "positive",
    })
  }

  const upcoming = subscriptionDash?.upcoming ?? []
  if (upcoming.length > 0) {
    const next = [...upcoming].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )[0]
    const days = daysUntilIso(next.date)
    const name = next.label?.trim() || next.provider?.trim() || "A subscription"
    if (days <= 0) {
      insights.push({
        text: `${name} renews today for ${formatCurrency(next.amount)}.`,
        tone: "caution",
      })
    } else if (days === 1) {
      insights.push({
        text: `${name} renews tomorrow for ${formatCurrency(next.amount)}.`,
        tone: "caution",
      })
    } else if (days <= 7) {
      insights.push({
        text: `${name} renews in ${days} days for ${formatCurrency(next.amount)}.`,
        tone: "neutral",
      })
    }
  } else if (subscriptionDash && subscriptionDash.monthlyActiveTotal > 0) {
    insights.push({
      text: `Active subscriptions run about ${formatCurrency(subscriptionDash.monthlyActiveTotal)} per month.`,
      tone: "neutral",
    })
  }

  const activeGoals = (savingGoals ?? []).filter((g) => g.status === "active")
  const goalsWithTarget = activeGoals.filter(
    (g) => g.target != null && g.target > 0,
  )
  if (goalsWithTarget.length > 0) {
    const ranked = goalsWithTarget
      .map((g) => ({
        goal: g,
        pct: Math.min(100, Math.max(0, (g.current / (g.target as number)) * 100)),
      }))
      .sort((a, b) => b.pct - a.pct)
    const nearest = ranked[0]
    if (nearest.pct >= 100) {
      insights.push({
        text: `${nearest.goal.name} has reached its target of ${formatCurrency(nearest.goal.target as number)}.`,
        tone: "positive",
      })
    } else if (nearest.goal.completeBy) {
      insights.push({
        text: `${nearest.goal.name} is on track for ${formatCompleteByMonth(nearest.goal.completeBy)} at the recent funding pace.`,
        tone: nearest.pct >= 70 ? "positive" : "neutral",
      })
    } else {
      insights.push({
        text: `${nearest.goal.name} is at ${nearest.pct.toFixed(0)}% of its ${formatCurrency(nearest.goal.target as number)} target.`,
        tone: nearest.pct >= 70 ? "positive" : "neutral",
      })
    }
  } else {
    const projected = activeGoals.find((g) => g.completeBy)
    if (projected?.completeBy) {
      insights.push({
        text: `${projected.name} is on track for ${formatCompleteByMonth(projected.completeBy)} at the recent funding pace.`,
        tone: "neutral",
      })
    }
  }

  return insights
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
