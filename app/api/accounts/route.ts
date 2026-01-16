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

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ accounts })
  } catch (error) {
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

    const { name, bankName, accountType, startingFunds, isDefault } = await request.json()

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
        startingFunds: startingFunds || 0,
        balance: startingFunds || 0,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
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

    const { id, name, bankName, accountType, isDefault } = await request.json()

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

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(bankName && { bankName }),
        ...(accountType && { accountType }),
        ...(isDefault !== undefined && { isDefault }),
      },
    })

    return NextResponse.json({ account })
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
