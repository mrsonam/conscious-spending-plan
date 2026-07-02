import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getDbErrorResponse } from "@/lib/db-error"
import { parseMoneyFromApi } from "@/lib/money-api"
import {
  mapMoneyFieldsToApi,
  mapMoneyListToApi,
  ACCOUNT_MONEY_FIELDS,
} from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    })

    const currency = currencyFromSession(session.user.displayCurrency)
    return moneyJsonResponse(
      {
        accounts: mapMoneyListToApi(
          accounts as Record<string, unknown>[],
          currency,
          ACCOUNT_MONEY_FIELDS
        ),
      },
      currency,
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error fetching accounts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { name, bankName, accountType, startingFunds, isDefault, accountNumber, bsb, cardLastFour: rawCardLastFour, cardExpiry, cardType, cardHolderName } =
      await request.json()
    const derivedCardLastFour = rawCardLastFour || null
    const currency = currencyFromSession(session.user.displayCurrency)
    let startingMinor = 0n
    if (startingFunds != null && startingFunds !== "") {
      try {
        startingMinor = parseMoneyFromApi(startingFunds, currency)
      } catch {
        return NextResponse.json(
          { error: "Starting balance must be a valid amount" },
          { status: 400 }
        )
      }
    }

    if (!name || !bankName || !accountType) {
      return NextResponse.json(
        { error: "Name, bank name, and account type are required" },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.account.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const account = await prisma.account.create({
      data: {
        userId: session.user.id,
        name,
        bankName,
        accountType,
        startingFunds: startingMinor,
        balance: startingMinor,
        isDefault: isDefault || false,
        accountNumber: accountNumber || null,
        bsb: bsb || null,
        cardLastFour: derivedCardLastFour,
        cardExpiry: cardExpiry || null,
        cardType: cardType || null,
        cardHolderName: cardHolderName || null,
      },
    })

    return moneyJsonResponse(
      {
        account: mapMoneyFieldsToApi(
          account as unknown as Record<string, unknown>,
          currency,
          ACCOUNT_MONEY_FIELDS
        ),
      },
      currency,
      { status: 201 }
    )
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error creating account:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id, name, bankName, accountType, isDefault, balance, accountNumber, bsb, cardLastFour, cardExpiry, cardType, cardHolderName } = await request.json() as {
      id?: string
      name?: string
      bankName?: string
      accountType?: string
      isDefault?: boolean
      balance?: unknown
      accountNumber?: string | null
      bsb?: string | null
      cardLastFour?: string | null
      cardExpiry?: string | null
      cardType?: string | null
      cardHolderName?: string | null
    }

    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingAccount) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.account.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    let balanceMinor: bigint | undefined
    if (balance !== undefined && balance !== null) {
      try {
        balanceMinor = parseMoneyFromApi(balance, currency)
      } catch {
        return NextResponse.json(
          { error: "Balance must be a valid number" },
          { status: 400 }
        )
      }
    }

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(bankName && { bankName }),
        ...(accountType && { accountType }),
        ...(isDefault !== undefined && { isDefault }),
        ...(balanceMinor !== undefined && { balance: balanceMinor }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(bsb !== undefined && { bsb }),
        ...(cardLastFour !== undefined && { cardLastFour }),
        ...(cardExpiry !== undefined && { cardExpiry }),
        ...(cardType !== undefined && { cardType }),
        ...(cardHolderName !== undefined && { cardHolderName }),
      },
    })

    return moneyJsonResponse(
      {
        account: mapMoneyFieldsToApi(
          account as unknown as Record<string, unknown>,
          currency,
          ACCOUNT_MONEY_FIELDS
        ),
      },
      currency
    )
  } catch (error) {
    console.error("Error updating account:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    await prisma.account.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Account deleted successfully" })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
