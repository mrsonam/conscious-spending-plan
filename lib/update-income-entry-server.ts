import { prisma } from "@/lib/prisma"
import {
  ensureMonthlyCategoryBalances,
  schedulePersistPreviousMonthClosing,
} from "@/lib/monthly-tracking"
import { ensurePreTrackingSavingsBalances } from "@/lib/pre-tracking-savings"
import { reallocateMonthIncomeForUser } from "@/lib/reallocate-month-income"
import {
  applySavingGoalCreditsForIncome,
  reverseSavingGoalCreditsForIncome,
} from "@/lib/saving-goal-credits-server"
import { incomeAllocationToApi, excludedIncomeSavingsAllocationMinor } from "@/lib/income-allocation"
import { serializeMoneyForApi } from "@/lib/money-api"
import { mapIncomeEntryToApi } from "@/lib/money-serialize"
import { coerceMinor } from "@/lib/money"

export type UpdateIncomeEntryInput = {
  incomeMinor: bigint
  description: string | null
  date: Date
  periodStart: Date
  periodEnd: Date
  accountId: string | null
  allocateToBudget: boolean | undefined
}

function monthKey(month: number, year: number) {
  return `${year}-${month}`
}

export async function updateIncomeEntryForUser(
  userId: string,
  entryId: string,
  input: UpdateIncomeEntryInput,
  currency: string,
) {
  const existing = await prisma.incomeEntry.findFirst({
    where: { id: entryId, userId },
    include: {
      account: { select: { id: true, name: true, bankName: true, accountType: true } },
    },
  })

  if (!existing) {
    return { error: "Income entry not found", status: 404 as const }
  }

  // Preserve the existing entry's allocation flag when the caller doesn't send one
  const effectiveAllocateToBudget = input.allocateToBudget ?? !existing.excludeFromAllocation

  if (input.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: input.accountId, userId },
    })
    if (!account) {
      return { error: "Account not found or does not belong to user", status: 404 as const }
    }
  }

  const fundAllocation = await prisma.fundAllocation.findUnique({
    where: { userId },
  })
  if (!fundAllocation && effectiveAllocateToBudget) {
    return { error: "Fund allocation not found", status: 404 as const }
  }

  const oldMonth = existing.date.getMonth() + 1
  const oldYear = existing.date.getFullYear()
  const newMonth = input.date.getMonth() + 1
  const newYear = input.date.getFullYear()
  const existingAmount = coerceMinor(existing.amount)

  await prisma.$transaction(async (tx) => {
    if (existing.accountId && existingAmount > 0n) {
      await tx.account.update({
        where: { id: existing.accountId },
        data: { balance: { decrement: existingAmount } },
      })
    }

    await reverseSavingGoalCreditsForIncome(tx, { userId, incomeEntryId: entryId })

    await tx.incomeEntry.update({
      where: { id: entryId },
      data: {
        amount: input.incomeMinor,
        description: input.description,
        date: input.date,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        accountId: input.accountId,
        excludeFromAllocation: !effectiveAllocateToBudget,
        ...(effectiveAllocateToBudget
          ? {}
          : {
              allocationFixedCosts: 0n,
              allocationSavings: input.incomeMinor,
              allocationInvestment: 0n,
              allocationGuiltFreeSpending: 0n,
            }),
      },
    })

    if (input.accountId && input.incomeMinor > 0n) {
      await tx.account.update({
        where: { id: input.accountId },
        data: { balance: { increment: input.incomeMinor } },
      })
    }
  })

  const monthsToSync = new Set<string>([
    monthKey(oldMonth, oldYear),
    monthKey(newMonth, newYear),
  ])

  // Fire background job immediately, the main transaction has already committed.
  schedulePersistPreviousMonthClosing(userId)

  try {
    if (monthsToSync.size > 0) {
      await ensurePreTrackingSavingsBalances(userId)
      for (const key of monthsToSync) {
        const [yearStr, monthStr] = key.split("-")
        const year = Number(yearStr)
        const month = Number(monthStr)
        await ensureMonthlyCategoryBalances(userId, month, year)
        await reallocateMonthIncomeForUser(userId, currency, month, year)
      }
    }

    const updated = await prisma.incomeEntry.findUnique({
      where: { id: entryId },
      select: { allocationSavings: true },
    })
    const savingsAlloc = effectiveAllocateToBudget
      ? coerceMinor(updated?.allocationSavings ?? 0n)
      : input.incomeMinor
    if (savingsAlloc > 0n) {
      await applySavingGoalCreditsForIncome(prisma, {
        userId,
        incomeEntryId: entryId,
        savingsAllocationMinor: savingsAlloc,
      })
    }
  } catch (allocationError) {
    const priorSavingsAlloc = existing.excludeFromAllocation
      ? existingAmount
      : coerceMinor(existing.allocationSavings ?? 0n)
    if (priorSavingsAlloc > 0n) {
      try {
        await applySavingGoalCreditsForIncome(prisma, {
          userId,
          incomeEntryId: entryId,
          savingsAllocationMinor: priorSavingsAlloc,
        })
      } catch {
        // Recovery also failed, original error takes precedence
      }
    }
    throw allocationError
  }

  const saved = await prisma.incomeEntry.findUnique({
    where: { id: entryId },
    include: {
      account: { select: { id: true, name: true, bankName: true, accountType: true } },
    },
  })

  if (!saved) {
    return { error: "Income entry not found after update", status: 500 as const }
  }

  const depositAccount = saved.account
  const incomeMinor = coerceMinor(saved.amount)

  if (saved.excludeFromAllocation) {
    const incomeDollars = serializeMoneyForApi(incomeMinor, currency)
    const savingsAlloc = excludedIncomeSavingsAllocationMinor(incomeMinor)
    return {
      status: 200 as const,
      entry: mapIncomeEntryToApi(saved as unknown as Record<string, unknown>, currency),
      breakdown: {
        ...incomeAllocationToApi(incomeMinor, savingsAlloc, currency),
        incomeEntryId: saved.id,
        depositedToAccountName: depositAccount
          ? `${depositAccount.name} (${depositAccount.bankName})`
          : null,
        isCashAccount: depositAccount?.accountType === "cash",
        isExcludedFromAllocation: true,
      },
    }
  }

  const alloc = {
    fixedCosts: coerceMinor(saved.allocationFixedCosts ?? 0n),
    savings: coerceMinor(saved.allocationSavings ?? 0n),
    investment: coerceMinor(saved.allocationInvestment ?? 0n),
    guiltFreeSpending: coerceMinor(saved.allocationGuiltFreeSpending ?? 0n),
  }

  return {
    status: 200 as const,
    entry: mapIncomeEntryToApi(saved as unknown as Record<string, unknown>, currency),
    breakdown: {
      ...incomeAllocationToApi(incomeMinor, alloc, currency),
      incomeEntryId: saved.id,
      depositedToAccountName: depositAccount
        ? `${depositAccount.name} (${depositAccount.bankName})`
        : null,
      isCashAccount: depositAccount?.accountType === "cash",
      isExcludedFromAllocation: false,
    },
  }
}
