import { NextResponse } from "next/server"

import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { isFundCategory } from "@/lib/category-bucket-transfer-shared"
import { transferCategoryBucketFunds } from "@/lib/category-bucket-transfer"
import { getCurrentMonthYear } from "@/lib/monthly-tracking"
import { parseMoneyFromApi } from "@/lib/money-api"
import { currencyFromSession } from "@/lib/user-currency"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const body = (await request.json()) as {
      fromCategory?: string
      toCategory?: string
      amount?: number | string
      month?: number
      year?: number
    }

    const fromCategory = body.fromCategory?.trim() ?? ""
    const toCategory = body.toCategory?.trim() ?? ""

    if (!isFundCategory(fromCategory) || !isFundCategory(toCategory)) {
      return NextResponse.json({ error: "Invalid bucket category" }, { status: 400 })
    }

    if (body.amount == null) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 })
    }

    let amountMinor: bigint
    try {
      amountMinor = parseMoneyFromApi(body.amount, currency)
    } catch {
      return NextResponse.json({ error: "Enter a valid transfer amount" }, { status: 400 })
    }

    const current = getCurrentMonthYear()
    const month = body.month ?? current.month
    const year = body.year ?? current.year

    if (month !== current.month || year !== current.year) {
      return NextResponse.json(
        { error: "Bucket transfers are only allowed for the current month" },
        { status: 400 }
      )
    }

    const result = await transferCategoryBucketFunds({
      userId: session.user.id,
      currency,
      month,
      year,
      fromCategory,
      toCategory,
      amountMinor,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return moneyJsonResponse(
      {
        fromCategory: result.fromCategory,
        toCategory: result.toCategory,
        amount: body.amount,
        month,
        year,
      },
      currency
    )
  } catch (error) {
    console.error("Category bucket transfer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
