import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { normalizeDisplayCurrency } from "@/lib/display-currency"
import { routeErrorResponse } from "@/lib/route-error"

const CATS = ["fixedCosts", "savings", "investment", "guiltFreeSpending"] as const
type Cat = (typeof CATS)[number]

function round2(n: number) {
  return Math.round(n * 100) / 100
}

// All BigInt minor-unit values → display dollars
function minorToDollars(n: bigint | null | undefined): number {
  return Number(n ?? 0n) / 100
}

export async function GET() {
  try {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const currency = normalizeDisplayCurrency(session.user.displayCurrency)

  // ── 1. income entries ──────────────────────────────────────────────────────
  const incomeEntries = await prisma.incomeEntry.findMany({
    where: { userId },
    select: {
      id: true, date: true, amount: true, description: true,
      excludeFromAllocation: true,
      allocationFixedCosts: true, allocationSavings: true,
      allocationInvestment: true, allocationGuiltFreeSpending: true,
    },
    orderBy: { date: "asc" },
  })

  // ── 2. expenses ────────────────────────────────────────────────────────────
  const expenses = await prisma.expense.findMany({
    where: { userId },
    select: { id: true, date: true, amount: true, description: true, category: true },
    orderBy: { date: "asc" },
  })

  // ── 3. category balances (envelopes) ──────────────────────────────────────
  const categoryBalances = await prisma.categoryBalance.findMany({
    where: { userId },
    select: { month: true, year: true, category: true, balance: true },
  })

  // ── group by month ─────────────────────────────────────────────────────────
  function monthKey(date: Date) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }

  const months = new Map<string, {
    income: typeof incomeEntries
    expenses: typeof expenses
    balances: typeof categoryBalances
  }>()

  for (const entry of incomeEntries) {
    const k = monthKey(entry.date)
    if (!months.has(k)) months.set(k, { income: [], expenses: [], balances: [] })
    months.get(k)!.income.push(entry)
  }
  for (const expense of expenses) {
    const k = monthKey(expense.date)
    if (!months.has(k)) months.set(k, { income: [], expenses: [], balances: [] })
    months.get(k)!.expenses.push(expense)
  }
  for (const b of categoryBalances) {
    const k = `${b.year}-${String(b.month).padStart(2, "0")}`
    if (!months.has(k)) months.set(k, { income: [], expenses: [], balances: [] })
    months.get(k)!.balances.push(b)
  }

  // ── uncategorised expenses (no category or category not in tracking cats) ──
  const uncategorised = expenses.filter(
    (e: { category: string | null }) => !e.category || !CATS.includes(e.category as Cat)
  )

  // ── per-month summary ──────────────────────────────────────────────────────
  const monthSummaries = []

  for (const [key, data] of [...months.entries()].sort()) {
    const totalIncome = data.income.reduce((s: number, e: typeof incomeEntries[number]) => s + minorToDollars(e.amount), 0)

    // allocated per category from income entry fields
    const allocated: Record<Cat, number> = { fixedCosts: 0, savings: 0, investment: 0, guiltFreeSpending: 0 }
    let incomeWithoutAllocation = 0
    for (const e of data.income) {
      if (e.excludeFromAllocation) {
        allocated.savings += minorToDollars(e.amount)
        continue
      }
      if (
        e.allocationFixedCosts == null &&
        e.allocationSavings == null &&
        e.allocationInvestment == null &&
        e.allocationGuiltFreeSpending == null
      ) {
        incomeWithoutAllocation++
        continue
      }
      allocated.fixedCosts += minorToDollars(e.allocationFixedCosts)
      allocated.savings += minorToDollars(e.allocationSavings)
      allocated.investment += minorToDollars(e.allocationInvestment)
      allocated.guiltFreeSpending += minorToDollars(e.allocationGuiltFreeSpending)
    }

    const totalAllocated = Object.values(allocated).reduce((s, v) => s + v, 0)

    // envelope balances per category (balance is BigInt minor units)
    const envelopes: Record<Cat, number> = { fixedCosts: 0, savings: 0, investment: 0, guiltFreeSpending: 0 }
    for (const b of data.balances) {
      if (CATS.includes(b.category as Cat)) {
        envelopes[b.category as Cat] += minorToDollars(b.balance)
      }
    }
    const totalEnvelopes = Object.values(envelopes).reduce((s, v) => s + v, 0)

    // spending per category
    const spent: Record<Cat, number> = { fixedCosts: 0, savings: 0, investment: 0, guiltFreeSpending: 0 }
    const expensesUncategorised: string[] = []
    for (const e of data.expenses) {
      const cat = e.category as Cat
      if (CATS.includes(cat)) {
        spent[cat] += minorToDollars(e.amount)
      } else {
        expensesUncategorised.push(
          `${e.description ?? "-"} (${e.category ?? "no category"}, $${(Number(e.amount) / 100).toFixed(2)})`
        )
      }
    }
    const totalSpent = Object.values(spent).reduce((s, v) => s + v, 0)

    // flags
    const flags: string[] = []
    if (incomeWithoutAllocation > 0)
      flags.push(`${incomeWithoutAllocation} income entries have no allocation stored, run Rebuild`)
    if (Math.abs(totalIncome - totalAllocated) > 0.02 && data.income.length > 0)
      flags.push(`Income ($${round2(totalIncome)}) ≠ allocated ($${round2(totalAllocated)}), diff $${round2(totalIncome - totalAllocated)}`)
    if (Math.abs(totalEnvelopes - totalAllocated) > 0.02 && data.income.length > 0)
      flags.push(`Envelopes ($${round2(totalEnvelopes)}) ≠ allocated ($${round2(totalAllocated)}), diff $${round2(totalEnvelopes - totalAllocated)}`)
    if (expensesUncategorised.length > 0)
      flags.push(`${expensesUncategorised.length} expenses not counted in any category`)

    monthSummaries.push({
      month: key,
      incomeEntries: data.income.length,
      totalIncome: round2(totalIncome),
      allocated: {
        fixedCosts: round2(allocated.fixedCosts),
        savings: round2(allocated.savings),
        investment: round2(allocated.investment),
        guiltFreeSpending: round2(allocated.guiltFreeSpending),
        total: round2(totalAllocated),
      },
      envelopes: {
        fixedCosts: round2(envelopes.fixedCosts),
        savings: round2(envelopes.savings),
        investment: round2(envelopes.investment),
        guiltFreeSpending: round2(envelopes.guiltFreeSpending),
        total: round2(totalEnvelopes),
      },
      spent: {
        fixedCosts: round2(spent.fixedCosts),
        savings: round2(spent.savings),
        investment: round2(spent.investment),
        guiltFreeSpending: round2(spent.guiltFreeSpending),
        total: round2(totalSpent),
      },
      expensesUncategorised,
      flags,
    })
  }

  return NextResponse.json({
    currency,
    totalIncomeEntries: incomeEntries.length,
    totalExpenses: expenses.length,
    uncategorisedExpenses: uncategorised.map((e: typeof expenses[number]) => ({
      id: e.id,
      date: e.date.toISOString(),
      description: e.description,
      category: e.category,
      amount: round2(minorToDollars(e.amount)),
    })),
    months: monthSummaries,
  })
  } catch (error) {
    return routeErrorResponse(error, "Error running category tracking diagnostic")
  }
}
