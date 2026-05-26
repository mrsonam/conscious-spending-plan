import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ensureMonthlyCategoryBalances,
  getIncomeEntriesForMonthByDate,
  schedulePersistPreviousMonthClosing,
} from "@/lib/monthly-tracking"
import { parseMoneyFromApi, serializeMoneyForApi } from "@/lib/money-api"
import {
  buildAllocatedSoFarFromEntries,
  computeIncomeAllocationsMinor,
  incomeAllocationToApi,
  type CategoryKey,
  type IncomeAllocationMinor,
} from "@/lib/income-allocation"
import { currencyFromSession } from "@/lib/user-currency"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const {
      income,
      description,
      date,
      periodStart,
      periodEnd,
      accountId,
      allocateToBudget = true,
    } = await request.json()

    let incomeMinor: bigint
    try {
      incomeMinor = parseMoneyFromApi(income, currency)
    } catch {
      return NextResponse.json(
        { error: "Valid income amount is required" },
        { status: 400 }
      )
    }
    if (incomeMinor <= 0n) {
      return NextResponse.json(
        { error: "Valid income amount is required" },
        { status: 400 }
      )
    }

    const incomeDate = date ? new Date(date + "T12:00:00") : new Date()
    const targetMonth = incomeDate.getMonth() + 1
    const targetYear = incomeDate.getFullYear()

    const fundAllocation = await prisma.fundAllocation.findUnique({
      where: { userId: session.user.id },
    })

    if (!fundAllocation) {
      return NextResponse.json(
        { error: "Fund allocation not found" },
        { status: 404 }
      )
    }

    await ensureMonthlyCategoryBalances(
      session.user.id,
      targetMonth,
      targetYear
    )

    const priorMonthEntries = await getIncomeEntriesForMonthByDate(
      session.user.id,
      targetMonth,
      targetYear
    )
    const allocatedSoFar = buildAllocatedSoFarFromEntries(
      priorMonthEntries,
      fundAllocation,
      currency
    )
    const getAllocatedFromIncomeSoFar = (cat: CategoryKey) =>
      allocatedSoFar[cat]

    let alloc: IncomeAllocationMinor = {
      fixedCosts: 0n,
      savings: 0n,
      investment: 0n,
      guiltFreeSpending: 0n,
    }

    if (allocateToBudget) {
      alloc = computeIncomeAllocationsMinor(
        incomeMinor,
        fundAllocation,
        currency,
        getAllocatedFromIncomeSoFar
      )
    }

    let depositAccount = null
    if (accountId) {
      depositAccount = await prisma.account.findFirst({
        where: { id: accountId, userId: session.user.id },
      })
    } else {
      depositAccount = await prisma.account.findFirst({
        where: { userId: session.user.id, isDefault: true },
      })
    }

    const incomeEntry = await prisma.incomeEntry.create({
      data: {
        userId: session.user.id,
        amount: incomeMinor,
        description: description || null,
        date: date ? new Date(date) : new Date(),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        accountId: depositAccount?.id || null,
        excludeFromAllocation: !allocateToBudget,
        ...(allocateToBudget && {
          allocationFixedCosts: alloc.fixedCosts,
          allocationSavings: alloc.savings,
          allocationInvestment: alloc.investment,
          allocationGuiltFreeSpending: alloc.guiltFreeSpending,
        }),
      },
    })

    if (!allocateToBudget) {
      if (depositAccount) {
        await prisma.account.update({
          where: { id: depositAccount.id },
          data: { balance: { increment: incomeMinor } },
        })
      }

      const incomeDollars = serializeMoneyForApi(incomeMinor, currency)
      return moneyJsonResponse(
        {
          income: incomeDollars,
          fixedCosts: 0,
          savings: 0,
          investment: 0,
          guiltFreeSpending: 0,
          total: incomeDollars,
          incomeEntryId: incomeEntry.id,
          depositedToAccount: depositAccount?.id || null,
          depositedToAccountName: depositAccount
            ? `${depositAccount.name} (${depositAccount.bankName})`
            : null,
          isCashAccount: depositAccount?.accountType === "cash",
          isExcludedFromAllocation: true,
        },
        currency
      )
    }

    const incrementBalance = async (category: string, delta: bigint) => {
      const incrementValue = delta
      const existing = await prisma.categoryBalance.findFirst({
        where: {
          userId: session.user.id,
          category,
          month: targetMonth,
          year: targetYear,
        },
      })

      if (existing) {
        await prisma.categoryBalance.update({
          where: { id: existing.id },
          data: { balance: { increment: incrementValue } },
        })
      } else {
        await prisma.categoryBalance.create({
          data: {
            userId: session.user.id,
            category,
            balance: incrementValue,
            month: targetMonth,
            year: targetYear,
          },
        })
      }
    }

    await Promise.all([
      incrementBalance("fixedCosts", alloc.fixedCosts),
      incrementBalance("investment", alloc.investment),
      incrementBalance("guiltFreeSpending", alloc.guiltFreeSpending),
      incrementBalance("savings", alloc.savings),
    ])

    if (depositAccount) {
      await prisma.account.update({
        where: { id: depositAccount.id },
        data: { balance: { increment: incomeMinor } },
      })
    } else if (!accountId) {
      console.warn(
        "No default account set for user. Income not deposited to any account."
      )
    }

    const breakdown = {
      ...incomeAllocationToApi(incomeMinor, alloc, currency),
      incomeEntryId: incomeEntry.id,
      depositedToAccount: depositAccount?.id || null,
      depositedToAccountName: depositAccount
        ? `${depositAccount.name} (${depositAccount.bankName})`
        : null,
      isCashAccount: depositAccount?.accountType === "cash",
      isExcludedFromAllocation: false,
    }

    schedulePersistPreviousMonthClosing(session.user.id)

    return moneyJsonResponse(breakdown, currency)
  } catch (error) {
    console.error("Error calculating breakdown:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
