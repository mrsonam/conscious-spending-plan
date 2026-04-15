"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { AppSelect } from "@/components/ui/app-select"
import { TrendingDown, TrendingUp, HandCoins } from "lucide-react"
import { ExpensesSkeleton } from "@/components/skeletons/expenses-skeleton"
import { useLoansPage } from "@/hooks/use-loans-page"
import { BENTO } from "@/lib/app-routes"

export default function LoansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddBorrowedForm, setShowAddBorrowedForm] = useState(false)

  const {
    accounts,
    loans,
    borrowedLoans,
    loading,
    message,
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
    handleSubmit,
    handleMarkRepaid,
    handleSubmitBorrowed,
    handleMarkBorrowedRepaid,
    formatCurrency,
    formatDate,
  } = useLoansPage(status)

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    if ((session.user.dashboardTheme ?? "classic") === "console") {
      router.replace(BENTO.loans)
    }
  }, [status, session?.user, router])

  const activeLoans = loans.filter((loan) => loan.status === "active")
  const repaidLoans = loans.filter((loan) => loan.status === "repaid")
  const activeBorrowedLoans = borrowedLoans.filter((loan) => loan.status === "active")
  const repaidBorrowedLoans = borrowedLoans.filter((loan) => loan.status === "repaid")

  if (status === "loading" || loading) {
    return (
      <>
        <Header title="Loans" />
        <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
          <ExpensesSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header title="Loans" />
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

        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <HandCoins className="h-6 w-6 text-indigo-600" />
              Loans & Borrowing
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Track money you lent to others and money you borrowed. Both types adjust account balances but are kept
              separate from spending and income categories.
            </p>
          </div>
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm)
            }}
          >
            {showAddForm ? "Cancel" : "Add Loan"}
          </Button>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Record New Loan</CardTitle>
              <CardDescription>Deduct amount from an account without counting it as spending</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  const ok = await handleSubmit(e)
                  if (ok) setShowAddForm(false)
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="account">Account *</Label>
                    <AppSelect
                      id="account"
                      value={accountId}
                      onValueChange={setAccountId}
                      required
                      variant="classic"
                      className="mt-1 rounded-lg"
                      options={accounts.map((account) => ({
                        value: account.id,
                        label: `${account.name} (${account.bankName}) - ${formatCurrency(account.balance)}`,
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount ($) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="borrowerName">Borrower (who you lent to)</Label>
                    <Input
                      id="borrowerName"
                      type="text"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      placeholder="Name or description"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <DateInput
                      id="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="mt-1 scheme-light dark:scheme-dark"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Expected Return Date (Optional)</Label>
                    <DateInput
                      id="dueDate"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 scheme-light dark:scheme-dark"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the loan"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Saving..." : "Save Loan"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-amber-600" />
                  Active Loans (Lent Out)
                </CardTitle>
                <CardDescription>Money you have lent to others and not yet received back</CardDescription>
              </CardHeader>
              <CardContent>
                {activeLoans.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-500">No active loans recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeLoans.map((loan) => {
                      const outstanding = loan.amount - loan.repaidAmount
                      return (
                        <div
                          key={loan.id}
                          className="flex items-center justify-between rounded-lg p-4 shadow-sm hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(outstanding)}{" "}
                              <span className="text-xs text-gray-500">(outstanding)</span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {loan.borrowerName || "Unknown borrower"}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              From {loan.account.name} ({loan.account.bankName})
                            </div>
                            {loan.description && <div className="mt-1 text-xs text-gray-500">{loan.description}</div>}
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                              <span>Loaned: {formatDate(loan.date)}</span>
                              {loan.dueDate && <span>• Due: {formatDate(loan.dueDate)}</span>}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => void handleMarkRepaid(loan.id)} className="ml-4">
                            <TrendingUp className="mr-1 h-4 w-4" />
                            Mark Repaid
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Repaid Loans (Lent Out)
                </CardTitle>
                <CardDescription>Loans you gave that have been fully repaid</CardDescription>
              </CardHeader>
              <CardContent>
                {repaidLoans.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-500">No repaid loans recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {repaidLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className="rounded-lg border border-green-100 bg-green-50 p-4"
                      >
                        <div className="font-semibold text-gray-900">{formatCurrency(loan.amount)}</div>
                        <div className="mt-1 text-sm text-gray-600">{loan.borrowerName || "Unknown borrower"}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          From {loan.account.name} ({loan.account.bankName})
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>Loaned: {formatDate(loan.date)}</span>
                          {loan.dueDate && <span>• Due: {formatDate(loan.dueDate)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Money You Borrowed</h3>
            <p className="mt-1 text-sm text-gray-500">
              Track money you borrowed. Amounts increase your account balance but are not treated as income.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowAddBorrowedForm(!showAddBorrowedForm)
            }}
          >
            {showAddBorrowedForm ? "Cancel" : "Add Borrowed Money"}
          </Button>
        </div>

        {showAddBorrowedForm && (
          <Card>
            <CardHeader>
              <CardTitle>Record Borrowed Money</CardTitle>
              <CardDescription>Add borrowed amount to one of your accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  const ok = await handleSubmitBorrowed(e)
                  if (ok) setShowAddBorrowedForm(false)
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="borrowedAccount">Account *</Label>
                    <AppSelect
                      id="borrowedAccount"
                      value={borrowedAccountId || accountId}
                      onValueChange={setBorrowedAccountId}
                      required
                      variant="classic"
                      className="mt-1 rounded-lg"
                      options={accounts.map((account) => ({
                        value: account.id,
                        label: `${account.name} (${account.bankName}) - ${formatCurrency(account.balance)}`,
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="borrowedAmount">Amount ($) *</Label>
                    <Input
                      id="borrowedAmount"
                      type="number"
                      value={borrowedAmount}
                      onChange={(e) => setBorrowedAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lenderName">Lender (who you borrowed from)</Label>
                    <Input
                      id="lenderName"
                      type="text"
                      value={lenderName}
                      onChange={(e) => setLenderName(e.target.value)}
                      placeholder="Name or description"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="borrowedDate">Date *</Label>
                    <DateInput
                      id="borrowedDate"
                      value={borrowedDate}
                      onChange={(e) => setBorrowedDate(e.target.value)}
                      required
                      className="mt-1 scheme-light dark:scheme-dark"
                    />
                  </div>
                  <div>
                    <Label htmlFor="borrowedDueDate">Expected Repayment Date (Optional)</Label>
                    <DateInput
                      id="borrowedDueDate"
                      value={borrowedDueDate}
                      onChange={(e) => setBorrowedDueDate(e.target.value)}
                      className="mt-1 scheme-light dark:scheme-dark"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="borrowedDescription">Description (Optional)</Label>
                  <Input
                    id="borrowedDescription"
                    type="text"
                    value={borrowedDescription}
                    onChange={(e) => setBorrowedDescription(e.target.value)}
                    placeholder="Brief description of the borrowed money"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={borrowedSubmitting} className="w-full">
                  {borrowedSubmitting ? "Saving..." : "Save Borrowed Money"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                Active Borrowed Loans
              </CardTitle>
              <CardDescription>Money you still owe to others</CardDescription>
            </CardHeader>
            <CardContent>
              {activeBorrowedLoans.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">You have no active borrowed loans recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeBorrowedLoans.map((loan) => {
                    const outstanding = loan.amount - loan.repaidAmount
                    return (
                      <div
                        key={loan.id}
                        className="flex items-center justify-between rounded-lg p-4 shadow-sm hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(outstanding)}{" "}
                            <span className="text-xs text-gray-500">(outstanding)</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">{loan.lenderName || "Unknown lender"}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            In {loan.account.name} ({loan.account.bankName})
                          </div>
                          {loan.description && <div className="mt-1 text-xs text-gray-500">{loan.description}</div>}
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span>Borrowed: {formatDate(loan.date)}</span>
                            {loan.dueDate && <span>• Due: {formatDate(loan.dueDate)}</span>}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleMarkBorrowedRepaid(loan.id)}
                          className="ml-4"
                        >
                          <TrendingDown className="mr-1 h-4 w-4" />
                          Mark Repaid
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Repaid Borrowed Loans
              </CardTitle>
              <CardDescription>Borrowed loans that you have fully repaid</CardDescription>
            </CardHeader>
            <CardContent>
              {repaidBorrowedLoans.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">No repaid borrowed loans recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {repaidBorrowedLoans.map((loan) => (
                    <div key={loan.id} className="rounded-lg border border-green-100 bg-green-50 p-4">
                      <div className="font-semibold text-gray-900">{formatCurrency(loan.amount)}</div>
                      <div className="mt-1 text-sm text-gray-600">{loan.lenderName || "Unknown lender"}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        In {loan.account.name} ({loan.account.bankName})
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>Borrowed: {formatDate(loan.date)}</span>
                        {loan.dueDate && <span>• Due: {formatDate(loan.dueDate)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
