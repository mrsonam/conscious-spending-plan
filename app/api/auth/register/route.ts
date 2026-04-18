import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import {
  normalizeEmail,
  validateEmailField,
  validatePasswordForCreate,
} from "@/lib/password-policy"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const { email, password, name } = body as {
    email?: unknown
    password?: unknown
    name?: unknown
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
  }

  const emailErr = validateEmailField(email)
  if (emailErr) {
    return NextResponse.json({ error: emailErr }, { status: 400 })
  }

  const passErr = validatePasswordForCreate(password)
  if (passErr) {
    return NextResponse.json({ error: passErr }, { status: 400 })
  }

  const normalizedEmail = normalizeEmail(email)

  let trimmedName: string | null = null
  if (name !== undefined && name !== null) {
    if (typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name." }, { status: 400 })
    }
    const n = name.trim()
    if (n.length > 120) {
      return NextResponse.json({ error: "Name is too long." }, { status: 400 })
    }
    trimmedName = n.length > 0 ? n : null
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    )
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashed,
      name: trimmedName,
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
        },
      },
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
