import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RedbarkAccount = {
  id: string
  name: string
  accountType: string
  balance: number
  currency: string
  institution: string
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const connection = await prisma.redbarkConnection.findUnique({
    where: { userId: session.user.id },
    select: { apiKey: true },
  })

  if (!connection?.apiKey) {
    return NextResponse.json({ error: "No Redbark API key configured" }, { status: 400 })
  }

  const res = await fetch("https://api.redbark.com/v1/accounts", {
    headers: {
      Authorization: `Bearer ${connection.apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to fetch accounts from Redbark" }, { status: 502 })
  }

  const data = (await res.json()) as { data?: RedbarkAccount[] }
  return NextResponse.json({ accounts: data.data ?? [] })
}
