import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const GEMMA_MODEL = process.env.AI_MODEL || "gemma-3-27b-it"
const API_KEY = process.env.AI_API_KEY

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: "AI_API_KEY is not configured on the server" },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const userMessage: string | undefined = body?.message
    const history: Array<{ role: "user" | "assistant"; content: string }> =
      body?.history || []

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      )
    }

    // Fetch a snapshot of ALL of the user's finances (not just current month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    )

    const [accounts, allCategoryBalances, allExpenses, allIncomeEntries, allLoans] =
      await Promise.all([
        prisma.account.findMany({
          where: { userId: session.user.id },
          select: {
            id: true,
            name: true,
            bankName: true,
            accountType: true,
            balance: true,
            isDefault: true,
          },
        }),
        prisma.categoryBalance.findMany({
          where: {
            userId: session.user.id,
          },
          select: {
            category: true,
            balance: true,
            month: true,
            year: true,
          },
        }),
        prisma.expense.findMany({
          where: {
            userId: session.user.id,
          },
          select: {
            amount: true,
            category: true,
            expenseCategory: true,
            date: true,
          },
        }),
        prisma.incomeEntry.findMany({
          where: {
            userId: session.user.id,
          } as any,
          select: {
            amount: true,
            date: true,
            excludeFromAllocation: true,
          },
        }),
        (prisma as any).loan.findMany({
          where: {
            userId: session.user.id,
          },
          select: {
            amount: true,
            repaidAmount: true,
            status: true,
            date: true,
          },
        }),
      ])

    // Build a compact, anonymized summary object using ALL history

    // Lifetime totals
    const totalIncomeAllTime = allIncomeEntries.reduce(
      (sum: number, e: { amount?: number }) => sum + (e.amount || 0),
      0,
    )
    const totalExpensesAllTime = allExpenses.reduce(
      (sum: number, e: { amount?: number }) => sum + (e.amount || 0),
      0,
    )

    // Current month totals (derived from all entries)
    const totalIncomeThisMonth = allIncomeEntries.reduce((sum: number, e: { amount?: number; date: Date }) => {
      const d = new Date(e.date)
      if (d >= startOfMonth && d <= endOfMonth) {
        return sum + (e.amount || 0)
      }
      return sum
    }, 0)

    const totalExpensesThisMonth = allExpenses.reduce((sum: number, e: { amount?: number; date: Date }) => {
      const d = new Date(e.date)
      if (d >= startOfMonth && d <= endOfMonth) {
        return sum + (e.amount || 0)
      }
      return sum
    }, 0)

    // All‑time category breakdowns
    const expenseByFundCategoryAllTime: Record<string, number> = {}
    const expenseBySpendingCategoryAllTime: Record<string, number> = {}
    for (const e of allExpenses) {
      if (e.category) {
        expenseByFundCategoryAllTime[e.category] =
          (expenseByFundCategoryAllTime[e.category] || 0) + (e.amount || 0)
      }
      if (e.expenseCategory) {
        expenseBySpendingCategoryAllTime[e.expenseCategory] =
          (expenseBySpendingCategoryAllTime[e.expenseCategory] || 0) +
          (e.amount || 0)
      }
    }

    // Monthly timeline (simple YYYY-MM buckets for income & expenses)
    const monthlyTimeline: Record<
      string,
      { income: number; expenses: number }
    > = {}

    for (const e of allIncomeEntries) {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}`
      if (!monthlyTimeline[key]) {
        monthlyTimeline[key] = { income: 0, expenses: 0 }
      }
      monthlyTimeline[key].income += e.amount || 0
    }

    for (const e of allExpenses) {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}`
      if (!monthlyTimeline[key]) {
        monthlyTimeline[key] = { income: 0, expenses: 0 }
      }
      monthlyTimeline[key].expenses += e.amount || 0
    }

    // Loans
    const totalLentOutAllTime = allLoans.reduce(
      (sum: number, loan: { amount?: number }) => sum + (loan.amount || 0),
      0,
    )
    const totalOutstandingLoans = allLoans.reduce(
      (sum: number, loan: { amount: number; repaidAmount: number }) =>
        sum + (loan.amount - loan.repaidAmount),
      0,
    )

    type AccountRow = { id: string; name: string; isDefault?: boolean }
    const accountNames = (accounts as AccountRow[]).map((a) =>
      a.isDefault ? `${a.name} (default)` : a.name,
    )
    const defaultAccount =
      (accounts as AccountRow[]).find((a) => a.isDefault) ||
      (accounts as AccountRow[])[0]

    const financeSnapshot = {
      generatedAt: now.toISOString(),
      accounts: accounts.map((a) => ({
        name: a.name,
        bankName: a.bankName,
        type: a.accountType,
        balance: a.balance,
      })),
      currentMonth: {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        income: totalIncomeThisMonth,
        expenses: totalExpensesThisMonth,
      },
      lifetimeTotals: {
        income: totalIncomeAllTime,
        expenses: totalExpensesAllTime,
        lentOutTotal: totalLentOutAllTime,
        lentOutOutstanding: totalOutstandingLoans,
      },
      monthlyTimeline,
      categoryBalances: allCategoryBalances,
      expensesByFundCategoryAllTime: expenseByFundCategoryAllTime,
      expensesBySpendingCategoryAllTime: expenseBySpendingCategoryAllTime,
      loanSummary: {
        activeCount: allLoans.filter((l: { status: string }) => l.status === "active").length,
        repaidCount: allLoans.filter((l: { status: string }) => l.status === "repaid").length,
      },
    }

    const systemPrompt = `
You are a helpful, conservative financial coach embedded in a personal finance dashboard.

You know the user's **actual data** from this JSON snapshot. Use ONLY this data and general budgeting wisdom:
- The user splits income into four funds: fixedCosts, savings, investment, and guiltFreeSpending.
- Category balances represent how much money is currently allocated to each fund this month.
- Expenses have both a fund category and a detailed spending category (like food, transport, etc.).
- Loans represent money the user has lent out. It is deducted from accounts but should NOT be treated as spending.

When answering:
- Be concise, practical, and non‑judgmental.
- Use plain language, a friendly tone, and short paragraphs.
- Whenever you give advice, tie it back to the **actual numbers** in the snapshot.
- If the question asks for something you can't know (like future income), say so and give a reasonable heuristic instead.
- Do not mention JSON, schemas, or technical details; just talk about money.

**LOGGING FROM CHAT**  
When the user asks to log, add, or record an expense, income, transfer, or loan, your FIRST line of the response MUST be exactly one of the following (valid JSON, one line, no markdown):

Account names (use exactly one or "default"): ${accountNames.join(", ")}.

- Expense: first line must be:
LOG_EXPENSE: {"amount":<number>,"expenseCategory":"<food|groceries|transport|bills|entertainment|other>","fundCategory":"<fixedCosts|savings|investment|guiltFreeSpending>","description":"<optional string>","accountName":"<from list or default>","date":"<optional ISO date yyyy-mm-dd>"}
Example: LOG_EXPENSE: {"amount":50,"expenseCategory":"food","fundCategory":"guiltFreeSpending","description":"lunch","accountName":"default","date":"2025-03-15"}

- Income: first line must be:
LOG_INCOME: {"amount":<number>,"description":"<optional>","accountName":"<from list or default>","date":"<optional ISO date yyyy-mm-dd>","periodStart":"<optional ISO date>","periodEnd":"<optional ISO date>"}

- Transfer: first line must be:
LOG_TRANSFER: {"amount":<number>,"fromAccountName":"<from list or default>","toAccountName":"<from list or default>","description":"<optional>","date":"<optional ISO date yyyy-mm-dd>"}

- Loan (money the user LENDS to someone else): first line must be:
LOG_LOAN: {"amount":<number>,"borrowerName":"<optional>","description":"<optional>","accountName":"<from list or default>","date":"<optional ISO date yyyy-mm-dd>","dueDate":"<optional ISO date yyyy-mm-dd>"}

If the user mentions a specific date, include it in the \"date\" field (and \"dueDate\" if they mention it). Otherwise omit \"date\" and use today's date. Then on the next line write a short friendly confirmation. Only output a LOG_ line when the user clearly wants to log something; otherwise answer normally with no LOG_ line.

Here is the user's current financial snapshot (do NOT repeat it back verbatim, just use it):
${JSON.stringify(financeSnapshot)}
`.trim()

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ]

    // Call Google Gemini / Gemma 3 generateContent API
    const gemmaUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent?key=${encodeURIComponent(
      API_KEY,
    )}`

    const response = await fetch(gemmaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: 0.4,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error("AI API error (Gemma 3):", response.status, errorText)
      return NextResponse.json(
        { error: "AI service failed" },
        { status: 502 },
      )
    }

    const data = await response.json()
    let reply =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
      "Sorry, I couldn't generate a response right now."

    const resolveAccount = (name: string): string | null => {
      if (!name || name === "default") return defaultAccount?.id ?? null
      const n = name.replace(/\s*\(default\)\s*$/i, "").trim()
      const acc = (accounts as AccountRow[]).find(
        (a) => a.name.toLowerCase() === n.toLowerCase(),
      )
      return acc?.id ?? null
    }

    let logAction: { action: string; params: Record<string, unknown> } | null =
      null

    // Extract JSON object after a LOG_ prefix (match balanced braces so we get full object)
    function extractJsonAfterPrefix(
      text: string,
      prefix: string,
    ): { json: string; start: number; end: number } | null {
      const idx = text.indexOf(prefix)
      if (idx < 0) return null
      const after = text.slice(idx + prefix.length).trim()
      const startBrace = after.indexOf("{")
      if (startBrace < 0) return null
      let depth = 0
      for (let i = startBrace; i < after.length; i++) {
        if (after[i] === "{") depth++
        else if (after[i] === "}") {
          depth--
          if (depth === 0) {
            const json = after.slice(startBrace, i + 1)
            const start = idx + prefix.length + after.slice(0, startBrace).length
            const end = idx + prefix.length + startBrace + json.length
            return { json, start: idx, end }
          }
        }
      }
      return null
    }

    const logExpenseBlock = extractJsonAfterPrefix(reply, "LOG_EXPENSE:")
    const logIncomeBlock = extractJsonAfterPrefix(reply, "LOG_INCOME:")
    const logTransferBlock = extractJsonAfterPrefix(reply, "LOG_TRANSFER:")
    const logLoanBlock = extractJsonAfterPrefix(reply, "LOG_LOAN:")

    if (logExpenseBlock) {
      try {
        const raw = JSON.parse(logExpenseBlock.json)
        const accountId = resolveAccount(raw.accountName || "default")
        if (accountId && raw.amount != null && raw.amount > 0) {
          const date = raw.date
            ? new Date(raw.date).toISOString().split("T")[0]
            : now.toISOString().split("T")[0]
          logAction = {
            action: "log_expense",
            params: {
              accountId,
              amount: Number(raw.amount),
              category: raw.fundCategory || "guiltFreeSpending",
              expenseCategory: raw.expenseCategory || "other",
              description: raw.description || null,
              date,
            },
          }
        }
      } catch (e) {
        console.error("Assistant: failed to parse LOG_EXPENSE JSON", logExpenseBlock.json, e)
      }
      reply = (reply.slice(0, logExpenseBlock.start) + reply.slice(logExpenseBlock.end)).trim()
    } else if (logIncomeBlock) {
      try {
        const raw = JSON.parse(logIncomeBlock.json)
        const accountId = resolveAccount(raw.accountName || "default")
        if (accountId != null && raw.amount != null && raw.amount > 0) {
          const date = raw.date ? new Date(raw.date) : now

          // If periodStart/periodEnd are provided, respect them; otherwise default to the month of the income date
          let periodStart: Date
          let periodEnd: Date
          if (raw.periodStart && raw.periodEnd) {
            periodStart = new Date(raw.periodStart)
            periodEnd = new Date(raw.periodEnd)
          } else {
            periodStart = new Date(date.getFullYear(), date.getMonth(), 1)
            periodEnd = new Date(
              date.getFullYear(),
              date.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            )
          }

          logAction = {
            action: "log_income",
            params: {
              income: Number(raw.amount),
              description: raw.description || null,
              date: date.toISOString(),
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
              accountId,
              allocateToBudget: true,
            },
          }
        }
      } catch (e) {
        console.error("Assistant: failed to parse LOG_INCOME JSON", logIncomeBlock.json, e)
      }
      reply = (reply.slice(0, logIncomeBlock.start) + reply.slice(logIncomeBlock.end)).trim()
    } else if (logTransferBlock) {
      try {
        const raw = JSON.parse(logTransferBlock.json)
        const fromId = resolveAccount(raw.fromAccountName || "default")
        const toId = resolveAccount(raw.toAccountName || "default")
        if (
          fromId &&
          toId &&
          fromId !== toId &&
          raw.amount != null &&
          raw.amount > 0
        ) {
          const dateStr = raw.date
            ? new Date(raw.date).toISOString().split("T")[0]
            : now.toISOString().split("T")[0]
          logAction = {
            action: "log_transfer",
            params: {
              fromAccountId: fromId,
              toAccountId: toId,
              amount: Number(raw.amount),
              description: raw.description || null,
              date: dateStr,
            },
          }
        }
      } catch (e) {
        console.error("Assistant: failed to parse LOG_TRANSFER JSON", logTransferBlock.json, e)
      }
      reply = (reply.slice(0, logTransferBlock.start) + reply.slice(logTransferBlock.end)).trim()
    } else if (logLoanBlock) {
      try {
        const raw = JSON.parse(logLoanBlock.json)
        const accountId = resolveAccount(raw.accountName || "default")
        if (accountId && raw.amount != null && raw.amount > 0) {
          const dateStr = raw.date
            ? new Date(raw.date).toISOString().split("T")[0]
            : now.toISOString().split("T")[0]
          const dueDateStr = raw.dueDate
            ? new Date(raw.dueDate).toISOString().split("T")[0]
            : undefined

          logAction = {
            action: "log_loan",
            params: {
              accountId,
              amount: Number(raw.amount),
              borrowerName: raw.borrowerName || null,
              description: raw.description || null,
              date: dateStr,
              dueDate: dueDateStr,
            },
          }
        }
      } catch (e) {
        console.error("Assistant: failed to parse LOG_LOAN JSON", logLoanBlock.json, e)
      }
      reply = (reply.slice(0, logLoanBlock.start) + reply.slice(logLoanBlock.end)).trim()
    }

    // Safety: if any JSON block or stray braces are still at the very start of the reply, strip them
    const trimmedStart = reply.trimStart()
    if (trimmedStart.startsWith("{")) {
      const offset = reply.length - trimmedStart.length
      let depth = 0
      let started = false
      let endIdx = -1
      for (let i = offset; i < reply.length; i++) {
        const ch = reply[i]
        if (ch === "{") {
          depth++
          started = true
        } else if (ch === "}") {
          depth--
          if (started && depth === 0) {
            endIdx = i + 1
            break
          }
        }
      }
      if (endIdx > offset) {
        reply = (reply.slice(0, offset) + reply.slice(endIdx)).trim()
      }
    }
    // Also strip any remaining leading '{' or '}' characters
    let cleaned = reply.trimStart()
    while (cleaned.startsWith("{") || cleaned.startsWith("}")) {
      cleaned = cleaned.slice(1).trimStart()
    }
    reply = cleaned

    return NextResponse.json({
      reply,
      ...(logAction && { logAction }),
    })
  } catch (error) {
    console.error("Assistant error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

