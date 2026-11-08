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
  savingGoalId?: string
}

export type ValidationContext = {
  accounts: Array<{ id: string; name: string; balanceMinor: bigint }>
  defaultAccountId: string | null
  currency: string
  /** Active saving goals; omitted when the caller doesn't need goal checks. */
  savingGoals?: Array<{ id: string }>
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

  if (tx.savingGoalId) {
    if (tx.type !== "expense" || tx.fundCategory !== "savings") {
      issues.push("A saving goal can only be linked to an expense in the savings fund category.")
    } else if (!ctx.savingGoals?.some((g) => g.id === tx.savingGoalId)) {
      issues.push(`Unknown or inactive saving goal "${tx.savingGoalId}".`)
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

/** First and last day (YYYY-MM-DD) of the month containing `date`, as the income page sends them. */
export function monthBounds(date: string) {
  const [y, m] = date.split("-").map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, "0")
  return { periodStart: `${y}-${mm}-01`, periodEnd: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` }
}

export type SpendingRow = {
  amountMinor: bigint
  fundCategory: string | null
  expenseCategory: string | null
}

/** Totals per expense category and per fund pillar, largest first. */
export function summarizeSpending(rows: SpendingRow[]) {
  const byExpense = new Map<string, { totalMinor: bigint; count: number }>()
  const byFund = new Map<string, { totalMinor: bigint; count: number }>()
  let totalMinor = 0n
  const add = (map: typeof byExpense, key: string, amount: bigint) => {
    const row = map.get(key) ?? { totalMinor: 0n, count: 0 }
    row.totalMinor += amount
    row.count += 1
    map.set(key, row)
  }
  for (const r of rows) {
    totalMinor += r.amountMinor
    add(byExpense, r.expenseCategory || "uncategorized", r.amountMinor)
    add(byFund, r.fundCategory || "uncategorized", r.amountMinor)
  }
  const sorted = (map: typeof byExpense) =>
    [...map.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => (b.totalMinor > a.totalMinor ? 1 : b.totalMinor < a.totalMinor ? -1 : 0))
  return { totalMinor, count: rows.length, byExpenseCategory: sorted(byExpense), byFundCategory: sorted(byFund) }
}
