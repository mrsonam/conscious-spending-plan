import type { Prisma } from "@prisma/client"

import {
  TRACKING_CATEGORIES,
  calculateCategoryTracking,
  type TrackingCategory,
} from "@/lib/category-tracking-calculation"
import { netPillarHeadroom } from "@/lib/category-tracking-shared"
import { FUND_CATEGORIES, type FundCategory } from "@/lib/fund-allocation-fields"
import { buildAllocatedSoFarFromEntries } from "@/lib/income-allocation"
import {
  ensureMonthClosing,
  ensureMonthlyCategoryBalances,
  getPreviousMonthRemainingAndOverspentByCategory,
} from "@/lib/monthly-tracking"
import {
  coerceMinor,
  dollarsToMinor,
  type MinorAmount,
} from "@/lib/money"
import { serializeMoneyForApi } from "@/lib/money-api"
import { prisma } from "@/lib/prisma"
import { ensurePreTrackingSavingsBalances, invalidatePreTrackingEnsureCache } from "@/lib/pre-tracking-savings"
import { ensureCategoryBucketTransferTable } from "@/lib/ensure-category-bucket-transfer-table"
import { upsertEnvelopeBalancesForMonth } from "@/lib/envelope-balance-recompute"
import { computeGeneralSavingsAvailableMinor } from "@/lib/saving-goal-general-savings"

import { computeMaxTransferFromBucketMinor } from "@/lib/category-bucket-transfer-shared"

type Tx = Prisma.TransactionClient

async function loadMonthTrackingSnapshot(
  userId: string,
  month: number,
  year: number,
  currency: string
) {
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)
  const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)

  const [
    categoryBalances,
    expenses,
    transfers,
    investments,
    incomeEntries,
    fundAllocation,
    carryoverPack,
    goals,
  ] = await Promise.all([
    prisma.categoryBalance.findMany({
      where: { userId, month, year },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: [...FUND_CATEGORIES] },
      },
      select: { amount: true, category: true },
    }),
    prisma.transfer.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: [...FUND_CATEGORIES] },
      },
      select: { amount: true, category: true },
    }),
    prisma.investmentHolding.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { amount: true },
    }),
    prisma.incomeEntry.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        excludeFromAllocation: false,
      },
      select: {
        amount: true,
        excludeFromAllocation: true,
        allocationFixedCosts: true,
        allocationSavings: true,
        allocationInvestment: true,
        allocationGuiltFreeSpending: true,
      },
    }),
    prisma.fundAllocation.findUnique({ where: { userId } }),
    getPreviousMonthRemainingAndOverspentByCategory(userId, month, year),
    prisma.savingGoal.findMany({
      where: { userId, status: { not: "archived" } },
      select: { currentMinor: true },
    }),
  ])

  const incomeAllocatedMinor = fundAllocation
    ? buildAllocatedSoFarFromEntries(incomeEntries, fundAllocation, currency)
    : null

  const incomeAllocatedByCategory: Record<string, number> = {}
  if (incomeAllocatedMinor) {
    for (const cat of TRACKING_CATEGORIES) {
      incomeAllocatedByCategory[cat] = toD(incomeAllocatedMinor[cat])
    }
  }

  const tracking = calculateCategoryTracking({
    categoryBalances: categoryBalances.map((b) => ({
      category: b.category,
      balance: toD(b.balance ?? 0n),
    })),
    expenses: expenses.map((e) => ({
      category: e.category,
      amount: toD(e.amount),
    })),
    transfers: transfers.map((t) => ({
      category: t.category,
      amount: toD(t.amount),
    })),
    investments: investments.map((i) => ({ amount: toD(i.amount) })),
    carryoverByCategory: carryoverPack.remaining,
    overspentByCategory: carryoverPack.overspent,
    incomeAllocatedByCategory: incomeAllocatedMinor ? incomeAllocatedByCategory : undefined,
  })

  const savingsRow = categoryBalances.find((b) => b.category === "savings")
  const savingsBalanceMinor = coerceMinor(savingsRow?.balance ?? 0n)
  const savingsGeneralMinor = computeGeneralSavingsAvailableMinor(
    savingsBalanceMinor,
    goals.map((g) => coerceMinor(g.currentMinor))
  )

  return {
    tracking,
    categoryBalances,
    savingsGeneralMinor,
  }
}

export async function transferCategoryBucketFunds(params: {
  userId: string
  currency: string
  month: number
  year: number
  fromCategory: FundCategory
  toCategory: FundCategory
  amountMinor: MinorAmount
}): Promise<
  | { ok: true; fromCategory: FundCategory; toCategory: FundCategory; amountMinor: MinorAmount }
  | { ok: false; error: string }
> {
  const { userId, currency, month, year, fromCategory, toCategory, amountMinor } = params

  if (fromCategory === toCategory) {
    return { ok: false, error: "Choose two different buckets" }
  }

  if (amountMinor <= 0n) {
    return { ok: false, error: "Amount must be greater than zero" }
  }

  invalidatePreTrackingEnsureCache(userId)
  await ensurePreTrackingSavingsBalances(userId, { force: true })
  await ensureMonthlyCategoryBalances(userId, month, year)
  await ensureCategoryBucketTransferTable()

  const snapshot = await loadMonthTrackingSnapshot(userId, month, year, currency)
  const sourceRow = snapshot.tracking[fromCategory as TrackingCategory]
  if (!sourceRow) {
    return { ok: false, error: "Source bucket not found" }
  }

  const headroomMinor = dollarsToMinor(netPillarHeadroom(sourceRow), currency)
  const maxMinor = computeMaxTransferFromBucketMinor(
    fromCategory,
    headroomMinor,
    fromCategory === "savings" ? snapshot.savingsGeneralMinor : undefined
  )

  if (maxMinor <= 0n) {
    return { ok: false, error: "No funds available to transfer from this bucket" }
  }

  if (amountMinor > maxMinor) {
    return {
      ok: false,
      error:
        fromCategory === "savings"
          ? "Amount exceeds available savings (after saving goals)"
          : "Amount exceeds available bucket balance",
    }
  }

  const fromRow = snapshot.categoryBalances.find((b) => b.category === fromCategory)
  const toRow = snapshot.categoryBalances.find((b) => b.category === toCategory)

  if (!fromRow || !toRow) {
    return { ok: false, error: "Bucket balances not initialized for this month" }
  }

  const fromBalance = coerceMinor(fromRow.balance)
  const toBalance = coerceMinor(toRow.balance)

  if (fromBalance < amountMinor) {
    return { ok: false, error: "Source envelope is too low for this transfer" }
  }

  await prisma.$transaction(async (tx: Tx) => {
    await tx.categoryBucketTransfer.create({
      data: {
        userId,
        fromCategory,
        toCategory,
        amount: amountMinor,
        month,
        year,
      },
    })
  })

  await upsertEnvelopeBalancesForMonth(userId, month, year, currency)
  await ensureMonthClosing(userId, month, year)

  return { ok: true, fromCategory, toCategory, amountMinor }
}
