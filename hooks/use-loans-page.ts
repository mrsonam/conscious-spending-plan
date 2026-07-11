"use client"

import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { parseMoneyInput } from "@/lib/money-input"
import { getLocalDateString } from "@/lib/date-utils"
import {
  fetchJsonAndCache,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
  requirePositiveNumber,
  requireSelection,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { toastError, toastSuccess } from "@/lib/app-toast"
import {
  applyOptimisticMarkBorrowedRepaid,
  applyOptimisticMarkLoanRepaid,
  applyOptimisticRecordBorrowed,
  applyOptimisticRecordLoan,
  cloneLoansState,
} from "@/lib/loans-optimistic"

export type LoanFormFieldKey =
  | "accountId"
  | "amount"
  | "date"
  | "borrowedAccountId"
  | "borrowedAmount"
  | "borrowedDate"

export interface LoanAccountRef {
  id: string
  name: string
  bankName: string
}

export interface LoanRow {
  id: string
  accountId: string
  amount: number
  description: string | null
  borrowerName: string | null
  date: string
  dueDate: string | null
  status: string
  repaidAmount: number
  createdAt: string
  updatedAt: string
  account: LoanAccountRef
}

export interface BorrowedLoanRow {
  id: string
  accountId: string
  amount: number
  description: string | null
  lenderName: string | null
  date: string
  dueDate: string | null
  status: string
  repaidAmount: number
  createdAt: string
  updatedAt: string
  account: LoanAccountRef
}

export interface LoansPageAccount {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  isDefault: boolean
}

const LOANS_ACCOUNTS_CACHE_KEY = "dashboard:accounts"
const LOANS_LENT_CACHE_KEY = "loans:lent"
const LOANS_BORROWED_CACHE_KEY = "loans:borrowed"
const LOANS_CACHE_MS = 45_000

export function useLoansPage(authStatus: "loading" | "authenticated" | "unauthenticated") {
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const router = useRouter()
  const [accounts, setAccounts] = useState<LoansPageAccount[]>([])
  const [loans, setLoans] = useState<LoanRow[]>([])
  const [borrowedLoans, setBorrowedLoans] = useState<BorrowedLoanRow[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingLoans, setLoadingLoans] = useState(true)
  const [loadingBorrowedLoans, setLoadingBorrowedLoans] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [lentFormError, setLentFormError] = useState<string | null>(null)
  const [borrowedFormError, setBorrowedFormError] = useState<string | null>(null)
  const {
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFieldErrors,
  } = useFormFieldErrors<LoanFormFieldKey>()

  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [borrowerName, setBorrowerName] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() => getLocalDateString())
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [borrowedAccountId, setBorrowedAccountId] = useState("")
  const [borrowedAmount, setBorrowedAmount] = useState("")
  const [lenderName, setLenderName] = useState("")
  const [borrowedDescription, setBorrowedDescription] = useState("")
  const [borrowedDate, setBorrowedDate] = useState(() => getLocalDateString())
  const [borrowedDueDate, setBorrowedDueDate] = useState("")
  const [borrowedSubmitting, setBorrowedSubmitting] = useState(false)
  const [repaySubmitting, setRepaySubmitting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    const cached = peekCachedJson<{ accounts?: LoansPageAccount[] }>(
      LOANS_ACCOUNTS_CACHE_KEY,
      LOANS_CACHE_MS,
    )
    if (!cached?.accounts) {
      setLoadingAccounts(true)
    }
    const t = Date.now()
    try {
      const data = await fetchJsonAndCache<{ accounts?: LoansPageAccount[] }>(
        LOANS_ACCOUNTS_CACHE_KEY,
        `/api/accounts?t=${t}`,
      )
      const list = data.accounts || []
      setAccounts(list)
      if (list.length > 0) {
        const def = list.find((a) => a.isDefault)
        setAccountId((prev) => prev || def?.id || list[0].id)
        setBorrowedAccountId((prev) => prev || def?.id || list[0].id)
      }
    } catch {
      console.error("Error fetching accounts")
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const fetchLoans = useCallback(async () => {
    const cached = peekCachedJson<{ loans?: LoanRow[] }>(LOANS_LENT_CACHE_KEY, LOANS_CACHE_MS)
    if (!cached?.loans) {
      setLoadingLoans(true)
    }
    const t = Date.now()
    try {
      const data = await fetchJsonAndCache<{ loans?: LoanRow[] }>(
        LOANS_LENT_CACHE_KEY,
        `/api/loans?t=${t}`,
      )
      setLoans(data.loans || [])
    } catch {
      console.error("Error fetching loans")
    } finally {
      setLoadingLoans(false)
    }
  }, [])

  const fetchBorrowedLoans = useCallback(async () => {
    const cached = peekCachedJson<{ borrowedLoans?: BorrowedLoanRow[] }>(
      LOANS_BORROWED_CACHE_KEY,
      LOANS_CACHE_MS,
    )
    if (!cached?.borrowedLoans) {
      setLoadingBorrowedLoans(true)
    }
    const t = Date.now()
    try {
      const data = await fetchJsonAndCache<{ borrowedLoans?: BorrowedLoanRow[] }>(
        LOANS_BORROWED_CACHE_KEY,
        `/api/borrowed-loans?t=${t}`,
      )
      setBorrowedLoans(data.borrowedLoans || [])
    } catch {
      console.error("Error fetching borrowed loans")
    } finally {
      setLoadingBorrowedLoans(false)
    }
  }, [])

  useLayoutEffect(() => {
    if (authStatus !== "authenticated") return

    const cachedAccounts = peekCachedJson<{ accounts?: LoansPageAccount[] }>(
      LOANS_ACCOUNTS_CACHE_KEY,
      LOANS_CACHE_MS,
    )
    if (cachedAccounts?.accounts) {
      const list = cachedAccounts.accounts
      setAccounts(list)
      if (list.length > 0) {
        const def = list.find((a) => a.isDefault)
        setAccountId((prev) => prev || def?.id || list[0].id)
        setBorrowedAccountId((prev) => prev || def?.id || list[0].id)
      }
      setLoadingAccounts(false)
    }

    const cachedLoans = peekCachedJson<{ loans?: LoanRow[] }>(LOANS_LENT_CACHE_KEY, LOANS_CACHE_MS)
    if (cachedLoans?.loans) {
      setLoans(cachedLoans.loans)
      setLoadingLoans(false)
    }

    const cachedBorrowed = peekCachedJson<{ borrowedLoans?: BorrowedLoanRow[] }>(
      LOANS_BORROWED_CACHE_KEY,
      LOANS_CACHE_MS,
    )
    if (cachedBorrowed?.borrowedLoans) {
      setBorrowedLoans(cachedBorrowed.borrowedLoans)
      setLoadingBorrowedLoans(false)
    }
  }, [authStatus])

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login")
    } else if (authStatus === "authenticated") {
      void fetchAccounts()
      void fetchLoans()
      void fetchBorrowedLoans()
    }
  }, [authStatus, router, fetchAccounts, fetchLoans, fetchBorrowedLoans])

  const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    setLentFormError(null)

    const lentErrors = buildFieldErrors<LoanFormFieldKey>([
      ["accountId", requireSelection(accountId, "an account")],
      ["amount", requirePositiveNumber(amount, "Amount")],
      ["date", requireField(date, "Date")],
    ])
    if (hasFieldErrors(lentErrors)) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.accountId
        delete next.amount
        delete next.date
        return { ...next, ...lentErrors }
      })
      return false
    }
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.accountId
      delete next.amount
      delete next.date
      return next
    })

    const amountNum = parseMoneyInput(amount, currencyCode)
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return false

    const snapshot = cloneLoansState(accounts, loans, borrowedLoans)
    const optimistic = applyOptimisticRecordLoan(loans, accounts, {
      accountId,
      amount: amountNum,
      borrowerName: borrowerName || null,
      description: description || null,
      date,
      dueDate: dueDate || null,
      account: { id: account.id, name: account.name, bankName: account.bankName },
    })
    setLoans(optimistic.loans)
    setAccounts(optimistic.accounts)
    setAmount("")
    setBorrowerName("")
    setDescription("")
    setDueDate("")
    toastSuccess(
      "Loan recorded successfully. Amount deducted from account (not counted as spending)."
    )

    void (async () => {
      setSubmitting(true)
      try {
        const response = await fetch("/api/loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            amount: amountNum,
            borrowerName: borrowerName || null,
            description: description || null,
            date,
            dueDate: dueDate || null,
          }),
        })
        const data = (await response.json()) as { error?: string }
        if (!response.ok) {
          setLoans(snapshot.loans)
          setAccounts(snapshot.accounts)
          setMessage({ type: "error", text: data.error || "Failed to record loan" })
          toastError(data.error || "Failed to record loan")
          return
        }
        await fetchLoans()
        await fetchAccounts()
      } catch {
        setLoans(snapshot.loans)
        setAccounts(snapshot.accounts)
        setMessage({ type: "error", text: "An error occurred" })
        toastError("An error occurred")
      } finally {
        setSubmitting(false)
      }
    })()

    return true
  }

  const handleMarkRepaid = async (loanId: string, toAccountId: string): Promise<boolean> => {
    const snapshot = cloneLoansState(accounts, loans, borrowedLoans)
    const optimistic = applyOptimisticMarkLoanRepaid(loans, accounts, loanId, toAccountId)
    setLoans(optimistic.loans)
    setAccounts(optimistic.accounts)
    toastSuccess("Loan marked as repaid. Amount credited to the selected account.")

    void (async () => {
      setRepaySubmitting(true)
      try {
        const response = await fetch("/api/loans", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loanId, toAccountId }),
        })
        const data = (await response.json()) as { error?: string }
        if (!response.ok) {
          setLoans(snapshot.loans)
          setAccounts(snapshot.accounts)
          setMessage({ type: "error", text: data.error || "Failed to update loan" })
          toastError(data.error || "Failed to update loan")
          return
        }
        await fetchLoans()
        await fetchAccounts()
      } catch {
        setLoans(snapshot.loans)
        setAccounts(snapshot.accounts)
        setMessage({ type: "error", text: "An error occurred" })
        toastError("An error occurred")
      } finally {
        setRepaySubmitting(false)
      }
    })()

    return true
  }

  const handleSubmitBorrowed = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    setBorrowedFormError(null)

    const borrowedErrors = buildFieldErrors<LoanFormFieldKey>([
      ["borrowedAccountId", requireSelection(borrowedAccountId, "an account")],
      ["borrowedAmount", requirePositiveNumber(borrowedAmount, "Amount")],
      ["borrowedDate", requireField(borrowedDate, "Date")],
    ])
    if (hasFieldErrors(borrowedErrors)) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.borrowedAccountId
        delete next.borrowedAmount
        delete next.borrowedDate
        return { ...next, ...borrowedErrors }
      })
      return false
    }
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.borrowedAccountId
      delete next.borrowedAmount
      delete next.borrowedDate
      return next
    })

    const amountNum = parseMoneyInput(borrowedAmount, currencyCode)
    const account = accounts.find((a) => a.id === borrowedAccountId)
    if (!account) return false

    const snapshot = cloneLoansState(accounts, loans, borrowedLoans)
    const optimistic = applyOptimisticRecordBorrowed(borrowedLoans, accounts, {
      accountId: borrowedAccountId,
      amount: amountNum,
      lenderName: lenderName || null,
      description: borrowedDescription || null,
      date: borrowedDate,
      dueDate: borrowedDueDate || null,
      account: { id: account.id, name: account.name, bankName: account.bankName },
    })
    setBorrowedLoans(optimistic.borrowedLoans)
    setAccounts(optimistic.accounts)
    setBorrowedAmount("")
    setLenderName("")
    setBorrowedDescription("")
    setBorrowedDueDate("")
    toastSuccess("Borrowing recorded. Balance updated (not counted as income).")

    void (async () => {
      setBorrowedSubmitting(true)
      try {
        const response = await fetch("/api/borrowed-loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: borrowedAccountId,
            amount: amountNum,
            lenderName: lenderName || null,
            description: borrowedDescription || null,
            date: borrowedDate,
            dueDate: borrowedDueDate || null,
          }),
        })
        const data = (await response.json()) as { error?: string }
        if (!response.ok) {
          setBorrowedLoans(snapshot.borrowedLoans)
          setAccounts(snapshot.accounts)
          setBorrowedFormError(data.error || "Failed to record borrowed money")
          toastError(data.error || "Failed to record borrowed money")
          return
        }
        await fetchBorrowedLoans()
        await fetchAccounts()
      } catch {
        setBorrowedLoans(snapshot.borrowedLoans)
        setAccounts(snapshot.accounts)
        setBorrowedFormError("An error occurred")
        toastError("An error occurred")
      } finally {
        setBorrowedSubmitting(false)
      }
    })()

    return true
  }

  const handleMarkBorrowedRepaid = async (
    borrowedLoanId: string,
    fromAccountId: string,
  ): Promise<boolean> => {
    const snapshot = cloneLoansState(accounts, loans, borrowedLoans)
    const optimistic = applyOptimisticMarkBorrowedRepaid(
      borrowedLoans,
      accounts,
      borrowedLoanId,
      fromAccountId
    )
    setBorrowedLoans(optimistic.borrowedLoans)
    setAccounts(optimistic.accounts)
    toastSuccess("Marked repaid. Amount deducted from the selected account.")

    void (async () => {
      setRepaySubmitting(true)
      try {
        const response = await fetch("/api/borrowed-loans", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ borrowedLoanId, fromAccountId }),
        })
        const data = (await response.json()) as { error?: string }
        if (!response.ok) {
          setBorrowedLoans(snapshot.borrowedLoans)
          setAccounts(snapshot.accounts)
          setMessage({ type: "error", text: data.error || "Failed to update borrowed loan" })
          toastError(data.error || "Failed to update borrowed loan")
          return
        }
        await fetchBorrowedLoans()
        await fetchAccounts()
      } catch {
        setBorrowedLoans(snapshot.borrowedLoans)
        setAccounts(snapshot.accounts)
        setMessage({ type: "error", text: "An error occurred" })
        toastError("An error occurred")
      } finally {
        setRepaySubmitting(false)
      }
    })()

    return true
  }

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  const loading =
    loadingAccounts || loadingLoans || loadingBorrowedLoans

  return {
    accounts,
    loans,
    borrowedLoans,
    loadingAccounts,
    loadingLoans,
    loadingBorrowedLoans,
    loading,
    message,
    setMessage,
    lentFormError,
    setLentFormError,
    borrowedFormError,
    setBorrowedFormError,
    fieldErrors,
    clearFieldError,
    clearFieldErrors,
    accountId,
    setAccountId,
    amount,
    setAmount,
    borrowerName,
    setBorrowerName,
    description,
    setDescription,
    date,
    setDate,
    dueDate,
    setDueDate,
    submitting,
    borrowedAccountId,
    setBorrowedAccountId,
    borrowedAmount,
    setBorrowedAmount,
    lenderName,
    setLenderName,
    borrowedDescription,
    setBorrowedDescription,
    borrowedDate,
    setBorrowedDate,
    borrowedDueDate,
    setBorrowedDueDate,
    borrowedSubmitting,
    repaySubmitting,
    fetchAccounts,
    fetchLoans,
    fetchBorrowedLoans,
    handleSubmit,
    handleMarkRepaid,
    handleSubmitBorrowed,
    handleMarkBorrowedRepaid,
    formatCurrency,
    formatDate,
  }
}
