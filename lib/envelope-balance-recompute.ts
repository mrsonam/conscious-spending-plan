import { FUND_CATEGORIES, type FundCategory } from "@/lib/fund-allocation-fields"
import { isFundCategory } from "@/lib/category-bucket-transfer-shared"
import { buildAllocatedSoFarFromEntries } from "@/lib/income-allocation"
import { getPreviousMonthRemainingByCategory } from "@/lib/monthly-tracking"
import { addMinor, coerceMinor, dollarsToMinor, subtractMinor } from "@/lib/money"
import { prisma } from "@/lib/prisma"
import {
  ensureCategoryBucketTransferTable,
  isMissingCategoryBucketTransferTable,
} from "@/lib/ensure-category-bucket-transfer-table"

function emptyBucketNets(): Record<FundCategory, bigint> {
  return Object.fromEntries(FUND_CATEGORIES.map((cat) => [cat, 0n])) as Record<
    FundCategory,
    bigint
  >
}

/** Net envelope adjustment per bucket from plan-level bucket transfers in one month. */
export async function getBucketTransferNetByCategory(
  userId: string,
  month: number,
  year: number
): Promise<Record<FundCategory, bigint>> {
  const nets = emptyBucketNets()

  await ensureCategoryBucketTransferTable()

  try {
    const rows = await prisma.categoryBucketTransfer.findMany({
      where: { userId, month, year },
      select: { fromCategory: true, toCategory: true, amount: true },
    })

    for (const row of rows) {
      const amount = coerceMinor(row.amount)
      if (isFundCategory(row.fromCategory)) {
        nets[row.fromCategory] = subtractMinor(nets[row.fromCategory], amount)
      }
      if (isFundCategory(row.toCategory)) {
        nets[row.toCategory] = addMinor(nets[row.toCategory], amount)
      }
    }
  } catch (error) {
    if (isMissingCategoryBucketTransferTable(error)) {
      return nets
    }
    throw error
  }

  return nets
}

/** carry + income allocation + bucket transfer nets for each pillar. */
export async function computeEnvelopeBalancesMinor(
  userId: string,
  month: number,
  year: number,
  currency: string
): Promise<Record<FundCategory, bigint>> {
  const [carryover, fundAllocation, incomeEntries, bucketNets] = await Promise.all([
    getPreviousMonthRemainingByCategory(userId, month, year),
    prisma.fundAllocation.findUnique({ where: { userId } }),
    prisma.incomeEntry.findMany({
      where: {
        userId,
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
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
    getBucketTransferNetByCategory(userId, month, year),
  ])

  let incomeTotals = Object.fromEntries(
    FUND_CATEGORIES.map((cat) => [cat, 0n])
  ) as Record<FundCategory, bigint>

  if (fundAllocation) {
    incomeTotals = buildAllocatedSoFarFromEntries(
      incomeEntries,
      fundAllocation,
      currency
    )
  }

  const balances = {} as Record<FundCategory, bigint>
  for (const cat of FUND_CATEGORIES) {
    balances[cat] = addMinor(
      addMinor(dollarsToMinor(carryover[cat] ?? 0, currency), incomeTotals[cat]),
      bucketNets[cat]
    )
  }

  return balances
}

/** Recompute and persist envelopes; returns the balances so callers don't recompute. */
export async function upsertEnvelopeBalancesForMonth(
  userId: string,
  month: number,
  year: number,
  currency: string
): Promise<Record<FundCategory, bigint>> {
  const balances = await computeEnvelopeBalancesMinor(userId, month, year, currency)

  await Promise.all(
    FUND_CATEGORIES.map((cat) =>
      prisma.categoryBalance.upsert({
        where: {
          userId_category_month_year: {
            userId,
            category: cat,
            month,
            year,
          },
        },
        create: {
          userId,
          category: cat,
          month,
          year,
          balance: balances[cat],
        },
        update: {
          balance: balances[cat],
        },
      })
    )
  )

  return balances
}
