import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { GET as getCategoryTracking } from "@/app/api/category-tracking/route"
import { GET as getNetWorthHistory } from "@/app/api/net-worth-history/route"
import { GET as getSpendingTrends } from "@/app/api/spending-trends/route"
import { GET as getCashFlowForecast } from "@/app/api/cash-flow-forecast/route"
import { parseMoneyFromApi, serializeMoneyForApi } from "@/lib/money-api"
import { prisma } from "@/lib/prisma"
import { getUserDisplayCurrency } from "@/lib/user-currency"
import { summarizeSpending } from "@/lib/mcp/transactions"
import {
  READ_ONLY,
  badDate,
  callRoute,
  errorResult,
  isoDay,
  json,
  routeError,
  routeResult,
  type McpCaller,
} from "@/lib/mcp/shared"

const DAY_MS = 24 * 60 * 60 * 1000

export function registerInsightTools(server: McpServer, caller: McpCaller) {
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
      annotations: READ_ONLY,
    },
    async ({ month, year }) => {
      const query = month && year ? `?month=${month}&year=${year}` : ""
      const { ok, data } = await callRoute(
        getCategoryTracking,
        caller,
        "GET",
        `/api/category-tracking${query}`,
      )
      if (!ok) return errorResult(routeError(data, "Failed to load budget status"))
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
      annotations: READ_ONLY,
    },
    async ({ from, to, accountId, text }) => {
      const invalid = badDate(from, to)
      if (invalid) return invalid
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

  server.registerTool(
    "get_net_worth_history",
    {
      title: "Net worth over time",
      description:
        "The user's net worth month by month (accounts, investments, super, loans), for questions like 'how has my net worth changed this year?'.",
      inputSchema: {
        months: z.number().int().min(1).max(60).optional().describe("How many months back; default 12"),
      },
      annotations: READ_ONLY,
    },
    async ({ months = 12 }) =>
      routeResult(
        callRoute(getNetWorthHistory, caller, "GET", `/api/net-worth-history?months=${months}`),
        "Failed to load net worth history",
      ),
  )

  server.registerTool(
    "get_spending_trends",
    {
      title: "Spending trends",
      description:
        "Month-by-month spending and income trends, for questions like 'is my spending going up?' or 'which categories are growing?'.",
      inputSchema: {
        months: z.number().int().min(1).max(24).optional().describe("How many months back; default 6"),
      },
      annotations: READ_ONLY,
    },
    async ({ months = 6 }) =>
      routeResult(
        callRoute(getSpendingTrends, caller, "GET", `/api/spending-trends?months=${months}`),
        "Failed to load spending trends",
      ),
  )

  server.registerTool(
    "get_cash_flow_forecast",
    {
      title: "Cash-flow forecast",
      description:
        "Projected balance over the coming days based on recurring payments and recent income/spending patterns, for questions like 'will I have enough before payday?'.",
      inputSchema: {
        days: z.number().int().min(7).max(180).optional().describe("Days ahead; default 30"),
        lookback: z
          .number()
          .int()
          .min(30)
          .max(365)
          .optional()
          .describe("Days of history to learn from; default 90"),
      },
      annotations: READ_ONLY,
    },
    async ({ days = 30, lookback = 90 }) =>
      routeResult(
        callRoute(
          getCashFlowForecast,
          caller,
          "GET",
          `/api/cash-flow-forecast?days=${days}&lookback=${lookback}`,
        ),
        "Failed to load cash-flow forecast",
      ),
  )

  server.registerTool(
    "reconcile_account",
    {
      title: "Compare an account with the bank",
      description:
        "Compare the balance the app has for an account with the real balance the user sees at their bank (e.g. from a screenshot), and list that account's recent activity so missing or duplicate transactions can be spotted. Read-only: suggest fixes and use the logging tools only after the user confirms.",
      inputSchema: {
        accountId: z.string(),
        actualBalance: z.number().describe("Balance shown by the bank, in major units"),
        sinceDays: z
          .number()
          .int()
          .min(1)
          .max(90)
          .optional()
          .describe("How many days of activity to list; default 14"),
      },
      annotations: READ_ONLY,
    },
    async ({ accountId, actualBalance, sinceDays = 14 }) => {
      const currency = await getUserDisplayCurrency(caller.userId)
      const money = (m: bigint) => serializeMoneyForApi(m, currency)
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId: caller.userId },
        select: { id: true, name: true, balance: true },
      })
      if (!account) return errorResult("Account not found.")
      let actualMinor: bigint
      try {
        actualMinor = parseMoneyFromApi(actualBalance, currency)
      } catch {
        return errorResult("actualBalance must be a number.")
      }
      const since = new Date(Date.now() - sinceDays * DAY_MS)
      const [expenses, income, transfers] = await Promise.all([
        prisma.expense.findMany({
          where: { userId: caller.userId, accountId, date: { gte: since } },
          select: { id: true, date: true, description: true, amount: true },
        }),
        prisma.incomeEntry.findMany({
          where: { userId: caller.userId, accountId, date: { gte: since } },
          select: { id: true, date: true, description: true, amount: true },
        }),
        prisma.transfer.findMany({
          where: {
            userId: caller.userId,
            date: { gte: since },
            OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
          },
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            fromAccountId: true,
            fromAccount: { select: { name: true } },
            toAccount: { select: { name: true } },
          },
        }),
      ])
      const activity = [
        ...expenses.map((e) => ({ ...e, kind: "expense", signed: -e.amount, note: null as string | null })),
        ...income.map((e) => ({ ...e, kind: "income", signed: e.amount, note: null as string | null })),
        ...transfers.map((t) => {
          const out = t.fromAccountId === accountId
          return {
            id: t.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            kind: out ? "transfer out" : "transfer in",
            signed: out ? -t.amount : t.amount,
            note: out ? `to ${t.toAccount.name}` : `from ${t.fromAccount.name}`,
          }
        }),
      ].sort((a, b) => b.date.getTime() - a.date.getTime())

      const difference = actualMinor - account.balance
      return json({
        currency,
        account: account.name,
        appBalance: money(account.balance),
        bankBalance: money(actualMinor),
        difference: money(difference),
        status:
          difference === 0n
            ? "Balances match."
            : difference > 0n
              ? "The bank has more than the app: income or an incoming transfer may be missing, or an expense was logged twice."
              : "The bank has less than the app: an expense or outgoing transfer may be missing, or income was logged twice.",
        recentActivity: activity.map((a) => ({
          id: a.id,
          type: a.kind,
          date: isoDay(a.date),
          description: a.description,
          amount: money(a.signed),
          ...(a.note ? { note: a.note } : {}),
        })),
      })
    },
  )
}
