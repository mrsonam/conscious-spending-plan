import {
  addMinor,
  coerceMinor,
  percentOfMinor,
  subtractMinor,
  type MinorAmount,
} from "@/lib/money"
import { serializeMoneyForApi } from "@/lib/money-api"
import {
  FUND_CATEGORIES,
  fundCategoryFixedMinor,
  fundCategoryPercentBps,
  type FundCategory,
} from "@/lib/fund-allocation-fields"
import type { FundAllocation } from "@prisma/client"

export type CategoryKey = FundCategory

export type IncomeAllocationMinor = Record<CategoryKey, MinorAmount>

function allocateCategory(
  fundAllocation: FundAllocation,
  category: CategoryKey,
  incomeMinor: MinorAmount
): MinorAmount {
  const typeKey = `${category}Type` as keyof FundAllocation
  const type = fundAllocation[typeKey] as string
  if (type === "fixed") {
    return fundCategoryFixedMinor(fundAllocation, category) ?? 0n
  }
  const bps = fundCategoryPercentBps(fundAllocation, category)
  return percentOfMinor(incomeMinor, bps / 100)
}

function categoryCap(
  fundAllocation: FundAllocation,
  category: CategoryKey
): bigint | null | undefined {
  return fundAllocation[`${category}Cap` as keyof FundAllocation] as
    | bigint
    | null
    | undefined
}

function applyCap(
  amount: MinorAmount,
  cap: bigint | null | undefined,
  alreadyAllocated: MinorAmount
): { amount: MinorAmount; excess: MinorAmount } {
  if (cap == null) return { amount, excess: 0n }
  const room = cap > alreadyAllocated ? cap - alreadyAllocated : 0n
  if (amount <= room) return { amount, excess: 0n }
  return { amount: room, excess: amount - room }
}

function assignmentTotal(amounts: IncomeAllocationMinor): MinorAmount {
  return addMinor(
    amounts.fixedCosts,
    amounts.savings,
    amounts.investment,
    amounts.guiltFreeSpending
  )
}

export type IncomeEntryAllocationSource = {
  excludeFromAllocation?: boolean | null
  amount: bigint
  allocationFixedCosts?: bigint | null
  allocationSavings?: bigint | null
  allocationInvestment?: bigint | null
  allocationGuiltFreeSpending?: bigint | null
}

/** Income excluded from the fund plan still lands in the savings bucket. */
export function excludedIncomeSavingsAllocationMinor(
  incomeMinor: MinorAmount
): IncomeAllocationMinor {
  return {
    fixedCosts: 0n,
    savings: incomeMinor,
    investment: 0n,
    guiltFreeSpending: 0n,
  }
}

function savingsFromExcludedEntry(entry: IncomeEntryAllocationSource): MinorAmount {
  if (entry.allocationSavings != null) {
    return coerceMinor(entry.allocationSavings)
  }
  return coerceMinor(entry.amount)
}

/** Sum prior income-entry allocations for cap checks on the next entry. */
export function buildAllocatedSoFarFromEntries(
  entries: IncomeEntryAllocationSource[],
  fundAllocation: FundAllocation,
  currencyCode: string
): Record<CategoryKey, MinorAmount> {
  const allocatedSoFar: Record<CategoryKey, MinorAmount> = {
    fixedCosts: 0n,
    savings: 0n,
    investment: 0n,
    guiltFreeSpending: 0n,
  }

  for (const entry of entries) {
    if (entry.excludeFromAllocation) {
      allocatedSoFar.savings = addMinor(
        allocatedSoFar.savings,
        savingsFromExcludedEntry(entry)
      )
      continue
    }

    const hasStored =
      entry.allocationFixedCosts != null ||
      entry.allocationSavings != null ||
      entry.allocationInvestment != null ||
      entry.allocationGuiltFreeSpending != null

    if (hasStored) {
      allocatedSoFar.fixedCosts = addMinor(
        allocatedSoFar.fixedCosts,
        coerceMinor(entry.allocationFixedCosts ?? 0n)
      )
      allocatedSoFar.savings = addMinor(
        allocatedSoFar.savings,
        coerceMinor(entry.allocationSavings ?? 0n)
      )
      allocatedSoFar.investment = addMinor(
        allocatedSoFar.investment,
        coerceMinor(entry.allocationInvestment ?? 0n)
      )
      allocatedSoFar.guiltFreeSpending = addMinor(
        allocatedSoFar.guiltFreeSpending,
        coerceMinor(entry.allocationGuiltFreeSpending ?? 0n)
      )
      continue
    }

    const incomeMinor = coerceMinor(entry.amount)
    const alloc = computeIncomeAllocationsMinor(
      incomeMinor,
      fundAllocation,
      currencyCode,
      (cat) => allocatedSoFar[cat]
    )
    allocatedSoFar.fixedCosts = addMinor(
      allocatedSoFar.fixedCosts,
      alloc.fixedCosts
    )
    allocatedSoFar.savings = addMinor(allocatedSoFar.savings, alloc.savings)
    allocatedSoFar.investment = addMinor(
      allocatedSoFar.investment,
      alloc.investment
    )
    allocatedSoFar.guiltFreeSpending = addMinor(
      allocatedSoFar.guiltFreeSpending,
      alloc.guiltFreeSpending
    )
  }

  return allocatedSoFar
}

export function computeIncomeAllocationsMinor(
  incomeMinor: MinorAmount,
  fundAllocation: FundAllocation,
  currencyCode: string,
  getAllocatedFromIncomeSoFar: (cat: CategoryKey) => MinorAmount
): IncomeAllocationMinor {
  const amounts: IncomeAllocationMinor = {
    fixedCosts: allocateCategory(fundAllocation, "fixedCosts", incomeMinor),
    savings: allocateCategory(fundAllocation, "savings", incomeMinor),
    investment: allocateCategory(fundAllocation, "investment", incomeMinor),
    guiltFreeSpending: allocateCategory(
      fundAllocation,
      "guiltFreeSpending",
      incomeMinor
    ),
  }

  let excessPool = 0n
  for (const cat of FUND_CATEGORIES) {
    const { amount, excess } = applyCap(
      amounts[cat],
      categoryCap(fundAllocation, cat),
      getAllocatedFromIncomeSoFar(cat)
    )
    amounts[cat] = amount
    excessPool = addMinor(excessPool, excess)
  }

  if (excessPool > 0n) {
    amounts.savings = addMinor(amounts.savings, excessPool)
  }

  const unallocated = subtractMinor(incomeMinor, assignmentTotal(amounts))
  if (unallocated > 0n) {
    amounts.savings = addMinor(amounts.savings, unallocated)
  }

  return amounts
}

export function incomeAllocationToApi(
  incomeMinor: MinorAmount,
  alloc: IncomeAllocationMinor,
  currencyCode: string
) {
  const toD = (m: MinorAmount) => serializeMoneyForApi(m, currencyCode)
  const income = toD(incomeMinor)
  return {
    income,
    fixedCosts: toD(alloc.fixedCosts),
    savings: toD(alloc.savings),
    investment: toD(alloc.investment),
    guiltFreeSpending: toD(alloc.guiltFreeSpending),
    total: income,
  }
}
