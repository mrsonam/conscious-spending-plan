import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor } from "@/lib/money"
import { routeErrorResponse } from "@/lib/route-error"

export const dynamic = "force-dynamic"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export async function GET(req: Request) {
  try {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const currency = currencyFromSession(session.user.displayCurrency)
  const toD = (minor: number) => serializeMoneyForApi(coerceMinor(BigInt(Math.round(minor))), currency)

  const { searchParams } = new URL(req.url)
  const months = Math.min(24, Math.max(3, Number(searchParams.get("months") ?? 12)))

  const now = new Date()

  // Fetch all required data in parallel
  const [accounts, allIncome, allExpenses, allHoldings, allLoans, superAccounts] = await Promise.all([
    prisma.account.findMany({ where: { userId }, select: { balance: true } }),
    prisma.incomeEntry.findMany({ where: { userId }, select: { amount: true, date: true } }),
    prisma.expense.findMany({ where: { userId }, select: { amount: true, date: true } }),
    prisma.investmentHolding.findMany({ where: { userId }, select: { amount: true, date: true } }),
    prisma.loan.findMany({
      where: { userId, status: "active" },
      select: { amount: true, repaidAmount: true, date: true },
    }),
    prisma.superannuationAccount.findMany({
      where: { userId },
      select: { contributions: { select: { amount: true } } },
    }),
  ])

  // Current cash anchor: sum of all account balances (in minor units)
  const currentCash = accounts.reduce((s, a) => s + Number(a.balance), 0)

  // Build month buckets oldest → current
  const buckets: { month: number; year: number; label: string; end: Date }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const end = new Date(year, month, 0, 23, 59, 59, 999) // last instant of this month
    buckets.push({ month, year, label: `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`, end })
  }

  // Single pass per source instead of re-filtering every array for each
  // bucket: sort ascending once, then advance a pointer as bucket ends grow.
  const incomeSorted = allIncome
    .map((e) => ({ t: new Date(e.date).getTime(), v: Number(e.amount) }))
    .sort((a, b) => a.t - b.t)
  const expensesSorted = allExpenses
    .map((e) => ({ t: new Date(e.date).getTime(), v: Number(e.amount) }))
    .sort((a, b) => a.t - b.t)
  const holdingsSorted = allHoldings
    .map((h) => ({ t: new Date(h.date).getTime(), v: Number(h.amount) }))
    .sort((a, b) => a.t - b.t)
  const loansSorted = allLoans
    .map((l) => ({
      t: new Date(l.date).getTime(),
      v: Math.max(0, Number(l.amount) - Number(l.repaidAmount)),
    }))
    .sort((a, b) => a.t - b.t)

  const totalIncome = incomeSorted.reduce((s, e) => s + e.v, 0)
  const totalExpenses = expensesSorted.reduce((s, e) => s + e.v, 0)

  // Super is intentionally constant across buckets (derived the same way as
  // the super page), compute it once.
  const superValue = superAccounts.reduce(
    (s, a) => s + a.contributions.reduce((cs, c) => cs + Number(c.amount), 0),
    0,
  )

  let incomeIdx = 0
  let incomeUpTo = 0
  let expenseIdx = 0
  let expenseUpTo = 0
  let holdingIdx = 0
  let investmentValue = 0
  let loanIdx = 0
  let loanValue = 0

  const snapshots = buckets.map(({ month, year, label, end }) => {
    const endMs = end.getTime()

    while (incomeIdx < incomeSorted.length && incomeSorted[incomeIdx].t <= endMs) {
      incomeUpTo += incomeSorted[incomeIdx].v
      incomeIdx++
    }
    while (expenseIdx < expensesSorted.length && expensesSorted[expenseIdx].t <= endMs) {
      expenseUpTo += expensesSorted[expenseIdx].v
      expenseIdx++
    }
    while (holdingIdx < holdingsSorted.length && holdingsSorted[holdingIdx].t <= endMs) {
      investmentValue += holdingsSorted[holdingIdx].v
      holdingIdx++
    }
    while (loanIdx < loansSorted.length && loansSorted[loanIdx].t <= endMs) {
      loanValue += loansSorted[loanIdx].v
      loanIdx++
    }

    // Cash: anchor on current balance, reverse transactions after this month
    const incomeAfter = totalIncome - incomeUpTo
    const expensesAfter = totalExpenses - expenseUpTo
    const cashValue = currentCash - incomeAfter + expensesAfter
    const netWorth = cashValue + investmentValue + loanValue + superValue

    return {
      month,
      year,
      label,
      cashValue: toD(cashValue),
      investmentValue: toD(investmentValue),
      loanValue: toD(loanValue),
      superValue: toD(superValue),
      netWorth: toD(netWorth),
    }
  })

  return NextResponse.json({ snapshots }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  })
  } catch (error) {
    return routeErrorResponse(error, "Error building net worth history")
  }
}
