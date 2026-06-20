import { prisma } from "@/lib/prisma"
import { dollarsToMinor } from "@/lib/money"
import { logIncomeEntryForUser } from "@/lib/log-income-entry-server"
import { mapBasiqCategory } from "@/lib/basiq-category-map"
import type { BasiqTransaction } from "@/lib/basiq-client"

export type SyncResult = {
  created: number
  skipped: number
  errors: number
}

export async function syncTransactions(
  userId: string,
  currency: string,
  transactions: BasiqTransaction[]
): Promise<SyncResult> {
  let created = 0
  let skipped = 0
  let errors = 0

  for (const tx of transactions) {
    try {
      const account = await prisma.account.findFirst({
        where: { userId, basiqAccountId: tx.account },
      })
      if (!account) {
        skipped++
        continue
      }

      const amount = Math.abs(parseFloat(tx.amount))
      if (amount <= 0 || !Number.isFinite(amount)) {
        skipped++
        continue
      }

      if (tx.direction === "credit") {
        const existing = await prisma.incomeEntry.findFirst({
          where: { userId, externalId: tx.id },
        })
        if (existing) {
          skipped++
          continue
        }

        await logIncomeEntryForUser(userId, currency, {
          amount,
          description: tx.description,
          date: tx.postDate,
          accountId: account.id,
          allocateToBudget: true,
          externalId: tx.id,
          source: "basiq",
        })
        created++
      } else {
        const existing = await prisma.expense.findFirst({
          where: { userId, externalId: tx.id },
        })
        if (existing) {
          skipped++
          continue
        }

        const amountMinor = dollarsToMinor(amount, currency)
        const { category, expenseCategory } = mapBasiqCategory(
          tx.category,
          tx.subCategory?.[0] ?? null
        )

        await prisma.expense.create({
          data: {
            userId,
            accountId: account.id,
            amount: amountMinor,
            description: tx.description,
            category,
            expenseCategory,
            date: new Date(tx.postDate),
            externalId: tx.id,
            source: "basiq",
            syncStatus: "pending_review",
          },
        })
        created++
      }

      await prisma.account.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("Unique constraint")) {
        skipped++
      } else {
        console.error(`Basiq sync error for tx ${tx.id}:`, e)
        errors++
      }
    }
  }

  return { created, skipped, errors }
}
