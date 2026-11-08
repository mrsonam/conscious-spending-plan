import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  GET as getInvestments,
  POST as postInvestment,
} from "@/app/api/investments/route"
import { POST as postDividend } from "@/app/api/investments/dividends/route"
import {
  GET as getSavingGoals,
  POST as postSavingGoal,
} from "@/app/api/saving-goals/route"
import { PATCH as patchSavingGoal } from "@/app/api/saving-goals/[id]/route"
import {
  GET as getRecurring,
  POST as postRecurring,
} from "@/app/api/recurring-expenses/route"
import {
  DELETE as deleteRecurring,
  PATCH as patchRecurring,
} from "@/app/api/recurring-expenses/[id]/route"
import {
  GET as getSubscriptions,
  POST as postSubscription,
} from "@/app/api/subscriptions/route"
import { PATCH as patchSubscription } from "@/app/api/subscriptions/[id]/route"
import {
  GET as getLoans,
  PATCH as patchLoan,
  POST as postLoan,
} from "@/app/api/loans/route"
import {
  GET as getBorrowedLoans,
  PATCH as patchBorrowedLoan,
  POST as postBorrowedLoan,
} from "@/app/api/borrowed-loans/route"
import {
  GET as getSuper,
  PUT as putSuper,
} from "@/app/api/superannuation/route"
import { POST as postSuperContribution } from "@/app/api/superannuation/contributions/route"
import {
  GET as getFundAllocation,
  PUT as putFundAllocation,
} from "@/app/api/fund-allocation/route"
import { FUND_CATEGORIES } from "@/lib/expense-page-constants"
import { checkBudgetSplit, type PillarSetting } from "@/lib/mcp/transactions"
import {
  DESTRUCTIVE,
  READ_ONLY,
  WRITE,
  badDate,
  callRoute,
  errorResult,
  expenseEnum,
  fundEnum,
  json,
  routeError,
  routeResult,
  type McpCaller,
} from "@/lib/mcp/shared"

const CONFIRM = "ONLY call after the user has explicitly confirmed this change in the conversation."
const FREQUENCIES = ["weekly", "fortnightly", "monthly", "yearly", "custom"] as const
const SUPER_TYPES = [
  "employer",
  "salary_sacrifice",
  "personal",
  "government",
  "investment",
  "fee",
  "tax",
] as const

export function registerPlanningTools(server: McpServer, caller: McpCaller) {
  const route = (
    handler: Parameters<typeof callRoute>[0],
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ) => callRoute(handler, caller, method, path, body, params)

  // --- Investments ---------------------------------------------------------

  server.registerTool(
    "get_portfolio",
    {
      title: "Investment portfolio",
      description:
        "The user's investment accounts with holdings (shares, cost, dividends received) and dividend totals (this year and all-time). Use the account ids for log_investment_purchase and log_dividend.",
      annotations: READ_ONLY,
    },
    async () =>
      routeResult(route(getInvestments, "GET", "/api/investments"), "Failed to load portfolio", (d) => {
        const accounts = (d.accounts as Array<Record<string, unknown>>) ?? []
        return {
          dividendYtd: d.dividendYtd,
          dividendAllTime: d.dividendAllTime,
          accounts: accounts.map((a) => ({
            id: a.id,
            name: a.name,
            cash: a.balance,
            invested: a.investedAmount,
            holdings: ((a.holdings as Array<Record<string, unknown>>) ?? []).map((h) => ({
              symbol: h.name,
              shares: h.totalShares,
              cost: h.totalAmount,
              averagePrice: h.averagePrice,
              dividendsReceived: h.dividendIncome,
            })),
          })),
        }
      }),
  )

  server.registerTool(
    "log_investment_purchase",
    {
      title: "Log an investment purchase",
      description: `Record buying shares/units in an investment account. The cost (shares × price + fee) is paid from the account's cash balance, so the user must have transferred money in first. ${CONFIRM}`,
      inputSchema: {
        investmentAccountId: z.string().describe("Investment account id from get_portfolio"),
        symbol: z.string().describe("Ticker, e.g. VTI or VAS.AX"),
        shares: z.number().positive(),
        pricePerUnit: z.number().positive(),
        brokerageFee: z.number().min(0).optional(),
        date: z.string().describe("YYYY-MM-DD"),
      },
      annotations: WRITE,
    },
    async ({ investmentAccountId, symbol, shares, pricePerUnit, brokerageFee, date }) => {
      const invalid = badDate(date)
      if (invalid) return invalid
      return routeResult(
        route(postInvestment, "POST", "/api/investments", {
          investmentAccountId,
          investmentName: symbol.trim().toUpperCase(),
          numberOfShares: String(shares),
          pricePerUnit,
          brokerageFee: brokerageFee ?? 0,
          date,
        }),
        "Failed to log purchase",
      )
    },
  )

  server.registerTool(
    "log_dividend",
    {
      title: "Log a dividend",
      description: `Record a dividend paid into an investment account's cash. It also appears as (unbudgeted) income on statements. ${CONFIRM}`,
      inputSchema: {
        investmentAccountId: z.string().describe("Investment account id from get_portfolio"),
        symbol: z.string().describe("Ticker of the holding that paid it"),
        amount: z.number().positive(),
        date: z.string().describe("YYYY-MM-DD"),
      },
      annotations: WRITE,
    },
    async ({ investmentAccountId, symbol, amount, date }) => {
      const invalid = badDate(date)
      if (invalid) return invalid
      return routeResult(
        route(postDividend, "POST", "/api/investments/dividends", {
          investmentAccountId,
          name: symbol.trim().toUpperCase(),
          amount,
          date,
        }),
        "Failed to log dividend",
      )
    },
  )

  // --- Saving goals --------------------------------------------------------

  server.registerTool(
    "get_saving_goals",
    {
      title: "Saving goals",
      description:
        "The user's saving goals with balance, target, share of the savings allocation and projected completion, plus general savings available to move into goals.",
      inputSchema: {
        status: z.enum(["active", "complete", "archived"]).optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ status }) =>
      routeResult(
        route(getSavingGoals, "GET", `/api/saving-goals${status ? `?status=${status}` : ""}`),
        "Failed to load saving goals",
      ),
  )

  server.registerTool(
    "add_to_saving_goal",
    {
      title: "Move savings into a goal",
      description: `Move money from general (unassigned) savings into a saving goal. ${CONFIRM}`,
      inputSchema: {
        goalId: z.string(),
        amount: z.number().positive(),
      },
      annotations: WRITE,
    },
    async ({ goalId, amount }) =>
      routeResult(
        route(patchSavingGoal, "PATCH", `/api/saving-goals/${goalId}`, { action: "transfer", amount }, {
          id: goalId,
        }),
        "Failed to move savings into the goal",
      ),
  )

  server.registerTool(
    "create_saving_goal",
    {
      title: "Create a saving goal",
      description: `Create a saving goal. percent is the share of each month's savings allocation that flows into it (active goals can't exceed 100% together). ${CONFIRM}`,
      inputSchema: {
        name: z.string().min(1),
        percent: z.number().min(0).max(100),
        target: z.number().positive().optional().describe("Target amount; omit for open-ended"),
      },
      annotations: WRITE,
    },
    async ({ name, percent, target }) =>
      routeResult(
        route(postSavingGoal, "POST", "/api/saving-goals", { name, percent, target: target ?? null }),
        "Failed to create saving goal",
      ),
  )

  server.registerTool(
    "update_saving_goal",
    {
      title: "Edit a saving goal",
      description: `Rename a saving goal or change its target or percent of the savings allocation. Pass only what changes; target null removes the target. ${CONFIRM}`,
      inputSchema: {
        goalId: z.string(),
        name: z.string().min(1).optional(),
        percent: z.number().min(0).max(100).optional(),
        target: z.number().positive().nullable().optional(),
      },
      annotations: DESTRUCTIVE,
    },
    async ({ goalId, ...changes }) => {
      if (Object.values(changes).every((v) => v === undefined)) return errorResult("No changes given.")
      return routeResult(
        route(patchSavingGoal, "PATCH", `/api/saving-goals/${goalId}`, changes, { id: goalId }),
        "Failed to update saving goal",
      )
    },
  )

  // --- Recurring payments & subscriptions ----------------------------------

  server.registerTool(
    "list_recurring_payments",
    {
      title: "Recurring payments and subscriptions",
      description:
        "All recurring expenses (bills, rent, memberships) and subscriptions with amount, frequency, account, next due date and status. Use the recurring expense ids to update or delete them.",
      annotations: READ_ONLY,
    },
    async () => {
      const [recurring, subscriptions] = await Promise.all([
        route(getRecurring, "GET", "/api/recurring-expenses"),
        route(getSubscriptions, "GET", "/api/subscriptions"),
      ])
      if (!recurring.ok) return errorResult(routeError(recurring.data, "Failed to load recurring payments"))
      return json({
        recurringExpenses: recurring.data,
        subscriptions: subscriptions.ok ? subscriptions.data : null,
      })
    },
  )

  server.registerTool(
    "add_recurring_payment",
    {
      title: "Add a recurring payment or subscription",
      description: `Set up a repeating expense. Use kind "subscription" for services like Netflix or Spotify (tracked with renewal dates) and "bill" for rent, utilities, insurance and similar. ${CONFIRM}`,
      inputSchema: {
        kind: z.enum(["subscription", "bill"]),
        accountId: z.string(),
        amount: z.number().positive(),
        description: z.string().min(1),
        fundCategory: fundEnum,
        expenseCategory: expenseEnum,
        frequency: z.enum(FREQUENCIES),
        intervalDays: z.number().int().min(1).optional().describe("Required when frequency is custom"),
        startDate: z.string().describe("YYYY-MM-DD of the first (or next) payment"),
        endDate: z.string().optional().describe("YYYY-MM-DD; omit for no end"),
        provider: z.string().optional().describe("Subscriptions only, e.g. Netflix"),
      },
      annotations: WRITE,
    },
    async ({ kind, fundCategory, provider, ...rest }) => {
      const invalid = badDate(rest.startDate, rest.endDate)
      if (invalid) return invalid
      if (rest.frequency === "custom" && !rest.intervalDays) {
        return errorResult("intervalDays is required for a custom frequency.")
      }
      const body = { ...rest, category: fundCategory }
      return kind === "subscription"
        ? routeResult(
            route(postSubscription, "POST", "/api/subscriptions", {
              ...body,
              provider: provider ?? rest.description,
            }),
            "Failed to add subscription",
          )
        : routeResult(route(postRecurring, "POST", "/api/recurring-expenses", body), "Failed to add recurring payment")
    },
  )

  server.registerTool(
    "update_recurring_payment",
    {
      title: "Edit, pause or cancel a recurring payment",
      description: `Change a recurring expense (amount, schedule, account, categories, or pause with isActive false). For a subscription, subscriptionStatus pauses or cancels it as a subscription. Pass only what changes. ${CONFIRM}`,
      inputSchema: {
        recurringExpenseId: z.string(),
        amount: z.number().positive().optional(),
        description: z.string().optional(),
        accountId: z.string().optional(),
        fundCategory: fundEnum.optional(),
        expenseCategory: expenseEnum.optional(),
        frequency: z.enum(FREQUENCIES).optional(),
        intervalDays: z.number().int().min(1).optional(),
        endDate: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        subscriptionId: z.string().optional(),
        subscriptionStatus: z.enum(["active", "paused", "cancelled"]).optional(),
      },
      annotations: DESTRUCTIVE,
    },
    async ({ recurringExpenseId, fundCategory, subscriptionId, subscriptionStatus, ...rest }) => {
      const invalid = badDate(rest.endDate ?? undefined)
      if (invalid) return invalid
      const results: Record<string, unknown> = {}
      if (subscriptionStatus) {
        if (!subscriptionId) return errorResult("subscriptionId is required to change subscriptionStatus.")
        const sub = await route(
          patchSubscription,
          "PATCH",
          `/api/subscriptions/${subscriptionId}`,
          { status: subscriptionStatus },
          { id: subscriptionId },
        )
        if (!sub.ok) return errorResult(routeError(sub.data, "Failed to update subscription"))
        results.subscription = sub.data
      }
      const body: Record<string, unknown> = { ...rest }
      if (fundCategory !== undefined) body.category = fundCategory
      for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k]
      if (Object.keys(body).length > 0) {
        const rec = await route(
          patchRecurring,
          "PATCH",
          `/api/recurring-expenses/${recurringExpenseId}`,
          body,
          { id: recurringExpenseId },
        )
        if (!rec.ok) return errorResult(routeError(rec.data, "Failed to update recurring payment"))
        results.recurringExpense = rec.data
      }
      if (Object.keys(results).length === 0) return errorResult("No changes given.")
      return json(results)
    },
  )

  server.registerTool(
    "delete_recurring_payment",
    {
      title: "Delete a recurring payment",
      description: `Permanently delete a recurring expense (and its subscription, if any). Already-logged expenses are kept. ${CONFIRM}`,
      inputSchema: { recurringExpenseId: z.string() },
      annotations: DESTRUCTIVE,
    },
    async ({ recurringExpenseId }) =>
      routeResult(
        route(deleteRecurring, "DELETE", `/api/recurring-expenses/${recurringExpenseId}`, undefined, {
          id: recurringExpenseId,
        }),
        "Failed to delete recurring payment",
      ),
  )

  // --- Loans ---------------------------------------------------------------

  server.registerTool(
    "list_loans",
    {
      title: "Money lent and borrowed",
      description: "Loans the user has given to others and money they've borrowed, with amounts outstanding.",
      inputSchema: { status: z.enum(["active", "repaid"]).optional() },
      annotations: READ_ONLY,
    },
    async ({ status }) => {
      const q = status ? `?status=${status}` : ""
      const [lent, borrowed] = await Promise.all([
        route(getLoans, "GET", `/api/loans${q}`),
        route(getBorrowedLoans, "GET", `/api/borrowed-loans${q}`),
      ])
      if (!lent.ok) return errorResult(routeError(lent.data, "Failed to load loans"))
      if (!borrowed.ok) return errorResult(routeError(borrowed.data, "Failed to load borrowed money"))
      return json({ lent: lent.data, borrowed: borrowed.data })
    },
  )

  server.registerTool(
    "record_loan",
    {
      title: "Record money lent or borrowed",
      description: `Record lending money to someone (paid out of accountId) or borrowing from someone (paid into accountId). ${CONFIRM}`,
      inputSchema: {
        direction: z.enum(["lent", "borrowed"]),
        accountId: z.string(),
        amount: z.number().positive(),
        person: z.string().min(1).describe("Who borrowed it / who lent it"),
        date: z.string().describe("YYYY-MM-DD"),
        dueDate: z.string().optional().describe("YYYY-MM-DD"),
        description: z.string().optional(),
      },
      annotations: WRITE,
    },
    async ({ direction, person, ...rest }) => {
      const invalid = badDate(rest.date, rest.dueDate)
      if (invalid) return invalid
      return direction === "lent"
        ? routeResult(route(postLoan, "POST", "/api/loans", { ...rest, borrowerName: person }), "Failed to record loan")
        : routeResult(
            route(postBorrowedLoan, "POST", "/api/borrowed-loans", { ...rest, lenderName: person }),
            "Failed to record borrowed money",
          )
    },
  )

  server.registerTool(
    "settle_loan",
    {
      title: "Mark a loan as repaid",
      description: `Mark a loan as fully repaid. For money lent, the outstanding amount comes back into accountId; for money borrowed, it is paid out of accountId. ${CONFIRM}`,
      inputSchema: {
        direction: z.enum(["lent", "borrowed"]),
        loanId: z.string(),
        accountId: z.string(),
      },
      annotations: WRITE,
    },
    async ({ direction, loanId, accountId }) =>
      direction === "lent"
        ? routeResult(
            route(patchLoan, "PATCH", "/api/loans", { loanId, toAccountId: accountId }),
            "Failed to settle loan",
          )
        : routeResult(
            route(patchBorrowedLoan, "PATCH", "/api/borrowed-loans", {
              borrowedLoanId: loanId,
              fromAccountId: accountId,
            }),
            "Failed to settle borrowed money",
          ),
  )

  // --- Superannuation ------------------------------------------------------

  server.registerTool(
    "get_superannuation",
    {
      title: "Superannuation",
      description: "The user's super accounts with balances and recent contributions.",
      annotations: READ_ONLY,
    },
    async () => routeResult(route(getSuper, "GET", "/api/superannuation"), "Failed to load superannuation"),
  )

  server.registerTool(
    "log_super_contribution",
    {
      title: "Log a super contribution",
      description: `Record a contribution (or fee/tax deduction) on a super account. ${CONFIRM}`,
      inputSchema: {
        superAccountId: z.string(),
        amount: z.number().positive(),
        type: z.enum(SUPER_TYPES).optional().describe("Default employer"),
        date: z.string().describe("YYYY-MM-DD"),
        description: z.string().optional(),
      },
      annotations: WRITE,
    },
    async (input) => {
      const invalid = badDate(input.date)
      if (invalid) return invalid
      return routeResult(
        route(postSuperContribution, "POST", "/api/superannuation/contributions", input),
        "Failed to log contribution",
      )
    },
  )

  server.registerTool(
    "update_super_balance",
    {
      title: "Update a super balance",
      description: `Set a super account's balance to what the fund currently reports. ${CONFIRM}`,
      inputSchema: {
        superAccountId: z.string(),
        balance: z.number().min(0),
      },
      annotations: DESTRUCTIVE,
    },
    async ({ superAccountId, balance }) =>
      routeResult(
        route(putSuper, "PUT", "/api/superannuation", { id: superAccountId, balance }),
        "Failed to update super balance",
      ),
  )

  // --- Budget split --------------------------------------------------------

  const pillarSchema = z.object({
    type: z.enum(["percentage", "fixed"]),
    value: z.number().describe("Percent of income (e.g. 50) or a fixed amount per month"),
    cap: z.number().positive().nullable().optional().describe("Optional monthly cap; null removes it"),
  })

  server.registerTool(
    "get_budget_split",
    {
      title: "Budget split",
      description:
        "How the user's income is split across the four pillars (fixed costs, savings, investment, guilt-free spending): percentage or fixed amount each, and any caps.",
      annotations: READ_ONLY,
    },
    async () =>
      routeResult(route(getFundAllocation, "GET", "/api/fund-allocation"), "Failed to load budget split", (d) => {
        const a = (d.fundAllocation ?? d) as Record<string, unknown>
        return Object.fromEntries(
          FUND_CATEGORIES.map((c) => [
            c.value,
            { type: a[`${c.value}Type`], value: a[`${c.value}Value`], cap: a[`${c.value}Cap`] ?? null },
          ]),
        )
      }),
  )

  server.registerTool(
    "update_budget_split",
    {
      title: "Change the budget split",
      description: `Change how income is split across pillars. Pass only the pillars that change. Percentages across pillars can't exceed 100%. This affects how all future income is allocated. ${CONFIRM}`,
      inputSchema: {
        fixedCosts: pillarSchema.optional(),
        savings: pillarSchema.optional(),
        investment: pillarSchema.optional(),
        guiltFreeSpending: pillarSchema.optional(),
      },
      annotations: DESTRUCTIVE,
    },
    async (changes) => {
      const current = await route(getFundAllocation, "GET", "/api/fund-allocation")
      if (!current.ok) return errorResult(routeError(current.data, "Failed to load budget split"))
      const allocation = { ...((current.data.fundAllocation ?? current.data) as Record<string, unknown>) }

      const merged: Record<string, PillarSetting> = {}
      for (const { value: pillar } of FUND_CATEGORIES) {
        const change = changes[pillar as keyof typeof changes]
        if (change) {
          allocation[`${pillar}Type`] = change.type
          allocation[`${pillar}Value`] = change.value
          if (change.cap !== undefined) allocation[`${pillar}Cap`] = change.cap
        }
        merged[pillar] = {
          type: allocation[`${pillar}Type`] as PillarSetting["type"],
          value: Number(allocation[`${pillar}Value`]),
        }
      }
      if (Object.values(changes).every((c) => c === undefined)) return errorResult("No changes given.")
      const issues = checkBudgetSplit(merged)
      if (issues.length > 0) return errorResult(`Not saved: ${issues.join(" ")}`)

      return routeResult(
        route(putFundAllocation, "PUT", "/api/fund-allocation", allocation),
        "Failed to update budget split",
        () => ({ updated: true, split: merged }),
      )
    },
  )
}
