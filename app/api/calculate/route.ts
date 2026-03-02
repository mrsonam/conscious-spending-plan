import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { 
  ensureMonthlyCategoryBalances,
  getPreviousMonthRemainingByCategory,
} from "@/lib/monthly-tracking"

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { income, description, date, periodStart, periodEnd, accountId, allocateToBudget = true } = await request.json()

    if (!income || income <= 0) {
      return NextResponse.json(
        { error: "Valid income amount is required" },
        { status: 400 }
      )
    }

    // Allocate to the month of the income date (or period start), not necessarily current month
    const incomeDate = date ? new Date(date + "T12:00:00") : new Date()
    const targetMonth = incomeDate.getMonth() + 1
    const targetYear = incomeDate.getFullYear()

    const fundAllocation = await prisma.fundAllocation.findUnique({
      where: { userId: session.user.id }
    })

    if (!fundAllocation) {
      return NextResponse.json(
        { error: "Fund allocation not found" },
        { status: 404 }
      )
    }

    // Ensure monthly category balances exist for the target month (income's month)
    await ensureMonthlyCategoryBalances(session.user.id, targetMonth, targetYear)

    // Get current balances and carryover so we can cap TOTAL from income this month (not per-entry)
    const [currentBalances, carryover] = await Promise.all([
      prisma.categoryBalance.findMany({
        where: {
          userId: session.user.id,
          month: targetMonth,
          year: targetYear,
        },
      }),
      getPreviousMonthRemainingByCategory(session.user.id, targetMonth, targetYear),
    ])
    const getCurrentBalance = (cat: string) =>
      currentBalances.find((b) => b.category === cat)?.balance ?? 0
    const getCarryover = (cat: string) => carryover[cat] ?? 0
    const getAllocatedFromIncomeSoFar = (cat: string) =>
      Math.max(0, getCurrentBalance(cat) - getCarryover(cat))

    // Calculate allocations strictly according to fund settings for THIS income only.
    let fixedCosts = 0
    let savings = 0
    let investment = 0
    let guiltFreeSpending = 0

    // Calculate each category based on its allocation type
    if (fundAllocation.fixedCostsType === "fixed") {
      fixedCosts = fundAllocation.fixedCostsValue
    } else {
      fixedCosts = (income * fundAllocation.fixedCostsValue) / 100
    }

    if (fundAllocation.investmentType === "fixed") {
      investment = fundAllocation.investmentValue
    } else {
      investment = (income * fundAllocation.investmentValue) / 100
    }

    if (fundAllocation.guiltFreeSpendingType === "fixed") {
      guiltFreeSpending = fundAllocation.guiltFreeSpendingValue
    } else {
      guiltFreeSpending = (income * fundAllocation.guiltFreeSpendingValue) / 100
    }

    if (fundAllocation.savingsType === "fixed") {
      savings = fundAllocation.savingsValue
    } else {
      savings = (income * fundAllocation.savingsValue) / 100
    }

    // Caps apply to TOTAL allocated from income for the month (across all income entries).
    // So we can only add up to (cap - already allocated from income this month).
    let excessToRedistribute = 0

    if (fundAllocation.fixedCostsCap !== null && fundAllocation.fixedCostsCap !== undefined) {
      const alreadyAllocated = getAllocatedFromIncomeSoFar("fixedCosts")
      const roomLeft = Math.max(0, fundAllocation.fixedCostsCap - alreadyAllocated)
      if (fixedCosts > roomLeft) {
        excessToRedistribute += fixedCosts - roomLeft
        fixedCosts = roomLeft
      }
    }
    
    if (fundAllocation.investmentCap !== null && fundAllocation.investmentCap !== undefined) {
      const alreadyAllocated = getAllocatedFromIncomeSoFar("investment")
      const roomLeft = Math.max(0, fundAllocation.investmentCap - alreadyAllocated)
      if (investment > roomLeft) {
        excessToRedistribute += investment - roomLeft
        investment = roomLeft
      }
    }
    
    if (fundAllocation.guiltFreeSpendingCap !== null && fundAllocation.guiltFreeSpendingCap !== undefined) {
      const alreadyAllocated = getAllocatedFromIncomeSoFar("guiltFreeSpending")
      const roomLeft = Math.max(0, fundAllocation.guiltFreeSpendingCap - alreadyAllocated)
      if (guiltFreeSpending > roomLeft) {
        excessToRedistribute += guiltFreeSpending - roomLeft
        guiltFreeSpending = roomLeft
      }
    }
    
    if (fundAllocation.savingsCap !== null && fundAllocation.savingsCap !== undefined) {
      const alreadyAllocated = getAllocatedFromIncomeSoFar("savings")
      const roomLeft = Math.max(0, fundAllocation.savingsCap - alreadyAllocated)
      if (savings > roomLeft) {
        excessToRedistribute += savings - roomLeft
        savings = roomLeft
      }
    }
    
    // Add excess from capped categories to savings (this may go beyond the cap;
    // we do NOT retroactively change existing savings, we only decide where the
    // new income should land).
    savings += excessToRedistribute

    // Calculate total allocated so far
    const allocated = fixedCosts + investment + guiltFreeSpending + savings
    const unallocated = income - allocated

    // Ensure all money is allocated - add any unallocated amount to savings
    // This ensures total always equals income exactly (no more, no less)
    if (unallocated !== 0) {
      savings += unallocated
    }

    // Get the account to deposit to (either selected account or default account)
    let depositAccount = null
    if (accountId) {
      // Verify the account belongs to the user
      depositAccount = await prisma.account.findFirst({
        where: {
          id: accountId,
          userId: session.user.id,
        },
      })
    } else {
      // Fall back to default account if no account selected
      depositAccount = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
      })
    }

    // Save income entry first (with accountId if available, and allocation amounts for reversal on delete)
    const incomeEntry = await prisma.incomeEntry.create({
      data: {
        userId: session.user.id,
        amount: income,
        description: description || null,
        date: date ? new Date(date) : new Date(), // Use provided date or current date
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        accountId: depositAccount?.id || null,
        // Casting to any to avoid Prisma client type mismatch until generate is run
        excludeFromAllocation: !allocateToBudget,
        ...(allocateToBudget && {
          allocationFixedCosts: fixedCosts ?? 0,
          allocationSavings: savings ?? 0,
          allocationInvestment: investment ?? 0,
          allocationGuiltFreeSpending: guiltFreeSpending ?? 0,
        }),
      } as any,
    })

    // If this income should not be allocated to budget categories, just deposit and return
    if (!allocateToBudget) {
      if (depositAccount) {
        await prisma.account.update({
          where: { id: depositAccount.id },
          data: {
            balance: { increment: income },
          },
        })
      }

      return NextResponse.json({
        income,
        fixedCosts: 0,
        savings: 0,
        investment: 0,
        guiltFreeSpending: 0,
        total: income,
        incomeEntryId: incomeEntry.id,
        depositedToAccount: depositAccount?.id || null,
        depositedToAccountName: depositAccount ? `${depositAccount.name} (${depositAccount.bankName})` : null,
        isCashAccount: depositAccount?.accountType === "cash",
        isExcludedFromAllocation: true,
      })
    }

    // Increment category balances by this income's allocation ONLY.
    // Previously allocated amounts (existing balances) are preserved.
    const incrementBalance = async (category: string, amount: number) => {
      // Ensure amount is a valid number
      const incrementValue =
        isNaN(amount) || amount === undefined || amount === null ? 0 : amount

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
      incrementBalance("fixedCosts", fixedCosts ?? 0),
      incrementBalance("investment", investment ?? 0),
      incrementBalance("guiltFreeSpending", guiltFreeSpending ?? 0),
      incrementBalance("savings", savings ?? 0),
    ])

    // Deposit income to selected/default account if it exists
    if (depositAccount) {
      await prisma.account.update({
        where: { id: depositAccount.id },
        data: {
          balance: { increment: income },
        },
      })
    } else if (!accountId) {
      console.warn("No default account set for user. Income not deposited to any account.")
    }

    // Ensure total exactly equals income (handle any rounding differences)
    const totalCalculated = fixedCosts + savings + investment + guiltFreeSpending
    const roundingDifference = income - totalCalculated
    savings += roundingDifference

    const breakdown = {
      income,
      fixedCosts: Math.round(fixedCosts * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      investment: Math.round(investment * 100) / 100,
      guiltFreeSpending: Math.round(guiltFreeSpending * 100) / 100,
      total: income, // Total always equals income exactly
      incomeEntryId: incomeEntry.id,
      depositedToAccount: depositAccount?.id || null,
      depositedToAccountName: depositAccount ? `${depositAccount.name} (${depositAccount.bankName})` : null,
    }

    return NextResponse.json(breakdown)
  } catch (error) {
    console.error("Error calculating breakdown:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
