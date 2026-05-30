import { createOptimisticId, roundMoney } from "@/lib/optimistic-id"

export type AccountBalanceRow = {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  startingFunds?: number
  isDefault: boolean
}

export function cloneAccountRows<T extends AccountBalanceRow>(accounts: T[]): T[] {
  return accounts.map((a) => ({ ...a }))
}

export function applyAccountTransferBalances<T extends AccountBalanceRow>(
  accounts: T[],
  fromAccountId: string,
  toAccountId: string,
  amount: number
): T[] {
  return accounts.map((acc) => {
    if (acc.id === fromAccountId) {
      return { ...acc, balance: roundMoney(acc.balance - amount) }
    }
    if (acc.id === toAccountId) {
      return { ...acc, balance: roundMoney(acc.balance + amount) }
    }
    return acc
  })
}

export function applyAccountBalanceDelta<T extends AccountBalanceRow>(
  accounts: T[],
  accountId: string,
  delta: number
): T[] {
  return accounts.map((acc) =>
    acc.id === accountId ? { ...acc, balance: roundMoney(acc.balance + delta) } : acc
  )
}

export function applyOptimisticAccountCreate(
  accounts: AccountBalanceRow[],
  input: {
    name: string
    bankName: string
    accountType: string
    balance: number
    isDefault: boolean
  }
): AccountBalanceRow[] {
  const id = createOptimisticId("account")
  let next = accounts.map((a) =>
    input.isDefault ? { ...a, isDefault: false } : a
  )
  next = [
    ...next,
    {
      id,
      name: input.name,
      bankName: input.bankName,
      accountType: input.accountType,
      balance: roundMoney(input.balance),
      startingFunds: roundMoney(input.balance),
      isDefault: input.isDefault,
    },
  ]
  return next
}

export function applyOptimisticAccountUpdate(
  accounts: AccountBalanceRow[],
  accountId: string,
  input: {
    name: string
    bankName: string
    accountType: string
    balance: number
    isDefault: boolean
  }
): AccountBalanceRow[] {
  return accounts.map((acc) => {
    if (acc.id !== accountId) {
      return input.isDefault ? { ...acc, isDefault: false } : acc
    }
    return {
      ...acc,
      name: input.name,
      bankName: input.bankName,
      accountType: input.accountType,
      balance: roundMoney(input.balance),
      isDefault: input.isDefault,
    }
  })
}

export function applyOptimisticAccountDelete(
  accounts: AccountBalanceRow[],
  accountId: string
): AccountBalanceRow[] {
  return accounts.filter((a) => a.id !== accountId)
}

export { createOptimisticId as createOptimisticAccountId }
