"use client"

import { useEffect, useState } from "react"
import { InvestmentsSkeleton } from "@/components/skeletons/investments-skeleton"
import { InvestmentFormSkeleton, InvestmentSummarySkeleton, InvestmentChartsSkeleton, InvestmentAccountsSkeleton } from "@/components/skeletons/investments-sections"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, Wallet, DollarSign, PieChart as PieChartIcon, BarChart3 } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from "recharts"
import { cn } from "@/lib/utils"

interface Account {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
}

interface InvestmentHolding {
  id: string
  name: string
  amount: number
  pricePerUnit: number | null
  numberOfShares: number | null
  date: string
}

interface InvestmentAccountSummary {
  id: string
  name: string
  bankName: string
  balance: number
  investedAmount: number
  totalValue: number
  holdings: InvestmentHolding[]
}

export default function InvestmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [investmentAccounts, setInvestmentAccounts] = useState<InvestmentAccountSummary[]>([])
  const [loadingForm, setLoadingForm] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingCharts, setLoadingCharts] = useState(true)
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  const [selectedInvestmentAccountId, setSelectedInvestmentAccountId] = useState("")
  const [investmentName, setInvestmentName] = useState("")
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [numberOfShares, setNumberOfShares] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchData()
      const today = new Date()
      setDate(today.toISOString().split("T")[0])
    }
  }, [status, router])

  const fetchData = async () => {
    setLoadingForm(true)
    setLoadingSummary(true)
    setLoadingCharts(true)
    setLoadingAccounts(true)
    
    try {
      const investmentsRes = await fetch("/api/investments")

      if (investmentsRes.ok) {
        const data = await investmentsRes.json()
        setInvestmentAccounts(data.accounts || [])
        // All sections can show once we have investment accounts data
        setLoadingForm(false)
        setLoadingSummary(false)
        setLoadingCharts(false)
        setLoadingAccounts(false)
      } else {
        setLoadingForm(false)
        setLoadingSummary(false)
        setLoadingCharts(false)
        setLoadingAccounts(false)
      }
    } catch (error) {
      console.error("Error fetching investments data:", error)
      setLoadingForm(false)
      setLoadingSummary(false)
      setLoadingCharts(false)
      setLoadingAccounts(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount || 0)

  // Calculate summary statistics
  const totalInvested = investmentAccounts.reduce((sum, acc) => sum + acc.investedAmount, 0)
  const totalRemaining = investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalValue = investmentAccounts.reduce((sum, acc) => sum + acc.totalValue, 0)

  // Prepare chart data
  const accountDistributionData = investmentAccounts.map((acc) => ({
    name: acc.name,
    value: acc.totalValue,
    invested: acc.investedAmount,
    remaining: acc.balance,
  }))

  // Prepare holdings data for bar chart
  const allHoldings = investmentAccounts.flatMap((acc) =>
    acc.holdings.map((h) => ({
      name: h.name,
      amount: h.amount,
      account: acc.name,
      date: h.date,
      pricePerUnit: h.pricePerUnit || 0,
      numberOfShares: h.numberOfShares || 0,
    }))
  )

  // Group holdings by share name for allocation chart
  const shareAllocation: Record<string, number> = {}
  allHoldings.forEach((h) => {
    shareAllocation[h.name] = (shareAllocation[h.name] || 0) + h.amount
  })

  const shareAllocationData = Object.entries(shareAllocation)
    .map(([name, amount]) => ({
      name: name.length > 15 ? name.substring(0, 15) + "..." : name,
      fullName: name,
      value: amount,
    }))
    .sort((a, b) => b.value - a.value)

  // Group holdings by month for trend chart
  const holdingsByMonth: Record<string, number> = {}
  allHoldings.forEach((h) => {
    const date = new Date(h.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    holdingsByMonth[monthKey] = (holdingsByMonth[monthKey] || 0) + h.amount
  })

  const trendData = Object.entries(holdingsByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6) // Last 6 months
    .map(([month, amount]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      amount,
    }))

  // Top holdings for bar chart
  const topHoldings = [...allHoldings]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map((h) => ({
      name: h.name.length > 15 ? h.name.substring(0, 15) + "..." : h.name,
      amount: h.amount,
    }))

  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!selectedInvestmentAccountId) {
      setMessage({
        type: "error",
        text: "Please select an investment account",
      })
      return
    }

    if (!investmentName) {
      setMessage({
        type: "error",
        text: "Please enter the investment name (e.g., share or fund)",
      })
      return
    }

    const numPricePerUnit = parseFloat(pricePerUnit)
    const numNumberOfShares = parseFloat(numberOfShares)
    
    if (!numPricePerUnit || numPricePerUnit <= 0) {
      setMessage({ type: "error", text: "Please enter a valid price per unit" })
      return
    }

    if (!numNumberOfShares || numNumberOfShares <= 0) {
      setMessage({ type: "error", text: "Please enter a valid number of shares" })
      return
    }

    // Calculate total amount
    const numericAmount = numPricePerUnit * numNumberOfShares

    if (!date) {
      setMessage({ type: "error", text: "Please select a date for this investment" })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investmentAccountId: selectedInvestmentAccountId,
          amount: numericAmount,
          investmentName,
          pricePerUnit: numPricePerUnit,
          numberOfShares: numNumberOfShares,
          date,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Failed to create investment" })
        return
      }

      setMessage({ type: "success", text: "Investment created successfully" })
      setAmount("")
      setInvestmentName("")
      setPricePerUnit("")
      setNumberOfShares("")
      setSelectedInvestmentAccountId("")

      // Refresh data to update balances and holdings
      fetchData()
    } catch (error) {
      console.error("Error creating investment:", error)
      setMessage({ type: "error", text: "An error occurred while creating investment" })
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "loading") {
    return (
      <>
        <Header title="Investments" />
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <InvestmentsSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header title="Investments" />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {loadingForm ? (
          <InvestmentFormSkeleton />
        ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Create Investment
            </CardTitle>
            <CardDescription>
              Record an investment from an investment account. Transfer money to investment accounts separately using the Transfer functionality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div
                  className={`p-3 rounded-lg border text-sm ${
                    message.type === "success"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              {investmentAccounts.length === 0 ? (
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                  <p className="font-medium mb-1">No investment accounts found</p>
                  <p>Create an investment account from the Accounts page first, then transfer money to it using the Transfer functionality.</p>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="investmentAccount">Investment Account *</Label>
                    <select
                      id="investmentAccount"
                      value={selectedInvestmentAccountId}
                      onChange={(e) => setSelectedInvestmentAccountId(e.target.value)}
                      required
                      className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select investment account</option>
                      {investmentAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.bankName}) - Available: {formatCurrency(acc.balance)} | Invested: {formatCurrency(acc.investedAmount)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Only investment accounts are shown. Transfer money to investment accounts separately using the Transfer page.
                    </p>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="investmentName">Investment Name *</Label>
                <Input
                  id="investmentName"
                  value={investmentName}
                  onChange={(e) => setInvestmentName(e.target.value)}
                  placeholder="e.g., AAPL, S&P 500 ETF, TSLA"
                  className="mt-1"
                  required
                />
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pricePerUnit">Price Per Unit ($) *</Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    value={pricePerUnit}
                    onChange={(e) => {
                      setPricePerUnit(e.target.value)
                      // Auto-calculate total if both fields are filled
                      if (e.target.value && numberOfShares) {
                        const price = parseFloat(e.target.value)
                        const shares = parseFloat(numberOfShares)
                        if (!isNaN(price) && !isNaN(shares) && price > 0 && shares > 0) {
                          setAmount((price * shares).toFixed(2))
                        }
                      }
                    }}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="numberOfShares">Number of Shares *</Label>
                  <Input
                    id="numberOfShares"
                    type="number"
                    value={numberOfShares}
                    onChange={(e) => {
                      setNumberOfShares(e.target.value)
                      // Auto-calculate total if both fields are filled
                      if (e.target.value && pricePerUnit) {
                        const shares = parseFloat(e.target.value)
                        const price = parseFloat(pricePerUnit)
                        if (!isNaN(shares) && !isNaN(price) && shares > 0 && price > 0) {
                          setAmount((shares * price).toFixed(2))
                        }
                      }
                    }}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Total Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  readOnly
                  className="mt-1 bg-gray-50"
                  placeholder="Auto-calculated"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Automatically calculated from Price Per Unit × Number of Shares
                </p>
              </div>

              <div>
                <Label htmlFor="date">Investment Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                {submitting ? "Creating investment..." : "Create Investment"}
              </Button>
            </form>
          </CardContent>
        </Card>
        )}

        {/* Summary Cards - Dashboard Style */}
        {loadingSummary ? (
          <InvestmentSummarySkeleton />
        ) : investmentAccounts.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalInvested)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Across all accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
                <Wallet className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalRemaining)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Ready to invest</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalValue)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Invested + Cash</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Charts Section */}
        {loadingCharts ? (
          <InvestmentChartsSkeleton />
        ) : investmentAccounts.length > 0 && accountDistributionData.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Account Distribution Pie Chart */}
            {accountDistributionData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Account Distribution
                  </CardTitle>
                  <CardDescription>Total value by investment account</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={accountDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => {
                          const percent = ((entry.value / totalValue) * 100).toFixed(0)
                          return `${entry.name}: ${percent}%`
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {accountDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) =>
                        value !== undefined ? formatCurrency(value) : ""
                      } />
                      <Legend wrapperStyle={{ fontSize: '12px' }} iconSize={12} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Investment Trend Chart */}
            {trendData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Investment Trend
                  </CardTitle>
                  <CardDescription>Monthly investment activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                      <YAxis style={{ fontSize: '12px' }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number | undefined) =>
                        value !== undefined ? formatCurrency(value) : ""
                      } />
                      <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {/* Share Allocation Pie Chart */}
        {loadingCharts ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-36" />
              </div>
              <Skeleton className="h-4 w-56 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded" />
            </CardContent>
          </Card>
        ) : shareAllocationData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Share Allocation
              </CardTitle>
              <CardDescription>Investment distribution by share name</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={shareAllocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => {
                      const percent = totalInvested > 0 ? ((entry.value / totalInvested) * 100).toFixed(0) : "0"
                      return `${entry.name}: ${percent}%`
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {shareAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) =>
                    value !== undefined ? formatCurrency(value) : ""
                  } />
                  <Legend wrapperStyle={{ fontSize: '12px' }} iconSize={12} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}

        {/* Top Holdings Bar Chart */}
        {loadingCharts ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded" />
            </CardContent>
          </Card>
        ) : topHoldings.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Holdings
              </CardTitle>
              <CardDescription>Largest investments by amount</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topHoldings} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" style={{ fontSize: '12px' }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '12px' }} />
                  <Tooltip formatter={(value: number | undefined) =>
                    value !== undefined ? formatCurrency(value) : ""
                  } />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}

        {/* Investment Accounts - Dashboard Style Cards */}
        {loadingAccounts ? (
          <InvestmentAccountsSkeleton />
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>Investment Accounts</CardTitle>
            <CardDescription>
              See how much is invested from each investment account and how much cash is still available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {investmentAccounts.length === 0 ? (
              <p className="text-sm text-gray-500">
                No investment accounts yet. Create one from the Accounts page first, then transfer money to it using the Transfer functionality.
              </p>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {investmentAccounts.map((acc) => {
                  const investedPercentage = acc.totalValue > 0 ? (acc.investedAmount / acc.totalValue) * 100 : 0
                  
                  return (
                    <Card key={acc.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{acc.name}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-gray-500 mb-2">{acc.bankName}</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(acc.totalValue)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Total value</p>
                        <div className="mt-3 text-xs text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Invested:</span>
                            <span className="font-medium text-blue-600">
                              {formatCurrency(acc.investedAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Remaining:</span>
                            <span className="font-medium text-gray-800">
                              {formatCurrency(acc.balance)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                          <div
                            className="h-1.5 rounded-full bg-blue-500 transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, investedPercentage))}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {investedPercentage.toFixed(0)}% invested
                        </p>
                        {acc.holdings.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-semibold text-gray-700 mb-2">
                              Recent investments ({acc.holdings.length})
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {acc.holdings.slice(0, 3).map((h) => (
                                <div key={h.id} className="text-xs text-gray-600">
                                  <div className="flex justify-between">
                                    <span className="truncate mr-2 font-medium">{h.name}</span>
                                    <span className="font-medium">{formatCurrency(h.amount)}</span>
                                  </div>
                                  {h.numberOfShares && h.numberOfShares > 0 && h.pricePerUnit && h.pricePerUnit > 0 && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {h.numberOfShares.toFixed(2)} shares @ {formatCurrency(h.pricePerUnit)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </>
  )
}

