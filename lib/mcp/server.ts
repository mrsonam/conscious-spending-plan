import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import {
  DELETE as deleteExpense,
  PATCH as patchExpense,
  POST as postExpense,
} from "@/app/api/expenses/route"
import { POST as postIncomeBulk } from "@/app/api/income-entries/bulk/route"
import {
  DELETE as deleteIncomeEntry,
  PATCH as patchIncomeEntry,
} from "@/app/api/income-entries/[id]/route"
import { GET as getCategoryTracking } from "@/app/api/category-tracking/route"
import { EXPENSE_CATEGORIES, FUND_CATEGORIES } from "@/lib/expense-page-constants"
import { serializeMoneyForApi } from "@/lib/money-api"
import { prisma } from "@/lib/prisma"
import { getUserDisplayCurrency } from "@/lib/user-currency"
import {
  findPossibleDuplicates,
  isIsoDate,
  monthBounds,
  summarizeSpending,
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
1. Call get_logging_context to load the user's accounts, categories, saving goals and recent history.
2. Extract each transaction. Use the user's recent history to pick categories the way they usually do.
3. Call preview_transactions with the full list.
4. Show the user a clear table (date, description, amount, income/expense, category, account) including any duplicate or balance warnings, and ask them to confirm or correct it.
5. Only after the user explicitly confirms, call log_transactions with exactly the confirmed list.
Never log anything the user has not confirmed in this conversation. Skip transfers between the user's own accounts unless they ask for them.

Fixing mistakes: find the transaction with search_transactions, show the user exactly what will change (or be deleted), and only call update_transaction or delete_transaction after they confirm.

Questions about money: use get_budget_status for "how much do I have left this month" and get_spending_summary for "how much did I spend on X".`

const fundEnum = z.enum(FUND_CATEGORIES.map((c) => c.value) as [string, ...string[]])
const expenseEnum = z.enum(EXPENSE_CATEGORIES.map((c) => c.value) as [string, ...string[]])

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
  fundCategory: fundEnum
    .optional()
    .describe("Expenses only: the spending-plan pillar the money comes from"),
  expenseCategory: expenseEnum.optional().describe("Expenses only: the detailed category"),
  savingGoalId: z
    .string()
    .optional()
    .describe(
      "Expenses with fundCategory 'savings' only: id of the saving goal this spending comes out of",
    ),
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

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

async function loadContext(userId: string) {
  const [currency, user, accounts, goals] = await Promise.all([
    getUserDisplayCurrency(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { defaultAccountId: true } }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, bankName: true, accountType: true, balance: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.savingGoal.findMany({
      where: { userId, status: "active" },
      select: { id: true, name: true, currentMinor: true, targetMinor: true },
      orderBy: { createdAt: "asc" },
    }),
  ])
  return {
    currency,
    defaultAccountId: user?.defaultAccountId ?? null,
    accounts: accounts.map((a) => ({ ...a, balanceMinor: a.balance })),
    savingGoals: goals,
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

type RouteHandler = (
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) => Promise<Response>

/** Invoke an existing API route handler as the caller (bearer token), returning its JSON. */
async function callRoute(
  handler: RouteHandler,
  caller: McpCaller,
  method: string,
  path: string,
  body?: unknown,
  params: Record<string, string> = {},
) {
  const res = await handler(
    new Request(`${caller.origin}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${caller.token}`,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    { params: Promise.resolve(params as { id: string }) },
  )
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: res.ok, data }
}

const routeError = (data: Record<string, unknown>, fallback: string) =>
  String(data.error ?? fallback)

export function createMcpServer(caller: McpCaller) {
  const server = new McpServer(
    { name: "conscious-spending-plan", version: "1.1.0" },
    { instructions: INSTRUCTIONS },
  )

  server.registerTool(
    "get_logging_context",
    {
      title: "Get accounts, categories and recent history",
      description:
        "Load everything needed to categorize transactions: the user's accounts (with ids and balances), default account, currency, valid fund and expense categories, active saving goals, and their most recent expenses and income as examples of how they categorize. Call this first.",
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
        today: isoDay(new Date()),
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
        savingGoals: ctx.savingGoals.map((g) => ({
          id: g.id,
          name: g.name,
          available: money(g.currentMinor),
          target: g.targetMinor != null ? money(g.targetMinor) : null,
        })),
        recentExpenses: expenses.map((e) => ({
          date: isoDay(e.date),
          description: e.description,
          amount: money(e.amount),
          fundCategory: e.category,
          expenseCategory: e.expenseCategory,
          account: e.account?.name,
        })),
        recentIncome: income.map((e) => ({
          date: isoDay(e.date),
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
        "Validate a list of proposed income/expense transactions without saving anything. Returns, per transaction, the resolved account, any problems, possible duplicates already logged (same amount within 3 days), and whether an account or saving goal would go below zero. Show the result to the user and ask them to confirm before calling log_transactions.",
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
      const goalRemaining = new Map(ctx.savingGoals.map((g) => [g.id, g.currentMinor]))
      const accountName = (id: string | null) =>
        ctx.accounts.find((a) => a.id === id)?.name ?? null
      const goalName = (id: string | undefined) =>
        ctx.savingGoals.find((g) => g.id === id)?.name ?? null

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
        if (v.amountMinor != null && t.savingGoalId && goalRemaining.has(t.savingGoalId)) {
          const left = goalRemaining.get(t.savingGoalId)! - v.amountMinor
          goalRemaining.set(t.savingGoalId, left)
          if (left < 0n) {
            warnings.push(
              `More than is left in the "${goalName(t.savingGoalId)}" goal; the app will reject this expense.`,
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
              .map((d) => `"${d.description ?? "(no description)"}" on ${isoDay(d.date)}`)
              .join(", ")}`,
          )
        }
        return {
          index,
          ...t,
          account: accountName(v.accountId),
          savingGoal: goalName(t.savingGoalId),
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
        "Save income and expenses to the user's account. ONLY call this after showing the user the preview and receiving their explicit confirmation in this conversation; pass exactly the confirmed transactions. Each expense is deducted from its account balance (and its saving goal, if linked); income is added and (unless allocateToBudget is false) split across the spending plan.",
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
          const { ok, data } = await callRoute(postExpense, caller, "POST", "/api/expenses", {
            amount: t.amount,
            description: t.description,
            category: t.fundCategory,
            expenseCategory: t.expenseCategory,
            date: t.date,
            accountId: v.accountId,
            savingGoalId: t.savingGoalId ?? null,
          })
          const expense = data.expense as { id?: string } | undefined
          results.push(
            ok
              ? { ...base, logged: true, id: expense?.id }
              : { ...base, logged: false, error: routeError(data, "Failed to log expense") },
          )
        } else {
          const { ok, data } = await callRoute(
            postIncomeBulk,
            caller,
            "POST",
            "/api/income-entries/bulk",
            {
              accountId: v.accountId ?? undefined,
              entries: [
                {
                  amount: t.amount,
                  description: t.description,
                  date: t.date,
                  allocateToBudget: t.allocateToBudget !== false,
                },
              ],
            },
          )
          const entries = data.entries as Array<{ id?: string }> | undefined
          results.push(
            ok
              ? { ...base, logged: true, id: entries?.[0]?.id }
              : { ...base, logged: false, error: routeError(data, "Failed to log income") },
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
    "search_transactions",
    {
      title: "Search logged transactions",
      description:
        "Find the user's income and expenses, newest first. All filters are optional; with none it returns the most recent transactions. Returns ids for update_transaction and delete_transaction.",
      inputSchema: {
        type: z.enum(["expense", "income", "all"]).optional().describe("Default all"),
        from: z.string().optional().describe("Start date YYYY-MM-DD (inclusive)"),
        to: z.string().optional().describe("End date YYYY-MM-DD (inclusive)"),
        text: z.string().optional().describe("Case-insensitive match on description"),
        fundCategory: fundEnum.optional().describe("Expenses only"),
        expenseCategory: expenseEnum.optional().describe("Expenses only"),
        accountId: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional().describe("Default 20"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ type = "all", from, to, text, fundCategory, expenseCategory, accountId, limit = 20 }) => {
      for (const d of [from, to]) {
        if (d && !isIsoDate(d)) return errorResult(`Invalid date "${d}"; use YYYY-MM-DD.`)
      }
      const currency = await getUserDisplayCurrency(caller.userId)
      const money = (m: bigint) => serializeMoneyForApi(m, currency)
      const date =
        from || to
          ? {
              ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            }
          : undefined
      const description = text ? { contains: text, mode: "insensitive" as const } : undefined
      const wantsIncome = type !== "expense" && !fundCategory && !expenseCategory

      const expenseWhere: Prisma.ExpenseWhereInput = {
        userId: caller.userId,
        ...(date ? { date } : {}),
        ...(description ? { description } : {}),
        ...(fundCategory ? { category: fundCategory } : {}),
        ...(expenseCategory ? { expenseCategory } : {}),
        ...(accountId ? { accountId } : {}),
      }
      const incomeWhere: Prisma.IncomeEntryWhereInput = {
        userId: caller.userId,
        ...(date ? { date } : {}),
        ...(description ? { description } : {}),
        ...(accountId ? { accountId } : {}),
      }

      const [expenses, income] = await Promise.all([
        type === "income"
          ? []
          : prisma.expense.findMany({
              where: expenseWhere,
              orderBy: { date: "desc" },
              take: limit,
              select: {
                id: true,
                date: true,
                description: true,
                amount: true,
                category: true,
                expenseCategory: true,
                savingGoal: { select: { name: true } },
                account: { select: { name: true } },
              },
            }),
        wantsIncome
          ? prisma.incomeEntry.findMany({
              where: incomeWhere,
              orderBy: { date: "desc" },
              take: limit,
              select: {
                id: true,
                date: true,
                description: true,
                amount: true,
                excludeFromAllocation: true,
                account: { select: { name: true } },
              },
            })
          : [],
      ])
      const rows = [
        ...expenses.map((e) => ({
          id: e.id,
          type: "expense",
          date: isoDay(e.date),
          description: e.description,
          amount: money(e.amount),
          fundCategory: e.category,
          expenseCategory: e.expenseCategory,
          savingGoal: e.savingGoal?.name ?? null,
          account: e.account?.name ?? null,
        })),
        ...income.map((e) => ({
          id: e.id,
          type: "income",
          date: isoDay(e.date),
          description: e.description,
          amount: money(e.amount),
          allocateToBudget: !e.excludeFromAllocation,
          account: e.account?.name ?? null,
        })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit)
      return json({ currency, count: rows.length, transactions: rows })
    },
  )

  server.registerTool(
    "update_transaction",
    {
      title: "Edit a logged transaction",
      description:
        "Change fields on an existing income or expense (find its id with search_transactions). Only pass the fields to change. ONLY call after showing the user the before/after and receiving their explicit confirmation. Account balances, budget allocations and saving goals are adjusted by the app.",
      inputSchema: {
        id: z.string(),
        type: z.enum(["expense", "income"]),
        amount: z.number().positive().optional(),
        date: z.string().optional().describe("YYYY-MM-DD"),
        description: z.string().optional(),
        accountId: z.string().optional(),
        fundCategory: fundEnum.optional().describe("Expenses only"),
        expenseCategory: expenseEnum.optional().describe("Expenses only"),
        savingGoalId: z
          .string()
          .nullable()
          .optional()
          .describe("Expenses only; null unlinks the goal"),
        allocateToBudget: z.boolean().optional().describe("Income only"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, type, ...changes }) => {
      if (changes.date && !isIsoDate(changes.date)) {
        return errorResult(`Invalid date "${changes.date}"; use YYYY-MM-DD.`)
      }
      if (type === "expense") {
        if (changes.allocateToBudget !== undefined) {
          return errorResult("allocateToBudget only applies to income.")
        }
        const body: Record<string, unknown> = {}
        if (changes.amount !== undefined) body.amount = changes.amount
        if (changes.date !== undefined) body.date = changes.date
        if (changes.description !== undefined) body.description = changes.description
        if (changes.accountId !== undefined) body.accountId = changes.accountId
        if (changes.fundCategory !== undefined) body.category = changes.fundCategory
        if (changes.expenseCategory !== undefined) body.expenseCategory = changes.expenseCategory
        if (changes.savingGoalId !== undefined) body.savingGoalId = changes.savingGoalId
        if (Object.keys(body).length === 0) return errorResult("No changes given.")
        const { ok, data } = await callRoute(
          patchExpense,
          caller,
          "PATCH",
          `/api/expenses?id=${encodeURIComponent(id)}`,
          body,
        )
        return ok
          ? json({ updated: true, expense: data.expense })
          : errorResult(routeError(data, "Failed to update expense"))
      }

      if (changes.fundCategory || changes.expenseCategory || changes.savingGoalId !== undefined) {
        return errorResult("Categories and saving goals only apply to expenses.")
      }
      // The income route replaces the whole entry, so merge changes onto the current row.
      const currency = await getUserDisplayCurrency(caller.userId)
      const existing = await prisma.incomeEntry.findFirst({
        where: { id, userId: caller.userId },
      })
      if (!existing) return errorResult("Income entry not found.")
      const date = changes.date ?? isoDay(existing.date)
      const { ok, data } = await callRoute(
        patchIncomeEntry,
        caller,
        "PATCH",
        `/api/income-entries/${encodeURIComponent(id)}`,
        {
          income: changes.amount ?? serializeMoneyForApi(existing.amount, currency),
          description:
            changes.description !== undefined ? changes.description : existing.description,
          date,
          ...monthBounds(date),
          accountId: changes.accountId ?? existing.accountId,
          allocateToBudget: changes.allocateToBudget ?? !existing.excludeFromAllocation,
        },
        { id },
      )
      return ok
        ? json({ updated: true, entry: data.entry })
        : errorResult(routeError(data, "Failed to update income"))
    },
  )

  server.registerTool(
    "delete_transaction",
    {
      title: "Delete a logged transaction",
      description:
        "Permanently delete one income or expense by id (find it with search_transactions). ONLY call after showing the user exactly which transaction will be deleted and receiving their explicit confirmation. The app reverses its effect on account balances, budget allocations and saving goals.",
      inputSchema: {
        id: z.string(),
        type: z.enum(["expense", "income"]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, type }) => {
      const { ok, data } =
        type === "expense"
          ? await callRoute(deleteExpense, caller, "DELETE", `/api/expenses?id=${encodeURIComponent(id)}`)
          : await callRoute(
              deleteIncomeEntry,
              caller,
              "DELETE",
              `/api/income-entries/${encodeURIComponent(id)}`,
              undefined,
              { id },
            )
      return ok
        ? json({ deleted: true, id, type })
        : errorResult(routeError(data, `Failed to delete ${type}`))
    },
  )

  server.registerTool(
    "get_budget_status",
    {
      title: "Budget status for a month",
      description:
        "How the user's spending plan is tracking for a month: per fund pillar (fixed costs, savings, investment, guilt-free spending) the allocated amount, spent so far and what's left, plus total income and savings available. Defaults to the current month.",
      inputSchema: {
        month: z.number().int().min(1).max(12).optional(),
        year: z.number().int().min(2000).max(2100).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ month, year }) => {
      const query = month && year ? `?month=${month}&year=${year}` : ""
      const res = await getCategoryTracking(
        new Request(`${caller.origin}/api/category-tracking${query}`, {
          headers: { authorization: `Bearer ${caller.token}` },
        }),
      )
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) return errorResult(routeError(data, "Failed to load budget status"))
      const currency = await getUserDisplayCurrency(caller.userId)
      return json({
        currency,
        month: data.month,
        year: data.year,
        totalIncomeForMonth: data.totalIncomeForMonth,
        pillars: data.tracking,
        savingsGeneralAvailable: data.savingsGeneralAvailable,
        savingsAssignedToGoals: data.savingsAssignedToGoals,
      })
    },
  )

  server.registerTool(
    "get_spending_summary",
    {
      title: "Spending summary by category",
      description:
        "Total expenses between two dates, broken down by detailed expense category and by fund pillar, plus the largest individual expenses. Optionally narrow to one account or a description search.",
      inputSchema: {
        from: z.string().describe("Start date YYYY-MM-DD (inclusive)"),
        to: z.string().describe("End date YYYY-MM-DD (inclusive)"),
        accountId: z.string().optional(),
        text: z.string().optional().describe("Case-insensitive match on description"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ from, to, accountId, text }) => {
      if (!isIsoDate(from) || !isIsoDate(to)) {
        return errorResult("from and to must be dates in YYYY-MM-DD format.")
      }
      const currency = await getUserDisplayCurrency(caller.userId)
      const money = (m: bigint) => serializeMoneyForApi(m, currency)
      const expenses = await prisma.expense.findMany({
        where: {
          userId: caller.userId,
          date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T23:59:59.999Z`) },
          ...(accountId ? { accountId } : {}),
          ...(text ? { description: { contains: text, mode: "insensitive" as const } } : {}),
        },
        select: {
          id: true,
          date: true,
          description: true,
          amount: true,
          category: true,
          expenseCategory: true,
        },
      })
      const summary = summarizeSpending(
        expenses.map((e) => ({
          amountMinor: e.amount,
          fundCategory: e.category,
          expenseCategory: e.expenseCategory,
        })),
      )
      const largest = [...expenses]
        .sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0))
        .slice(0, 5)
      return json({
        currency,
        from,
        to,
        total: money(summary.totalMinor),
        count: summary.count,
        byExpenseCategory: summary.byExpenseCategory.map((r) => ({
          category: r.category,
          total: money(r.totalMinor),
          count: r.count,
        })),
        byFundCategory: summary.byFundCategory.map((r) => ({
          category: r.category,
          total: money(r.totalMinor),
          count: r.count,
        })),
        largestExpenses: largest.map((e) => ({
          id: e.id,
          date: isoDay(e.date),
          description: e.description,
          amount: money(e.amount),
          expenseCategory: e.expenseCategory,
        })),
      })
    },
  )

  return server
}
