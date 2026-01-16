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
 * Ensure category balances exist for current month (initialize if needed)
 * This ensures a fresh start each month
 */
export async function ensureMonthlyCategoryBalances(userId: string) {
  const { month, year } = getCurrentMonthYear()
  
  const categories = ['fixedCosts', 'savings', 'investment', 'guiltFreeSpending']
  
  // Fetch all existing balances in one query for better performance
  const existingBalances = await prisma.categoryBalance.findMany({
    where: {
      userId,
      month,
      year,
    },
  })
  
  const existingMap = new Set(existingBalances.map(b => b.category))
  const missingCategories = categories.filter(cat => !existingMap.has(cat))
  
  // Batch create missing balances
  if (missingCategories.length > 0) {
    await prisma.categoryBalance.createMany({
      data: missingCategories.map(category => ({
        userId,
        category,
        balance: 0,
        month,
        year,
      })),
      skipDuplicates: true,
    })
  }
}

/**
 * Get all income entries for the current month only
 * Includes account information to filter out cash accounts
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
