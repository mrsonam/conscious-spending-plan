"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

export function useAccountsPage(authStatus: "loading" | "authenticated" | "unauthenticated") {
  const router = useRouter()
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
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

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = (await response.json()) as { accounts?: AccountRow[] }
        setAccounts(data.accounts || [])
      }
    } catch {
      console.error("Error fetching accounts")
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login")
    } else if (authStatus === "authenticated") {
      void fetchAccounts()
      const today = new Date()
      setTransferDate(today.toISOString().split("T")[0])
    }
  }, [authStatus, router, fetchAccounts])

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
    setShowAddForm(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    try {
      const method = editingAccount ? "PUT" : "POST"
      const body = editingAccount
        ? {
            id: editingAccount.id,
            name,
            bankName,
            accountType,
            isDefault,
          }
        : {
            name,
            bankName,
            accountType,
            startingFunds: parseFloat(startingFunds) || 0,
            isDefault,
          }

      const response = await fetch("/api/accounts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setMessage({ type: "success", text: editingAccount ? "Account updated!" : "Account created!" })
        resetForm()
        await fetchAccounts()
      } else {
        const data = (await response.json()) as { error?: string }
        setMessage({ type: "error", text: data.error || "Failed to save account" })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
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
        await fetchAccounts()
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
    setMessage(null)
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
        await fetchAccounts()
      } else {
        const data = (await response.json()) as { error?: string }
        setMessage({ type: "error", text: data.error || "Failed to transfer funds" })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setTransferring(false)
    }
  }

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }, [])

  return {
    accounts,
    loadingAccounts,
    fetchAccounts,
    showAddForm,
    setShowAddForm,
    showTransferForm,
    setShowTransferForm,
    editingAccount,
    message,
    setMessage,
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
    resetForm,
    startEdit,
    handleSubmit,
    handleDelete,
    confirmDeleteAccount,
    handleTransfer,
    formatCurrency,
  }
}
