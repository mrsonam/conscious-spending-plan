"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { AppSelect } from "@/components/ui/app-select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AccountsSkeleton } from "@/components/skeletons/accounts-skeleton"
import { AccountsListSkeleton } from "@/components/skeletons/accounts-sections"
import { Plus, ArrowRightLeft, Trash2, Edit2, Star, Building2 } from "lucide-react"
import { useAccountsPage, ACCOUNT_FUND_CATEGORIES } from "@/hooks/use-accounts-page"
import { BENTO } from "@/lib/app-routes"

export default function AccountsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const {
    accounts,
    loadingAccounts,
    showAddForm,
    setShowAddForm,
    showTransferForm,
    setShowTransferForm,
    editingAccount,
    message,
    setMessage,
    showDeleteConfirm,
    setShowDeleteConfirm,
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
  } = useAccountsPage(status)

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    if ((session.user.dashboardTheme ?? "classic") === "console") {
      router.replace(BENTO.accounts)
    }
  }, [status, session?.user, router])

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
        <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
          <AccountsSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header title="Accounts" />
      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        {message && (
          <div
            className={`rounded-lg p-3 ${
              message.type === "success"
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Your Accounts</h2>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">Manage your bank accounts and transfers</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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
            <Button
              onClick={() => {
                resetForm()
                setShowAddForm(true)
                setShowTransferForm(false)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingAccount ? "Edit Account" : "Add New Account"}</CardTitle>
              <CardDescription>
                {editingAccount ? "Update account details and current balance" : "Create a new account to track your funds"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} inert={savingAccount}>
              <fieldset disabled={savingAccount} className="space-y-4 border-0 p-0 m-0 min-w-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Account Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={savingAccount}
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
                      disabled={savingAccount}
                      placeholder="e.g., Chase Bank"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="accountType">Account Type *</Label>
                    <AppSelect
                      id="accountType"
                      value={accountType}
                      onValueChange={setAccountType}
                      disabled={savingAccount}
                      required
                      variant="classic"
                      className="mt-1"
                      options={[
                        { value: "checking", label: "Checking" },
                        { value: "savings", label: "Savings" },
                        { value: "investment", label: "Investment" },
                        { value: "credit", label: "Credit Card" },
                        { value: "cash", label: "Cash" },
                      ]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="startingFunds">
                      {editingAccount ? "Current balance" : "Starting balance"}
                    </Label>
                    <Input
                      id="startingFunds"
                      type="number"
                      value={startingFunds}
                      onChange={(e) => setStartingFunds(e.target.value)}
                      min={editingAccount ? undefined : "0"}
                      step="0.01"
                      disabled={savingAccount}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    disabled={savingAccount}
                    className="h-4 w-4 text-indigo-600"
                  />
                  <Label htmlFor="isDefault" className="cursor-pointer">
                    Set as default account (income will be deposited here)
                  </Label>
                </div>
              </fieldset>

                <div className="mt-4 flex gap-2">
                  <Button type="submit" loading={savingAccount}>
                    {editingAccount ? "Update Account" : "Create Account"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} disabled={savingAccount}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {showTransferForm && (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Funds</CardTitle>
              <CardDescription>Move money between your accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransfer} className="space-y-4" inert={transferring}>
                <fieldset disabled={transferring} className="space-y-4 border-0 p-0 m-0 min-w-0">
                <div>
                  <Label htmlFor="fromAccount">From Account *</Label>
                  <AppSelect
                    id="fromAccount"
                    value={fromAccountId}
                    onValueChange={setFromAccountId}
                    disabled={transferring}
                    required
                    variant="classic"
                    className="mt-1 rounded-md border border-gray-300"
                    placeholder="Select account"
                    options={[
                      { value: "", label: "Select account" },
                      ...accounts.map((acc) => ({
                        value: acc.id,
                        label: `${acc.name} (${formatCurrency(acc.balance)})`,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <Label htmlFor="toAccount">To Account *</Label>
                  <AppSelect
                    id="toAccount"
                    value={toAccountId}
                    onValueChange={setToAccountId}
                    disabled={transferring}
                    required
                    variant="classic"
                    className="mt-1 rounded-md border border-gray-300"
                    placeholder="Select account"
                    options={[
                      { value: "", label: "Select account" },
                      ...accounts
                        .filter((acc) => acc.id !== fromAccountId)
                        .map((acc) => ({
                          value: acc.id,
                          label: `${acc.name} (${formatCurrency(acc.balance)})`,
                        })),
                    ]}
                  />
                </div>

                <div>
                  <Label htmlFor="transferDate">Transfer Date *</Label>
                  <DateInput
                    id="transferDate"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    disabled={transferring}
                    className="mt-1 scheme-light dark:scheme-dark"
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
                    disabled={transferring}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="transferCategory">Fund Category (Optional)</Label>
                  <AppSelect
                    id="transferCategory"
                    value={transferCategory}
                    onValueChange={setTransferCategory}
                    disabled={transferring}
                    variant="classic"
                    className="mt-1 rounded-lg border border-gray-300"
                    placeholder="No category"
                    options={[
                      { value: "", label: "No category" },
                      ...ACCOUNT_FUND_CATEGORIES.map((cat) => ({
                        value: cat.value,
                        label: cat.label,
                      })),
                    ]}
                  />
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
                    disabled={transferring}
                    placeholder="e.g., Monthly savings transfer"
                    className="mt-1"
                  />
                </div>
                </fieldset>

                <div className="flex gap-2">
                  <Button type="submit" loading={transferring}>
                    Transfer Funds
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={transferring}
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

        {loadingAccounts ? (
          <AccountsListSkeleton />
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="py-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No accounts yet</h3>
                <p className="mt-2 text-sm text-gray-500">Create your first account to start tracking your funds</p>
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
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {account.name}
                        {account.isDefault && <Star className="h-4 w-4 fill-indigo-600 text-indigo-600" />}
                      </CardTitle>
                      <CardDescription className="mt-1">{account.bankName}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(account)} className="h-8 w-8">
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
                      <div className="mb-1 text-xs text-gray-500">Account Type</div>
                      <span
                        className={`inline-block rounded border px-2 py-1 text-xs font-medium ${getAccountTypeColor(
                          account.accountType,
                        )}`}
                      >
                        {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-gray-500">Current Balance</div>
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(account.balance)}</div>
                    </div>
                    {account.isDefault && (
                      <div className="text-xs font-medium text-indigo-600">Default account for income deposits</div>
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
