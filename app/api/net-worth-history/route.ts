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

  const snapshots = buckets.map(({ month, year, label, end }) => {
    const endMs = end.getTime()

    // Cash: anchor on current balance, reverse transactions that happened after this month
    const incomeAfter = allIncome
      .filter((e) => new Date(e.date).getTime() > endMs)
      .reduce((s, e) => s + Number(e.amount), 0)
    const expensesAfter = allExpenses
      .filter((e) => new Date(e.date).getTime() > endMs)
      .reduce((s, e) => s + Number(e.amount), 0)
    const cashValue = currentCash - incomeAfter + expensesAfter

    // Investments: only holdings purchased on or before this month
    const investmentValue = allHoldings
      .filter((h) => new Date(h.date).getTime() <= endMs)
      .reduce((s, h) => s + Number(h.amount), 0)

    // Loans: only loans issued on or before this month
    const loanValue = allLoans
      .filter((l) => new Date(l.date).getTime() <= endMs)
      .reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.repaidAmount)), 0)

    // Super: sum of all contributions (no time-travel — derived same way as the super page)
    const superValue = superAccounts.reduce((s, a) =>
      s + a.contributions.reduce((cs, c) => cs + Number(c.amount), 0), 0)

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
