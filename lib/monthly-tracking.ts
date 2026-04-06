import { prisma } from "./prisma"

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

const CATEGORIES = ["fixedCosts", "savings", "investment", "guiltFreeSpending"] as const

/**
 * Compute remaining and overspent for a given month, **after** applying the previous month's
 * carryover and overspent, then store in CategoryMonthClosing.
 *
 * Logic:
 * - Effective allocated for this month = this month's CategoryBalance − previous month's overspent
 *   (so we start from: previous remaining − previous overspent + income this month = balance − prev overspent).
 * - Spent = this month's expenses + transfers (or investment holdings for investment).
 * - net = effective_allocated − spent; remaining = max(0, net); overspent = max(0, −net).
 */
export async function ensureMonthClosing(
  userId: string,
  month: number,
  year: number
): Promise<PreviousMonthResult> {
  const emptyResult = (): PreviousMonthResult => ({
    remaining: Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<string, number>,
    overspent: Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<string, number>,
  })

  // Stale JWT, deleted user, or bad id — avoid FK violation on CategoryMonthClosing (P2003).
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!userExists) {
    return emptyResult()
  }

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  // Previous month's overspent: use stored closing so this month's remaining/overspent is after carryover/overspent.
  // If previous month not yet stored, use 0 (no recursion).
  let prevOverspentByCat: Record<string, number> = {}
  const prevClosings = await prisma.categoryMonthClosing.findMany({
    where: { userId, month: prevMonth, year: prevYear },
  })
  for (const row of prevClosings) {
    prevOverspentByCat[row.category] = row.overspent ?? 0
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

  const remaining: Record<string, number> = {}
  const overspent: Record<string, number> = {}

  for (const cat of CATEGORIES) {
    let balance = 0
    for (const b of balances) {
      if (b.category === cat) balance += b.balance ?? 0
    }
    const prevOverspent = prevOverspentByCat[cat] ?? 0
    const allocatedAfterPrevOverspent = Math.max(0, balance - prevOverspent)

    let spent = 0
    if (cat === "investment") {
      for (const inv of investments) spent += inv.amount
    } else {
      for (const e of expenses) {
        if (e.category === cat) spent += e.amount
      }
      for (const t of transfers) {
        if (t.category === cat) spent += t.amount
      }
    }

    const net = allocatedAfterPrevOverspent - spent
    const rem = net >= 0 ? net : 0
    const over = net < 0 ? Math.abs(net) : 0
    remaining[cat] = rem
    overspent[cat] = over

    await prisma.categoryMonthClosing.upsert({
      where: {
        userId_category_month_year: { userId, category: cat, month, year },
      },
      create: {
        userId,
        category: cat,
        month,
        year,
        remaining: rem,
        overspent: over,
        updatedAt: new Date(),
      },
      update: {
        remaining: rem,
        overspent: over,
        updatedAt: new Date(),
      },
    })
  }

  return { remaining, overspent }
}

/**
 * Get carryover and overspent for the *previous* month, from stored CategoryMonthClosing.
 * Ensures the previous month's closing is computed and stored first, then returns it.
 * So: next month's carryover = previous month's stored remaining; next month's overspent = previous month's stored overspent.
 */
export async function getPreviousMonthRemainingAndOverspentByCategory(
  userId: string,
  month: number,
  year: number
): Promise<PreviousMonthResult> {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  // Compute and store previous month's remaining/overspent, then return it
  return ensureMonthClosing(userId, prevMonth, prevYear)
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
    const carryover = await getPreviousMonthRemainingByCategory(userId, m, y)
    await prisma.categoryBalance.createMany({
      data: missingCategories.map(category => ({
        userId,
        category,
        balance: carryover[category] ?? 0,
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
  const { month: m, year: y, startOfMonth, endOfMonth } =
    month !== undefined && year !== undefined
      ? {
          month,
          year,
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
