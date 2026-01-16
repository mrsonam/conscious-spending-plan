import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        fundAllocation: {
          create: {
            fixedCostsType: "percentage",
            fixedCostsValue: 50,
            savingsType: "percentage",
            savingsValue: 20,
            investmentType: "percentage",
            investmentValue: 10,
            guiltFreeSpendingType: "percentage",
            guiltFreeSpendingValue: 20,
          }
        }
      }
    })

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
