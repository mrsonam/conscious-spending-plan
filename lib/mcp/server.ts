import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { POST as postExpense } from "@/app/api/expenses/route"
import { POST as postIncomeBulk } from "@/app/api/income-entries/bulk/route"
import { EXPENSE_CATEGORIES, FUND_CATEGORIES } from "@/lib/expense-page-constants"
import { serializeMoneyForApi } from "@/lib/money-api"
import { prisma } from "@/lib/prisma"
import { getUserDisplayCurrency } from "@/lib/user-currency"
import {
  findPossibleDuplicates,
  validateTransaction,
  type ExistingTransaction,
  type ProposedTransaction,
} from "@/lib/mcp/transactions"

export type McpCaller = {
  userId: string
  /** Raw bearer token, forwarded so writes go through the existing API routes unchanged. */
  token: string
  origin: string
}

const INSTRUCTIONS = `Conscious Spending Plan: the user's personal budgeting app.

Workflow for logging income and expenses (from chat text or screenshots of bank transactions):
1. Call get_logging_context to load the user's accounts, categories and recent history.
2. Extract each transaction. Use the user's recent history to pick categories the way they usually do.
3. Call preview_transactions with the full list.
4. Show the user a clear table (date, description, amount, income/expense, category, account) including any duplicate or balance warnings, and ask them to confirm or correct it.
5. Only after the user explicitly confirms, call log_transactions with exactly the confirmed list.
Never log anything the user has not confirmed in this conversation. Skip transfers between the user's own accounts unless they ask for them.`

const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  // Positivity is checked per row by validateTransaction so the preview can report it.
  amount: z.number().describe("Positive amount in major units, e.g. 42.5"),
  date: z.string().describe("YYYY-MM-DD"),
  description: z.string().describe("Short merchant/payer description, e.g. 'Woolworths Newtown'"),
  accountId: z
    .string()
    .optional()
    .describe("Account id from get_logging_context; omit to use the user's default account"),
  fundCategory: z
    .enum(FUND_CATEGORIES.map((c) => c.value) as [string, ...string[]])
    .optional()
    .describe("Expenses only: the spending-plan pillar the money comes from"),
  expenseCategory: z
    .enum(EXPENSE_CATEGORIES.map((c) => c.value) as [string, ...string[]])
    .optional()
    .describe("Expenses only: the detailed category"),
  allocateToBudget: z
    .boolean()
    .optional()
    .describe(
      "Income only: true (default) for regular income like salary that gets split across the plan; false for refunds, reimbursements or one-offs that shouldn't be budgeted",
    ),
})

const transactionsInput = {
  transactions: z.array(transactionSchema).min(1).max(50),
}

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] }
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true }
}

async function loadContext(userId: string) {
  const [currency, user, accounts] = await Promise.all([
    getUserDisplayCurrency(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { defaultAccountId: true } }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, bankName: true, accountType: true, balance: true },
      orderBy: { createdAt: "asc" },
    }),
  ])
  return {
    currency,
    defaultAccountId: user?.defaultAccountId ?? null,
    accounts: accounts.map((a) => ({ ...a, balanceMinor: a.balance })),
  }
}

async function loadExistingAround(userId: string, dates: string[]): Promise<ExistingTransaction[]> {
  const times = dates
    .map((d) => new Date(`${d}T00:00:00Z`).getTime())
    .filter((t) => !Number.isNaN(t))
  if (times.length === 0) return []
  const pad = 4 * 24 * 60 * 60 * 1000
  const range = { gte: new Date(Math.min(...times) - pad), lte: new Date(Math.max(...times) + pad) }
  const [expenses, income] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: range },
      select: { id: true, amount: true, date: true, description: true },
    }),
    prisma.incomeEntry.findMany({
      where: { userId, date: range },
      select: { id: true, amount: true, date: true, description: true },
    }),
  ])
  return [
    ...expenses.map((e) => ({ ...e, type: "expense" as const, amountMinor: e.amount })),
    ...income.map((e) => ({ ...e, type: "income" as const, amountMinor: e.amount })),
  ]
}

async function callRoute(
  handler: (req: Request) => Promise<Response>,
  caller: McpCaller,
  path: string,
  body: unknown,
) {
  const res = await handler(
    new Request(`${caller.origin}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${caller.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  )
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: res.ok, data }
}

export function createMcpServer(caller: McpCaller) {
  const server = new McpServer(
    { name: "conscious-spending-plan", version: "1.0.0" },
    { instructions: INSTRUCTIONS },
  )

  server.registerTool(
    "get_logging_context",
    {
      title: "Get accounts, categories and recent history",
      description:
        "Load everything needed to categorize transactions: the user's accounts (with ids and balances), default account, currency, valid fund and expense categories, and their most recent expenses and income as examples of how they categorize. Call this first.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const ctx = await loadContext(caller.userId)
      const money = (m: bigint) => serializeMoneyForApi(m, ctx.currency)
      const [expenses, income] = await Promise.all([
        prisma.expense.findMany({
          where: { userId: caller.userId },
          orderBy: { date: "desc" },
          take: 40,
          select: {
            date: true,
            description: true,
            amount: true,
            category: true,
            expenseCategory: true,
            account: { select: { name: true } },
          },
        }),
        prisma.incomeEntry.findMany({
          where: { userId: caller.userId },
          orderBy: { date: "desc" },
          take: 15,
          select: {
            date: true,
            description: true,
            amount: true,
            excludeFromAllocation: true,
            account: { select: { name: true } },
          },
        }),
      ])
      return json({
        currency: ctx.currency,
        today: new Date().toISOString().slice(0, 10),
        defaultAccountId: ctx.defaultAccountId,
        accounts: ctx.accounts.map((a) => ({
          id: a.id,
          name: a.name,
          bank: a.bankName,
          type: a.accountType,
          balance: money(a.balance),
        })),
        fundCategories: FUND_CATEGORIES,
        expenseCategories: EXPENSE_CATEGORIES,
        recentExpenses: expenses.map((e) => ({
          date: e.date.toISOString().slice(0, 10),
          description: e.description,
          amount: money(e.amount),
          fundCategory: e.category,
          expenseCategory: e.expenseCategory,
          account: e.account?.name,
        })),
        recentIncome: income.map((e) => ({
          date: e.date.toISOString().slice(0, 10),
          description: e.description,
          amount: money(e.amount),
          allocateToBudget: !e.excludeFromAllocation,
          account: e.account?.name,
        })),
      })
    },
  )

  server.registerTool(
    "preview_transactions",
    {
      title: "Check transactions before logging",
      description:
        "Validate a list of proposed income/expense transactions without saving anything. Returns, per transaction, the resolved account, any problems, possible duplicates already logged (same amount within 3 days), and whether an account would go below zero. Show the result to the user and ask them to confirm before calling log_transactions.",
      inputSchema: transactionsInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ transactions }) => {
      const ctx = await loadContext(caller.userId)
      const existing = await loadExistingAround(
        caller.userId,
        transactions.map((t) => t.date),
      )
      const remaining = new Map(ctx.accounts.map((a) => [a.id, a.balanceMinor]))
      const accountName = (id: string | null) =>
        ctx.accounts.find((a) => a.id === id)?.name ?? null

      const rows = transactions.map((t, index) => {
        const v = validateTransaction(t as ProposedTransaction, ctx)
        const warnings: string[] = []
        if (v.amountMinor != null && v.accountId && t.type === "expense") {
          const left = (remaining.get(v.accountId) ?? 0n) - v.amountMinor
          remaining.set(v.accountId, left)
          if (left < 0n) {
            warnings.push(
              `Not enough balance in ${accountName(v.accountId)}; the app will reject this expense.`,
            )
          }
        }
        const duplicates =
          v.amountMinor != null && v.issues.length === 0
            ? findPossibleDuplicates({ type: t.type, amountMinor: v.amountMinor, date: t.date }, existing)
            : []
        if (duplicates.length > 0) {
          warnings.push(
            `Possible duplicate of: ${duplicates
              .map((d) => `"${d.description ?? "(no description)"}" on ${d.date.toISOString().slice(0, 10)}`)
              .join(", ")}`,
          )
        }
        return {
          index,
          ...t,
          account: accountName(v.accountId),
          ready: v.issues.length === 0,
          problems: v.issues,
          warnings,
        }
      })

      return json({
        currency: ctx.currency,
        readyCount: rows.filter((r) => r.ready).length,
        transactions: rows,
        next: "Show these to the user and wait for explicit confirmation before calling log_transactions.",
      })
    },
  )

  server.registerTool(
    "log_transactions",
    {
      title: "Log confirmed transactions",
      description:
        "Save income and expenses to the user's account. ONLY call this after showing the user the preview and receiving their explicit confirmation in this conversation; pass exactly the confirmed transactions. Each expense is deducted from its account balance; income is added and (unless allocateToBudget is false) split across the spending plan.",
      inputSchema: transactionsInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ transactions }) => {
      const ctx = await loadContext(caller.userId)
      const validated = transactions.map((t) => ({
        t,
        v: validateTransaction(t as ProposedTransaction, ctx),
      }))
      const invalid = validated
        .map(({ v }, index) => ({ index, problems: v.issues }))
        .filter((r) => r.problems.length > 0)
      if (invalid.length > 0) {
        return errorResult(
          `Nothing was logged. Fix these first (run preview_transactions again):\n${JSON.stringify(invalid, null, 2)}`,
        )
      }

      const results: Array<{
        index: number
        type: string
        description: string
        amount: number
        logged: boolean
        id?: string
        error?: string
      }> = []

      for (const [index, { t, v }] of validated.entries()) {
        const base = { index, type: t.type, description: t.description, amount: t.amount }
        if (t.type === "expense") {
          const { ok, data } = await callRoute(postExpense, caller, "/api/expenses", {
            amount: t.amount,
            description: t.description,
            category: t.fundCategory,
            expenseCategory: t.expenseCategory,
            date: t.date,
            accountId: v.accountId,
          })
          const expense = data.expense as { id?: string } | undefined
          results.push(
            ok
              ? { ...base, logged: true, id: expense?.id }
              : { ...base, logged: false, error: String(data.error ?? "Failed to log expense") },
          )
        } else {
          const { ok, data } = await callRoute(postIncomeBulk, caller, "/api/income-entries/bulk", {
            accountId: v.accountId ?? undefined,
            entries: [
              {
                amount: t.amount,
                description: t.description,
                date: t.date,
                allocateToBudget: t.allocateToBudget !== false,
              },
            ],
          })
          const entries = data.entries as Array<{ id?: string }> | undefined
          results.push(
            ok
              ? { ...base, logged: true, id: entries?.[0]?.id }
              : { ...base, logged: false, error: String(data.error ?? "Failed to log income") },
          )
        }
      }

      return json({
        loggedCount: results.filter((r) => r.logged).length,
        failedCount: results.filter((r) => !r.logged).length,
        results,
      })
    },
  )

  server.registerTool(
    "list_recent_transactions",
    {
      title: "List recently logged transactions",
      description:
        "List the user's most recently dated income and expenses, newest first. Useful to check what is already logged.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Default 20"),
        type: z.enum(["expense", "income", "all"]).optional().describe("Default all"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ limit = 20, type = "all" }) => {
      const currency = await getUserDisplayCurrency(caller.userId)
      const money = (m: bigint) => serializeMoneyForApi(m, currency)
      const [expenses, income] = await Promise.all([
        type === "income"
          ? []
          : prisma.expense.findMany({
              where: { userId: caller.userId },
              orderBy: { date: "desc" },
              take: limit,
              select: {
                id: true,
                date: true,
                description: true,
                amount: true,
                category: true,
                expenseCategory: true,
                account: { select: { name: true } },
              },
            }),
        type === "expense"
          ? []
          : prisma.incomeEntry.findMany({
              where: { userId: caller.userId },
              orderBy: { date: "desc" },
              take: limit,
              select: {
                id: true,
                date: true,
                description: true,
                amount: true,
                account: { select: { name: true } },
              },
            }),
      ])
      const rows = [
        ...expenses.map((e) => ({
          id: e.id,
          type: "expense",
          date: e.date.toISOString().slice(0, 10),
          description: e.description,
          amount: money(e.amount),
          fundCategory: e.category,
          expenseCategory: e.expenseCategory,
          account: e.account?.name ?? null,
        })),
        ...income.map((e) => ({
          id: e.id,
          type: "income",
          date: e.date.toISOString().slice(0, 10),
          description: e.description,
          amount: money(e.amount),
          account: e.account?.name ?? null,
        })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit)
      return json({ currency, transactions: rows })
    },
  )

  return server
}
