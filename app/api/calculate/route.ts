import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { authFromRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { schedulePersistPreviousMonthClosing } from "@/lib/monthly-tracking"
import { incomeAllocationToApi, excludedIncomeSavingsAllocationMinor } from "@/lib/income-allocation"
import { logIncomeEntryForUser } from "@/lib/log-income-entry-server"
import { getUserDisplayCurrency } from "@/lib/user-currency"

export async function POST(request: Request) {
  try {
    const authed = await authFromRequest(request)

    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(authed.userId)
    const {
      income,
      description,
      date,
      accountId,
      allocateToBudget = true,
    } = await request.json()

    const result = await logIncomeEntryForUser(authed.userId, currency, {
      amount: income,
      description,
      date,
      accountId,
      allocateToBudget,
    })

    schedulePersistPreviousMonthClosing(authed.userId)

    let depositAccount = null
    if (result.depositAccountId) {
      depositAccount = await prisma.account.findFirst({
        where: { id: result.depositAccountId, userId: authed.userId },
      })
    }

    if (!result.allocateToBudget) {
      const savingsAlloc = excludedIncomeSavingsAllocationMinor(result.incomeMinor)
      return moneyJsonResponse(
        {
          ...incomeAllocationToApi(result.incomeMinor, savingsAlloc, currency),
          incomeEntryId: result.entryId,
          depositedToAccount: depositAccount?.id || null,
          depositedToAccountName: depositAccount
            ? `${depositAccount.name} (${depositAccount.bankName})`
            : null,
          isCashAccount: depositAccount?.accountType === "cash",
          isExcludedFromAllocation: true,
        },
        currency,
      )
    }

    const breakdown = {
      ...incomeAllocationToApi(result.incomeMinor, result.alloc, currency),
      incomeEntryId: result.entryId,
      depositedToAccount: depositAccount?.id || null,
      depositedToAccountName: depositAccount
        ? `${depositAccount.name} (${depositAccount.bankName})`
        : null,
      isCashAccount: depositAccount?.accountType === "cash",
      isExcludedFromAllocation: false,
    }

    return moneyJsonResponse(breakdown, currency)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Valid income amount is required") {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message === "Fund allocation not found") {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }
    console.error("Error calculating breakdown:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
