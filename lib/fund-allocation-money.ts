import type { FundAllocation } from "@prisma/client"
import {
  applyFundCategoryValueFromApi,
  attachLegacyValueFields,
  FUND_CATEGORIES,
  parseFundCapsFromApi,
  serializeFundCaps,
} from "@/lib/fund-allocation-fields"

const LEGACY_VALUE_SUFFIX = "Value"

/** Strip computed API-only keys before Prisma write. */
export function fundAllocationPrismaData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...data }
  for (const category of FUND_CATEGORIES) {
    delete out[`${category}${LEGACY_VALUE_SUFFIX}`]
  }
  return out
}

export function fundAllocationToApi(
  row: FundAllocation,
  currencyCode: string
): Record<string, unknown> {
  const out = attachLegacyValueFields(row, currencyCode)
  Object.assign(out, serializeFundCaps(row, currencyCode))
  return out
}

export function fundAllocationFromApi(
  data: Record<string, unknown>,
  currencyCode: string
): Record<string, unknown> {
  const out = { ...data }
  parseFundCapsFromApi(out, currencyCode)
  for (const category of FUND_CATEGORIES) {
    applyFundCategoryValueFromApi(out, category, currencyCode)
  }
  return fundAllocationPrismaData(out)
}
