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

/** Practical upper bound for categories without a monthly cap. */
const UNBOUNDED_ROOM = 1n << 120n

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

function roomUnderCap(
  category: CategoryKey,
  amounts: IncomeAllocationMinor,
  fundAllocation: FundAllocation,
  getAllocatedFromIncomeSoFar: (cat: CategoryKey) => MinorAmount
): MinorAmount {
  const cap = categoryCap(fundAllocation, category)
  if (cap == null) return UNBOUNDED_ROOM
  const assigned = addMinor(
    getAllocatedFromIncomeSoFar(category),
    amounts[category]
  )
  return cap > assigned ? cap - assigned : 0n
}

/** Spread a pool across categories with remaining cap room, weighted by target %. */
function distributePoolByTargetWeights(
  amounts: IncomeAllocationMinor,
  pool: MinorAmount,
  fundAllocation: FundAllocation,
  incomeMinor: MinorAmount,
  getAllocatedFromIncomeSoFar: (cat: CategoryKey) => MinorAmount
): MinorAmount {
  let remaining = pool

  while (remaining > 0n) {
    let weightSum = 0n
    const eligible: CategoryKey[] = []

    for (const cat of FUND_CATEGORIES) {
      const room = roomUnderCap(
        cat,
        amounts,
        fundAllocation,
        getAllocatedFromIncomeSoFar
      )
      if (room <= 0n) continue
      const target = allocateCategory(fundAllocation, cat, incomeMinor)
      if (target <= 0n) continue
      eligible.push(cat)
      weightSum = addMinor(weightSum, target)
    }

    if (eligible.length === 0 || weightSum === 0n) break

    let distributedThisPass = 0n
    for (const cat of eligible) {
      const room = roomUnderCap(
        cat,
        amounts,
        fundAllocation,
        getAllocatedFromIncomeSoFar
      )
      const target = allocateCategory(fundAllocation, cat, incomeMinor)
      const ideal = (remaining * target) / weightSum
      const give = ideal > room ? room : ideal
      if (give <= 0n) continue
      amounts[cat] = addMinor(amounts[cat], give)
      distributedThisPass = addMinor(distributedThisPass, give)
    }

    if (distributedThisPass === 0n) break
    remaining -= distributedThisPass
  }

  return remaining
}

export type IncomeEntryAllocationSource = {
  excludeFromAllocation?: boolean | null
  amount: bigint
  allocationFixedCosts?: bigint | null
  allocationSavings?: bigint | null
  allocationInvestment?: bigint | null
  allocationGuiltFreeSpending?: bigint | null
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
    if (entry.excludeFromAllocation) continue

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
    distributePoolByTargetWeights(
      amounts,
      excessPool,
      fundAllocation,
      incomeMinor,
      getAllocatedFromIncomeSoFar
    )
  }

  const unallocated = subtractMinor(incomeMinor, assignmentTotal(amounts))
  if (unallocated > 0n) {
    let leftover = distributePoolByTargetWeights(
      amounts,
      unallocated,
      fundAllocation,
      incomeMinor,
      getAllocatedFromIncomeSoFar
    )

    while (leftover > 0n) {
      const ordered = [...FUND_CATEGORIES]
        .map((cat) => ({
          cat,
          room: roomUnderCap(
            cat,
            amounts,
            fundAllocation,
            getAllocatedFromIncomeSoFar
          ),
          weight: allocateCategory(fundAllocation, cat, incomeMinor),
        }))
        .filter((item) => item.room > 0n && item.weight > 0n)
        .sort((a, b) => (a.weight > b.weight ? -1 : a.weight < b.weight ? 1 : 0))

      if (ordered.length === 0) break

      let assigned = false
      for (const item of ordered) {
        if (leftover <= 0n) break
        amounts[item.cat] = addMinor(amounts[item.cat], 1n)
        leftover -= 1n
        assigned = true
      }
      if (!assigned) break
    }

    if (leftover > 0n) {
      amounts.savings = addMinor(amounts.savings, leftover)
    }
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
