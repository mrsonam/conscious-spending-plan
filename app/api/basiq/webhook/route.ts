import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncTransactions } from "@/lib/basiq-transaction-sync"
import { normalizeDisplayCurrency } from "@/lib/display-currency"
import crypto from "crypto"

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex")
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, expBuf)
}

export async function POST(request: Request) {
  try {
    const secret = process.env.BASIQ_WEBHOOK_SECRET
    if (!secret) {
      console.error("BASIQ_WEBHOOK_SECRET not configured")
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    const rawBody = await request.text()
    const signature = request.headers.get("x-basiq-signature")

    if (!signature || !verifyWebhookSignature(rawBody, signature, secret)) {
      console.warn("Basiq webhook: invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const payload = JSON.parse(rawBody) as {
      type?: string
      data?: Array<{
        id: string
        amount: string
        direction: "credit" | "debit"
        description: string
        postDate: string
        enrich?: { category?: string }
        subClass?: { title?: string }
        account: string
      }>
      userId?: string
    }

    if (!payload.data?.length) {
      return NextResponse.json({ ok: true })
    }

    const basiqAccountIds = [...new Set(payload.data.map((t) => t.account))]
    const accounts = await prisma.account.findMany({
      where: { basiqAccountId: { in: basiqAccountIds } },
      select: { userId: true, basiqAccountId: true },
    })

    if (accounts.length === 0) {
      return NextResponse.json({ ok: true, skipped: "no linked accounts" })
    }

    const accountsByBasiqId = new Map(
      accounts.map((a) => [a.basiqAccountId, a.userId])
    )
    const txByUser = new Map<string, typeof payload.data>()
    for (const t of payload.data) {
      const owner = accountsByBasiqId.get(t.account)
      if (!owner) continue
      const list = txByUser.get(owner) ?? []
      list.push(t)
      txByUser.set(owner, list)
    }

    let totalCreated = 0
    let totalSkipped = 0
    let totalErrors = 0

    for (const [userId, userTxs] of txByUser) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayCurrency: true },
      })
      const currency = normalizeDisplayCurrency(user?.displayCurrency)

      const transactions = userTxs.map((t) => ({
        id: t.id,
        amount: t.amount,
        direction: t.direction,
        description: t.description,
        postDate: t.postDate,
        category: t.enrich?.category ?? t.subClass?.title ?? null,
        subCategory: null,
        account: t.account,
      }))

      const result = await syncTransactions(userId, currency, transactions)
      totalCreated += result.created
      totalSkipped += result.skipped
      totalErrors += result.errors
    }

    return NextResponse.json({ ok: true, created: totalCreated, skipped: totalSkipped, errors: totalErrors })
  } catch (error) {
    console.error("Basiq webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
