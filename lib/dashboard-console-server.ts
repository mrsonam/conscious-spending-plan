import { prisma } from "@/lib/prisma"
import { prismaSubscription } from "@/lib/prisma-subscription"
import { getIncomePageStats } from "@/lib/income-summary"
import {
  getCurrentMonthYear,
  getIncomeEntriesForMonthByDate,
  getPreviousMonthRemainingAndOverspentByCategory,
} from "@/lib/monthly-tracking"
import { ensurePreTrackingSavingsBalances } from "@/lib/pre-tracking-savings"
import { reconcilePlanToLiquid } from "@/lib/plan-liquid-reconcile"
import {
  computeIncomeAllocationsMinor,
  incomeAllocationToApi,
  buildAllocatedSoFarFromEntries,
  type CategoryKey,
  type IncomeAllocationMinor,
} from "@/lib/income-allocation"
import { serializeMoneyForApi } from "@/lib/money-api"
import {
  mapMoneyListToApi,
  mapMoneyListToApi as mapExpenseListToApi,
  ACCOUNT_MONEY_FIELDS,
  AMOUNT_ONLY_FIELDS,
  LOAN_MONEY_FIELDS,
} from "@/lib/money-serialize"
import { minorSumToDollars } from "@/lib/money-aggregates"
import { addMinor, coerceMinor } from "@/lib/money"
import { TRACKING_CATEGORIES, calculateCategoryTracking } from "@/lib/category-tracking-calculation"
import { addShares } from "@/lib/shares"
import { toApiMoney, sumAmountMinor } from "@/lib/investments-api-map"
import {
  collectUpcomingEvents,
  monthlyEquivalent,
  nextChargeDate,
  SUPPORTED_SUBSCRIPTION_FREQUENCIES,
  type SubscriptionFrequency,
} from "@/lib/subscription-utils"
import { getExchangeRate } from "@/lib/fx-rate"
import { dollarsToMinor } from "@/lib/money"
import type {
  DashboardConsoleCorePayload,
  DashboardConsolePayload,
  DashboardConsoleSecondaryPayload,
} from "@/lib/dashboard-console-types"
import type { Breakdown, DashboardRecentTransaction } from "@/components/wealth-console/types"
import { bpsToDisplayPercent } from "@/lib/saving-goal-allocation"
import { loadSavingGoalProjections } from "@/lib/saving-goal-projection"

const FUND_CATEGORIES = [
  "fixedCosts",
  "investment",
  "savings",
  "guiltFreeSpending",
] as const

function sumAllocationsForMonth(
  monthEntries: { amount: bigint }[],
  fundAllocation: NonNullable<Awaited<ReturnType<typeof prisma.fundAllocation.findUnique>>>,
  currency: string,
): { totals: IncomeAllocationMinor; totalIncome: bigint } {
  const totals: IncomeAllocationMinor = {
    fixedCosts: 0n,
    savings: 0n,
    investment: 0n,
    guiltFreeSpending: 0n,
  }
  const allocatedSoFar: Record<CategoryKey, bigint> = {
    fixedCosts: 0n,
    savings: 0n,
    investment: 0n,
    guiltFreeSpending: 0n,
  }
  let totalIncome = 0n

  for (const entry of monthEntries) {
    const incomeMinor = coerceMinor(entry.amount)
    totalIncome = addMinor(totalIncome, incomeMinor)
    const alloc = computeIncomeAllocationsMinor(
      incomeMinor,
      fundAllocation,
      currency,
      (cat) => allocatedSoFar[cat],
    )
    totals.fixedCosts = addMinor(totals.fixedCosts, alloc.fixedCosts)
    totals.savings = addMinor(totals.savings, alloc.savings)
    totals.investment = addMinor(totals.investment, alloc.investment)
    totals.guiltFreeSpending = addMinor(
      totals.guiltFreeSpending,
      alloc.guiltFreeSpending,
    )
    allocatedSoFar.fixedCosts = addMinor(allocatedSoFar.fixedCosts, alloc.fixedCosts)
    allocatedSoFar.savings = addMinor(allocatedSoFar.savings, alloc.savings)
    allocatedSoFar.investment = addMinor(allocatedSoFar.investment, alloc.investment)
    allocatedSoFar.guiltFreeSpending = addMinor(
      allocatedSoFar.guiltFreeSpending,
      alloc.guiltFreeSpending,
    )
  }

  return { totals, totalIncome }
}

async function loadCurrentMonthBreakdown(
  userId: string,
  currency: string,
  fundAllocation: Awaited<ReturnType<typeof prisma.fundAllocation.findUnique>>,
): Promise<Breakdown | null> {
  const allMonthEntries = await getIncomeEntriesForMonthByDate(userId)
  const monthEntries = allMonthEntries.filter(
    (entry) => entry.excludeFromAllocation !== true,
  )
  const totalIncomeIncludingAll = allMonthEntries.reduce(
    (sum, entry) => addMinor(sum, coerceMinor(entry.amount)),
    0n,
  )

  if (monthEntries.length === 0) {
    return {
      income: serializeMoneyForApi(totalIncomeIncludingAll, currency),
      fixedCosts: 0,
      savings: 0,
      investment: 0,
      guiltFreeSpending: 0,
      total: 0,
    }
  }

  if (!fundAllocation) return null

  const { totals, totalIncome } = sumAllocationsForMonth(
    monthEntries,
    fundAllocation,
    currency,
  )

  return {
    ...incomeAllocationToApi(totalIncome, totals, currency),
    income: serializeMoneyForApi(totalIncomeIncludingAll, currency),
    total: serializeMoneyForApi(totalIncome, currency),
  }
}

async function loadExpensesForRange(
  userId: string,
  start: Date,
  end: Date,
  currency: string,
) {
  const where = {
    userId,
    date: { gte: start, lte: end },
  }
  const [expenses, sumResult] = await Promise.all([
    prisma.expense.findMany({
      where,
      select: {
        id: true,
        amount: true,
        description: true,
        date: true,
        category: true,
        expenseCategory: true,
        accountId: true,
      },
      orderBy: { date: "desc" },
      take: 500,
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ])

  return {
    expenses: mapExpenseListToApi(
      expenses as Record<string, unknown>[],
      currency,
      AMOUNT_ONLY_FIELDS,
    ),
    total:
      sumResult._sum.amount != null
        ? minorSumToDollars(sumResult._sum.amount, currency)
        : null,
  }
}

async function loadCategoryTracking(
  userId: string,
  currency: string,
  fundAllocation: Awaited<ReturnType<typeof prisma.fundAllocation.findUnique>>,
) {
  const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)
  const { month: currentMonth, year: currentYear, startOfMonth, endOfMonth } =
    getCurrentMonthYear()

  const [
    currentMonthCategoryBalances,
    currentMonthExpenses,
    currentMonthTransfers,
    incomeEntriesForMonth,
    previousMonth,
  ] = await Promise.all([
    prisma.categoryBalance.findMany({
      where: { userId, month: currentMonth, year: currentYear },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: [...FUND_CATEGORIES] },
      },
      _sum: { amount: true },
    }),
    prisma.transfer.groupBy({
      by: ["category"],
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: [...FUND_CATEGORIES] },
      },
      _sum: { amount: true },
    }),
    prisma.incomeEntry.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        amount: true,
        excludeFromAllocation: true,
        allocationFixedCosts: true,
        allocationSavings: true,
        allocationInvestment: true,
        allocationGuiltFreeSpending: true,
      },
    }),
    getPreviousMonthRemainingAndOverspentByCategory(
      userId,
      currentMonth,
      currentYear,
    ),
  ])

  const { remaining: carryoverByCategory, overspent: overspentByCategory } =
    previousMonth

  const incomeAllocatedMinor = fundAllocation
    ? buildAllocatedSoFarFromEntries(incomeEntriesForMonth, fundAllocation, currency)
    : null
  const incomeAllocatedByCategory: Record<string, number> = {}
  if (incomeAllocatedMinor) {
    for (const cat of TRACKING_CATEGORIES) {
      incomeAllocatedByCategory[cat] = toD(incomeAllocatedMinor[cat])
    }
  }

  let tracking = calculateCategoryTracking({
    categoryBalances: currentMonthCategoryBalances.map((b) => ({
      category: b.category,
      balance: toD(b.balance ?? 0n),
    })),
    expenses: currentMonthExpenses
      .filter((e) => e.category)
      .map((e) => ({
        category: e.category!,
        amount: toD(e._sum.amount ?? 0n),
      })),
    transfers: currentMonthTransfers
      .filter((t) => t.category)
      .map((t) => ({
        category: t.category!,
        amount: toD(t._sum.amount ?? 0n),
      })),
    investments: [],
    carryoverByCategory,
    overspentByCategory,
    incomeAllocatedByCategory: incomeAllocatedMinor
      ? incomeAllocatedByCategory
      : undefined,
  })

  tracking = (
    await reconcilePlanToLiquid(userId, currentMonth, currentYear, currency, tracking)
  ).tracking

  const slim: DashboardConsolePayload["tracking"] = {}
  for (const key of Object.keys(tracking)) {
    const tr = tracking[key as keyof typeof tracking]
    slim[key] = {
      allocated: tr.allocated ?? 0,
      spent: tr.spent ?? 0,
      remaining: tr.remaining ?? 0,
      overspent: tr.overspent ?? 0,
    }
  }
  return slim
}

async function loadCategoryHistory(userId: string, currency: string) {
  const toD = (minor: bigint | null | undefined) =>
    serializeMoneyForApi(coerceMinor(minor ?? 0n), currency)

  const { month: currentMonth, year: currentYear } = getCurrentMonthYear()
  const months: Array<{ month: number; year: number; label: string }> = []
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1)
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    months.push({ month, year, label })
  }
  months.reverse()

  const oldestMonth = months[0]
  const newestMonth = months[months.length - 1]
  const overallStart = new Date(oldestMonth.year, oldestMonth.month - 1, 1)
  const overallEnd = new Date(newestMonth.year, newestMonth.month, 0, 23, 59, 59, 999)

  const history: Record<string, Array<{ month: string; remaining: number }>> = {
    fixedCosts: [],
    investment: [],
    savings: [],
    guiltFreeSpending: [],
  }

  const monthKeys = months.map((m) => ({ month: m.month, year: m.year }))
  const oldest = monthKeys[0]
  const prevOfOldest =
    oldest.month === 1
      ? { month: 12, year: oldest.year - 1 }
      : { month: oldest.month - 1, year: oldest.year }
  const allMonthKeys = [prevOfOldest, ...monthKeys]

  const [allCategoryBalances, allExpenses, allTransfers] = await Promise.all([
    prisma.categoryBalance.findMany({
      where: {
        userId,
        OR: allMonthKeys.map(({ month, year }) => ({ month, year })),
      },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: overallStart, lte: overallEnd },
        category: { in: [...FUND_CATEGORIES] },
      },
      select: { amount: true, category: true, date: true },
    }),
    prisma.transfer.findMany({
      where: {
        userId,
        date: { gte: overallStart, lte: overallEnd },
        category: { in: [...FUND_CATEGORIES] },
      },
      select: { amount: true, category: true, date: true },
    }),
  ])

  const getBalancesForMonth = (month: number, year: number) => {
    const map: Record<string, number> = {
      fixedCosts: 0,
      investment: 0,
      savings: 0,
      guiltFreeSpending: 0,
    }
    for (const b of allCategoryBalances) {
      if (b.month === month && b.year === year && map[b.category] !== undefined) {
        map[b.category] = toD(b.balance)
      }
    }
    return map
  }

  const getSpentForMonth = (startOfMonth: Date, endOfMonth: Date) => {
    const spent: Record<string, number> = {
      fixedCosts: 0,
      investment: 0,
      savings: 0,
      guiltFreeSpending: 0,
    }
    for (const e of allExpenses) {
      const d = new Date(e.date)
      if (d >= startOfMonth && d <= endOfMonth && e.category && e.category !== "investment") {
        spent[e.category] += toD(e.amount)
      }
    }
    for (const transfer of allTransfers) {
      const d = new Date(transfer.date)
      if (d >= startOfMonth && d <= endOfMonth && transfer.category === "investment") {
        spent.investment += toD(transfer.amount)
      }
    }
    return spent
  }

  let prevBalances = getBalancesForMonth(prevOfOldest.month, prevOfOldest.year)
  let prevSpent = getSpentForMonth(
    new Date(prevOfOldest.year, prevOfOldest.month - 1, 1),
    new Date(prevOfOldest.year, prevOfOldest.month, 0, 23, 59, 59, 999),
  )

  for (const { month, year, label } of months) {
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)
    const balances = getBalancesForMonth(month, year)
    const spent = getSpentForMonth(startOfMonth, endOfMonth)
    const categories = ["fixedCosts", "investment", "guiltFreeSpending", "savings"] as const
    const allocatedFromIncome: Record<string, number> = {}
    for (const cat of categories) {
      const carryover = Math.max(0, prevBalances[cat] - prevSpent[cat])
      allocatedFromIncome[cat] = Math.max(0, balances[cat] - carryover)
    }
    prevBalances = balances
    prevSpent = spent

    for (const cat of categories) {
      history[cat].push({
        month: label,
        remaining: Math.round((balances[cat] - spent[cat]) * 100) / 100,
      })
    }
  }

  return history
}

async function loadDashboardInvestments(userId: string, currency: string) {
  const { startOfMonth, endOfMonth } = getCurrentMonthYear()
  const toD = (m: bigint) => toApiMoney(m, currency)
  const accounts = await prisma.account.findMany({
    where: { userId, accountType: "investment" },
    select: {
      name: true,
      bankName: true,
      investmentHoldings: {
        orderBy: { date: "desc" },
        select: {
          name: true,
          amount: true,
          numberOfShares: true,
          date: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return accounts.map((account) => {
    const holdings = account.investmentHoldings
    const investedMinor = sumAmountMinor(holdings)
    const holdingsByName: Record<string, typeof holdings> = {}
    holdings.forEach((h) => {
      const key = h.name.toLowerCase().trim()
      if (!holdingsByName[key]) holdingsByName[key] = []
      holdingsByName[key].push(h)
    })

    const grouped = Object.entries(holdingsByName).map(([, rows]) => {
      const totalSharesStr = rows.reduce(
        (sum, h) => addShares(sum, h.numberOfShares),
        "0",
      )
      const totalAmountMinor = sumAmountMinor(rows)
      const purchases = rows
        .filter(
          (h) => h.date >= startOfMonth && h.date <= endOfMonth,
        )
        .map((h) => ({
          amount: toD(h.amount),
          date: h.date.toISOString(),
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      return {
        name: rows[0].name,
        totalAmount: toD(totalAmountMinor),
        totalShares: Number(totalSharesStr),
        purchases,
      }
    })

    return {
      name: account.name,
      bankName: account.bankName,
      investedAmount: toD(investedMinor),
      holdings: grouped,
    }
  })
}

async function loadSubscriptionDash(userId: string, currency: string) {
  const upcomingDays = 14
  const rawSubscriptions = await prismaSubscription.findMany({
    where: { userId },
    include: {
      recurringExpense: {
        include: {
          account: { select: { id: true, name: true, bankName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const currencies = new Set<string>()
  for (const s of rawSubscriptions) {
    if (s.foreignCurrency) currencies.add(s.foreignCurrency.toUpperCase())
  }

  const fxMap: Record<string, number> = {}
  if (currencies.size > 0) {
    await Promise.all(
      Array.from(currencies).map(async (curr) => {
        fxMap[curr] = await getExchangeRate(curr, currency)
      }),
    )
  }

  const subscriptions = rawSubscriptions.map((s) => {
    let amountMinor = s.recurringExpense.amount
    if (s.foreignCurrency && s.foreignAmount != null) {
      const rate = fxMap[s.foreignCurrency.toUpperCase()] || 1
      const foreignDollars = serializeMoneyForApi(s.foreignAmount, s.foreignCurrency)
      amountMinor = dollarsToMinor(foreignDollars * rate, currency)
    }
    return {
      id: s.id,
      label: s.label,
      provider: s.provider,
      status: s.status,
      trialEndsAt: s.trialEndsAt,
      nextRenewalAt: s.nextRenewalAt,
      reminderDaysBefore: s.reminderDaysBefore,
      recurringExpense: {
        amount: serializeMoneyForApi(amountMinor, currency),
        frequency: s.recurringExpense.frequency,
        startDate: s.recurringExpense.startDate,
        isActive: s.recurringExpense.isActive,
        description: s.recurringExpense.description,
        intervalDays: s.recurringExpense.intervalDays ?? null,
      },
    }
  })

  const activeForTotals = subscriptions.filter(
    (s) => s.status === "active" && s.recurringExpense.isActive,
  )
  let monthlyActiveTotal = 0
  for (const s of activeForTotals) {
    const f = s.recurringExpense.frequency as SubscriptionFrequency
    if (SUPPORTED_SUBSCRIPTION_FREQUENCIES.includes(f)) {
      monthlyActiveTotal += monthlyEquivalent(
        s.recurringExpense.amount,
        f,
        s.recurringExpense.intervalDays,
      )
    }
  }

  const upcoming = collectUpcomingEvents(
    subscriptions.map((s) => ({
      id: s.id,
      label: s.label,
      provider: s.provider,
      status: s.status,
      trialEndsAt: s.trialEndsAt,
      nextRenewalAt: s.nextRenewalAt,
      reminderDaysBefore: s.reminderDaysBefore,
      recurringExpense: {
        amount: s.recurringExpense.amount,
        frequency: s.recurringExpense.frequency,
        startDate: s.recurringExpense.startDate,
        isActive: s.recurringExpense.isActive,
        description: s.recurringExpense.description,
        intervalDays: s.recurringExpense.intervalDays ?? null,
      },
    })),
    upcomingDays,
  )

  // Standalone recurring expenses (rent, utilities, …) due in the same window.
  // Subscriptions are excluded, they're already covered above.
  const now = new Date()
  const windowEnd = new Date(now.getTime() + upcomingDays * 86_400_000)
  const standaloneBills = await prisma.recurringExpense.findMany({
    where: { userId, isActive: true, subscription: null },
    select: {
      id: true,
      amount: true,
      description: true,
      frequency: true,
      startDate: true,
      endDate: true,
      intervalDays: true,
    },
  })

  for (const bill of standaloneBills) {
    const freq = bill.frequency as SubscriptionFrequency
    if (!SUPPORTED_SUBSCRIPTION_FREQUENCIES.includes(freq)) continue
    const next = nextChargeDate(
      bill.startDate,
      freq,
      now,
      bill.intervalDays,
    )
    if (next.getTime() > windowEnd.getTime()) continue
    if (bill.endDate && next.getTime() > bill.endDate.getTime()) continue
    upcoming.push({
      subscriptionId: bill.id,
      label: bill.description?.trim() || "Recurring expense",
      provider: null,
      amount: serializeMoneyForApi(bill.amount, currency),
      date: next.toISOString(),
      kind: "bill",
      reminderDaysBefore: 0,
    })
  }

  upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return { monthlyActiveTotal, upcoming }
}

const RECENT_TX_LOOKBACK_DAYS = 60
const RECENT_TX_LIMIT = 5

async function loadRecentTransactions(
  userId: string,
  currency: string,
): Promise<DashboardRecentTransaction[]> {
  const since = new Date()
  since.setDate(since.getDate() - RECENT_TX_LOOKBACK_DAYS)
  const toD = (minor: bigint) => serializeMoneyForApi(coerceMinor(minor), currency)

  // The top RECENT_TX_LIMIT overall can never need more than that many rows
  // from any one source. createdAt breaks ties between same-day rows so the
  // order is stable (dates are stored with day precision).
  const [expenses, incomeEntries, transfers] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: since } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: RECENT_TX_LIMIT,
      select: {
        id: true,
        amount: true,
        description: true,
        date: true,
        createdAt: true,
        category: true,
        expenseCategory: true,
        account: { select: { name: true, bankName: true } },
      },
    }),
    prisma.incomeEntry.findMany({
      where: { userId, date: { gte: since } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: RECENT_TX_LIMIT,
      select: {
        id: true,
        amount: true,
        description: true,
        date: true,
        createdAt: true,
        account: { select: { name: true, bankName: true } },
      },
    }),
    prisma.transfer.findMany({
      where: { userId, date: { gte: since } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: RECENT_TX_LIMIT,
      select: {
        id: true,
        amount: true,
        description: true,
        date: true,
        createdAt: true,
        category: true,
        fromAccount: { select: { name: true } },
        toAccount: { select: { name: true } },
      },
    }),
  ])

  type Row = DashboardRecentTransaction & { sortTime: number; sortTie: number }
  const rows: Row[] = []

  for (const e of expenses) {
    rows.push({
      id: e.id,
      type: "expense",
      amount: toD(e.amount),
      date: e.date.toISOString(),
      description: e.description,
      category: e.category,
      expenseCategory: e.expenseCategory,
      accountLabel: e.account ? `${e.account.bankName} · ${e.account.name}` : null,
      sortTime: e.date.getTime(),
      sortTie: e.createdAt.getTime(),
    })
  }

  for (const entry of incomeEntries) {
    rows.push({
      id: entry.id,
      type: "income",
      amount: toD(entry.amount),
      date: entry.date.toISOString(),
      description: entry.description,
      category: null,
      accountLabel: entry.account ? `${entry.account.bankName} · ${entry.account.name}` : null,
      sortTime: entry.date.getTime(),
      sortTie: entry.createdAt.getTime(),
    })
  }

  for (const t of transfers) {
    rows.push({
      id: t.id,
      type: "transfer",
      amount: toD(t.amount),
      date: t.date.toISOString(),
      description: t.description,
      category: t.category,
      accountLabel:
        t.fromAccount && t.toAccount
          ? `${t.fromAccount.name} → ${t.toAccount.name}`
          : null,
      sortTime: t.date.getTime(),
      sortTie: t.createdAt.getTime(),
    })
  }

  rows.sort((a, b) => b.sortTime - a.sortTime || b.sortTie - a.sortTie)
  return rows.slice(0, RECENT_TX_LIMIT).map(({ sortTime: _t, sortTie: _tie, ...rest }) => rest)
}

async function loadSavingGoalsForDashboard(userId: string, currency: string) {
  const goals = await prisma.savingGoal.findMany({
    where: {
      userId,
      status: { in: ["active", "complete"] },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 4,
  })

  const projections = await loadSavingGoalProjections(userId, goals, currency)

  return goals.map((g) => ({
    id: g.id,
    name: g.name,
    current: serializeMoneyForApi(g.currentMinor, currency),
    target:
      g.targetMinor != null
        ? serializeMoneyForApi(g.targetMinor, currency)
        : null,
    percent: bpsToDisplayPercent(g.percentBps),
    status: g.status,
    completeBy: projections[g.id]?.completeBy ?? null,
  }))
}

export async function loadDashboardConsoleCoreData(
  userId: string,
  currency: string,
): Promise<DashboardConsoleCorePayload> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999,
  )
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date()
  const toD = (v: bigint | null | undefined) => minorSumToDollars(v, currency)

  const [fundAllocation] = await Promise.all([
    prisma.fundAllocation.findUnique({ where: { userId } }),
    ensurePreTrackingSavingsBalances(userId),
  ])

  const [
    breakdown,
    incomeStats,
    accountsRows,
    expensesCurrent,
    lastMonthExpenseAgg,
    tracking,
    ytdAggs,
  ] = await Promise.all([
    loadCurrentMonthBreakdown(userId, currency, fundAllocation),
    getIncomePageStats(userId),
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    loadExpensesForRange(userId, startOfMonth, endOfMonth, currency),
    prisma.expense.aggregate({
      where: { userId, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    loadCategoryTracking(userId, currency, fundAllocation),
    Promise.all([
      prisma.incomeEntry.aggregate({
        where: { userId, date: { gte: startOfYear, lte: endOfYear } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: startOfYear, lte: endOfYear } },
        _sum: { amount: true },
      }),
      prisma.investmentHolding.aggregate({
        where: { userId, date: { gte: startOfYear, lte: endOfYear } },
        _sum: { amount: true },
      }),
    ]),
  ])

  const accounts = mapMoneyListToApi(
    accountsRows as Record<string, unknown>[],
    currency,
    ACCOUNT_MONEY_FIELDS,
  ) as unknown as DashboardConsoleCorePayload["accounts"]

  const [incomeAgg, expenseAgg, investedAgg] = ytdAggs

  return {
    breakdown,
    lastMonthIncome: incomeStats.lastMonthIncome,
    accounts,
    expenses: expensesCurrent.expenses as unknown as DashboardConsoleCorePayload["expenses"],
    expensesTotalForMonth: expensesCurrent.total,
    lastMonthExpenses: toD(lastMonthExpenseAgg._sum.amount),
    tracking,
    ytd: {
      year,
      totalIncome: toD(incomeAgg._sum.amount),
      totalExpenses: toD(expenseAgg._sum.amount),
      totalInvested: toD(investedAgg._sum.amount),
    },
  }
}

export async function loadDashboardConsoleSecondaryData(
  userId: string,
  currency: string,
): Promise<DashboardConsoleSecondaryPayload> {
  const [history, investmentAccounts, loansRows, subscriptionDash, recentTransactions, savingGoalsRows, superAccounts] =
    await Promise.all([
      loadCategoryHistory(userId, currency),
      loadDashboardInvestments(userId, currency),
      prisma.loan.findMany({
        where: { userId, status: "active" },
        orderBy: { date: "desc" },
        take: 100,
      }),
      loadSubscriptionDash(userId, currency),
      loadRecentTransactions(userId, currency),
      loadSavingGoalsForDashboard(userId, currency),
      prisma.superannuationAccount.findMany({
        where: { userId },
        select: { contributions: { select: { amount: true } } },
      }),
    ])

  const loans = mapMoneyListToApi(
    loansRows as Record<string, unknown>[],
    currency,
    LOAN_MONEY_FIELDS,
  ) as unknown as DashboardConsoleSecondaryPayload["loans"]

  const superBalance = superAccounts.reduce((acc, account) => {
    const total = account.contributions.reduce((s, c) => s + c.amount, 0n)
    return acc + minorSumToDollars(total, currency)
  }, 0)

  return {
    history,
    investmentAccounts,
    loans,
    subscriptionDash,
    recentTransactions,
    savingGoals: savingGoalsRows,
    superBalance,
  }
}

export async function loadDashboardConsoleData(
  userId: string,
  currency: string,
): Promise<DashboardConsolePayload> {
  const [core, secondary] = await Promise.all([
    loadDashboardConsoleCoreData(userId, currency),
    loadDashboardConsoleSecondaryData(userId, currency),
  ])
  return { ...core, ...secondary }
}
