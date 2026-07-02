import { prisma } from "@/lib/prisma"
import { dollarsToMinor } from "@/lib/money"
import { logIncomeEntryForUser } from "@/lib/log-income-entry-server"
import { mapCdrCategory } from "@/lib/redbark-category-map"

export type RedbarkTransaction = {
  id: string
  amount: number       // integer cents, negative = debit
  currency: string | null
  status: string
  description: string
  direction: "credit" | "debit"
  class: string
  account_id: string
  account_name: string
  local_date: string   // YYYY-MM-DD
  transaction_date: string
  post_date: string | null
  merchant_name: string | null
  category: string | null
  merchant_category_code: string | null
  reference: string | null
  extended_description: string | null
}

export type SyncResult = {
  created: number
  skipped: number
  errors: number
}

export async function syncRedbarkTransactions(
  userId: string,
  currency: string,
  transactions: RedbarkTransaction[]
): Promise<SyncResult> {
  let created = 0
  let skipped = 0
  let errors = 0

  for (const tx of transactions) {
    try {
      const account = await prisma.account.findFirst({
        where: { userId, redbarkAccountId: tx.account_id },
      })
      if (!account) {
        skipped++
        continue
      }

      // Redbark amounts are in cents (smallest currency unit), negative = debit
      const absAmountCents = Math.abs(tx.amount)
      if (absAmountCents <= 0) {
        skipped++
        continue
      }

      // Convert cents to dollars for our helpers (which work in display dollars)
      const amountDollars = absAmountCents / 100
      const externalId = `redbark:${tx.id}`
      const txDate = tx.local_date // YYYY-MM-DD

      if (tx.direction === "credit") {
        const existing = await prisma.incomeEntry.findFirst({
          where: { userId, externalId },
        })
        if (existing) {
          skipped++
          continue
        }

        await logIncomeEntryForUser(userId, currency, {
          amount: amountDollars,
          description: tx.merchant_name ?? tx.description,
          date: txDate,
          accountId: account.id,
          allocateToBudget: true,
          externalId,
          source: "redbark",
        })
        created++
      } else {
        const existing = await prisma.expense.findFirst({
          where: { userId, externalId },
        })
        if (existing) {
          skipped++
          continue
        }

        const amountMinor = dollarsToMinor(amountDollars, currency)
        const { category, expenseCategory } = mapCdrCategory(tx.category)

        await prisma.expense.create({
          data: {
            userId,
            accountId: account.id,
            amount: amountMinor,
            description: tx.merchant_name ?? tx.description,
            category,
            expenseCategory,
            date: new Date(txDate),
            externalId,
            source: "redbark",
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
        console.error(`Redbark sync error for tx ${tx.id}:`, e)
        errors++
      }
    }
  }

  return { created, skipped, errors }
}
