import { prisma } from "../lib/prisma"
import { reallocateMonthIncomeForUser } from "../lib/reallocate-month-income"
import { serializeMoneyForApi } from "../lib/money-api"
import { getUserDisplayCurrency } from "../lib/user-currency"
import { FUND_CATEGORIES } from "../lib/fund-allocation-fields"
import { getCurrentMonthYear } from "../lib/monthly-tracking"

async function main() {
  const { month, year } = getCurrentMonthYear()
  const users = await prisma.user.findMany({ select: { id: true, email: true } })

  if (users.length === 0) {
    console.log("No users found.")
    return
  }

  for (const user of users) {
    const currency = await getUserDisplayCurrency(user.id)
    const entryMonths = await prisma.$queryRaw<
      Array<{ month: number; year: number; count: bigint }>
    >`
      SELECT EXTRACT(MONTH FROM date)::int AS month,
             EXTRACT(YEAR FROM date)::int AS year,
             COUNT(*)::bigint AS count
      FROM "IncomeEntry"
      WHERE "userId" = ${user.id}
        AND "excludeFromAllocation" = false
      GROUP BY 1, 2
      ORDER BY year DESC, month DESC
    `

    console.log(`\n[${user.email ?? user.id}] Income entry months:`)
    if (entryMonths.length === 0) {
      console.log("  (none)")
      continue
    }
    for (const row of entryMonths) {
      console.log(`  ${row.month}/${row.year}: ${row.count} entries`)
    }

    const target =
      entryMonths.find((row) => row.month === month && row.year === year) ??
      entryMonths[0]

    if (!target) continue

    try {
      const result = await reallocateMonthIncomeForUser(
        user.id,
        currency,
        target.month,
        target.year,
      )
      console.log(
        `Reallocated ${result.entryCount} entries for ${result.month}/${result.year}`,
      )
      for (const cat of FUND_CATEGORIES) {
        console.log(
          `  ${cat}: income=${serializeMoneyForApi(result.incomeTotals[cat], currency)} envelope=${serializeMoneyForApi(result.envelopeTotals[cat], currency)}`,
        )
      }
    } catch (error) {
      console.error(`Failed:`, error)
    }
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
