import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { defaultFundAllocationCreate } from "@/lib/fund-allocation-fields"
import {
  fundAllocationFromApi,
  fundAllocationToApi,
} from "@/lib/fund-allocation-money"
import { currencyFromSession } from "@/lib/user-currency"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)

    let fundAllocation = await prisma.fundAllocation.findUnique({
      where: { userId: session.user.id },
    })

    if (!fundAllocation) {
      fundAllocation = await prisma.fundAllocation.create({
        data: defaultFundAllocationCreate(session.user.id),
      })
    }

    return moneyJsonResponse(fundAllocationToApi(fundAllocation, currency), currency)
  } catch (error) {
    console.error("Error fetching fund allocation:", error)
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const data = fundAllocationFromApi(
      (await request.json()) as Record<string, unknown>,
      currency
    )

    const fundAllocation = await prisma.fundAllocation.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data,
      },
    })

    return moneyJsonResponse(fundAllocationToApi(fundAllocation, currency), currency)
  } catch (error) {
    console.error("Error updating fund allocation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
