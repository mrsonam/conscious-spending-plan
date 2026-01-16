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
import { TrendingUp, Wallet, DollarSign, PieChart as PieChartIcon, BarChart3, TrendingDown, ArrowUpDown, Plus, Activity, Briefcase, Target, Calendar } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from "recharts"
import { cn } from "@/lib/utils"

interface Account {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
}

interface InvestmentPurchase {
  id: string
  pricePerUnit: number | null
  numberOfShares: number | null
  amount: number
  date: string
}

interface InvestmentHolding {
  name: string
  totalShares: number
  totalAmount: number
  averagePrice: number
  purchases: InvestmentPurchase[]
  firstPurchaseDate: string
  lastPurchaseDate: string
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
  
  // State for current prices (keyed by "accountId-holdingName")
  const [currentPrices, setCurrentPrices] = useState<Record<string, string>>({})
  
  // State for active tab/view
  const [activeTab, setActiveTab] = useState<"overview" | "holdings" | "analytics" | "add">("overview")

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

  // Helper function to get holding key
  const getHoldingKey = (accountId: string, holdingName: string) => {
    return `${accountId}-${holdingName}`
  }

  // Calculate gains/losses for a holding
  const calculateGainsLosses = (holding: InvestmentHolding, currentPrice: number | null) => {
    if (!currentPrice || holding.totalShares === 0) {
      return {
        currentValue: 0,
        costBasis: holding.totalAmount,
        gainLoss: 0,
        gainLossPercent: 0,
      }
    }

    const currentValue = currentPrice * holding.totalShares
    const costBasis = holding.totalAmount
    const gainLoss = currentValue - costBasis
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

    return {
      currentValue,
      costBasis,
      gainLoss,
      gainLossPercent,
    }
  }

  // Calculate total portfolio gains/losses
  const calculatePortfolioGainsLosses = () => {
    let totalCostBasis = 0
    let totalCurrentValue = 0

    investmentAccounts.forEach((acc) => {
      acc.holdings.forEach((holding) => {
        const key = getHoldingKey(acc.id, holding.name)
        const currentPriceStr = currentPrices[key]
        const currentPrice = currentPriceStr ? parseFloat(currentPriceStr) : null

        if (currentPrice && holding.totalShares > 0) {
          totalCostBasis += holding.totalAmount
          totalCurrentValue += currentPrice * holding.totalShares
        }
      })
    })

    const totalGainLoss = totalCurrentValue - totalCostBasis
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0

    return {
      totalCostBasis,
      totalCurrentValue,
      totalGainLoss,
      totalGainLossPercent,
    }
  }

  // Calculate summary statistics
  const totalInvested = investmentAccounts.reduce((sum, acc) => sum + acc.investedAmount, 0)
  const totalRemaining = investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalValue = investmentAccounts.reduce((sum, acc) => sum + acc.totalValue, 0)
  
  // Calculate portfolio gains/losses
  const portfolioGains = calculatePortfolioGainsLosses()

  // Prepare chart data
  const accountDistributionData = investmentAccounts.map((acc) => ({
    name: acc.name,
    value: acc.totalValue,
    invested: acc.investedAmount,
    remaining: acc.balance,
  }))

  // Prepare holdings data for bar chart (using merged holdings)
  const allHoldings = investmentAccounts.flatMap((acc) =>
    acc.holdings.map((h) => ({
      name: h.name,
      amount: h.totalAmount,
      account: acc.name,
      date: h.lastPurchaseDate,
      averagePrice: h.averagePrice,
      totalShares: h.totalShares,
    }))
  )

  // Group holdings by share name for allocation chart (already merged by name)
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

  // Group holdings by month for trend chart (using individual purchases)
  const holdingsByMonth: Record<string, number> = {}
  investmentAccounts.forEach((acc) => {
    acc.holdings.forEach((h) => {
      h.purchases.forEach((purchase) => {
        const date = new Date(purchase.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        holdingsByMonth[monthKey] = (holdingsByMonth[monthKey] || 0) + purchase.amount
      })
    })
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
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Modern Tab Navigation */}
        <div className="flex flex-wrap gap-2 pb-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-all",
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab("holdings")}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-all",
              activeTab === "holdings"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Holdings
            </div>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-all",
              activeTab === "analytics"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </div>
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-all",
              activeTab === "add"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Investment
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Enhanced Summary Cards */}
              {loadingSummary ? (
                <InvestmentSummarySkeleton />
              ) : investmentAccounts.length > 0 ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Total Invested</CardTitle>
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {formatCurrency(totalInvested)}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Across all accounts</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Available Cash</CardTitle>
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(totalRemaining)}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Ready to invest</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Total Value</CardTitle>
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600">
                        {formatCurrency(totalValue)}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Invested + Cash</p>
                    </CardContent>
                  </Card>

                  {portfolioGains.totalCurrentValue > 0 && (
                    <Card className={`bg-gradient-to-br ${
                      portfolioGains.totalGainLoss >= 0 
                        ? "from-green-50 to-emerald-50" 
                        : "from-red-50 to-rose-50"
                    }`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Gain/Loss</CardTitle>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          portfolioGains.totalGainLoss >= 0 ? "bg-green-100" : "bg-red-100"
                        }`}>
                          {portfolioGains.totalGainLoss >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-3xl font-bold ${
                          portfolioGains.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {formatCurrency(portfolioGains.totalGainLoss)}
                        </div>
                        <p className={`text-xs mt-2 ${
                          portfolioGains.totalGainLossPercent >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {portfolioGains.totalGainLossPercent >= 0 ? "+" : ""}
                          {portfolioGains.totalGainLossPercent.toFixed(2)}%
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}

              {/* Current Prices Input Section - Compact in Overview */}
              {loadingAccounts ? null : investmentAccounts.length > 0 && investmentAccounts.some(acc => acc.holdings.length > 0) ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpDown className="h-5 w-5 text-indigo-600" />
                      Track Current Prices
                    </CardTitle>
                    <CardDescription>
                      Enter current market prices to calculate gains/losses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {investmentAccounts.map((acc) => {
                        if (acc.holdings.length === 0) return null
                        return acc.holdings.map((holding) => {
                          const key = getHoldingKey(acc.id, holding.name)
                          const currentPrice = currentPrices[key] || ""
                          
                          return (
                            <div key={key} className="space-y-2">
                              <Label htmlFor={`price-${key}`} className="text-sm font-medium">
                                {holding.name}
                              </Label>
                              <Input
                                id={`price-${key}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={currentPrice}
                                onChange={(e) => {
                                  setCurrentPrices((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }}
                                placeholder="Current price"
                                className="text-sm"
                              />
                            </div>
                          )
                        })
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Quick Holdings Preview */}
              {loadingAccounts ? (
                <InvestmentAccountsSkeleton />
              ) : investmentAccounts.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Investment Accounts</CardTitle>
                    <CardDescription>
                      Quick overview of your investment accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {investmentAccounts.map((acc) => {
                        const investedPercentage = acc.totalValue > 0 ? (acc.investedAmount / acc.totalValue) * 100 : 0
                        
                        return (
                          <Card key={acc.id} className="hover:shadow-md transition-all">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-base">{acc.name}</CardTitle>
                                  <p className="text-xs text-gray-500 mt-1">{acc.bankName}</p>
                                </div>
                                <TrendingUp className="h-5 w-5 text-indigo-600" />
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {formatCurrency(acc.totalValue)}
                                </div>
                                <p className="text-xs text-gray-500">Total value</p>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Invested:</span>
                                  <span className="font-semibold text-blue-600">
                                    {formatCurrency(acc.investedAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Available:</span>
                                  <span className="font-semibold text-gray-800">
                                    {formatCurrency(acc.balance)}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-indigo-500 transition-all"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, investedPercentage))}%`,
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 text-center">
                                {investedPercentage.toFixed(0)}% invested
                              </p>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}

          {/* Holdings Tab */}
          {activeTab === "holdings" && (
            <>
              {/* Current Prices Input Section */}
              {loadingAccounts ? null : investmentAccounts.length > 0 && investmentAccounts.some(acc => acc.holdings.length > 0) ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpDown className="h-5 w-5 text-indigo-600" />
                      Track Current Prices
                    </CardTitle>
                    <CardDescription>
                      Enter the current market price for each holding to calculate your gains or losses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {investmentAccounts.map((acc) => {
                        if (acc.holdings.length === 0) return null
                        
                        return (
                          <div key={acc.id} className="space-y-3 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold text-base text-gray-800">{acc.name}</h3>
                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                              {acc.holdings.map((holding) => {
                                const key = getHoldingKey(acc.id, holding.name)
                                const currentPrice = currentPrices[key] || ""
                                
                                return (
                                  <div key={key} className="space-y-1">
                                    <Label htmlFor={`price-${key}`} className="text-sm font-medium">
                                      {holding.name}
                                      {holding.totalShares > 0 && (
                                        <span className="text-gray-500 ml-1 font-normal">
                                          ({holding.totalShares.toFixed(2)} shares)
                                        </span>
                                      )}
                                    </Label>
                                    <Input
                                      id={`price-${key}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={currentPrice}
                                      onChange={(e) => {
                                        setCurrentPrices((prev) => ({
                                          ...prev,
                                          [key]: e.target.value,
                                        }))
                                      }}
                                      placeholder="Current price"
                                      className="text-sm"
                                    />
                                    {currentPrice && parseFloat(currentPrice) > 0 && holding.totalShares > 0 && (
                                      <div className="text-xs text-gray-600">
                                        Current Value: {formatCurrency(parseFloat(currentPrice) * holding.totalShares)}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Detailed Holdings View */}
              {loadingAccounts ? null : investmentAccounts.length > 0 && investmentAccounts.some(acc => acc.holdings.length > 0) ? (
                <Card>
                  <CardHeader>
                    <CardTitle>All Holdings</CardTitle>
                    <CardDescription>
                      Detailed view of all investments grouped by share name, showing individual purchase prices and average cost
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {investmentAccounts.map((acc) => {
                        if (acc.holdings.length === 0) return null
                        
                        return (
                          <div key={acc.id} className="rounded-lg p-5 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center justify-between mb-5 pb-3">
                              <div>
                                <h3 className="font-bold text-lg text-gray-900">{acc.name}</h3>
                                <p className="text-sm text-gray-500">{acc.bankName}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-500">Total Invested</div>
                                <div className="text-xl font-bold text-indigo-600">
                                  {formatCurrency(acc.investedAmount)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                              {acc.holdings.map((h, idx) => {
                                const key = getHoldingKey(acc.id, h.name)
                                const currentPriceStr = currentPrices[key]
                                const currentPrice = currentPriceStr ? parseFloat(currentPriceStr) : null
                                const gainsLosses = calculateGainsLosses(h, currentPrice)
                                
                                return (
                                  <Card key={`${h.name}-${acc.id}-${idx}`} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-3">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <CardTitle className="text-lg mb-2">{h.name}</CardTitle>
                                          <div className="space-y-1 text-sm text-gray-600">
                                            <div className="flex justify-between">
                                              <span>Cost Basis:</span>
                                              <span className="font-medium">{formatCurrency(h.totalAmount)}</span>
                                            </div>
                                            {h.totalShares > 0 && (
                                              <>
                                                <div className="flex justify-between">
                                                  <span>Shares:</span>
                                                  <span className="font-medium">{h.totalShares.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>Avg Price:</span>
                                                  <span className="font-medium text-indigo-600">{formatCurrency(h.averagePrice)}</span>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      {currentPrice && currentPrice > 0 && h.totalShares > 0 && (
                                        <div className="p-3 rounded-lg bg-gray-50 space-y-2">
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Current Price:</span>
                                            <span className="font-medium">{formatCurrency(currentPrice)}</span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Current Value:</span>
                                            <span className="font-medium">{formatCurrency(gainsLosses.currentValue)}</span>
                                          </div>
                                          <div className="pt-2">
                                            <div className="flex justify-between items-center">
                                              <span className="text-sm font-semibold text-gray-700">Gain/Loss:</span>
                                              <span className={`text-lg font-bold ${
                                                gainsLosses.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                                              }`}>
                                                {gainsLosses.gainLoss >= 0 ? "+" : ""}
                                                {formatCurrency(gainsLosses.gainLoss)}
                                                {" "}
                                                <span className="text-sm">
                                                  ({gainsLosses.gainLossPercent >= 0 ? "+" : ""}
                                                  {gainsLosses.gainLossPercent.toFixed(2)}%)
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {h.purchases.length > 0 && (
                                        <div className="pt-3">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">
                                            Purchase History ({h.purchases.length} {h.purchases.length === 1 ? 'purchase' : 'purchases'})
                                          </div>
                                          <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {h.purchases.map((purchase) => (
                                              <div key={purchase.id} className="flex items-center justify-between text-sm bg-white rounded p-2">
                                                <div className="flex-1">
                                                  {purchase.numberOfShares && purchase.numberOfShares > 0 && purchase.pricePerUnit && purchase.pricePerUnit > 0 ? (
                                                    <div>
                                                      <span className="font-medium">
                                                        {purchase.numberOfShares.toFixed(2)} shares
                                                      </span>
                                                      <span className="text-gray-500 mx-2">@</span>
                                                      <span className="font-medium text-indigo-600">
                                                        {formatCurrency(purchase.pricePerUnit)}
                                                      </span>
                                                      <span className="text-gray-500 mx-2">=</span>
                                                      <span className="font-medium">
                                                        {formatCurrency(purchase.amount)}
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <span className="font-medium">
                                                      {formatCurrency(purchase.amount)}
                                                    </span>
                                                  )}
                                                  <div className="text-xs text-gray-400 mt-0.5">
                                                    {new Date(purchase.date).toLocaleDateString('en-US', {
                                                      year: 'numeric',
                                                      month: 'short',
                                                      day: 'numeric'
                                                    })}
                                                  </div>
                                                </div>
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
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <>
              {/* Charts Section */}
              {loadingCharts ? (
                <InvestmentChartsSkeleton />
              ) : investmentAccounts.length > 0 && accountDistributionData.length > 0 ? (
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
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
            </>
          )}

          {/* Add Investment Tab */}
          {activeTab === "add" && (
            <>
        {loadingForm ? (
          <InvestmentFormSkeleton />
        ) : (
        <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-indigo-600" />
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
                          className={`p-3 rounded-lg text-sm ${
                            message.type === "success"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {message.text}
                        </div>
                      )}

                      {investmentAccounts.length === 0 ? (
                        <div className="p-4 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
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
                              className="mt-1 w-full px-4 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            </>
          )}
        </div>
      </div>
    </>
  )
}
