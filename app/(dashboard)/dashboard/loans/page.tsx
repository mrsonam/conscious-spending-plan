"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingDown, TrendingUp, Calendar, HandCoins } from "lucide-react"
import { ExpensesSkeleton } from "@/components/skeletons/expenses-skeleton"
import { ExpensesListSkeleton } from "@/components/skeletons/expenses-sections"

interface Account {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  isDefault: boolean
}

interface Loan {
  id: string
  accountId: string
  amount: number
  description: string | null
  borrowerName: string | null
  date: string
  dueDate: string | null
  status: "active" | "repaid" | "defaulted" | string
  repaidAmount: number
  createdAt: string
  updatedAt: string
  account: {
    id: string
    name: string
    bankName: string
  }
}

interface BorrowedLoan {
  id: string
  accountId: string
  amount: number
  description: string | null
  lenderName: string | null
  date: string
  dueDate: string | null
  status: "active" | "repaid" | "defaulted" | string
  repaidAmount: number
  createdAt: string
  updatedAt: string
  account: {
    id: string
    name: string
    bankName: string
  }
}

export default function LoansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [borrowedLoans, setBorrowedLoans] = useState<BorrowedLoan[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingLoans, setLoadingLoans] = useState(true)
  const [loadingBorrowedLoans, setLoadingBorrowedLoans] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddBorrowedForm, setShowAddBorrowedForm] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form state
  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [borrowerName, setBorrowerName] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  // Borrowed loan form state
  const [borrowedAccountId, setBorrowedAccountId] = useState("")
  const [borrowedAmount, setBorrowedAmount] = useState("")
  const [lenderName, setLenderName] = useState("")
  const [borrowedDescription, setBorrowedDescription] = useState("")
  const [borrowedDate, setBorrowedDate] = useState(new Date().toISOString().split("T")[0])
  const [borrowedDueDate, setBorrowedDueDate] = useState<string>("")
  const [borrowedSubmitting, setBorrowedSubmitting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchAccounts()
      fetchLoans()
      fetchBorrowedLoans()
    }
  }, [status, router])

  const fetchAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        if (data.accounts && data.accounts.length > 0) {
          const defaultAccount = data.accounts.find((acc: Account) => acc.isDefault)
          setAccountId(defaultAccount?.id || data.accounts[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const fetchLoans = async () => {
    setLoadingLoans(true)
    try {
      const response = await fetch("/api/loans")
      if (response.ok) {
        const data = await response.json()
        setLoans(data.loans || [])
      }
    } catch (error) {
      console.error("Error fetching loans:", error)
    } finally {
      setLoadingLoans(false)
    }
  }

  const fetchBorrowedLoans = async () => {
    setLoadingBorrowedLoans(true)
    try {
      const response = await fetch("/api/borrowed-loans")
      if (response.ok) {
        const data = await response.json()
        setBorrowedLoans(data.borrowedLoans || [])
      }
    } catch (error) {
      console.error("Error fetching borrowed loans:", error)
    } finally {
      setLoadingBorrowedLoans(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!accountId || !amount) {
      setMessage({ type: "error", text: "Please fill in all required fields" })
      return
    }

    const amountNum = parseFloat(amount)
    if (amountNum <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than 0" })
      return
    }

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

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Loan recorded successfully. Amount deducted from account but not counted as spending.",
        })
        setAmount("")
        setBorrowerName("")
        setDescription("")
        setDueDate("")
        setShowAddForm(false)
        fetchLoans()
        fetchAccounts() // refresh balances
      } else {
        setMessage({ type: "error", text: data.error || "Failed to record loan" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkRepaid = async (loanId: string) => {
    setMessage(null)
    try {
      const response = await fetch("/api/loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Loan marked as repaid. Amount added back to account.",
        })
        fetchLoans()
        fetchAccounts()
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update loan" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" })
    }
  }

  const handleSubmitBorrowed = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!borrowedAccountId || !borrowedAmount) {
      setMessage({ type: "error", text: "Please fill in all required fields" })
      return
    }

    const amountNum = parseFloat(borrowedAmount)
    if (amountNum <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than 0" })
      return
    }

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

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Borrowed money recorded successfully. Amount added to the selected account but not counted as income.",
        })
        setBorrowedAmount("")
        setLenderName("")
        setBorrowedDescription("")
        setBorrowedDueDate("")
        setShowAddBorrowedForm(false)
        fetchBorrowedLoans()
        fetchAccounts() // refresh balances
      } else {
        setMessage({ type: "error", text: data.error || "Failed to record borrowed money" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setBorrowedSubmitting(false)
    }
  }

  const handleMarkBorrowedRepaid = async (borrowedLoanId: string) => {
    setMessage(null)
    try {
      const response = await fetch("/api/borrowed-loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrowedLoanId }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Borrowed loan marked as repaid. Amount deducted from the account.",
        })
        fetchBorrowedLoans()
        fetchAccounts()
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update borrowed loan" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (status === "loading" || loadingAccounts) {
    return (
      <>
        <Header title="Loans" />
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <ExpensesSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  const activeLoans = loans.filter((loan) => loan.status === "active")
  const repaidLoans = loans.filter((loan) => loan.status === "repaid")
  const activeBorrowedLoans = borrowedLoans.filter((loan) => loan.status === "active")
  const repaidBorrowedLoans = borrowedLoans.filter((loan) => loan.status === "repaid")

  return (
    <>
      <Header title="Loans" />
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

        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HandCoins className="h-6 w-6 text-indigo-600" />
              Loans & Borrowing
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Track money you lent to others and money you borrowed. Both types of loans adjust account balances but are
              kept separate from your spending and income categories.
            </p>
          </div>
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setMessage(null)
            }}
          >
            {showAddForm ? "Cancel" : "Add Loan"}
          </Button>
        </div>

        {/* Add Loan Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Record New Loan</CardTitle>
              <CardDescription>Deduct amount from an account without counting it as spending</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="account">Account *</Label>
                    <select
                      id="account"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="mt-1 w-full px-4 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.bankName}) - {formatCurrency(account.balance)}
                        </option>
                      ))}
                    </select>
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
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Expected Return Date (Optional)</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1"
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

        {/* Loans Lists */}
        {loadingLoans ? (
          <ExpensesListSkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Active Loans (Lent Out) */}
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
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No active loans recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeLoans.map((loan) => {
                      const outstanding = loan.amount - loan.repaidAmount
                      return (
                        <div
                          key={loan.id}
                          className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 shadow-sm"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">
                                  {formatCurrency(outstanding)}{" "}
                                  <span className="text-xs text-gray-500">(outstanding)</span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {loan.borrowerName || "Unknown borrower"}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  From {loan.account.name} ({loan.account.bankName})
                                </div>
                                {loan.description && (
                                  <div className="text-xs text-gray-500 mt-1">{loan.description}</div>
                                )}
                                <div className="flex gap-2 mt-1 flex-wrap text-xs text-gray-500">
                                  <span>Loaned: {formatDate(loan.date)}</span>
                                  {loan.dueDate && <span>• Due: {formatDate(loan.dueDate)}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkRepaid(loan.id)}
                            className="ml-4"
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Mark Repaid
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Repaid Loans (Lent Out) */}
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
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No repaid loans recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {repaidLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-100"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(loan.amount)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {loan.borrowerName || "Unknown borrower"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            From {loan.account.name} ({loan.account.bankName})
                          </div>
                          <div className="flex gap-2 mt-1 flex-wrap text-xs text-gray-500">
                            <span>Loaned: {formatDate(loan.date)}</span>
                            {loan.dueDate && <span>• Due: {formatDate(loan.dueDate)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Borrowed Money Section */}
        {loadingBorrowedLoans ? (
          <ExpensesListSkeleton />
        ) : (
          <>
            <div className="flex justify-between items-center mt-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Money You Borrowed</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Track money you borrowed from others. These amounts increase your account balance but are not treated
                  as income.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddBorrowedForm(!showAddBorrowedForm)
                  setMessage(null)
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
                  <form onSubmit={handleSubmitBorrowed} className="space-y-4">
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="borrowedAccount">Account *</Label>
                        <select
                          id="borrowedAccount"
                          value={borrowedAccountId || accountId}
                          onChange={(e) => setBorrowedAccountId(e.target.value)}
                          required
                          className="mt-1 w-full px-4 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        >
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name} ({account.bankName}) - {formatCurrency(account.balance)}
                            </option>
                          ))}
                        </select>
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
                        <Input
                          id="borrowedDate"
                          type="date"
                          value={borrowedDate}
                          onChange={(e) => setBorrowedDate(e.target.value)}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="borrowedDueDate">Expected Repayment Date (Optional)</Label>
                        <Input
                          id="borrowedDueDate"
                          type="date"
                          value={borrowedDueDate}
                          onChange={(e) => setBorrowedDueDate(e.target.value)}
                          className="mt-1"
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

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              {/* Active Borrowed Loans */}
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
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">You have no active borrowed loans recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeBorrowedLoans.map((loan) => {
                        const outstanding = loan.amount - loan.repaidAmount
                        return (
                          <div
                            key={loan.id}
                            className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 shadow-sm"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900">
                                    {formatCurrency(outstanding)}{" "}
                                    <span className="text-xs text-gray-500">(outstanding)</span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {loan.lenderName || "Unknown lender"}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    In {loan.account.name} ({loan.account.bankName})
                                  </div>
                                  {loan.description && (
                                    <div className="text-xs text-gray-500 mt-1">{loan.description}</div>
                                  )}
                                  <div className="flex gap-2 mt-1 flex-wrap text-xs text-gray-500">
                                    <span>Borrowed: {formatDate(loan.date)}</span>
                                    {loan.dueDate && <span>• Due: {formatDate(loan.dueDate)}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkBorrowedRepaid(loan.id)}
                              className="ml-4"
                            >
                              <TrendingDown className="h-4 w-4 mr-1" />
                              Mark Repaid
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Repaid Borrowed Loans */}
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
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">No repaid borrowed loans recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {repaidBorrowedLoans.map((loan) => (
                        <div
                          key={loan.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-100"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(loan.amount)}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {loan.lenderName || "Unknown lender"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              In {loan.account.name} ({loan.account.bankName})
                            </div>
                            <div className="flex gap-2 mt-1 flex-wrap text-xs text-gray-500">
                              <span>Borrowed: {formatDate(loan.date)}</span>
                              {loan.dueDate && <span>• Due: {formatDate(loan.dueDate)}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  )
}

