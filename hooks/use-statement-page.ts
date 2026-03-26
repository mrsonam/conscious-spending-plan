"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type IncomeEntry = {
  id: string
  amount: number
  description: string | null
  date: string
  accountId: string | null
  account: { id: string; name: string; bankName: string } | null
}

type Expense = {
  id: string
  accountId: string
  amount: number
  description: string | null
  category: string | null
  date: string
  account: { id: string; name: string; bankName: string }
}

type Transfer = {
  id: string
  fromAccountId: string
  toAccountId: string
  amount: number
  description: string | null
  category: string | null
  date: string
  fromAccount: { id: string; name: string; bankName: string }
  toAccount: { id: string; name: string; bankName: string }
}

type InvestmentAccount = {
  id: string
  name: string
  bankName: string
  holdings: Array<{
    name: string
    purchases: Array<{
      id: string
      amount: number
      date: string
      numberOfShares: number | null
      pricePerUnit: number | null
      brokerageFee?: number
    }>
  }>
}

export type StatementAccount = {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  isDefault: boolean
}

export type StatementTransaction = {
  id: string
  type: "income" | "expense" | "transfer" | "investment"
  amount: number
  date: string
  description: string | null
  category: string | null
  account?: { id: string; name: string; bankName: string }
  fromAccount?: { id: string; name: string; bankName: string }
  toAccount?: { id: string; name: string; bankName: string }
}

export function useStatementPage(
  status: string,
  router: { push: (path: string) => void },
) {
  const [accounts, setAccounts] = useState<StatementAccount[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterAccountId, setFilterAccountId] = useState("")

  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [investmentAccounts, setInvestmentAccounts] = useState<InvestmentAccount[]>(
    [],
  )

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = (await response.json()) as { accounts?: StatementAccount[] }
        setAccounts(data.accounts ?? [])
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoadingSummary(true)
    setLoadingTransactions(true)

    try {
      const [incomeRes, expensesRes, transfersRes, investmentsRes] =
        await Promise.all([
          fetch(
            filterStartDate && filterEndDate
              ? `/api/income-entries?${new URLSearchParams({
                  startDate: filterStartDate,
                  endDate: filterEndDate,
                }).toString()}`
              : `/api/income-entries?forStatement=true`,
          ),
          fetch(
            filterStartDate || filterEndDate
              ? `/api/expenses?${new URLSearchParams({
                  ...(filterStartDate && { startDate: filterStartDate }),
                  ...(filterEndDate && { endDate: filterEndDate }),
                }).toString()}`
              : "/api/expenses",
          ),
          fetch(
            filterStartDate || filterEndDate
              ? `/api/transfers?${new URLSearchParams({
                  ...(filterStartDate && { startDate: filterStartDate }),
                  ...(filterEndDate && { endDate: filterEndDate }),
                }).toString()}`
              : "/api/transfers",
          ),
          fetch("/api/investments"),
        ])

      if (incomeRes.ok) {
        const data = (await incomeRes.json()) as { entries?: IncomeEntry[] }
        setIncomeEntries(data.entries ?? [])
      }
      if (expensesRes.ok) {
        const data = (await expensesRes.json()) as { expenses?: Expense[] }
        setExpenses(data.expenses ?? [])
      }
      if (transfersRes.ok) {
        const data = (await transfersRes.json()) as { transfers?: Transfer[] }
        setTransfers(data.transfers ?? [])
      }
      if (investmentsRes.ok) {
        const data = (await investmentsRes.json()) as {
          accounts?: InvestmentAccount[]
        }
        setInvestmentAccounts(data.accounts ?? [])
      }

      setLoadingSummary(false)
    } catch (error) {
      console.error("Error fetching statement data:", error)
      setLoadingSummary(false)
      setLoadingTransactions(false)
    }
  }, [filterStartDate, filterEndDate])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      void fetchAccounts()
      void fetchData()
    }
  }, [status, router, fetchAccounts, fetchData])

  useEffect(() => {
    if (status === "authenticated") {
      void fetchData()
    }
  }, [filterStartDate, filterEndDate, filterAccountId, status, fetchData])

  const transactions = useMemo<StatementTransaction[]>(() => {
    const combined: StatementTransaction[] = []

    for (const entry of incomeEntries) {
      if (filterAccountId && entry.accountId !== filterAccountId) continue
      const t = new Date(entry.date).getTime()
      if (filterStartDate && t < new Date(filterStartDate).getTime()) continue
      if (filterEndDate && t > new Date(filterEndDate).getTime()) continue
      combined.push({
        id: entry.id,
        type: "income",
        amount: entry.amount,
        date: entry.date,
        description: entry.description || "Income",
        category: null,
        account: entry.account ?? undefined,
      })
    }

    for (const expense of expenses) {
      if (filterAccountId && expense.accountId !== filterAccountId) continue
      combined.push({
        id: expense.id,
        type: "expense",
        amount: expense.amount,
        date: expense.date,
        description: expense.description,
        category: expense.category,
        account: expense.account,
      })
    }

    for (const transfer of transfers) {
      if (
        filterAccountId &&
        transfer.fromAccountId !== filterAccountId &&
        transfer.toAccountId !== filterAccountId
      ) {
        continue
      }
      const t = new Date(transfer.date).getTime()
      if (filterStartDate && t < new Date(filterStartDate).getTime()) continue
      if (filterEndDate && t > new Date(filterEndDate).getTime()) continue
      combined.push({
        id: transfer.id,
        type: "transfer",
        amount: transfer.amount,
        date: transfer.date,
        description: transfer.description,
        category: transfer.category || null,
        fromAccount: transfer.fromAccount,
        toAccount: transfer.toAccount,
      })
    }

    for (const account of investmentAccounts) {
      for (const holding of account.holdings) {
        for (const purchase of holding.purchases) {
          if (filterAccountId && account.id !== filterAccountId) continue
          const t = new Date(purchase.date).getTime()
          if (filterStartDate && t < new Date(filterStartDate).getTime()) continue
          if (filterEndDate && t > new Date(filterEndDate).getTime()) continue

          combined.push({
            id: purchase.id,
            type: "investment",
            amount: purchase.amount,
            date: purchase.date,
            description: `Investment buy: ${holding.name}`,
            category: "investment",
            account: { id: account.id, name: account.name, bankName: account.bankName },
          })
        }
      }
    }

    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return combined
  }, [
    incomeEntries,
    expenses,
    transfers,
    investmentAccounts,
    filterAccountId,
    filterStartDate,
    filterEndDate,
  ])

  useEffect(() => {
    if (!loadingSummary) setLoadingTransactions(false)
  }, [loadingSummary])

  const totals = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0)
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0)
    const transfers = transactions
      .filter((t) => t.type === "transfer")
      .reduce((s, t) => s + t.amount, 0)
    const investments = transactions
      .filter((t) => t.type === "investment")
      .reduce((s, t) => s + t.amount, 0)
    return {
      income,
      expenses,
      transfers,
      investments,
      net: income - expenses,
    }
  }, [transactions])

  return {
    accounts,
    transactions,
    totals,
    loadingSummary,
    loadingTransactions,
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    filterAccountId,
    setFilterAccountId,
  }
}

