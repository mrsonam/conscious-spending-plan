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
} from "@/lib/monthly-tracking"
import { ensurePreTrackingSavingsBalances } from "@/lib/pre-tracking-savings"
import { upsertEnvelopeBalancesForMonth } from "@/lib/envelope-balance-recompute"
import { addMinor, coerceMinor } from "@/lib/money"
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
    select: {
      id: true,
      amount: true,
      allocationFixedCosts: true,
      allocationSavings: true,
      allocationInvestment: true,
      allocationGuiltFreeSpending: true,
    },
  })

  const { reallocations, incomeTotals } = computeMonthIncomeReallocations(
    monthEntries.map((entry) => ({ id: entry.id, amount: coerceMinor(entry.amount) })),
    fundAllocation,
    currencyCode,
  )

  // Skip entries whose stored allocation already matches — during a chain
  // rebuild most months are unchanged and every write here is pure overhead.
  const storedById = new Map(monthEntries.map((e) => [e.id, e]))
  const changed = reallocations.filter(({ entryId, alloc }) => {
    const stored = storedById.get(entryId)
    if (!stored) return true
    return (
      coerceMinor(stored.allocationFixedCosts) !== alloc.fixedCosts ||
      coerceMinor(stored.allocationSavings) !== alloc.savings ||
      coerceMinor(stored.allocationInvestment) !== alloc.investment ||
      coerceMinor(stored.allocationGuiltFreeSpending) !== alloc.guiltFreeSpending
    )
  })

  if (changed.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const { entryId, alloc } of changed) {
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
    })
  }

  // Returns the freshly computed balances — no second recompute needed.
  const envelopeTotals = await upsertEnvelopeBalancesForMonth(
    userId,
    resolved.month,
    resolved.year,
    currencyCode
  )

  return {
    month: resolved.month,
    year: resolved.year,
    entryCount: reallocations.length,
    incomeTotals,
    envelopeTotals,
  }
}
