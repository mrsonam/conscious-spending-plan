import { serializeMoneyForApi } from "@/lib/money-api"

type RecordLike = Record<string, unknown>

/** Map selected bigint money fields on a record to dollar numbers for JSON. */
export function mapMoneyFieldsToApi<T extends RecordLike>(
  record: T,
  currencyCode: string,
  fields: readonly string[]
): T {
  const out = { ...record } as T
  for (const field of fields) {
    if (field in out && out[field] != null) {
      ;(out as RecordLike)[field] = serializeMoneyForApi(
        out[field] as bigint,
        currencyCode
      )
    }
  }
  return out
}

export function mapMoneyListToApi<T extends RecordLike>(
  records: T[],
  currencyCode: string,
  fields: readonly string[]
): T[] {
  return records.map((r) => mapMoneyFieldsToApi(r, currencyCode, fields))
}

/** Income entry rows often include a nested account with bigint balances. */
export function mapIncomeEntryToApi<T extends RecordLike>(
  record: T,
  currencyCode: string
): T {
  const out = mapMoneyFieldsToApi(record, currencyCode, INCOME_MONEY_FIELDS)
  const account = (record as RecordLike).account
  if (account && typeof account === "object" && !Array.isArray(account)) {
    ;(out as RecordLike).account = mapMoneyFieldsToApi(
      account as RecordLike,
      currencyCode,
      ACCOUNT_MONEY_FIELDS
    )
  }
  return out
}

export function mapIncomeEntryListToApi<T extends RecordLike>(
  records: T[],
  currencyCode: string
): T[] {
  return records.map((r) => mapIncomeEntryToApi(r, currencyCode))
}

/** Walk a JSON-ready object and convert any remaining bigint money values. */
export function deepSerializeBigIntsForApi(
  value: unknown,
  currencyCode: string
): unknown {
  if (typeof value === "bigint") {
    return serializeMoneyForApi(value, currencyCode)
  }
  if (value instanceof Date) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepSerializeBigIntsForApi(item, currencyCode))
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      out[key] = deepSerializeBigIntsForApi(nested, currencyCode)
    }
    return out
  }
  return value
}

export const ACCOUNT_MONEY_FIELDS = ["balance", "startingFunds"] as const
export const AMOUNT_ONLY_FIELDS = ["amount"] as const
export const LOAN_MONEY_FIELDS = ["amount", "repaidAmount"] as const
export const INCOME_MONEY_FIELDS = [
  "amount",
  "allocationFixedCosts",
  "allocationSavings",
  "allocationInvestment",
  "allocationGuiltFreeSpending",
] as const
export const HOLDING_MONEY_FIELDS = ["amount", "pricePerUnit", "brokerageFee"] as const
export const FUND_CAP_FIELDS = [
  "fixedCostsCap",
  "savingsCap",
  "investmentCap",
  "guiltFreeSpendingCap",
] as const
export const CATEGORY_BALANCE_FIELDS = ["balance"] as const
export const MONTH_CLOSING_FIELDS = ["remaining", "overspent"] as const

export function mapAccountToApi<T extends RecordLike>(
  record: T,
  currencyCode: string
): T {
  return mapMoneyFieldsToApi(record, currencyCode, ACCOUNT_MONEY_FIELDS)
}

export function mapExpenseToApi<T extends RecordLike>(
  record: T,
  currencyCode: string
): T {
  const out = mapMoneyFieldsToApi(record, currencyCode, AMOUNT_ONLY_FIELDS)
  const account = (record as RecordLike).account
  if (account && typeof account === "object" && !Array.isArray(account)) {
    ;(out as RecordLike).account = mapAccountToApi(
      account as RecordLike,
      currencyCode
    )
  }
  return out
}

export function mapTransferToApi<T extends RecordLike>(
  record: T,
  currencyCode: string
): T {
  const out = mapMoneyFieldsToApi(record, currencyCode, AMOUNT_ONLY_FIELDS)
  for (const key of ["fromAccount", "toAccount"] as const) {
    const nested = (record as RecordLike)[key]
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      ;(out as RecordLike)[key] = mapAccountToApi(
        nested as RecordLike,
        currencyCode
      )
    }
  }
  return out
}
