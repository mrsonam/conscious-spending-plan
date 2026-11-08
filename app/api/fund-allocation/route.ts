import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { authFromRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { defaultFundAllocationCreate } from "@/lib/fund-allocation-fields"
import {
  fundAllocationFromApi,
  fundAllocationToApi,
} from "@/lib/fund-allocation-money"
import { getUserDisplayCurrency } from "@/lib/user-currency"
import { getDbErrorResponse } from "@/lib/db-error"

export async function GET(request: Request) {
  try {
    const authed = await authFromRequest(request)

    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(authed.userId)

    let fundAllocation = await prisma.fundAllocation.findUnique({
      where: { userId: authed.userId },
    })

    if (!fundAllocation) {
      fundAllocation = await prisma.fundAllocation.create({
        data: defaultFundAllocationCreate(authed.userId),
      })
    }

    return moneyJsonResponse(fundAllocationToApi(fundAllocation, currency), currency)
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error fetching fund allocation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const authed = await authFromRequest(request)

    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(authed.userId)
    const data = fundAllocationFromApi(
      (await request.json()) as Record<string, unknown>,
      currency
    )

    const fundAllocation = await prisma.fundAllocation.upsert({
      where: { userId: authed.userId },
      update: data,
      create: {
        userId: authed.userId,
        ...data,
      },
    })

    return moneyJsonResponse(fundAllocationToApi(fundAllocation, currency), currency)
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error updating fund allocation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
