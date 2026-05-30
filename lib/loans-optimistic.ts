import { createOptimisticId, roundMoney } from "@/lib/optimistic-id"

export type LoanAccountLike = {
  id: string
  name: string
  bankName: string
  balance: number
  accountType?: string
  isDefault?: boolean
}

export type LoanRowLike = {
  id: string
  accountId: string
  amount: number
  description: string | null
  borrowerName?: string | null
  lenderName?: string | null
  date: string
  dueDate: string | null
  status: string
  repaidAmount: number
  createdAt: string
  updatedAt: string
  account: { id: string; name: string; bankName: string }
}

export function cloneLoansState<
  T extends LoanAccountLike,
  L extends LoanRowLike,
  B extends LoanRowLike,
>(
  accounts: T[],
  loans: L[],
  borrowedLoans: B[]
) {
  return {
    accounts: accounts.map((a) => ({ ...a })),
    loans: loans.map((l) => ({ ...l, account: { ...l.account } })),
    borrowedLoans: borrowedLoans.map((l) => ({ ...l, account: { ...l.account } })),
  }
}

export function applyOptimisticRecordLoan<L extends LoanRowLike>(
  loans: L[],
  accounts: LoanAccountLike[],
  input: {
    accountId: string
    amount: number
    borrowerName: string | null
    description: string | null
    date: string
    dueDate: string | null
    account: { id: string; name: string; bankName: string }
  }
): { loans: L[]; accounts: LoanAccountLike[] } {
  const now = new Date().toISOString()
  const loan = {
    id: createOptimisticId("loan"),
    accountId: input.accountId,
    amount: input.amount,
    description: input.description,
    borrowerName: input.borrowerName,
    date: input.date,
    dueDate: input.dueDate,
    status: "active",
    repaidAmount: 0,
    createdAt: now,
    updatedAt: now,
    account: input.account,
  } as L

  return {
    loans: [loan, ...loans],
    accounts: accounts.map((a) =>
      a.id === input.accountId
        ? { ...a, balance: roundMoney(a.balance - input.amount) }
        : a
    ),
  }
}

export function applyOptimisticMarkLoanRepaid<L extends LoanRowLike>(
  loans: L[],
  accounts: LoanAccountLike[],
  loanId: string,
  toAccountId: string
): { loans: L[]; accounts: LoanAccountLike[] } {
  const loan = loans.find((l) => l.id === loanId)
  if (!loan) return { loans, accounts }

  const outstanding = roundMoney(loan.amount - loan.repaidAmount)
  const nextLoans = loans.map((l) =>
    l.id === loanId
      ? { ...l, status: "repaid", repaidAmount: l.amount, updatedAt: new Date().toISOString() }
      : l
  )
  const nextAccounts = accounts.map((a) =>
    a.id === toAccountId ? { ...a, balance: roundMoney(a.balance + outstanding) } : a
  )
  return { loans: nextLoans, accounts: nextAccounts }
}

export function applyOptimisticRecordBorrowed<L extends LoanRowLike>(
  borrowedLoans: L[],
  accounts: LoanAccountLike[],
  input: {
    accountId: string
    amount: number
    lenderName: string | null
    description: string | null
    date: string
    dueDate: string | null
    account: { id: string; name: string; bankName: string }
  }
): { borrowedLoans: L[]; accounts: LoanAccountLike[] } {
  const now = new Date().toISOString()
  const row = {
    id: createOptimisticId("borrowed"),
    accountId: input.accountId,
    amount: input.amount,
    description: input.description,
    lenderName: input.lenderName,
    date: input.date,
    dueDate: input.dueDate,
    status: "active",
    repaidAmount: 0,
    createdAt: now,
    updatedAt: now,
    account: input.account,
  } as L

  return {
    borrowedLoans: [row, ...borrowedLoans],
    accounts: accounts.map((a) =>
      a.id === input.accountId
        ? { ...a, balance: roundMoney(a.balance + input.amount) }
        : a
    ),
  }
}

export function applyOptimisticMarkBorrowedRepaid<L extends LoanRowLike>(
  borrowedLoans: L[],
  accounts: LoanAccountLike[],
  borrowedLoanId: string,
  fromAccountId: string
): { borrowedLoans: L[]; accounts: LoanAccountLike[] } {
  const loan = borrowedLoans.find((l) => l.id === borrowedLoanId)
  if (!loan) return { borrowedLoans, accounts }

  const outstanding = roundMoney(loan.amount - loan.repaidAmount)
  const nextBorrowed = borrowedLoans.map((l) =>
    l.id === borrowedLoanId
      ? { ...l, status: "repaid", repaidAmount: l.amount, updatedAt: new Date().toISOString() }
      : l
  )
  const nextAccounts = accounts.map((a) =>
    a.id === fromAccountId
      ? { ...a, balance: roundMoney(a.balance - outstanding) }
      : a
  )
  return { borrowedLoans: nextBorrowed, accounts: nextAccounts }
}
