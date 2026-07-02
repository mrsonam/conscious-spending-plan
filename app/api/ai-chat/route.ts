import { NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor } from "@/lib/money"

function buildFinancialContext(
  data: {
    accounts: { name: string; accountType: string; balance: number }[]
    recentExpenses: {
      category: string | null
      expenseCategory: string | null
      amount: number
      date: string
    }[]
    recentIncome: { amount: number; date: string; source: string | null }[]
    recurringExpenses: {
      description: string | null
      amount: number
      frequency: string
    }[]
    fundAllocations: {
      fixedCosts: number
      savings: number
      investment: number
      guiltFreeSpending: number
    } | null
  },
) {
  const { accounts, recentExpenses, recentIncome, recurringExpenses } = data

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const cashBalance = accounts
    .filter((a) => a.accountType === "checking" || a.accountType === "savings")
    .reduce((s, a) => s + a.balance, 0)

  const expensesByMonth = new Map<string, Map<string, number>>()
  for (const e of recentExpenses) {
    const month = e.date.slice(0, 7)
    const cat = e.expenseCategory ?? e.category ?? "uncategorized"
    if (!expensesByMonth.has(month)) expensesByMonth.set(month, new Map())
    const catMap = expensesByMonth.get(month)!
    catMap.set(cat, (catMap.get(cat) ?? 0) + e.amount)
  }

  const incomeByMonth = new Map<string, number>()
  for (const inc of recentIncome) {
    const month = inc.date.slice(0, 7)
    incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + inc.amount)
  }

  let context = `## User's Financial Snapshot\n\n`
  context += `### Accounts\n`
  for (const a of accounts) {
    context += `- ${a.name} (${a.accountType}): $${a.balance.toFixed(2)}\n`
  }
  context += `- Total balance: $${totalBalance.toFixed(2)}\n`
  context += `- Cash (checking+savings): $${cashBalance.toFixed(2)}\n\n`

  context += `### Monthly Income (last 6 months)\n`
  const sortedIncomeMonths = [...incomeByMonth.entries()].sort(
    (a, b) => b[0].localeCompare(a[0]),
  )
  for (const [month, total] of sortedIncomeMonths) {
    context += `- ${month}: $${total.toFixed(2)}\n`
  }

  context += `\n### Monthly Spending by Category (last 6 months)\n`
  const sortedExpenseMonths = [...expensesByMonth.entries()].sort(
    (a, b) => b[0].localeCompare(a[0]),
  )
  for (const [month, cats] of sortedExpenseMonths) {
    const total = [...cats.values()].reduce((s, v) => s + v, 0)
    context += `\n**${month}** — Total: $${total.toFixed(2)}\n`
    const sorted = [...cats.entries()].sort((a, b) => b[1] - a[1])
    for (const [cat, amt] of sorted) {
      context += `  - ${cat}: $${amt.toFixed(2)}\n`
    }
  }

  if (recurringExpenses.length > 0) {
    context += `\n### Recurring Expenses\n`
    for (const r of recurringExpenses) {
      context += `- ${r.description ?? "Unnamed"}: $${r.amount.toFixed(2)} (${r.frequency})\n`
    }
  }

  if (data.fundAllocations) {
    const f = data.fundAllocations
    context += `\n### Budget Allocation (% of income)\n`
    context += `- Fixed costs: ${f.fixedCosts}%\n`
    context += `- Savings: ${f.savings}%\n`
    context += `- Investment: ${f.investment}%\n`
    context += `- Guilt-free spending: ${f.guiltFreeSpending}%\n`
  }

  return context
}

const SYSTEM_PROMPT = `You are a helpful financial assistant embedded in the user's Conscious Spending Plan app. You have access to their real financial data shown below.

Your role:
- Answer questions about their spending, income, balances, and trends
- Provide actionable insights and suggestions
- Help them understand their financial patterns
- Suggest ways to optimize their budget
- Be encouraging but honest about areas that need attention

Guidelines:
- Use specific numbers from their data when answering
- Keep responses concise and conversational (2-4 paragraphs max)
- Use dollar amounts, not minor units
- When comparing months, note trends (increasing/decreasing)
- If asked about something not in the data, say so honestly
- Never make up financial data
- Do not use markdown headers, keep it conversational`

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1",
  })
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 },
      )
    }

    let parsedBody: unknown
    try {
      parsedBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const rawMessages = (parsedBody as { messages?: unknown })?.messages

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 },
      )
    }

    // Only accept user/assistant turns with bounded string content — the
    // system prompt is always built server-side and can't be overridden.
    const MAX_CONTENT_CHARS = 8_000
    const messages: { role: "user" | "assistant"; content: string }[] = []
    for (const m of rawMessages) {
      const role = (m as { role?: unknown })?.role
      const content = (m as { content?: unknown })?.content
      if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
        return NextResponse.json(
          { error: "Messages must have role 'user' or 'assistant' and string content" },
          { status: 400 },
        )
      }
      messages.push({ role, content: content.slice(0, MAX_CONTENT_CHARS) })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)

    const now = new Date()
    const sixMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 6,
      1,
    )

    const [accounts, expenses, income, recurring, fundSettings] =
      await Promise.all([
        prisma.account.findMany({
          where: { userId: session.user.id },
          select: { name: true, accountType: true, balance: true },
        }),
        prisma.expense.findMany({
          where: {
            userId: session.user.id,
            date: { gte: sixMonthsAgo },
          },
          select: {
            amount: true,
            date: true,
            category: true,
            expenseCategory: true,
          },
          orderBy: { date: "desc" },
        }),
        prisma.incomeEntry.findMany({
          where: {
            userId: session.user.id,
            date: { gte: sixMonthsAgo },
            excludeFromAllocation: false,
          },
          select: { amount: true, date: true, source: true },
          orderBy: { date: "desc" },
        }),
        prisma.recurringExpense.findMany({
          where: { userId: session.user.id, isActive: true },
          select: { description: true, amount: true, frequency: true },
        }),
        prisma.fundAllocation.findFirst({
          where: { userId: session.user.id },
        }),
      ])

    const financialContext = buildFinancialContext({
      accounts: accounts.map(
        (a: { name: string; accountType: string; balance: bigint }) => ({
          name: a.name,
          accountType: a.accountType,
          balance: toD(coerceMinor(a.balance)),
        }),
      ),
      recentExpenses: expenses.map(
        (e: {
          category: string | null
          expenseCategory: string | null
          amount: bigint
          date: Date
        }) => ({
          category: e.category,
          expenseCategory: e.expenseCategory,
          amount: toD(coerceMinor(e.amount)),
          date: e.date.toISOString().split("T")[0]!,
        }),
      ),
      recentIncome: income.map(
        (i: { amount: bigint; date: Date; source: string | null }) => ({
          amount: toD(coerceMinor(i.amount)),
          date: i.date.toISOString().split("T")[0]!,
          source: i.source,
        }),
      ),
      recurringExpenses: recurring.map(
        (r: {
          description: string | null
          amount: bigint
          frequency: string
        }) => ({
          description: r.description,
          amount: toD(coerceMinor(r.amount)),
          frequency: r.frequency,
        }),
      ),
      fundAllocations: fundSettings
        ? {
            fixedCosts: fundSettings.fixedCostsPercentBps / 100,
            savings: fundSettings.savingsPercentBps / 100,
            investment: fundSettings.investmentPercentBps / 100,
            guiltFreeSpending: fundSettings.guiltFreeSpendingPercentBps / 100,
          }
        : null,
    })

    const systemMessage = `${SYSTEM_PROMPT}\n\n${financialContext}`

    const stream = await getOpenAI().chat.completions.create({
      model: "minimaxai/minimax-m2.7",
      messages: [
        { role: "system", content: systemMessage },
        ...(messages.slice(-10) as OpenAI.Chat.Completions.ChatCompletionMessageParam[]),
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 4096,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
        } catch (err) {
          console.error("Stream error:", err)
          controller.enqueue(
            encoder.encode("\n\n[Error: connection interrupted]"),
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("AI chat error:", error)
    const message =
      error instanceof OpenAI.APIError
        ? `AI service error: ${error.message}`
        : "Internal server error"
    return NextResponse.json(
      { error: message },
      { status: error instanceof OpenAI.APIError ? 502 : 500 },
    )
  }
}
