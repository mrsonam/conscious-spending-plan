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

const RECOMMENDATION_PROMPT = `You are a financial advisor. Analyze the user's actual spending vs their budget allocation and suggest optimizations.

Return a JSON object with this exact structure:
{
  "summary": "1-2 sentence overall assessment",
  "recommendations": [
    {
      "pillar": "fixedCosts" | "savings" | "investment" | "guiltFreeSpending",
      "currentPct": <number>,
      "suggestedPct": <number>,
      "reason": "1 sentence explanation"
    }
  ]
}

Rules:
- The four pillar percentages MUST sum to 100
- Only suggest changes if actual spending meaningfully differs from allocation
- Reference specific dollar amounts from the data
- If allocations look good, say so and suggest minor tweaks at most
- Be practical — don't suggest unrealistic savings targets
- Return ONLY the JSON object, no other text or markdown`

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

    let expenses: {
      amount: bigint
      date: Date
      category: string | null
      expenseCategory: string | null
    }[] = []
    let income: { amount: bigint; date: Date }[] = []
    let recurring: {
      description: string | null
      amount: bigint
      frequency: string
      expenseCategory: string | null
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
          select: { amount: true, date: true },
          orderBy: { date: "desc" },
        }),
        prisma.recurringExpense.findMany({
          where: { userId: session.user.id, isActive: true },
          select: {
            description: true,
            amount: true,
            frequency: true,
            expenseCategory: true,
          },
        }),
        prisma.fundAllocation.findFirst({
          where: { userId: session.user.id },
        }),
      ])
      expenses = results[0] as typeof expenses
      income = results[1] as typeof income
      recurring = results[2] as typeof recurring
      fundSettings = results[3] as FundSettingsRow | null
    } catch (dbErr) {
      console.error("AI budget recommendations: database unavailable:", dbErr)
    }

    const incomeByMonth = new Map<string, number>()
    for (const i of income) {
      const month = i.date.toISOString().slice(0, 7)
      incomeByMonth.set(
        month,
        (incomeByMonth.get(month) ?? 0) + toD(coerceMinor(i.amount)),
      )
    }
    const monthlyIncomes = [...incomeByMonth.values()]
    const avgMonthlyIncome =
      monthlyIncomes.length > 0
        ? monthlyIncomes.reduce((a, b) => a + b, 0) / monthlyIncomes.length
        : 0

    const pillarTotals: Record<string, number> = {
      fixedCosts: 0,
      savings: 0,
      investment: 0,
      guiltFreeSpending: 0,
    }
    const categoryBreakdown = new Map<string, number>()

    for (const e of expenses) {
      const cat = e.expenseCategory ?? e.category ?? "uncategorized"
      const amt = toD(coerceMinor(e.amount))
      categoryBreakdown.set(cat, (categoryBreakdown.get(cat) ?? 0) + amt)

      const pillar = cat.toLowerCase()
      if (pillar.includes("fixed") || pillar.includes("rent") || pillar.includes("utilities")) {
        pillarTotals.fixedCosts += amt
      } else if (pillar.includes("saving")) {
        pillarTotals.savings += amt
      } else if (pillar.includes("invest")) {
        pillarTotals.investment += amt
      } else {
        pillarTotals.guiltFreeSpending += amt
      }
    }

    const months = Math.max(1, incomeByMonth.size)

    let context = `Average monthly income: $${avgMonthlyIncome.toFixed(2)}\n`
    context += `Data spans ${months} months\n\n`

    if (fundSettings) {
      context += `Current Budget Allocation:\n`
      context += `  Fixed costs: ${fundSettings.fixedCostsPercentBps / 100}%\n`
      context += `  Savings: ${fundSettings.savingsPercentBps / 100}%\n`
      context += `  Investment: ${fundSettings.investmentPercentBps / 100}%\n`
      context += `  Guilt-free spending: ${fundSettings.guiltFreeSpendingPercentBps / 100}%\n\n`
    } else {
      context += `No budget allocation set yet.\n\n`
    }

    context += `Actual Monthly Spending by Pillar (averaged over ${months} months):\n`
    for (const [pillar, total] of Object.entries(pillarTotals)) {
      const monthly = total / months
      const pct = avgMonthlyIncome > 0 ? (monthly / avgMonthlyIncome) * 100 : 0
      context += `  ${pillar}: $${monthly.toFixed(2)}/mo (${pct.toFixed(1)}% of income)\n`
    }

    context += `\nDetailed Category Spending (total over ${months} months):\n`
    for (const [cat, total] of [...categoryBreakdown.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      context += `  ${cat}: $${total.toFixed(2)} ($${(total / months).toFixed(2)}/mo)\n`
    }

    if (recurring.length > 0) {
      context += `\nRecurring Expenses:\n`
      for (const r of recurring) {
        context += `  ${r.description ?? "Unnamed"}: $${toD(coerceMinor(r.amount)).toFixed(2)} (${r.frequency})\n`
      }
    }

    if (expenses.length === 0 && income.length === 0) {
      context += "\nNote: No financial data is available yet. Suggest a standard 50/20/10/20 allocation with general reasoning.\n"
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "minimaxai/minimax-m2.7",
      messages: [
        { role: "system", content: RECOMMENDATION_PROMPT },
        { role: "user", content: context },
      ],
      temperature: 0.5,
      top_p: 0.95,
      max_tokens: 1024,
      stream: false,
    })

    const raw = completion.choices[0]?.message?.content ?? "{}"
    let result: {
      summary: string
      recommendations: {
        pillar: string
        currentPct: number
        suggestedPct: number
        reason: string
      }[]
    }
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      result = JSON.parse(jsonMatch?.[0] ?? "{}")
    } catch {
      console.error("Failed to parse budget recommendations JSON:", raw)
      result = { summary: "", recommendations: [] }
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
      },
    })
  } catch (error) {
    console.error("AI budget recommendations error:", error)
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 },
    )
  }
}
