import type { DashboardConsolePayload } from "@/lib/dashboard-console-types"

export type PillarStatus = "over" | "tight" | "on_track" | "idle"

export type InsightsPillarRow = {
  key: string
  label: string
  allocated: number
  spent: number
  remaining: number
  overspent: number
  usedPct: number
  status: PillarStatus
}

export type InsightsGoalRow = {
  id: string
  name: string
  current: number
  target: number | null
  completionPct: number | null
  completeBy: string | null
  status: string
}

export type InsightsUpcomingRow = {
  subscriptionId: string
  label: string
  provider: string | null
  amount: number
  date: string
  kind: "renewal" | "trial" | "bill"
  daysUntil: number
}

export type InsightsOverview = {
  health: {
    income: number
    expenses: number
    savingsRatePct: number | null
    budgetUsedPct: number
    monthElapsedPct: number
    paceGapPct: number
    pace: "ahead" | "behind" | "on_track" | "idle"
    runwayDays: number | null
    cashBalance: number
  }
  pillars: InsightsPillarRow[]
  subscriptions: {
    monthlyActiveTotal: number
    upcomingCount: number
    upcoming: InsightsUpcomingRow[]
  }
  goals: InsightsGoalRow[]
}

const PILLAR_ORDER = [
  "fixedCosts",
  "savings",
  "investment",
  "guiltFreeSpending",
] as const

const PILLAR_LABELS: Record<string, string> = {
  fixedCosts: "Fixed costs",
  savings: "Savings",
  investment: "Investment",
  guiltFreeSpending: "Guilt-free",
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

function pillarStatus(row: {
  allocated: number
  remaining: number
  overspent: number
}): PillarStatus {
  if (row.overspent > 0) return "over"
  if (row.allocated <= 0) return "idle"
  if (row.remaining < row.allocated * 0.2) return "tight"
  return "on_track"
}

export function buildInsightsOverview(
  payload: DashboardConsolePayload,
): InsightsOverview {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const currentDay = now.getDate()
  const monthElapsedPct = (currentDay / daysInMonth) * 100

  const income = payload.breakdown?.income ?? 0
  const expenses = payload.expensesTotalForMonth ?? 0
  const allocationTotal = payload.breakdown?.total ?? 0

  const investedThisMonth = payload.investmentAccounts.reduce((sum, acc) => {
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
    let invested = 0
    for (const h of acc.holdings ?? []) {
      for (const p of h.purchases ?? []) {
        const t = new Date(p.date).getTime()
        if (!Number.isNaN(t) && t >= start && t <= end) invested += p.amount || 0
      }
    }
    return sum + invested
  }, 0)

  const budgetUsedPct =
    allocationTotal > 0
      ? Math.min(100, ((expenses + investedThisMonth) / allocationTotal) * 100)
      : 0
  const paceGapPct = budgetUsedPct - monthElapsedPct
  const pace: InsightsOverview["health"]["pace"] =
    allocationTotal <= 0
      ? "idle"
      : paceGapPct >= 15
        ? "ahead"
        : paceGapPct <= -15
          ? "behind"
          : "on_track"

  const savingsRatePct =
    income > 0 ? Math.max(0, ((income - expenses) / income) * 100) : null

  const cashBalance = payload.accounts
    .filter((a) => {
      const t = a.accountType.toLowerCase()
      return t === "checking" || t === "savings" || t === "cash"
    })
    .reduce((s, a) => s + a.balance, 0)

  const avgDailySpending = currentDay > 0 ? expenses / currentDay : 0
  const runwayDays =
    avgDailySpending > 0 ? Math.floor(cashBalance / avgDailySpending) : null

  const pillars: InsightsPillarRow[] = PILLAR_ORDER.map((key) => {
    const tracking = payload.tracking[key]
    const allocated = tracking?.allocated ?? payload.breakdown?.[key] ?? 0
    const spent = tracking?.spent ?? 0
    const overspent = tracking?.overspent ?? 0
    const remaining =
      tracking?.remaining ?? Math.max(0, allocated - spent)
    const usedPct =
      allocated > 0 ? Math.min(100, ((spent + overspent) / allocated) * 100) : 0
    return {
      key,
      label: PILLAR_LABELS[key] ?? key,
      allocated,
      spent,
      remaining,
      overspent,
      usedPct,
      status: pillarStatus({ allocated, remaining, overspent }),
    }
  })

  const upcoming: InsightsUpcomingRow[] = (payload.subscriptionDash.upcoming ?? [])
    .map((row) => ({
      ...row,
      daysUntil: daysUntilIso(row.date),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5)

  const goals: InsightsGoalRow[] = (payload.savingGoals ?? [])
    .filter((g) => g.status === "active" || g.status === "complete")
    .map((g) => {
      const completionPct =
        g.target != null && g.target > 0
          ? Math.min(100, Math.max(0, (g.current / g.target) * 100))
          : null
      return {
        id: g.id,
        name: g.name,
        current: g.current,
        target: g.target,
        completionPct,
        completeBy: g.completeBy ?? null,
        status: g.status,
      }
    })
    .sort((a, b) => (b.completionPct ?? -1) - (a.completionPct ?? -1))
    .slice(0, 6)

  return {
    health: {
      income,
      expenses,
      savingsRatePct,
      budgetUsedPct,
      monthElapsedPct,
      paceGapPct,
      pace,
      runwayDays,
      cashBalance,
    },
    pillars,
    subscriptions: {
      monthlyActiveTotal: payload.subscriptionDash.monthlyActiveTotal ?? 0,
      upcomingCount: upcoming.length,
      upcoming,
    },
    goals,
  }
}
