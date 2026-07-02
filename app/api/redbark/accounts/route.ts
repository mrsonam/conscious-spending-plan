import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { routeErrorResponse } from "@/lib/route-error"

type RedbarkAccount = {
  id: string
  name: string
  accountType: string
  balance: number
  currency: string
  institution: string
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const connection = await prisma.redbarkConnection.findUnique({
      where: { userId: session.user.id },
      select: { apiKey: true },
    })

    if (!connection?.apiKey) {
      return NextResponse.json({ error: "No Redbark API key configured" }, { status: 400 })
    }

    let res: Response
    try {
      res = await fetch("https://api.redbark.com/v1/accounts", {
        headers: {
          Authorization: `Bearer ${connection.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      })
    } catch (fetchError) {
      console.error("Redbark accounts fetch failed:", fetchError)
      return NextResponse.json(
        { error: "Could not reach Redbark. Try again shortly." },
        { status: 502 }
      )
    }

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
      }
      return NextResponse.json({ error: "Failed to fetch accounts from Redbark" }, { status: 502 })
    }

    let data: { data?: RedbarkAccount[] }
    try {
      data = (await res.json()) as { data?: RedbarkAccount[] }
    } catch {
      return NextResponse.json(
        { error: "Redbark returned an unexpected response" },
        { status: 502 }
      )
    }
    return NextResponse.json({ accounts: Array.isArray(data.data) ? data.data : [] })
  } catch (error) {
    return routeErrorResponse(error, "Error fetching Redbark accounts")
  }
}
