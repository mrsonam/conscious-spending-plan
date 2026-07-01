import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { mapMoneyFieldsToApi, ACCOUNT_MONEY_FIELDS } from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const account = await prisma.account.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    return moneyJsonResponse(
      {
        account: mapMoneyFieldsToApi(
          account as unknown as Record<string, unknown>,
          currency,
          ACCOUNT_MONEY_FIELDS,
        ),
      },
      currency,
    )
  } catch (error) {
    console.error("Error fetching account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
