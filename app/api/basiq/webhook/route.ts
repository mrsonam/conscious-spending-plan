import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncTransactions } from "@/lib/basiq-transaction-sync"
import { normalizeDisplayCurrency } from "@/lib/display-currency"
import crypto from "crypto"

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  const secret = process.env.BASIQ_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-basiq-signature")

    if (process.env.BASIQ_WEBHOOK_SECRET && !verifyWebhookSignature(rawBody, signature)) {
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

    const userId = accounts[0].userId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayCurrency: true },
    })
    const currency = normalizeDisplayCurrency(user?.displayCurrency)

    const transactions = payload.data.map((t) => ({
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

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("Basiq webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
