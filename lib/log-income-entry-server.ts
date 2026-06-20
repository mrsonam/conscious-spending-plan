import { prisma } from "@/lib/prisma"
import {
  ensureMonthlyCategoryBalances,
  getIncomeEntriesForMonthByDate,
} from "@/lib/monthly-tracking"
import { parseMoneyFromApi } from "@/lib/money-api"
import {
  buildAllocatedSoFarFromEntries,
  computeIncomeAllocationsMinor,
  excludedIncomeSavingsAllocationMinor,
  type CategoryKey,
  type IncomeAllocationMinor,
} from "@/lib/income-allocation"
import { applySavingGoalCreditsForIncome } from "@/lib/saving-goal-credits-server"
import { ensurePreTrackingSavingsBalances } from "@/lib/pre-tracking-savings"
import { reallocateMonthIncomeForUser } from "@/lib/reallocate-month-income"
import { upsertEnvelopeBalancesForMonth } from "@/lib/envelope-balance-recompute"
import { coerceMinor } from "@/lib/money"

export type LogIncomeEntryInput = {
  amount: unknown
  description?: string | null
  date?: string
  accountId?: string | null
  allocateToBudget?: boolean
  /** Skip month envelope sync — caller runs reallocateMonthIncomeForUser once after a batch. */
  deferEnvelopeSync?: boolean
  externalId?: string
  source?: string
}

export type LogIncomeEntryResult = {
  entryId: string
  incomeMinor: bigint
  alloc: IncomeAllocationMinor
  allocateToBudget: boolean
  depositAccountId: string | null
}

function periodBoundsFromDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  const periodStart = new Date(d.getFullYear(), d.getMonth(), 1)
  const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { incomeDate: d, periodStart, periodEnd, targetMonth: d.getMonth() + 1, targetYear: d.getFullYear() }
}

export async function logIncomeEntryForUser(
  userId: string,
  currency: string,
  input: LogIncomeEntryInput,
): Promise<LogIncomeEntryResult> {
  const allocateToBudget = input.allocateToBudget !== false

  let incomeMinor: bigint
  try {
    incomeMinor = parseMoneyFromApi(input.amount, currency)
  } catch {
    throw new Error("Valid income amount is required")
  }
  if (incomeMinor <= 0n) {
    throw new Error("Valid income amount is required")
  }

  const dateStr =
    input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
      ? input.date
      : new Date().toISOString().slice(0, 10)
  const { incomeDate, periodStart, periodEnd, targetMonth, targetYear } =
    periodBoundsFromDate(dateStr)

  const fundAllocation = await prisma.fundAllocation.findUnique({
    where: { userId },
  })

  if (!fundAllocation && allocateToBudget) {
    throw new Error("Fund allocation not found")
  }

  await ensurePreTrackingSavingsBalances(userId)
  await ensureMonthlyCategoryBalances(userId, targetMonth, targetYear)

  let alloc: IncomeAllocationMinor = {
    fixedCosts: 0n,
    savings: 0n,
    investment: 0n,
    guiltFreeSpending: 0n,
  }

  if (allocateToBudget && fundAllocation) {
    const priorMonthEntries = await getIncomeEntriesForMonthByDate(
      userId,
      targetMonth,
      targetYear,
    )
    const allocatedSoFar = buildAllocatedSoFarFromEntries(
      priorMonthEntries,
      fundAllocation,
      currency,
    )
    const getAllocatedFromIncomeSoFar = (cat: CategoryKey) => allocatedSoFar[cat]
    alloc = computeIncomeAllocationsMinor(
      incomeMinor,
      fundAllocation,
      currency,
      getAllocatedFromIncomeSoFar,
    )
  } else if (!allocateToBudget) {
    alloc = excludedIncomeSavingsAllocationMinor(incomeMinor)
  }

  let depositAccount = null
  if (input.accountId) {
    depositAccount = await prisma.account.findFirst({
      where: { id: input.accountId, userId },
    })
  } else {
    depositAccount = await prisma.account.findFirst({
      where: { userId, isDefault: true },
    })
  }

  const incomeEntry = await prisma.incomeEntry.create({
    data: {
      userId,
      amount: incomeMinor,
      description: input.description ?? null,
      date: incomeDate,
      periodStart,
      periodEnd,
      accountId: depositAccount?.id ?? null,
      excludeFromAllocation: !allocateToBudget,
      allocationFixedCosts: allocateToBudget ? alloc.fixedCosts : 0n,
      allocationSavings: alloc.savings,
      allocationInvestment: allocateToBudget ? alloc.investment : 0n,
      allocationGuiltFreeSpending: allocateToBudget ? alloc.guiltFreeSpending : 0n,
      externalId: input.externalId ?? null,
      source: input.source ?? "manual",
    },
  })

  if (!input.deferEnvelopeSync) {
    if (allocateToBudget) {
      await reallocateMonthIncomeForUser(userId, currency, targetMonth, targetYear)

      const updated = await prisma.incomeEntry.findUnique({
        where: { id: incomeEntry.id },
        select: {
          allocationFixedCosts: true,
          allocationSavings: true,
          allocationInvestment: true,
          allocationGuiltFreeSpending: true,
        },
      })

      alloc = {
        fixedCosts: coerceMinor(updated?.allocationFixedCosts ?? 0n),
        savings: coerceMinor(updated?.allocationSavings ?? 0n),
        investment: coerceMinor(updated?.allocationInvestment ?? 0n),
        guiltFreeSpending: coerceMinor(updated?.allocationGuiltFreeSpending ?? 0n),
      }
    } else {
      await upsertEnvelopeBalancesForMonth(userId, targetMonth, targetYear, currency)
    }

    if (alloc.savings > 0n) {
      await applySavingGoalCreditsForIncome(prisma, {
        userId,
        incomeEntryId: incomeEntry.id,
        savingsAllocationMinor: alloc.savings,
      })
    }
  }

  if (depositAccount) {
    await prisma.account.update({
      where: { id: depositAccount.id },
      data: { balance: { increment: incomeMinor } },
    })
  }

  return {
    entryId: incomeEntry.id,
    incomeMinor,
    alloc,
    allocateToBudget,
    depositAccountId: depositAccount?.id ?? null,
  }
}
