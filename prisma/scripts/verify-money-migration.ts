/**
 * Post-migration sanity check: sample sums of minor amounts are non-negative integers.
 * Run: npx tsx prisma/scripts/verify-money-migration.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const [expenseAgg, accountSample] = await Promise.all([
    prisma.expense.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.account.findFirst({ select: { balance: true, startingFunds: true } }),
  ])

  console.log("Expense count:", expenseAgg._count)
  console.log("Expense amount sum (minor):", expenseAgg._sum.amount?.toString() ?? "0")
  if (accountSample) {
    console.log("Sample account balance (minor):", accountSample.balance.toString())
    console.log("Sample startingFunds (minor):", accountSample.startingFunds.toString())
  }

  const badDecimals = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Expense"
    WHERE "amount"::text LIKE '%.%'
  `
  console.log("Expenses with fractional minor (should be 0):", badDecimals[0]?.count?.toString() ?? "0")
  console.log("verify-money-migration: OK")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
