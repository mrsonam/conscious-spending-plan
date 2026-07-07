import {
  monthlyEquivalent,
  SUPPORTED_SUBSCRIPTION_FREQUENCIES,
  type SubscriptionFrequency,
} from "@/lib/subscription-utils"
import { createOptimisticId, roundMoney } from "@/lib/optimistic-id"

export type SubscriptionRecurringLike = {
  id: string
  amount: number
  description: string | null
  frequency: string
  intervalDays?: number | null
  startDate: string
  endDate: string | null
  isActive: boolean
  category: string | null
  expenseCategory: string | null
  account: { id: string; name: string; bankName: string }
}

export type SubscriptionRowLike = {
  id: string
  provider: string | null
  label: string | null
  status: string
  trialEndsAt: string | null
  nextRenewalAt: string | null
  reminderDaysBefore: number
  foreignCurrency: string | null
  foreignAmount: number | null
  recurringExpense: SubscriptionRecurringLike
}

export function cloneSubscriptionState(
  subscriptions: SubscriptionRowLike[],
  monthlyActiveTotal: number
) {
  return {
    subscriptions: subscriptions.map((s) => ({
      ...s,
      recurringExpense: { ...s.recurringExpense, account: { ...s.recurringExpense.account } },
    })),
    monthlyActiveTotal,
  }
}

function activeMonthlyContribution(row: SubscriptionRowLike): number {
  if (row.status !== "active") return 0
  const freq = row.recurringExpense.frequency as SubscriptionFrequency
  if (!SUPPORTED_SUBSCRIPTION_FREQUENCIES.includes(freq)) {
    return row.recurringExpense.amount
  }
  return monthlyEquivalent(
    row.recurringExpense.amount,
    freq,
    row.recurringExpense.intervalDays,
  )
}

export function applyOptimisticSubscriptionCreate(
  subscriptions: SubscriptionRowLike[],
  monthlyActiveTotal: number,
  input: {
    account: { id: string; name: string; bankName: string }
    amount: number
    description: string | null
    category: string | null
    expenseCategory: string | null
    frequency: string
    intervalDays?: number | null
    startDate: string
    provider: string | null
    label: string | null
    trialEndsAt: string | null
    nextRenewalAt: string | null
    reminderDaysBefore: number
    status: string
    foreignCurrency: string | null
    foreignAmount: number | null
  }
): { subscriptions: SubscriptionRowLike[]; monthlyActiveTotal: number } {
  const recurringId = createOptimisticId("recurring")
  const row: SubscriptionRowLike = {
    id: createOptimisticId("subscription"),
    provider: input.provider,
    label: input.label,
    status: input.status,
    trialEndsAt: input.trialEndsAt,
    nextRenewalAt: input.nextRenewalAt,
    reminderDaysBefore: input.reminderDaysBefore,
    foreignCurrency: input.foreignCurrency,
    foreignAmount: input.foreignAmount,
    recurringExpense: {
      id: recurringId,
      amount: input.amount,
      description: input.description,
      frequency: input.frequency,
      intervalDays: input.intervalDays ?? null,
      startDate: input.startDate,
      endDate: null,
      isActive: true,
      category: input.category,
      expenseCategory: input.expenseCategory,
      account: input.account,
    },
  }
  const monthlyDelta = activeMonthlyContribution(row)
  return {
    subscriptions: [row, ...subscriptions],
    monthlyActiveTotal: roundMoney(monthlyActiveTotal + monthlyDelta),
  }
}

export function applyOptimisticSubscriptionUpdate(
  subscriptions: SubscriptionRowLike[],
  monthlyActiveTotal: number,
  subscriptionId: string,
  patch: Partial<SubscriptionRowLike> & {
    recurringExpense?: Partial<SubscriptionRecurringLike>
  }
): { subscriptions: SubscriptionRowLike[]; monthlyActiveTotal: number } {
  const prev = subscriptions.find((s) => s.id === subscriptionId)
  const prevMonthly = prev ? activeMonthlyContribution(prev) : 0

  const nextSubscriptions = subscriptions.map((s) => {
    if (s.id !== subscriptionId) return s
    return {
      ...s,
      ...patch,
      recurringExpense: patch.recurringExpense
        ? { ...s.recurringExpense, ...patch.recurringExpense }
        : s.recurringExpense,
    }
  })

  const next = nextSubscriptions.find((s) => s.id === subscriptionId)
  const nextMonthly = next ? activeMonthlyContribution(next) : 0

  return {
    subscriptions: nextSubscriptions,
    monthlyActiveTotal: roundMoney(monthlyActiveTotal - prevMonthly + nextMonthly),
  }
}

export function applyOptimisticSubscriptionDelete(
  subscriptions: SubscriptionRowLike[],
  monthlyActiveTotal: number,
  subscriptionId: string
): { subscriptions: SubscriptionRowLike[]; monthlyActiveTotal: number } {
  const removed = subscriptions.find((s) => s.id === subscriptionId)
  const delta = removed ? activeMonthlyContribution(removed) : 0
  return {
    subscriptions: subscriptions.filter((s) => s.id !== subscriptionId),
    monthlyActiveTotal: roundMoney(Math.max(0, monthlyActiveTotal - delta)),
  }
}
