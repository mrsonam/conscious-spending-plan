import { NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor } from "@/lib/money"

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
})

const ANOMALY_PROMPT = `You are a financial fraud and anomaly detection system. Analyze the user's recent transactions and flag anything unusual.

Return a JSON array of anomalies (0-5 items). Each anomaly must have:
- "severity": "high" | "medium" | "low"
- "title": short headline (max 8 words)
- "description": 1-2 sentence explanation with specific amounts and dates
- "category": the spending category involved

Look for:
- Unusually large transactions compared to the user's normal spending in that category
- Sudden spikes in a category (e.g. 2x+ normal monthly spend)
- New categories that haven't appeared before
- Duplicate or very similar charges close together
- Transactions significantly above the category average

If nothing unusual is found, return an empty array [].
Return ONLY the JSON array, no other text or markdown.`

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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    type ExpenseRow = {
      amount: bigint
      date: Date
      description: string | null
      category: string | null
      expenseCategory: string | null
    }

    let allExpenses: ExpenseRow[] = []
    let recentExpenses: ExpenseRow[] = []

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
            description: true,
            category: true,
            expenseCategory: true,
          },
          orderBy: { date: "desc" },
        }),
        prisma.expense.findMany({
          where: {
            userId: session.user.id,
            date: { gte: thirtyDaysAgo },
          },
          select: {
            amount: true,
            date: true,
            description: true,
            category: true,
            expenseCategory: true,
          },
          orderBy: { date: "desc" },
        }),
      ])
      allExpenses = results[0] as ExpenseRow[]
      recentExpenses = results[1] as ExpenseRow[]
    } catch (dbErr) {
      console.error("AI anomaly detection: database unavailable:", dbErr)
    }

    const categoryAvgs = new Map<string, { total: number; count: number }>()
    for (const e of allExpenses) {
      const cat = e.expenseCategory ?? e.category ?? "uncategorized"
      const entry = categoryAvgs.get(cat) ?? { total: 0, count: 0 }
      entry.total += toD(coerceMinor(e.amount))
      entry.count += 1
      categoryAvgs.set(cat, entry)
    }

    let context = `Historical Category Averages (6 months):\n`
    for (const [cat, { total, count }] of [...categoryAvgs.entries()].sort(
      (a, b) => b[1].total - a[1].total,
    )) {
      const avg = total / count
      context += `  ${cat}: avg $${avg.toFixed(2)}/transaction, ${count} transactions, $${total.toFixed(2)} total\n`
    }

    context += `\nRecent Transactions (last 30 days):\n`
    for (const e of recentExpenses.slice(0, 50)) {
      const cat = e.expenseCategory ?? e.category ?? "uncategorized"
      const amt = toD(coerceMinor(e.amount))
      const date = e.date.toISOString().split("T")[0]
      context += `  ${date} | ${cat} | ${e.description ?? "No description"} | $${amt.toFixed(2)}\n`
    }

    const completion = await openai.chat.completions.create({
      model: "minimaxai/minimax-m2.7",
      messages: [
        { role: "system", content: ANOMALY_PROMPT },
        { role: "user", content: context },
      ],
      temperature: 0.3,
      top_p: 0.95,
      max_tokens: 1024,
      stream: false,
    })

    const raw = completion.choices[0]?.message?.content ?? "[]"
    let anomalies: {
      severity: string
      title: string
      description: string
      category: string
    }[]
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      anomalies = JSON.parse(jsonMatch?.[0] ?? "[]")
    } catch {
      console.error("Failed to parse anomaly detection JSON:", raw)
      anomalies = []
    }

    return NextResponse.json(
      { anomalies },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        },
      },
    )
  } catch (error) {
    console.error("AI anomaly detection error:", error)
    return NextResponse.json(
      { error: "Failed to run anomaly detection" },
      { status: 500 },
    )
  }
}
