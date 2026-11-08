import { EXPENSE_CATEGORIES, FUND_CATEGORIES } from "@/lib/expense-page-constants"
import { parseMoneyFromApi } from "@/lib/money-api"

export type TransactionType = "expense" | "income"

/** One transaction as Claude proposes it (amounts in major units, e.g. dollars). */
export type ProposedTransaction = {
  type: TransactionType
  amount: number
  date: string
  description: string
  accountId?: string
  fundCategory?: string
  expenseCategory?: string
  allocateToBudget?: boolean
}

export type ValidationContext = {
  accounts: Array<{ id: string; name: string; balanceMinor: bigint }>
  defaultAccountId: string | null
  currency: string
}

export type ValidatedTransaction = {
  amountMinor: bigint | null
  /** Resolved account (explicit or the user's default); null when neither exists. */
  accountId: string | null
  issues: string[]
}

const FUND_VALUES = new Set<string>(FUND_CATEGORIES.map((c) => c.value))
const EXPENSE_VALUES = new Set<string>(EXPENSE_CATEGORIES.map((c) => c.value))
const DAY_MS = 24 * 60 * 60 * 1000

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value)
}

export function validateTransaction(
  tx: ProposedTransaction,
  ctx: ValidationContext,
): ValidatedTransaction {
  const issues: string[] = []

  let amountMinor: bigint | null = null
  try {
    amountMinor = parseMoneyFromApi(tx.amount, ctx.currency)
  } catch {
    amountMinor = null
  }
  if (amountMinor == null || amountMinor <= 0n) {
    issues.push("Amount must be a number greater than 0.")
    amountMinor = null
  }

  if (!isIsoDate(tx.date)) issues.push("Date must be a real date in YYYY-MM-DD format.")
  if (!tx.description.trim()) issues.push("Description is required.")

  let accountId: string | null = null
  if (tx.accountId) {
    if (ctx.accounts.some((a) => a.id === tx.accountId)) accountId = tx.accountId
    else issues.push(`Unknown account "${tx.accountId}". Use an id from get_logging_context.`)
  } else if (ctx.defaultAccountId) {
    accountId = ctx.defaultAccountId
  } else if (tx.type === "expense") {
    issues.push("No account given and the user has no default account set.")
  }

  if (tx.type === "expense") {
    if (!tx.fundCategory || !FUND_VALUES.has(tx.fundCategory)) {
      issues.push(`Invalid fund category "${tx.fundCategory ?? ""}".`)
    }
    if (!tx.expenseCategory || !EXPENSE_VALUES.has(tx.expenseCategory)) {
      issues.push(`Invalid expense category "${tx.expenseCategory ?? ""}".`)
    }
  }

  return { amountMinor, accountId, issues }
}

export type ExistingTransaction = {
  id: string
  type: TransactionType
  amountMinor: bigint
  date: Date
  description: string | null
}

/** Already-logged rows of the same type and amount dated within `windowDays` of the candidate. */
export function findPossibleDuplicates(
  candidate: { type: TransactionType; amountMinor: bigint; date: string },
  existing: ExistingTransaction[],
  windowDays = 3,
): ExistingTransaction[] {
  const target = new Date(`${candidate.date}T00:00:00Z`).getTime()
  return existing.filter(
    (e) =>
      e.type === candidate.type &&
      e.amountMinor === candidate.amountMinor &&
      Math.abs(e.date.getTime() - target) <= windowDays * DAY_MS + DAY_MS / 2,
  )
}
