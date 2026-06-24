import { NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor } from "@/lib/money"

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1",
  })
}

const INSIGHT_PROMPT = `You are a financial analyst. Analyze the user's financial data and return exactly 4 actionable insights as a JSON array.

Each insight must have:
- "type": one of "warning", "positive", "tip", "info"
- "title": short headline (max 8 words)
- "body": 1-2 sentence explanation with specific dollar amounts from their data

Rules:
- Use "warning" for overspending, declining savings, budget breaches
- Use "positive" for good trends, improved savings, under-budget categories
- Use "tip" for actionable optimization suggestions
- Use "info" for neutral observations or comparisons
- Always reference specific numbers from their data
- If there's not enough data for 4 insights, still return 4 but use "info" type for general advice
- Return ONLY the JSON array, no other text or markdown

Example output:
[
  {"type":"warning","title":"Dining spend up 40%","body":"You spent $820 on dining out this month vs $585 last month — a $235 increase."},
  {"type":"positive","title":"Savings rate improving","body":"Your savings rate hit 22% this month, up from 18% last month."},
  {"type":"tip","title":"Bundle streaming services","body":"You're paying $45/mo across 3 streaming services. Consider bundling to save ~$15/mo."},
  {"type":"info","title":"Income steady at $6.2k","body":"Your income has been consistent at ~$6,200/mo for the past 3 months."}
]`

export async function GET() {
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

    const currency = currencyFromSession(session.user.displayCurrency)
    const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)

    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

    let accounts: { name: string; accountType: string; balance: bigint }[] = []
    let expenses: {
      amount: bigint
      date: Date
      category: string | null
      expenseCategory: string | null
    }[] = []
    let income: { amount: bigint; date: Date; source: string | null }[] = []
    let recurring: {
      description: string | null
      amount: bigint
      frequency: string
    }[] = []
    type FundSettingsRow = {
      fixedCostsPercentBps: number
      savingsPercentBps: number
      investmentPercentBps: number
      guiltFreeSpendingPercentBps: number
    }
    let fundSettings: FundSettingsRow | null = null

    try {
      const results = await Promise.all([
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
      accounts = results[0] as typeof accounts
      expenses = results[1] as typeof expenses
      income = results[2] as typeof income
      recurring = results[3] as typeof recurring
      fundSettings = results[4] as FundSettingsRow | null
    } catch (dbErr) {
      console.error("AI insights: database unavailable, generating with limited context:", dbErr)
    }

    const totalBalance = accounts.reduce(
      (s: number, a: { balance: bigint }) => s + toD(coerceMinor(a.balance)),
      0,
    )

    const expensesByMonth = new Map<string, Map<string, number>>()
    for (const e of expenses) {
      const month = e.date.toISOString().slice(0, 7)
      const cat = e.expenseCategory ?? e.category ?? "uncategorized"
      if (!expensesByMonth.has(month)) expensesByMonth.set(month, new Map())
      const catMap = expensesByMonth.get(month)!
      catMap.set(cat, (catMap.get(cat) ?? 0) + toD(coerceMinor(e.amount)))
    }

    const incomeByMonth = new Map<string, number>()
    for (const i of income) {
      const month = i.date.toISOString().slice(0, 7)
      incomeByMonth.set(
        month,
        (incomeByMonth.get(month) ?? 0) + toD(coerceMinor(i.amount)),
      )
    }

    let context = `Total balance: $${totalBalance.toFixed(2)}\n\n`
    context += `Monthly Income:\n`
    for (const [month, total] of [...incomeByMonth.entries()].sort(
      (a, b) => b[0].localeCompare(a[0]),
    )) {
      context += `  ${month}: $${total.toFixed(2)}\n`
    }

    context += `\nMonthly Spending by Category:\n`
    for (const [month, cats] of [...expensesByMonth.entries()].sort(
      (a, b) => b[0].localeCompare(a[0]),
    )) {
      const total = [...cats.values()].reduce((s, v) => s + v, 0)
      context += `\n${month} — Total: $${total.toFixed(2)}\n`
      for (const [cat, amt] of [...cats.entries()].sort(
        (a, b) => b[1] - a[1],
      )) {
        context += `  ${cat}: $${amt.toFixed(2)}\n`
      }
    }

    if (recurring.length > 0) {
      context += `\nRecurring Expenses:\n`
      for (const r of recurring) {
        context += `  ${r.description ?? "Unnamed"}: $${toD(coerceMinor(r.amount)).toFixed(2)} (${r.frequency})\n`
      }
    }

    if (fundSettings) {
      context += `\nBudget Allocation:\n`
      context += `  Fixed costs: ${fundSettings.fixedCostsPercentBps / 100}%\n`
      context += `  Savings: ${fundSettings.savingsPercentBps / 100}%\n`
      context += `  Investment: ${fundSettings.investmentPercentBps / 100}%\n`
      context += `  Guilt-free: ${fundSettings.guiltFreeSpendingPercentBps / 100}%\n`
    }

    if (accounts.length === 0 && expenses.length === 0 && income.length === 0) {
      context += "\nNote: No financial data is available yet. Provide 4 general personal finance tips as insights instead.\n"
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "minimaxai/minimax-m2.7",
      messages: [
        { role: "system", content: INSIGHT_PROMPT },
        { role: "user", content: context },
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 1024,
      stream: false,
    })

    const raw = completion.choices[0]?.message?.content ?? "[]"
    console.log("AI insights raw response:", raw.slice(0, 500))
    let insights: { type: string; title: string; body: string }[]
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error("No JSON array found in AI response:", raw)
      }
      insights = JSON.parse(jsonMatch?.[0] ?? "[]")
    } catch {
      console.error("Failed to parse insights JSON:", raw)
      insights = []
    }

    return NextResponse.json(
      { insights },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        },
      },
    )
  } catch (error) {
    console.error("AI insights error:", error)
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 },
    )
  }
}
