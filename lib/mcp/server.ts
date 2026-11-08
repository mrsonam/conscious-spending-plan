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
import { POST as postTransfer } from "@/app/api/transfers/route"
import { EXPENSE_CATEGORIES, FUND_CATEGORIES } from "@/lib/expense-page-constants"
import { serializeMoneyForApi } from "@/lib/money-api"
import { prisma } from "@/lib/prisma"
import { getUserDisplayCurrency } from "@/lib/user-currency"
import {
  findPossibleDuplicates,
  monthBounds,
  validateTransaction,
  type ExistingTransaction,
  type ProposedTransaction,
} from "@/lib/mcp/transactions"
import {
  DESTRUCTIVE,
  READ_ONLY,
  WRITE,
  badDate,
  callRoute,
  errorResult,
  expenseEnum,
  fundEnum,
  isoDay,
  json,
  routeError,
  type McpCaller,
} from "@/lib/mcp/shared"
import { registerInsightTools } from "@/lib/mcp/tools-insights"
import { registerPlanningTools } from "@/lib/mcp/tools-planning"

export type { McpCaller } from "@/lib/mcp/shared"

const INSTRUCTIONS = `Conscious Spending Plan: the user's personal budgeting app.

Workflow for logging income, expenses and transfers (from chat text or screenshots of bank transactions):
1. Call get_logging_context to load the user's accounts, categories, saving goals and recent history.
2. Extract each transaction. Use the user's recent history to pick categories the way they usually do. Money moving between two of the user's own accounts is a transfer, not an expense or income.
3. Call preview_transactions with the full list.
4. Show the user a clear table (date, description, amount, type, category, account) including any duplicate or balance warnings, and ask them to confirm or correct it.
5. Only after the user explicitly confirms, call log_transactions with exactly the confirmed list.
Never log anything the user has not confirmed in this conversation.

Fixing mistakes: find the transaction with search_transactions, show the user exactly what will change (or be deleted), and only call update_transaction or delete_transaction after they confirm.

If the user shares their bank balance, use reconcile_account to compare it with the app and point out what might be missing.

Every other tool that changes data (investments, saving goals, recurring payments, loans, super, budget split) also needs the user's explicit confirmation first. Read-only tools answer questions: budget status, spending summary, net worth, trends, cash-flow forecast, portfolio, goals, recurring payments, loans, super and the budget split.`

const transactionSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  // Positivity is checked per row by validateTransaction so the preview can report it.
  amount: z.number().describe("Positive amount in major units, e.g. 42.5"),
  date: z.string().describe("YYYY-MM-DD"),
  description: z.string().describe("Short merchant/payer description, e.g. 'Woolworths Newtown'"),
  accountId: z
    .string()
    .optional()
    .describe(
      "Account id from get_logging_context (for transfers: the account money leaves); omit to use the user's default account",
    ),
  toAccountId: z
    .string()
    .optional()
    .describe("Transfers only: the account the money goes into"),
  fundCategory: fundEnum
    .optional()
    .describe(
      "Expenses: the spending-plan pillar the money comes from (required). Transfers: optional pillar the move counts towards, e.g. investment when funding a brokerage account",
    ),
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
  const select = { id: true, amount: true, date: true, description: true }
  const [expenses, income, transfers] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: range }, select }),
    prisma.incomeEntry.findMany({ where: { userId, date: range }, select }),
    prisma.transfer.findMany({ where: { userId, date: range }, select }),
  ])
  return [
    ...expenses.map((e) => ({ ...e, type: "expense" as const, amountMinor: e.amount })),
    ...income.map((e) => ({ ...e, type: "income" as const, amountMinor: e.amount })),
    ...transfers.map((e) => ({ ...e, type: "transfer" as const, amountMinor: e.amount })),
  ]
}

export function createMcpServer(caller: McpCaller) {
  const server = new McpServer(
    { name: "conscious-spending-plan", version: "1.2.0" },
    { instructions: INSTRUCTIONS },
  )

  server.registerTool(
    "get_logging_context",
    {
      title: "Get accounts, categories and recent history",
      description:
        "Load everything needed to categorize transactions: the user's accounts (with ids and balances), default account, currency, valid fund and expense categories, active saving goals, and their most recent expenses, income and transfers as examples of how they categorize. Call this first.",
      annotations: READ_ONLY,
    },
    async () => {
      const ctx = await loadContext(caller.userId)
      const money = (m: bigint) => serializeMoneyForApi(m, ctx.currency)
      const [expenses, income, transfers] = await Promise.all([
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
        prisma.transfer.findMany({
          where: { userId: caller.userId },
          orderBy: { date: "desc" },
          take: 10,
          select: {
            date: true,
            description: true,
            amount: true,
            category: true,
            fromAccount: { select: { name: true } },
            toAccount: { select: { name: true } },
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
        recentTransfers: transfers.map((t) => ({
          date: isoDay(t.date),
          description: t.description,
          amount: money(t.amount),
          from: t.fromAccount.name,
          to: t.toAccount.name,
          fundCategory: t.category,
        })),
      })
    },
  )

  server.registerTool(
    "preview_transactions",
    {
      title: "Check transactions before logging",
      description:
        "Validate a list of proposed income/expense/transfer transactions without saving anything. Returns, per transaction, the resolved accounts, any problems, possible duplicates already logged (same amount within 3 days), and whether an account or saving goal would go below zero. Show the result to the user and ask them to confirm before calling log_transactions.",
      inputSchema: transactionsInput,
      annotations: READ_ONLY,
    },
    async ({ transactions }) => {
      const ctx = await loadContext(caller.userId)
      const existing = await loadExistingAround(
        caller.userId,
        transactions.map((t) => t.date),
      )
      const remaining = new Map(ctx.accounts.map((a) => [a.id, a.balanceMinor]))
      const goalRemaining = new Map(ctx.savingGoals.map((g) => [g.id, g.currentMinor]))
      const accountName = (id: string | null | undefined) =>
        ctx.accounts.find((a) => a.id === id)?.name ?? null
      const goalName = (id: string | undefined) =>
        ctx.savingGoals.find((g) => g.id === id)?.name ?? null

      const rows = transactions.map((t, index) => {
        const v = validateTransaction(t as ProposedTransaction, ctx)
        const warnings: string[] = []
        if (v.amountMinor != null && v.accountId && t.type !== "income") {
          const left = (remaining.get(v.accountId) ?? 0n) - v.amountMinor
          remaining.set(v.accountId, left)
          if (left < 0n) {
            warnings.push(
              `Not enough balance in ${accountName(v.accountId)}; the app will reject this ${t.type}.`,
            )
          }
        }
        if (v.amountMinor != null && t.type === "transfer" && t.toAccountId && remaining.has(t.toAccountId)) {
          remaining.set(t.toAccountId, remaining.get(t.toAccountId)! + v.amountMinor)
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
          ...(t.type === "transfer" ? { toAccount: accountName(t.toAccountId) } : {}),
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
        "Save income, expenses and transfers to the user's account. ONLY call this after showing the user the preview and receiving their explicit confirmation in this conversation; pass exactly the confirmed transactions. Each expense is deducted from its account balance (and its saving goal, if linked); income is added and (unless allocateToBudget is false) split across the spending plan; transfers move money between two accounts.",
      inputSchema: transactionsInput,
      annotations: WRITE,
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
        let outcome: { ok: boolean; id?: string; error: string }
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
          outcome = {
            ok,
            id: (data.expense as { id?: string } | undefined)?.id,
            error: routeError(data, "Failed to log expense"),
          }
        } else if (t.type === "transfer") {
          const { ok, data } = await callRoute(postTransfer, caller, "POST", "/api/transfers", {
            fromAccountId: v.accountId,
            toAccountId: t.toAccountId,
            amount: t.amount,
            description: t.description,
            date: t.date,
            category: t.fundCategory ?? null,
          })
          outcome = {
            ok,
            id: (data.transfer as { id?: string } | undefined)?.id,
            error: routeError(data, "Failed to log transfer"),
          }
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
          outcome = {
            ok,
            id: (data.entries as Array<{ id?: string }> | undefined)?.[0]?.id,
            error: routeError(data, "Failed to log income"),
          }
        }
        results.push(
          outcome.ok
            ? { ...base, logged: true, id: outcome.id }
            : { ...base, logged: false, error: outcome.error },
        )
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
        "Find the user's income, expenses and transfers, newest first. All filters are optional; with none it returns the most recent transactions. Returns ids for update_transaction and delete_transaction (expenses and income only).",
      inputSchema: {
        type: z.enum(["expense", "income", "transfer", "all"]).optional().describe("Default all"),
        from: z.string().optional().describe("Start date YYYY-MM-DD (inclusive)"),
        to: z.string().optional().describe("End date YYYY-MM-DD (inclusive)"),
        text: z.string().optional().describe("Case-insensitive match on description"),
        fundCategory: fundEnum.optional().describe("Expenses only"),
        expenseCategory: expenseEnum.optional().describe("Expenses only"),
        accountId: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional().describe("Default 20"),
      },
      annotations: READ_ONLY,
    },
    async ({ type = "all", from, to, text, fundCategory, expenseCategory, accountId, limit = 20 }) => {
      const invalid = badDate(from, to)
      if (invalid) return invalid
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
      const expenseOnly = Boolean(fundCategory || expenseCategory)
      const wants = (t: "expense" | "income" | "transfer") =>
        (type === "all" || type === t) && (t === "expense" || !expenseOnly)

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
      const transferWhere: Prisma.TransferWhereInput = {
        userId: caller.userId,
        ...(date ? { date } : {}),
        ...(description ? { description } : {}),
        ...(accountId ? { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] } : {}),
      }

      const [expenses, income, transfers] = await Promise.all([
        wants("expense")
          ? prisma.expense.findMany({
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
            })
          : [],
        wants("income")
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
        wants("transfer")
          ? prisma.transfer.findMany({
              where: transferWhere,
              orderBy: { date: "desc" },
              take: limit,
              select: {
                id: true,
                date: true,
                description: true,
                amount: true,
                category: true,
                fromAccount: { select: { name: true } },
                toAccount: { select: { name: true } },
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
        ...transfers.map((t) => ({
          id: t.id,
          type: "transfer",
          date: isoDay(t.date),
          description: t.description,
          amount: money(t.amount),
          from: t.fromAccount.name,
          to: t.toAccount.name,
          fundCategory: t.category,
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
        "Change fields on an existing income or expense (find its id with search_transactions; transfers can't be edited here). Only pass the fields to change. ONLY call after showing the user the before/after and receiving their explicit confirmation. Account balances, budget allocations and saving goals are adjusted by the app.",
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
      annotations: DESTRUCTIVE,
    },
    async ({ id, type, ...changes }) => {
      const invalid = badDate(changes.date)
      if (invalid) return invalid
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
        "Permanently delete one income or expense by id (find it with search_transactions; transfers can't be deleted here). ONLY call after showing the user exactly which transaction will be deleted and receiving their explicit confirmation. The app reverses its effect on account balances, budget allocations and saving goals.",
      inputSchema: {
        id: z.string(),
        type: z.enum(["expense", "income"]),
      },
      annotations: DESTRUCTIVE,
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

  registerInsightTools(server, caller)
  registerPlanningTools(server, caller)

  return server
}
