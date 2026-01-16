import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const fundAllocation = await prisma.fundAllocation.findUnique({
      where: { userId: session.user.id }
    })

    if (!fundAllocation) {
      // Create default allocation if it doesn't exist
      const newAllocation = await prisma.fundAllocation.create({
        data: {
          userId: session.user.id,
          fixedCostsType: "percentage",
          fixedCostsValue: 50,
          savingsType: "percentage",
          savingsValue: 20,
          investmentType: "percentage",
          investmentValue: 10,
          guiltFreeSpendingType: "percentage",
          guiltFreeSpendingValue: 20,
        }
      })
      return NextResponse.json(newAllocation)
    }

    return NextResponse.json(fundAllocation)
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const data = await request.json()

    const fundAllocation = await prisma.fundAllocation.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data
      }
    })

    return NextResponse.json(fundAllocation)
  } catch (error) {
    console.error("Error updating fund allocation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
