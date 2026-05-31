"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import {
  fetchJsonAndCache,
  peekCachedJson,
} from "@/lib/client-fetch-cache"

type IncomeEntry = {
  id: string
  amount: number
  description: string | null
  date: string
  accountId: string | null
  account: { id: string; name: string; bankName: string } | null
  excludeFromAllocation?: boolean
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
  /** Income only: false when excluded from budget allocation (e.g. dividends). */
  excludeFromAllocation?: boolean
}

type StatementSummary = {
  income: number
  expenses: number
  transfers: number
  investments: number
  net: number
  totalRows: number
}

const EMPTY_SUMMARY: StatementSummary = {
  income: 0,
  expenses: 0,
  transfers: 0,
  investments: 0,
  net: 0,
  totalRows: 0,
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
  const [summary, setSummary] = useState<StatementSummary>(EMPTY_SUMMARY)

  useLayoutEffect(() => {
    if (status !== "authenticated") return

    const cachedAccounts =
      peekCachedJson<{ accounts?: StatementAccount[] }>("statement:accounts", 60_000) ??
      peekCachedJson<{ accounts?: StatementAccount[] }>("dashboard:accounts", 45_000)
    if (cachedAccounts?.accounts?.length) {
      setAccounts(cachedAccounts.accounts)
    }

    const cachedSummary = peekCachedJson<StatementSummary>("statement:summary:all", 30_000)
    if (cachedSummary) {
      setSummary(cachedSummary)
      setLoadingSummary(false)
    }
  }, [status])

  const fetchAccounts = useCallback(async () => {
    const cached = peekCachedJson<{ accounts?: StatementAccount[] }>(
      "statement:accounts",
      60_000,
    )
    if (cached) {
      setAccounts(cached.accounts ?? [])
    }

    try {
      const data = await fetchJsonAndCache<{ accounts?: StatementAccount[] }>(
        "statement:accounts",
        `/api/accounts?t=${Date.now()}`,
      )
      setAccounts(data.accounts ?? [])
    } catch (error) {
      console.error("Error fetching accounts:", error)
    }
  }, [])

  const summaryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (filterStartDate) params.set("startDate", filterStartDate)
    if (filterEndDate) params.set("endDate", filterEndDate)
    if (filterAccountId) params.set("accountId", filterAccountId)
    return params
  }, [filterAccountId, filterEndDate, filterStartDate])

  const transactionParams = useMemo(() => {
    const params = new URLSearchParams()
    if (filterStartDate) params.set("startDate", filterStartDate)
    if (filterEndDate) params.set("endDate", filterEndDate)
    return params
  }, [filterEndDate, filterStartDate])

  const fetchSummary = useCallback(async () => {
    const query = summaryParams.toString()
    const cacheKey = `statement:summary:${query || "all"}`
    const cached = peekCachedJson<StatementSummary>(cacheKey, 30_000)
    if (cached) {
      setSummary(cached)
      setLoadingSummary(false)
    } else {
      setLoadingSummary(true)
    }

    try {
      const data = await fetchJsonAndCache<StatementSummary>(
        cacheKey,
        `/api/statement/summary${query ? `?${query}&t=${Date.now()}` : `?t=${Date.now()}`}`,
      )
      setSummary(data)
    } catch (error) {
      console.error("Error fetching statement summary:", error)
    } finally {
      setLoadingSummary(false)
    }
  }, [summaryParams])

  const fetchData = useCallback(async () => {
    const query = transactionParams.toString()
    const suffix = query ? `?${query}&t=${Date.now()}` : `?t=${Date.now()}`
    const incomeUrl =
      filterStartDate && filterEndDate
        ? `/api/income-entries?${new URLSearchParams({
            startDate: filterStartDate,
            endDate: filterEndDate,
          }).toString()}&t=${Date.now()}`
        : `/api/income-entries?forStatement=true&t=${Date.now()}`

    const cacheKeys = {
      income: `statement:income:${query || "all"}`,
      expenses: `statement:expenses:${query || "all"}`,
      transfers: `statement:transfers:${query || "all"}`,
      investments: `statement:investments:all`,
    }

    const cachedIncome = peekCachedJson<{ entries?: IncomeEntry[] }>(
      cacheKeys.income,
      30_000,
    )
    const cachedExpenses = peekCachedJson<{ expenses?: Expense[] }>(
      cacheKeys.expenses,
      30_000,
    )
    const cachedTransfers = peekCachedJson<{ transfers?: Transfer[] }>(
      cacheKeys.transfers,
      30_000,
    )
    const cachedInvestments = peekCachedJson<{ accounts?: InvestmentAccount[] }>(
      cacheKeys.investments,
      30_000,
    )

    if (cachedIncome) setIncomeEntries(cachedIncome.entries ?? [])
    if (cachedExpenses) setExpenses(cachedExpenses.expenses ?? [])
    if (cachedTransfers) setTransfers(cachedTransfers.transfers ?? [])
    if (cachedInvestments) setInvestmentAccounts(cachedInvestments.accounts ?? [])

    if (cachedIncome && cachedExpenses && cachedTransfers && cachedInvestments) {
      setLoadingTransactions(false)
    } else {
      setLoadingTransactions(true)
    }

    try {
      const [incomeData, expenseData, transferData, investmentData] =
        await Promise.all([
          fetchJsonAndCache<{ entries?: IncomeEntry[] }>(
            cacheKeys.income,
            incomeUrl,
          ),
          fetchJsonAndCache<{ expenses?: Expense[] }>(
            cacheKeys.expenses,
            `/api/expenses${suffix}`,
          ),
          fetchJsonAndCache<{ transfers?: Transfer[] }>(
            cacheKeys.transfers,
            `/api/transfers${suffix}`,
          ),
          fetchJsonAndCache<{ accounts?: InvestmentAccount[] }>(
            cacheKeys.investments,
            `/api/investments?t=${Date.now()}`,
          ),
        ])

      setIncomeEntries(incomeData.entries ?? [])
      setExpenses(expenseData.expenses ?? [])
      setTransfers(transferData.transfers ?? [])
      setInvestmentAccounts(investmentData.accounts ?? [])
    } catch (error) {
      console.error("Error fetching statement data:", error)
    } finally {
      setLoadingTransactions(false)
    }
  }, [filterEndDate, filterStartDate, transactionParams])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      void fetchAccounts()
      void fetchSummary()
      void fetchData()
    }
  }, [status, router, fetchAccounts, fetchData, fetchSummary])

  useEffect(() => {
    if (status === "authenticated") {
      void fetchSummary()
    }
  }, [filterAccountId, status, fetchSummary])

  useEffect(() => {
    if (status === "authenticated") {
      void fetchSummary()
      void fetchData()
    }
  }, [filterStartDate, filterEndDate, status, fetchData, fetchSummary])

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
        excludeFromAllocation: entry.excludeFromAllocation === true,
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

  return {
    accounts,
    transactions,
    totals: {
      income: summary.income,
      expenses: summary.expenses,
      transfers: summary.transfers,
      investments: summary.investments,
      net: summary.net,
    },
    totalRows: summary.totalRows,
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

