"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { parseMoneyInput } from "@/lib/money-input"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
  requirePositiveNumber,
  requireSelection,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"

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
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [borrowedAccountId, setBorrowedAccountId] = useState("")
  const [borrowedAmount, setBorrowedAmount] = useState("")
  const [lenderName, setLenderName] = useState("")
  const [borrowedDescription, setBorrowedDescription] = useState("")
  const [borrowedDate, setBorrowedDate] = useState(new Date().toISOString().split("T")[0])
  const [borrowedDueDate, setBorrowedDueDate] = useState("")
  const [borrowedSubmitting, setBorrowedSubmitting] = useState(false)
  const [repaySubmitting, setRepaySubmitting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = (await response.json()) as { accounts?: LoansPageAccount[] }
        const list = data.accounts || []
        setAccounts(list)
        if (list.length > 0) {
          const def = list.find((a) => a.isDefault)
          setAccountId((prev) => prev || def?.id || list[0].id)
          setBorrowedAccountId((prev) => prev || def?.id || list[0].id)
        }
      }
    } catch {
      console.error("Error fetching accounts")
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const fetchLoans = useCallback(async () => {
    setLoadingLoans(true)
    try {
      const response = await fetch("/api/loans")
      if (response.ok) {
        const data = (await response.json()) as { loans?: LoanRow[] }
        setLoans(data.loans || [])
      }
    } catch {
      console.error("Error fetching loans")
    } finally {
      setLoadingLoans(false)
    }
  }, [])

  const fetchBorrowedLoans = useCallback(async () => {
    setLoadingBorrowedLoans(true)
    try {
      const response = await fetch("/api/borrowed-loans")
      if (response.ok) {
        const data = (await response.json()) as { borrowedLoans?: BorrowedLoanRow[] }
        setBorrowedLoans(data.borrowedLoans || [])
      }
    } catch {
      console.error("Error fetching borrowed loans")
    } finally {
      setLoadingBorrowedLoans(false)
    }
  }, [])

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

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Loan recorded successfully. Amount deducted from account (not counted as spending).",
        })
        setAmount("")
        setBorrowerName("")
        setDescription("")
        setDueDate("")
        await fetchLoans()
        await fetchAccounts()
        return true
      }
      setMessage({ type: "error", text: data.error || "Failed to record loan" })
      return false
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkRepaid = async (loanId: string, toAccountId: string): Promise<boolean> => {
    setMessage(null)
    setRepaySubmitting(true)
    try {
      const response = await fetch("/api/loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, toAccountId }),
      })

      const data = (await response.json()) as { error?: string }

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Loan marked as repaid. Amount credited to the selected account.",
        })
        await fetchLoans()
        await fetchAccounts()
        return true
      }
      setMessage({ type: "error", text: data.error || "Failed to update loan" })
      return false
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
      return false
    } finally {
      setRepaySubmitting(false)
    }
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

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Borrowing recorded. Balance updated (not counted as income).",
        })
        setBorrowedAmount("")
        setLenderName("")
        setBorrowedDescription("")
        setBorrowedDueDate("")
        await fetchBorrowedLoans()
        await fetchAccounts()
        return true
      }
      setBorrowedFormError(data.error || "Failed to record borrowed money")
      return false
    } catch {
      setBorrowedFormError("An error occurred")
      return false
    } finally {
      setBorrowedSubmitting(false)
    }
  }

  const handleMarkBorrowedRepaid = async (
    borrowedLoanId: string,
    fromAccountId: string,
  ): Promise<boolean> => {
    setMessage(null)
    setRepaySubmitting(true)
    try {
      const response = await fetch("/api/borrowed-loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrowedLoanId, fromAccountId }),
      })

      const data = (await response.json()) as { error?: string }

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Marked repaid. Amount deducted from the selected account.",
        })
        await fetchBorrowedLoans()
        await fetchAccounts()
        return true
      }
      setMessage({ type: "error", text: data.error || "Failed to update borrowed loan" })
      return false
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
      return false
    } finally {
      setRepaySubmitting(false)
    }
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
