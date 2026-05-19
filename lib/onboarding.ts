import type { FundAllocation } from "@prisma/client"
import {
  DEFAULT_FUND_PERCENT_BPS,
  FUND_CATEGORIES,
  type FundCategory,
  fundCategoryPercentBps,
  fundCategoryDisplayValue,
} from "@/lib/fund-allocation-fields"

export const ONBOARDING_PATH = "/onboarding" as const

export type OnboardingStepId = "welcome" | "basics" | "accounts" | "buckets" | "done"

export const ONBOARDING_STEPS: OnboardingStepId[] = [
  "welcome",
  "basics",
  "accounts",
  "buckets",
  "done",
]

export type OnboardingAllocationDraft = {
  fixedCostsType: string
  fixedCostsValue: number
  savingsType: string
  savingsValue: number
  investmentType: string
  investmentValue: number
  guiltFreeSpendingType: string
  guiltFreeSpendingValue: number
}

export function isDefaultFundAllocation(row: FundAllocation): boolean {
  for (const category of FUND_CATEGORIES) {
    const typeKey = `${category}Type` as keyof FundAllocation
    if (row[typeKey] !== "percentage") return false
    if (fundCategoryPercentBps(row, category) !== DEFAULT_FUND_PERCENT_BPS[category]) {
      return false
    }
  }
  return true
}

export function allocationDraftFromApi(row: {
  fixedCostsType: string
  fixedCostsValue: number
  savingsType: string
  savingsValue: number
  investmentType: string
  investmentValue: number
  guiltFreeSpendingType: string
  guiltFreeSpendingValue: number
}): OnboardingAllocationDraft {
  return { ...row }
}

export function sumPercentageAllocation(draft: OnboardingAllocationDraft): number {
  let sum = 0
  for (const category of FUND_CATEGORIES) {
    const type = draft[`${category}Type` as keyof OnboardingAllocationDraft] as string
    if (type === "percentage") {
      sum += draft[`${category}Value` as keyof OnboardingAllocationDraft] as number
    }
  }
  return sum
}

export function validatePercentageAllocation(draft: OnboardingAllocationDraft): string | null {
  for (const category of FUND_CATEGORIES) {
    const type = draft[`${category}Type` as keyof OnboardingAllocationDraft] as string
    if (type !== "percentage") {
      return "During setup, use percentage splits for each bucket. You can switch to fixed amounts later in Fund Settings."
    }
    const value = draft[`${category}Value` as keyof OnboardingAllocationDraft] as number
    if (!Number.isFinite(value) || value < 0) {
      return "Enter a valid percentage for each bucket."
    }
  }
  const sum = sumPercentageAllocation(draft)
  if (Math.abs(sum - 100) > 0.01) {
    return `Percentages must add up to 100%. Current total: ${sum.toFixed(1)}%.`
  }
  return null
}

export const BUCKET_META: {
  category: FundCategory
  label: string
  hint: string
  valueKey: keyof OnboardingAllocationDraft
  typeKey: keyof OnboardingAllocationDraft
}[] = [
  {
    category: "fixedCosts",
    label: "Fixed costs",
    hint: "Rent, bills, subscriptions and the essentials.",
    valueKey: "fixedCostsValue",
    typeKey: "fixedCostsType",
  },
  {
    category: "savings",
    label: "Savings",
    hint: "Emergency fund and short-term goals.",
    valueKey: "savingsValue",
    typeKey: "savingsType",
  },
  {
    category: "investment",
    label: "Investments",
    hint: "Long-term wealth building.",
    valueKey: "investmentValue",
    typeKey: "investmentType",
  },
  {
    category: "guiltFreeSpending",
    label: "Guilt-free spending",
    hint: "Dining out, hobbies with no guilt attached.",
    valueKey: "guiltFreeSpendingValue",
    typeKey: "guiltFreeSpendingType",
  },
]

export function defaultAllocationDraft(): OnboardingAllocationDraft {
  return {
    fixedCostsType: "percentage",
    fixedCostsValue: 50,
    savingsType: "percentage",
    savingsValue: 20,
    investmentType: "percentage",
    investmentValue: 10,
    guiltFreeSpendingType: "percentage",
    guiltFreeSpendingValue: 20,
  }
}

/** Build draft from Prisma row for editing during onboarding. */
export function allocationDraftFromPrisma(
  row: FundAllocation,
  currencyCode: string,
): OnboardingAllocationDraft {
  return {
    fixedCostsType: row.fixedCostsType,
    fixedCostsValue: fundCategoryDisplayValue(row, "fixedCosts", currencyCode),
    savingsType: row.savingsType,
    savingsValue: fundCategoryDisplayValue(row, "savings", currencyCode),
    investmentType: row.investmentType,
    investmentValue: fundCategoryDisplayValue(row, "investment", currencyCode),
    guiltFreeSpendingType: row.guiltFreeSpendingType,
    guiltFreeSpendingValue: fundCategoryDisplayValue(
      row,
      "guiltFreeSpending",
      currencyCode,
    ),
  }
}
