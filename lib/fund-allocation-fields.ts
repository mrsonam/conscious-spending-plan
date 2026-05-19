import type { FundAllocation } from "@prisma/client"
import { coerceMinor, dollarsToMinor, minorToDollars } from "@/lib/money"
import { parseMoneyFromApi, serializeMoneyForApi } from "@/lib/money-api"

export const FUND_CATEGORIES = [
  "fixedCosts",
  "savings",
  "investment",
  "guiltFreeSpending",
] as const

export type FundCategory = (typeof FUND_CATEGORIES)[number]

export const DEFAULT_FUND_PERCENT_BPS: Record<FundCategory, number> = {
  fixedCosts: 5000,
  savings: 2000,
  investment: 1000,
  guiltFreeSpending: 2000,
}

function typeKey(category: FundCategory): keyof FundAllocation {
  return `${category}Type` as keyof FundAllocation
}

function percentBpsKey(category: FundCategory): keyof FundAllocation {
  return `${category}PercentBps` as keyof FundAllocation
}

function fixedMinorKey(category: FundCategory): keyof FundAllocation {
  return `${category}FixedMinor` as keyof FundAllocation
}

function valueKey(category: FundCategory): `${FundCategory}Value` {
  return `${category}Value`
}

function capKey(category: FundCategory): keyof FundAllocation {
  return `${category}Cap` as keyof FundAllocation
}

/** UI/API display value: percent as major units (50 = 50%), fixed as dollars. */
export function fundCategoryDisplayValue(
  row: FundAllocation,
  category: FundCategory,
  currencyCode: string
): number {
  const type = row[typeKey(category)] as string
  if (type === "fixed") {
    const minor = row[fixedMinorKey(category)] as bigint | null
    return minor != null ? minorToDollars(minor, currencyCode) : 0
  }
  const bps = row[percentBpsKey(category)] as number
  return bps / 100
}

export function fundCategoryFixedMinor(
  row: FundAllocation,
  category: FundCategory
): bigint | null {
  const type = row[typeKey(category)] as string
  if (type !== "fixed") return null
  const minor = row[fixedMinorKey(category)] as bigint | null
  return minor != null ? coerceMinor(minor) : null
}

export function fundCategoryPercentBps(
  row: FundAllocation,
  category: FundCategory
): number {
  return row[percentBpsKey(category)] as number
}

/** Apply legacy *Value + *Type fields from API body onto Prisma-shaped data. */
export function applyFundCategoryValueFromApi(
  data: Record<string, unknown>,
  category: FundCategory,
  currencyCode: string
): void {
  const type = data[typeKey(category)] as string | undefined
  const legacyValue = data[valueKey(category)]
  if (legacyValue == null || legacyValue === "" || type == null) return

  if (type === "percentage") {
    const pct = Number(legacyValue)
    if (!Number.isFinite(pct) || pct < 0) return
    data[percentBpsKey(category)] = Math.round(pct * 100)
    data[fixedMinorKey(category)] = null
  } else if (type === "fixed") {
    const minor = parseMoneyFromApi(legacyValue, currencyCode)
    data[fixedMinorKey(category)] = minor
  }
  delete data[valueKey(category)]
}

export function attachLegacyValueFields(
  row: FundAllocation,
  currencyCode: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const category of FUND_CATEGORIES) {
    out[valueKey(category)] = fundCategoryDisplayValue(row, category, currencyCode)
  }
  return out
}

export const FUND_CAP_FIELDS = [
  "fixedCostsCap",
  "savingsCap",
  "investmentCap",
  "guiltFreeSpendingCap",
] as const

export function serializeFundCaps(
  row: FundAllocation,
  currencyCode: string
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of FUND_CAP_FIELDS) {
    const v = row[field]
    out[field] = v != null ? serializeMoneyForApi(v, currencyCode) : null
  }
  return out
}

export function parseFundCapsFromApi(
  data: Record<string, unknown>,
  currencyCode: string
): void {
  for (const field of FUND_CAP_FIELDS) {
    if (field in data && data[field] != null && data[field] !== "") {
      data[field] = parseMoneyFromApi(data[field], currencyCode)
    }
  }
}

export const DEFAULT_FUND_ALLOCATION_DATA = {
  fixedCostsType: "percentage",
  fixedCostsPercentBps: DEFAULT_FUND_PERCENT_BPS.fixedCosts,
  savingsType: "percentage",
  savingsPercentBps: DEFAULT_FUND_PERCENT_BPS.savings,
  investmentType: "percentage",
  investmentPercentBps: DEFAULT_FUND_PERCENT_BPS.investment,
  guiltFreeSpendingType: "percentage",
  guiltFreeSpendingPercentBps: DEFAULT_FUND_PERCENT_BPS.guiltFreeSpending,
} as const

/** Default row for create (Prisma). */
export function defaultFundAllocationCreate(userId: string) {
  return {
    userId,
    ...DEFAULT_FUND_ALLOCATION_DATA,
  }
}

/** Nested create under User (no userId). */
export function defaultFundAllocationNestedCreate() {
  return { ...DEFAULT_FUND_ALLOCATION_DATA }
}
