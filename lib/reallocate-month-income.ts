import type { FundAllocation } from "@prisma/client"
import { FUND_CATEGORIES } from "@/lib/fund-allocation-fields"
import {
  computeIncomeAllocationsMinor,
  type CategoryKey,
  type IncomeAllocationMinor,
} from "@/lib/income-allocation"
import {
  ensureMonthlyCategoryBalances,
  getCurrentMonthYear,
  getPreviousMonthRemainingByCategory,
} from "@/lib/monthly-tracking"
import { ensurePreTrackingSavingsBalances } from "@/lib/pre-tracking-savings"
import { addMinor, coerceMinor, dollarsToMinor } from "@/lib/money"
import { prisma } from "@/lib/prisma"

export type MonthIncomeReallocation = {
  entryId: string
  amount: bigint
  alloc: IncomeAllocationMinor
}

export function computeMonthIncomeReallocations(
  entries: Array<{ id: string; amount: bigint }>,
  fundAllocation: FundAllocation,
  currencyCode: string,
): { reallocations: MonthIncomeReallocation[]; incomeTotals: IncomeAllocationMinor } {
  const allocatedSoFar: Record<CategoryKey, bigint> = {
    fixedCosts: 0n,
    savings: 0n,
    investment: 0n,
    guiltFreeSpending: 0n,
  }
  const incomeTotals: IncomeAllocationMinor = {
    fixedCosts: 0n,
    savings: 0n,
    investment: 0n,
    guiltFreeSpending: 0n,
  }
  const reallocations: MonthIncomeReallocation[] = []

  for (const entry of entries) {
    const incomeMinor = coerceMinor(entry.amount)
    const alloc = computeIncomeAllocationsMinor(
      incomeMinor,
      fundAllocation,
      currencyCode,
      (cat) => allocatedSoFar[cat],
    )
    reallocations.push({ entryId: entry.id, amount: incomeMinor, alloc })

    for (const cat of FUND_CATEGORIES) {
      allocatedSoFar[cat] = addMinor(allocatedSoFar[cat], alloc[cat])
      incomeTotals[cat] = addMinor(incomeTotals[cat], alloc[cat])
    }
  }

  return { reallocations, incomeTotals }
}

export async function reallocateMonthIncomeForUser(
  userId: string,
  currencyCode: string,
  month?: number,
  year?: number,
) {
  const resolved =
    month !== undefined && year !== undefined
      ? { month, year }
      : getCurrentMonthYear()

  const fundAllocation = await prisma.fundAllocation.findUnique({
    where: { userId },
  })
  if (!fundAllocation) {
    throw new Error("Fund allocation not found")
  }

  await ensurePreTrackingSavingsBalances(userId)
  await ensureMonthlyCategoryBalances(userId, resolved.month, resolved.year)

  const startOfMonth = new Date(resolved.year, resolved.month - 1, 1)
  const endOfMonth = new Date(resolved.year, resolved.month, 0, 23, 59, 59, 999)

  const monthEntries = await prisma.incomeEntry.findMany({
    where: {
      userId,
      date: { gte: startOfMonth, lte: endOfMonth },
      excludeFromAllocation: false,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: { id: true, amount: true },
  })

  const { reallocations, incomeTotals } = computeMonthIncomeReallocations(
    monthEntries.map((entry) => ({ id: entry.id, amount: coerceMinor(entry.amount) })),
    fundAllocation,
    currencyCode,
  )

  const carryover = await getPreviousMonthRemainingByCategory(
    userId,
    resolved.month,
    resolved.year,
  )

  await prisma.$transaction(async (tx) => {
    for (const { entryId, alloc } of reallocations) {
      await tx.incomeEntry.update({
        where: { id: entryId },
        data: {
          allocationFixedCosts: alloc.fixedCosts,
          allocationSavings: alloc.savings,
          allocationInvestment: alloc.investment,
          allocationGuiltFreeSpending: alloc.guiltFreeSpending,
        },
      })
    }

    const existingBalances = await tx.categoryBalance.findMany({
      where: {
        userId,
        month: resolved.month,
        year: resolved.year,
      },
    })
    const existingMap = new Map(existingBalances.map((row) => [row.category, row]))

    for (const cat of FUND_CATEGORIES) {
      const carryoverMinor = dollarsToMinor(carryover[cat] ?? 0, currencyCode)
      const balance = addMinor(carryoverMinor, incomeTotals[cat])
      const existing = existingMap.get(cat)
      if (existing) {
        await tx.categoryBalance.update({
          where: { id: existing.id },
          data: { balance },
        })
      } else {
        await tx.categoryBalance.create({
          data: {
            userId,
            category: cat,
            balance,
            month: resolved.month,
            year: resolved.year,
          },
        })
      }
    }
  })

  return {
    month: resolved.month,
    year: resolved.year,
    entryCount: reallocations.length,
    incomeTotals,
    envelopeTotals: Object.fromEntries(
      FUND_CATEGORIES.map((cat) => [
        cat,
        addMinor(
          dollarsToMinor(carryover[cat] ?? 0, currencyCode),
          incomeTotals[cat],
        ),
      ]),
    ) as Record<CategoryKey, bigint>,
  }
}
