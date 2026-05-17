"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  invalidateCategoryTrackingAndDashboardCaches,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireDifferent,
  requireField,
  requirePositiveNumber,
  requireSelection,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"

export type AccountFormFieldKey =
  | "name"
  | "bankName"
  | "accountType"
  | "startingFunds"
  | "fromAccountId"
  | "toAccountId"
  | "transferAmount"
  | "transferDate"

export interface AccountRow {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  startingFunds: number
  isDefault: boolean
}

export const ACCOUNT_FUND_CATEGORIES = [
  { value: "fixedCosts", label: "Fixed Costs" },
  { value: "investment", label: "Investment" },
  { value: "savings", label: "Savings" },
  { value: "guiltFreeSpending", label: "Guilt-Free Spending" },
] as const

/** Same key as dashboard core load — shared cache when navigating between pages. */
export const ACCOUNTS_LIST_CACHE_KEY = "dashboard:accounts"

export function useAccountsPage(authStatus: "loading" | "authenticated" | "unauthenticated") {
  const { formatCurrency } = useFormatCurrency()
  const router = useRouter()
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [accountFormError, setAccountFormError] = useState<string | null>(null)
  const [transferFormError, setTransferFormError] = useState<string | null>(null)
  const {
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFieldErrors,
  } = useFormFieldErrors<AccountFormFieldKey>()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountType, setAccountType] = useState("checking")
  const [startingFunds, setStartingFunds] = useState("")
  const [isDefault, setIsDefault] = useState(false)

  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferDescription, setTransferDescription] = useState("")
  const [transferDate, setTransferDate] = useState("")
  const [transferCategory, setTransferCategory] = useState("")
  const [transferring, setTransferring] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)

  const refetchAccounts = useCallback(async () => {
    const t = Date.now()
    try {
      const data = await fetchJsonAndCache<{ accounts?: AccountRow[] }>(
        ACCOUNTS_LIST_CACHE_KEY,
        `/api/accounts?t=${t}`,
      )
      setAccounts(data.accounts || [])
    } catch {
      setAccounts([])
    }
  }, [])

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login")
      return
    }
    if (authStatus !== "authenticated") return

    let cancelled = false

    async function load() {
      setLoadingAccounts(true)
      const t = Date.now()
      try {
        const cached = peekCachedJson<{ accounts?: AccountRow[] }>(
          ACCOUNTS_LIST_CACHE_KEY,
          45_000,
        )
        if (cached?.accounts) {
          setAccounts(cached.accounts)
          setLoadingAccounts(false)
        }

        const data = await fetchJsonAndCache<{ accounts?: AccountRow[] }>(
          ACCOUNTS_LIST_CACHE_KEY,
          `/api/accounts?t=${t}`,
        )

        if (cancelled) return

        setAccounts(data.accounts || [])
      } catch (e) {
        console.error("Error fetching accounts", e)
        if (!cancelled) {
          setAccounts([])
        }
      } finally {
        if (!cancelled) {
          setLoadingAccounts(false)
        }
      }
    }

    void load()
    const today = new Date()
    setTransferDate(today.toISOString().split("T")[0])

    return () => {
      cancelled = true
    }
  }, [authStatus, router])

  const resetForm = useCallback(() => {
    setName("")
    setBankName("")
    setAccountType("checking")
    setStartingFunds("")
    setIsDefault(false)
    setEditingAccount(null)
    setShowAddForm(false)
  }, [])

  const startEdit = useCallback((account: AccountRow) => {
    setEditingAccount(account)
    setName(account.name)
    setBankName(account.bankName)
    setAccountType(account.accountType)
    setIsDefault(account.isDefault)
    setStartingFunds(
      Number.isFinite(account.balance) ? String(account.balance) : "0",
    )
    setShowAddForm(true)
  }, [])

  const invalidateAccountsCaches = useCallback(() => {
    invalidateCachedJson(ACCOUNTS_LIST_CACHE_KEY)
    invalidateCategoryTrackingAndDashboardCaches()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAccountFormError(null)

    const accountErrors = buildFieldErrors<AccountFormFieldKey>([
      ["name", requireField(name, "Account name")],
      ["bankName", requireField(bankName, "Institution")],
      ["accountType", requireSelection(accountType, "an account type")],
      [
        "startingFunds",
        editingAccount && startingFunds.trim() === ""
          ? "Current balance is required."
          : editingAccount &&
              startingFunds.trim() !== "" &&
              !Number.isFinite(parseFloat(startingFunds))
            ? "Enter a valid current balance."
            : null,
      ],
    ])
    if (hasFieldErrors(accountErrors)) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.name
        delete next.bankName
        delete next.accountType
        delete next.startingFunds
        return { ...next, ...accountErrors }
      })
      return
    }
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.name
      delete next.bankName
      delete next.accountType
      delete next.startingFunds
      return next
    })

    try {
      const method = editingAccount ? "PUT" : "POST"

      const body = editingAccount
        ? {
            id: editingAccount.id,
            name,
            bankName,
            accountType,
            isDefault,
            balance: parseFloat(startingFunds),
          }
        : {
            name,
            bankName,
            accountType,
            startingFunds: parseFloat(startingFunds) || 0,
            isDefault,
          }

      setSavingAccount(true)
      const response = await fetch("/api/accounts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setMessage({ type: "success", text: editingAccount ? "Account updated!" : "Account created!" })
        resetForm()
        invalidateAccountsCaches()
        await refetchAccounts()
      } else {
        const data = (await response.json()) as { error?: string }
        setAccountFormError(data.error || "Failed to save account")
      }
    } catch {
      setAccountFormError("An error occurred")
    } finally {
      setSavingAccount(false)
    }
  }

  const handleDelete = (id: string) => {
    setAccountToDelete(id)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return

    try {
      const response = await fetch(`/api/accounts?id=${accountToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMessage({ type: "success", text: "Account deleted!" })
        setShowDeleteConfirm(false)
        setAccountToDelete(null)
        invalidateAccountsCaches()
        await refetchAccounts()
      } else {
        const data = (await response.json()) as { error?: string }
        setMessage({ type: "error", text: data.error || "Failed to delete account" })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferFormError(null)

    const fromAccountErr = requireSelection(fromAccountId, "a from account")
    const toAccountErr = requireSelection(toAccountId, "a to account")
    const transferErrors = buildFieldErrors<AccountFormFieldKey>([
      ["fromAccountId", fromAccountErr],
      [
        "toAccountId",
        toAccountErr ||
          (!fromAccountErr && !toAccountErr
            ? requireDifferent(
                fromAccountId,
                toAccountId,
                "From account",
                "To account",
              )
            : null),
      ],
      ["transferAmount", requirePositiveNumber(transferAmount, "Amount")],
      ["transferDate", requireField(transferDate, "Date")],
    ])
    if (hasFieldErrors(transferErrors)) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.fromAccountId
        delete next.toAccountId
        delete next.transferAmount
        delete next.transferDate
        return { ...next, ...transferErrors }
      })
      return
    }
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.fromAccountId
      delete next.toAccountId
      delete next.transferAmount
      delete next.transferDate
      return next
    })

    setTransferring(true)

    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: parseFloat(transferAmount),
          description: transferDescription || null,
          date: transferDate,
          category: transferCategory || null,
        }),
      })

      if (response.ok) {
        setMessage({ type: "success", text: "Transfer completed!" })
        setShowTransferForm(false)
        setFromAccountId("")
        setToAccountId("")
        setTransferAmount("")
        setTransferDescription("")
        setTransferCategory("")
        const today = new Date()
        setTransferDate(today.toISOString().split("T")[0])
        invalidateAccountsCaches()
        await refetchAccounts()
      } else {
        const data = (await response.json()) as { error?: string }
        setTransferFormError(data.error || "Failed to transfer funds")
      }
    } catch {
      setTransferFormError("An error occurred")
    } finally {
      setTransferring(false)
    }
  }

  return {
    accounts,
    loadingAccounts,
    showAddForm,
    setShowAddForm,
    showTransferForm,
    setShowTransferForm,
    editingAccount,
    message,
    setMessage,
    accountFormError,
    setAccountFormError,
    transferFormError,
    setTransferFormError,
    fieldErrors,
    clearFieldError,
    clearFieldErrors,
    showDeleteConfirm,
    setShowDeleteConfirm,
    accountToDelete,
    setAccountToDelete,
    name,
    setName,
    bankName,
    setBankName,
    accountType,
    setAccountType,
    startingFunds,
    setStartingFunds,
    isDefault,
    setIsDefault,
    fromAccountId,
    setFromAccountId,
    toAccountId,
    setToAccountId,
    transferAmount,
    setTransferAmount,
    transferDescription,
    setTransferDescription,
    transferDate,
    setTransferDate,
    transferCategory,
    setTransferCategory,
    transferring,
    savingAccount,
    resetForm,
    startEdit,
    handleSubmit,
    handleDelete,
    confirmDeleteAccount,
    handleTransfer,
    formatCurrency,
  }
}
