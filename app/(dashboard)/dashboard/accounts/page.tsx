"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AccountsSkeleton } from "@/components/skeletons/accounts-skeleton"
import { AccountsListSkeleton } from "@/components/skeletons/accounts-sections"
import { Plus, ArrowRightLeft, Trash2, Edit2, Star, Building2 } from "lucide-react"

interface Account {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  startingFunds: number
  isDefault: boolean
}

export default function AccountsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountType, setAccountType] = useState("checking")
  const [startingFunds, setStartingFunds] = useState("")
  const [isDefault, setIsDefault] = useState(false)

  // Transfer form states
  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferDescription, setTransferDescription] = useState("")
  const [transferDate, setTransferDate] = useState("")
  const [transferCategory, setTransferCategory] = useState("")
  const [transferring, setTransferring] = useState(false)

  const FUND_CATEGORIES = [
    { value: "fixedCosts", label: "Fixed Costs" },
    { value: "investment", label: "Investment" },
    { value: "savings", label: "Savings" },
    { value: "guiltFreeSpending", label: "Guilt-Free Spending" },
  ]

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchAccounts()
      // Set default transfer date to today
      const today = new Date()
      setTransferDate(today.toISOString().split("T")[0])
    }
  }, [status, router])

  const fetchAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    try {
      const url = editingAccount ? "/api/accounts" : "/api/accounts"
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

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setMessage({ type: "success", text: editingAccount ? "Account updated!" : "Account created!" })
        resetForm()
        fetchAccounts()
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.error || "Failed to save account" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" })
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
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
        fetchAccounts()
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.error || "Failed to delete account" })
      }
    } catch (error) {
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
        // Reset date to today
        const today = new Date()
        setTransferDate(today.toISOString().split("T")[0])
        fetchAccounts()
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.error || "Failed to transfer funds" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setTransferring(false)
    }
  }

  const resetForm = () => {
    setName("")
    setBankName("")
    setAccountType("checking")
    setStartingFunds("")
    setIsDefault(false)
    setEditingAccount(null)
    setShowAddForm(false)
  }

  const startEdit = (account: Account) => {
    setEditingAccount(account)
    setName(account.name)
    setBankName(account.bankName)
    setAccountType(account.accountType)
    setIsDefault(account.isDefault)
    setShowAddForm(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      checking: "bg-blue-50 text-blue-700 border-blue-200",
      savings: "bg-green-50 text-green-700 border-green-200",
      investment: "bg-purple-50 text-purple-700 border-purple-200",
      credit: "bg-red-50 text-red-700 border-red-200",
      cash: "bg-yellow-50 text-yellow-700 border-yellow-200",
    }
    return colors[type] || "bg-gray-50 text-gray-700 border-gray-200"
  }

  if (status === "loading") {
    return (
      <>
        <Header title="Accounts" />
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <AccountsSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header title="Accounts" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {message && (
          <div
            className={`p-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Accounts</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage your bank accounts and transfers</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                setShowTransferForm(true)
                setShowAddForm(false)
              }}
              disabled={accounts.length < 2}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer
            </Button>
            <Button onClick={() => {
              resetForm()
              setShowAddForm(true)
              setShowTransferForm(false)
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </div>

        {/* Add/Edit Account Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingAccount ? "Edit Account" : "Add New Account"}</CardTitle>
              <CardDescription>
                {editingAccount ? "Update account details" : "Create a new account to track your funds"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Account Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="e.g., Main Checking"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Input
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                      placeholder="e.g., Chase Bank"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="accountType">Account Type *</Label>
                    <select
                      id="accountType"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border-0 bg-gray-50 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="investment">Investment</option>
                      <option value="credit">Credit Card</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  {!editingAccount && (
                    <div>
                      <Label htmlFor="startingFunds">Starting Balance</Label>
                      <Input
                        id="startingFunds"
                        type="number"
                        value={startingFunds}
                        onChange={(e) => setStartingFunds(e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <Label htmlFor="isDefault" className="cursor-pointer">
                    Set as default account (income will be deposited here)
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingAccount ? "Update Account" : "Create Account"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Transfer Form */}
        {showTransferForm && (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Funds</CardTitle>
              <CardDescription>Move money between your accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <Label htmlFor="fromAccount">From Account *</Label>
                  <select
                    id="fromAccount"
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="toAccount">To Account *</Label>
                  <select
                    id="toAccount"
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter((acc) => acc.id !== fromAccountId)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.balance)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="transferDate">Transfer Date *</Label>
                  <Input
                    id="transferDate"
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="transferAmount">Amount *</Label>
                  <Input
                    id="transferAmount"
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="transferCategory">Fund Category (Optional)</Label>
                  <select
                    id="transferCategory"
                    value={transferCategory}
                    onChange={(e) => setTransferCategory(e.target.value)}
                    className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">No category</option>
                    {FUND_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Link this transfer to a fund category to track it in category tracking
                  </p>
                </div>

                <div>
                  <Label htmlFor="transferDescription">Description (Optional)</Label>
                  <Input
                    id="transferDescription"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                    placeholder="e.g., Monthly savings transfer"
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={transferring}>
                    {transferring ? "Transferring..." : "Transfer Funds"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTransferForm(false)
                      setFromAccountId("")
                      setToAccountId("")
                      setTransferAmount("")
                      setTransferDescription("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Accounts List */}
        {loadingAccounts ? (
          <AccountsListSkeleton />
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No accounts yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create your first account to start tracking your funds
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    resetForm()
                    setShowAddForm(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className={account.isDefault ? "ring-2 ring-indigo-500" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {account.name}
                        {account.isDefault && (
                          <Star className="h-4 w-4 text-indigo-600 fill-indigo-600" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {account.bankName}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(account)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(account.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Account Type</div>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getAccountTypeColor(
                          account.accountType
                        )}`}
                      >
                        {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Current Balance</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(account.balance)}
                      </div>
                    </div>
                    {account.isDefault && (
                      <div className="text-xs text-indigo-600 font-medium">
                        Default account for income deposits
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Account"
          description="Are you sure you want to delete this account? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteAccount}
          variant="destructive"
        />
      </div>
    </>
  )
}
