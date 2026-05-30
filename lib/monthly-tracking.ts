import { prisma } from "./prisma"
import { TRACKING_CATEGORIES, calculateMonthClosing } from "./category-tracking-calculation"
import { dollarsToMinor } from "@/lib/money"
import { serializeMoneyForApi } from "@/lib/money-api"
import { getUserDisplayCurrency } from "@/lib/user-currency"

/**
 * Get current month and year
 */
export function getCurrentMonthYear() {
  const now = new Date()
  return {
    month: now.getMonth() + 1, // 1-12
    year: now.getFullYear(),
    startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  }
}

/**
 * Previous month's allocated and spent, and the resulting remaining/overspent.
 * Single source of truth: net = allocated - spent; remaining = max(0, net); overspent = max(0, -net).
 */
export type PreviousMonthResult = {
  remaining: Record<string, number>
  overspent: Record<string, number>
}

function emptyPreviousMonthResult(): PreviousMonthResult {
  return {
    remaining: Object.fromEntries(
      TRACKING_CATEGORIES.map((c) => [c, 0]),
    ) as Record<string, number>,
    overspent: Object.fromEntries(
      TRACKING_CATEGORIES.map((c) => [c, 0]),
    ) as Record<string, number>,
  }
}

function previousCalendarMonth(month: number, year: number) {
  return month === 1
    ? { month: 12, year: year - 1 }
    : { month: month - 1, year }
}

/**
 * Read stored month closing rows when all tracking categories are present.
 */
async function readStoredMonthClosing(
  userId: string,
  month: number,
  year: number,
  currency: string,
): Promise<PreviousMonthResult | null> {
  const rows = await prisma.categoryMonthClosing.findMany({
    where: { userId, month, year },
  })
  if (rows.length < TRACKING_CATEGORIES.length) return null

  const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)
  const remaining: Record<string, number> = {}
  const overspent: Record<string, number> = {}
  for (const cat of TRACKING_CATEGORIES) {
    const row = rows.find((r) => r.category === cat)
    if (!row) return null
    remaining[cat] = toD(row.remaining ?? 0n)
    overspent[cat] = toD(row.overspent ?? 0n)
  }
  return { remaining, overspent }
}

/**
 * Compute remaining and overspent for a month (read-only — no DB writes).
 */
export async function computeMonthClosingForMonth(
  userId: string,
  month: number,
  year: number,
  currency?: string,
): Promise<PreviousMonthResult> {
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!userExists) return emptyPreviousMonthResult()

  const resolvedCurrency = currency ?? (await getUserDisplayCurrency(userId))
  const toD = (minor: bigint) => serializeMoneyForApi(minor, resolvedCurrency)

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)
  const { month: prevMonth, year: prevYear } = previousCalendarMonth(month, year)

  const prevOverspentByCat: Record<string, number> = {}
  const prevClosings = await prisma.categoryMonthClosing.findMany({
    where: { userId, month: prevMonth, year: prevYear },
  })
  for (const row of prevClosings) {
    prevOverspentByCat[row.category] = toD(row.overspent ?? 0n)
  }

  const [balances, expenses, transfers, investments] = await Promise.all([
    prisma.categoryBalance.findMany({
      where: { userId, month, year },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: ["fixedCosts", "investment", "savings", "guiltFreeSpending"] },
      },
      select: { amount: true, category: true },
    }),
    prisma.transfer.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: ["fixedCosts", "investment", "savings", "guiltFreeSpending"] },
      },
      select: { amount: true, category: true },
    }),
    prisma.investmentHolding.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { amount: true },
    }),
  ])

  return calculateMonthClosing({
    categoryBalances: balances.map((b) => ({
      category: b.category,
      balance: toD(b.balance),
    })),
    expenses: expenses.map((e) => ({
      amount: toD(e.amount),
      category: e.category,
    })),
    transfers: transfers.map((t) => ({
      amount: toD(t.amount),
      category: t.category,
    })),
    investments: investments.map((i) => ({ amount: toD(i.amount) })),
    previousOverspentByCategory: prevOverspentByCat,
  })
}

/**
 * Compute and persist month closing (use after writes — not on dashboard GET).
 */
export async function ensureMonthClosing(
  userId: string,
  month: number,
  year: number,
): Promise<PreviousMonthResult> {
  const currency = await getUserDisplayCurrency(userId)
  const { remaining, overspent } = await computeMonthClosingForMonth(
    userId,
    month,
    year,
    currency,
  )

  const now = new Date()
  await Promise.all(
    TRACKING_CATEGORIES.map((cat) =>
      prisma.categoryMonthClosing.upsert({
        where: {
          userId_category_month_year: { userId, category: cat, month, year },
        },
        create: {
          userId,
          category: cat,
          month,
          year,
          remaining: dollarsToMinor(remaining[cat], currency),
          overspent: dollarsToMinor(overspent[cat], currency),
          updatedAt: now,
        },
        update: {
          remaining: dollarsToMinor(remaining[cat], currency),
          overspent: dollarsToMinor(overspent[cat], currency),
          updatedAt: now,
        },
      }),
    ),
  )

  return { remaining, overspent }
}

/**
 * Persist the calendar month before `month`/`year` (fire-and-forget after income/expense writes).
 */
export function schedulePersistPreviousMonthClosing(userId: string) {
  const { month, year } = getCurrentMonthYear()
  const { month: prevMonth, year: prevYear } = previousCalendarMonth(month, year)
  void ensureMonthClosing(userId, prevMonth, prevYear).catch((error) => {
    console.error("Failed to persist previous month closing:", error)
  })
}

/**
 * Carryover and overspent for the month before `month`/`year` (read-only on GET paths).
 */
export async function getPreviousMonthRemainingAndOverspentByCategory(
  userId: string,
  month: number,
  year: number,
): Promise<PreviousMonthResult> {
  const { month: prevMonth, year: prevYear } = previousCalendarMonth(month, year)
  const currency = await getUserDisplayCurrency(userId)

  const stored = await readStoredMonthClosing(
    userId,
    prevMonth,
    prevYear,
    currency,
  )
  const base =
    stored ?? (await computeMonthClosingForMonth(userId, prevMonth, prevYear, currency))

  return base
}

/**
 * Get the previous calendar month's remaining (carryover) per category.
 * Comes from stored CategoryMonthClosing for the previous month (computed and stored by ensureMonthClosing).
 */
export async function getPreviousMonthRemainingByCategory(
  userId: string,
  month: number,
  year: number
): Promise<Record<string, number>> {
  const { remaining } = await getPreviousMonthRemainingAndOverspentByCategory(userId, month, year)
  return remaining
}

/**
 * Ensure category balances exist for a given month (initialize if needed).
 * If month and year are omitted, uses current month.
 * When creating new balances, initializes with the previous month's remaining only
 * (carryover from the single previous month, not from all past months).
 */
export async function ensureMonthlyCategoryBalances(userId: string, month?: number, year?: number) {
  const resolved = month !== undefined && year !== undefined
    ? { month, year }
    : getCurrentMonthYear()
  const { month: m, year: y } = resolved

  const categories = ['fixedCosts', 'savings', 'investment', 'guiltFreeSpending']

  // Fetch all existing balances in one query for better performance
  const existingBalances = await prisma.categoryBalance.findMany({
    where: {
      userId,
      month: m,
      year: y,
    },
  })

  const existingMap = new Set(existingBalances.map(b => b.category))
  const missingCategories = categories.filter(cat => !existingMap.has(cat))

  if (missingCategories.length > 0) {
    const currency = await getUserDisplayCurrency(userId)
    const carryover = await getPreviousMonthRemainingByCategory(userId, m, y)
    await prisma.categoryBalance.createMany({
      data: missingCategories.map((category) => ({
        userId,
        category,
        balance: dollarsToMinor(carryover[category] ?? 0, currency),
        month: m,
        year: y,
      })),
      skipDuplicates: true,
    })
  }
}

/**
 * Get income entries for a given month by income date (not createdAt).
 * Use this for "monthly income" and category-tracking so allocation matches.
 * If month/year omitted, uses current month.
 */
export async function getIncomeEntriesForMonthByDate(
  userId: string,
  month?: number,
  year?: number
) {
  const { startOfMonth, endOfMonth } =
    month !== undefined && year !== undefined
      ? {
          startOfMonth: new Date(year, month - 1, 1),
          endOfMonth: new Date(year, month, 0, 23, 59, 59, 999),
        }
      : getCurrentMonthYear()

  return await prisma.incomeEntry.findMany({
    where: {
      userId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      account: true,
    },
    orderBy: { date: "desc" },
  })
}

/**
 * Get all income entries for the current month only (by createdAt).
 * @deprecated Prefer getIncomeEntriesForMonthByDate for allocation/tracking.
 */
export async function getCurrentMonthIncomeEntries(userId: string) {
  const { startOfMonth, endOfMonth } = getCurrentMonthYear()
  
  return await prisma.incomeEntry.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    include: {
      account: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get category balances for current month only
 */
export async function getCurrentMonthCategoryBalances(userId: string) {
  const { month, year } = getCurrentMonthYear()
  
  return await prisma.categoryBalance.findMany({
    where: {
      userId,
      month,
      year,
    },
  })
}

/**
 * Check if we're in a new month compared to the last activity
 * This can be used to trigger monthly resets
 */
export async function checkIfNewMonth(userId: string): Promise<boolean> {
  const { month, year } = getCurrentMonthYear()
  
  // Check if there are any category balances for current month
  const currentMonthBalances = await prisma.categoryBalance.findFirst({
    where: {
      userId,
      month,
      year,
    },
  })
  
  // If no balances exist for current month, it's a new month
  return !currentMonthBalances
}
