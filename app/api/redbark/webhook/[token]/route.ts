import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { normalizeDisplayCurrency } from "@/lib/display-currency"
import { syncRedbarkTransactions, type RedbarkTransaction } from "@/lib/redbark-transaction-sync"

function verifySignature(rawBody: string, signature: string, timestamp: string, secret: string): boolean {
  try {
    const age = Math.abs(Date.now() / 1000 - Number(timestamp))
    if (age > 300) return false // reject replays older than 5 minutes

    const expected = "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")
    if (signature.length !== expected.length) return false
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

type RedbarkPayload = {
  id: string
  type: "transactions.synced" | "trades.synced"
  api_version: string
  created: number
  data: {
    new: RedbarkTransaction[]
    updated: RedbarkTransaction[]
  }
  metadata: {
    sync_run_id: string | null
    new_count: number
    updated_count: number
    chunk: number
    total_chunks: number
  }
}

// Redbark may send a GET to validate the endpoint URL is reachable
export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const rawBody = await request.text()
    const signature = request.headers.get("x-redbark-signature") ?? ""
    const timestamp = request.headers.get("x-redbark-timestamp") ?? ""

    const connection = await prisma.redbarkConnection.findUnique({
      where: { webhookToken: token },
      include: { user: { select: { id: true, displayCurrency: true } } },
    })

    if (!connection) {
      // Return 200 so Redbark doesn't disable the endpoint, just ignore unknown tokens
      console.warn(`Redbark webhook: unknown token ${token}`)
      return NextResponse.json({ ok: true, skipped: "unknown token" })
    }

    if (!connection.webhookSecret) {
      // Secret not yet configured, acknowledge receipt without processing
      console.info(`Redbark webhook: signing secret not yet configured for token ${token}`)
      return NextResponse.json({ ok: true, skipped: "secret not configured" })
    }

    if (!verifySignature(rawBody, signature, timestamp, connection.webhookSecret)) {
      console.warn(
        `Redbark webhook: invalid signature for token ${token}`,
        { signature, timestamp, bodyLength: rawBody.length }
      )
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    let payload: RedbarkPayload
    try {
      payload = JSON.parse(rawBody) as RedbarkPayload
    } catch {
      // Signature was valid but body isn't JSON, acknowledge so Redbark
      // doesn't disable the endpoint over a malformed delivery.
      console.warn(`Redbark webhook: non-JSON body for token ${token}`)
      return NextResponse.json({ ok: true, skipped: "malformed body" })
    }

    // Only handle bank transaction syncs (not brokerage trades)
    if (payload?.type !== "transactions.synced") {
      return NextResponse.json({ ok: true, skipped: "unsupported event type" })
    }

    const transactions = [...(payload.data?.new ?? []), ...(payload.data?.updated ?? [])]
    if (transactions.length === 0) {
      return NextResponse.json({ ok: true, created: 0, skipped: 0, errors: 0 })
    }

    const currency = normalizeDisplayCurrency(connection.user.displayCurrency)
    const result = await syncRedbarkTransactions(connection.user.id, currency, transactions)

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("Redbark webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
