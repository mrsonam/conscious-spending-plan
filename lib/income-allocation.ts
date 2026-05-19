import {
  addMinor,
  percentOfMinor,
  subtractMinor,
  type MinorAmount,
} from "@/lib/money"
import { serializeMoneyForApi } from "@/lib/money-api"
import {
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

export function computeIncomeAllocationsMinor(
  incomeMinor: MinorAmount,
  fundAllocation: FundAllocation,
  currencyCode: string,
  getAllocatedFromIncomeSoFar: (cat: CategoryKey) => MinorAmount
): IncomeAllocationMinor {
  let fixedCosts = allocateCategory(fundAllocation, "fixedCosts", incomeMinor)
  let investment = allocateCategory(fundAllocation, "investment", incomeMinor)
  let guiltFreeSpending = allocateCategory(
    fundAllocation,
    "guiltFreeSpending",
    incomeMinor
  )
  let savings = allocateCategory(fundAllocation, "savings", incomeMinor)

  let excessToRedistribute = 0n

  const capped: Array<{
    key: CategoryKey
    cap: bigint | null | undefined
    get: () => MinorAmount
    set: (v: MinorAmount) => void
  }> = [
    {
      key: "fixedCosts",
      cap: fundAllocation.fixedCostsCap,
      get: () => fixedCosts,
      set: (v) => {
        fixedCosts = v
      },
    },
    {
      key: "investment",
      cap: fundAllocation.investmentCap,
      get: () => investment,
      set: (v) => {
        investment = v
      },
    },
    {
      key: "guiltFreeSpending",
      cap: fundAllocation.guiltFreeSpendingCap,
      get: () => guiltFreeSpending,
      set: (v) => {
        guiltFreeSpending = v
      },
    },
    {
      key: "savings",
      cap: fundAllocation.savingsCap,
      get: () => savings,
      set: (v) => {
        savings = v
      },
    },
  ]

  for (const item of capped) {
    const { amount, excess } = applyCap(
      item.get(),
      item.cap,
      getAllocatedFromIncomeSoFar(item.key)
    )
    item.set(amount)
    excessToRedistribute += excess
  }

  savings = addMinor(savings, excessToRedistribute)

  const allocated = addMinor(
    fixedCosts,
    investment,
    guiltFreeSpending,
    savings
  )
  const unallocated = subtractMinor(incomeMinor, allocated)
  if (unallocated !== 0n) {
    savings = addMinor(savings, unallocated)
  }

  return { fixedCosts, savings, investment, guiltFreeSpending }
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
