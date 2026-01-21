"use client"

import { useEffect, useState } from "react"
import { SummaryCardsSkeleton, ChartsSkeleton, CategoryDetailsSkeleton, RecentExpensesSkeleton } from "@/components/skeletons/category-tracking-sections"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingDown, Wallet, TrendingUp, PiggyBank, CreditCard, BarChart3, Activity, PieChart as PieChartIcon, Target, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"

interface CategoryTracking {
  allocated: number
  spent: number
  transferred: number
  income: number
  carryover: number
  overspending: number
  available: number
  remaining: number
  overspent: number
}


const CATEGORIES = [
  { key: "fixedCosts", label: "Fixed Costs", color: "red", icon: Wallet, colorHex: "#ef4444" },
  { key: "investment", label: "Investment", color: "blue", icon: TrendingUp, colorHex: "#3b82f6" },
  { key: "savings", label: "Savings", color: "green", icon: PiggyBank, colorHex: "#10b981" },
  { key: "guiltFreeSpending", label: "Guilt-Free Spending", color: "purple", icon: CreditCard, colorHex: "#8b5cf6" },
]

export default function CategoryTrackingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tracking, setTracking] = useState<Record<string, CategoryTracking> | null>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [history, setHistory] = useState<Record<string, Array<{ month: string; allocated: number; spent: number; remaining: number }>> | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingCharts, setLoadingCharts] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(true)
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  
  // State for active tab/view
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "details" | "insights">("overview")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchData()
    }
  }, [status, router])

  const fetchData = async () => {
    setLoadingSummary(true)
    setLoadingCharts(true)
    setLoadingDetails(true)
    setLoadingExpenses(true)
    
    try {
      const { startOfMonth, endOfMonth } = getCurrentMonthYear()
      // Fetch all data in parallel
      const [trackingRes, expensesRes, historyRes] = await Promise.all([
        fetch("/api/category-tracking"),
        // Only fetch expenses with fund categories for current month (server-side filtered)
        fetch(`/api/expenses?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}&category=fixedCosts,investment,savings,guiltFreeSpending`),
        fetch("/api/category-tracking/history"),
      ])

      if (trackingRes.ok) {
        const data = await trackingRes.json()
        setTracking(data.tracking)
        setLoadingSummary(false)
        setLoadingDetails(false)
      }

      if (expensesRes.ok) {
        const data = await expensesRes.json()
        // Expenses are already filtered by category on the server
        setExpenses(data.expenses || [])
        setLoadingExpenses(false)
      }

      if (historyRes.ok) {
        const data = await historyRes.json()
        setHistory(data.history)
        setLoadingCharts(false)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setLoadingSummary(false)
      setLoadingCharts(false)
      setLoadingDetails(false)
      setLoadingExpenses(false)
    }
  }

  const getCurrentMonthYear = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { startOfMonth, endOfMonth }
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

  const getCategoryColor = (color: string) => {
    const colors: Record<string, string> = {
      red: "bg-red-50 text-red-700 border-red-200",
      blue: "bg-blue-50 text-blue-700 border-blue-200",
      green: "bg-green-50 text-green-700 border-green-200",
      purple: "bg-purple-50 text-purple-700 border-purple-200",
    }
    return colors[color] || "bg-gray-50 text-gray-700"
  }

  if (status === "loading") {
    return (
      <>
        <Header title="Category Tracking" />
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
          <SummaryCardsSkeleton />
          <ChartsSkeleton />
          <CategoryDetailsSkeleton />
          <RecentExpensesSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  // Calculate additional insights
  const totalAllocated = tracking ? Object.values(tracking).reduce((sum, cat) => sum + cat.allocated, 0) : 0
  const totalSpent = tracking ? Object.values(tracking).reduce((sum, cat) => sum + cat.spent, 0) : 0
  const totalRemaining = tracking ? Object.values(tracking).reduce((sum, cat) => sum + cat.remaining, 0) : 0
  const overallUsage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0

  // Category comparison data for pie chart
  const categoryDistribution = tracking ? CATEGORIES.map(cat => {
    const data = tracking[cat.key]
    return {
      name: cat.label,
      value: data?.spent || 0,
      color: cat.colorHex,
    }
  }).filter(item => item.value > 0) : []

  return (
    <>
      <Header title="Category Tracking" />
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
            onClick={() => setActiveTab("details")}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-all",
              activeTab === "details"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Details
            </div>
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-all",
              activeTab === "insights"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Category Budget Tracking</h2>
                <p className="text-sm text-gray-500 mt-1">
                  View spending and remaining budget for each fund category. Log expenses from the{" "}
                  <button
                    onClick={() => router.push("/dashboard/expenses")}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Expenses page
                  </button>
                  {" "}and select a fund category.
                </p>
              </div>

              {/* Overall Summary Cards */}
              {loadingSummary ? (
                <SummaryCardsSkeleton />
              ) : tracking && Object.keys(tracking).length > 0 ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(totalAllocated)}</div>
                      <p className="text-xs text-gray-500 mt-1">This month's total budget</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</div>
                      <p className="text-xs text-gray-500 mt-1">{overallUsage.toFixed(1)}% of budget used</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Remaining</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRemaining)}</div>
                      <p className="text-xs text-gray-500 mt-1">Available balance</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
                      <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overallUsage.toFixed(1)}%</div>
                      <p className="text-xs text-gray-500 mt-1">Overall utilization</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-indigo-100 p-4">
                          <Activity className="h-12 w-12 text-indigo-600" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900">No Budget Data Available</h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          You need to set up fund allocation and add income to start tracking your budget categories.
                        </p>
                      </div>
                      <div className="pt-4">
                        <Button
                          onClick={() => router.push("/dashboard")}
                          className="inline-flex items-center gap-2"
                        >
                          Go to Dashboard
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Category Summary Cards */}
              {loadingSummary ? (
                <SummaryCardsSkeleton />
              ) : tracking && Object.keys(tracking).length > 0 ? (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {CATEGORIES.map((cat) => {
                    const data = tracking[cat.key]
                    if (!data) return null

                    const isOverspent = data.overspent > 0
                    const Icon = cat.icon
                    const usagePercent = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0

                    return (
                      <Card key={cat.key} className={cn(isOverspent && "border-red-300")}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{cat.label}</CardTitle>
                          <Icon className={cn("h-4 w-4", isOverspent ? "text-red-500" : `text-${cat.color}-600`)} />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(data.remaining)}
                          </div>
                          <p className={cn(
                            "text-xs mt-1",
                            isOverspent ? "text-red-600" : "text-gray-500"
                          )}>
                            {isOverspent ? `Overspent by ${formatCurrency(data.overspent)}` : "Remaining"}
                          </p>
                          <div className="mt-2 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span>Allocated:</span>
                              <span className="font-medium">{formatCurrency(data.allocated)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{cat.key === "investment" ? "Invested:" : "Spent:"}</span>
                              <span className="font-medium text-red-600">{formatCurrency(data.spent)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Usage:</span>
                              <span className={cn(
                                "font-medium",
                                isOverspent ? "text-red-600" : usagePercent > 80 ? "text-yellow-600" : "text-green-600"
                              )}>
                                {usagePercent.toFixed(1)}%
                              </span>
                            </div>
                            {data.transferred > 0 && (
                              <div className="flex justify-between items-center text-xs text-gray-600">
                                <span>Transferred:</span>
                                <span className="font-medium text-blue-600">{formatCurrency(data.transferred)}</span>
                              </div>
                            )}
                            {(data.carryover > 0 || data.overspending > 0) && (
                              <div className="mt-1 pt-1 border-t">
                                {data.carryover > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>Carryover:</span>
                                    <span>+{formatCurrency(data.carryover)}</span>
                                  </div>
                                )}
                                {data.overspending > 0 && (
                                  <div className="flex justify-between text-red-600">
                                    <span>Overspent:</span>
                                    <span>-{formatCurrency(data.overspending)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                            <div
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                isOverspent
                                  ? "bg-red-500"
                                  : data.remaining > data.allocated * 0.2
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              )}
                              style={{
                                width: `${Math.min(100, Math.max(0, data.allocated > 0 ? (data.remaining / data.allocated) * 100 : 0))}%`,
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : null}

              {/* Category Status and Recent Expenses - Side by Side (50/50) */}
              {(loadingSummary ? null : tracking && Object.keys(tracking).length > 0) || (loadingExpenses ? null : expenses.length > 0) ? (
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  {/* Quick Status Summary */}
                  {loadingSummary ? null : tracking && Object.keys(tracking).length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Category Status
                        </CardTitle>
                        <CardDescription>Current status for each category</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {CATEGORIES.map((cat) => {
                            const data = tracking[cat.key]
                            if (!data) return null
                            const usagePercent = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0
                            const isOverspent = data.overspent > 0
                            const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                            const currentDay = new Date().getDate()
                            const expectedUsage = (currentDay / daysInMonth) * 100

                            let status = "On Track"
                            let statusColor = "text-green-600 bg-green-50"
                            if (isOverspent) {
                              status = "Overspent"
                              statusColor = "text-red-600 bg-red-50"
                            } else if (usagePercent > expectedUsage * 1.2) {
                              status = "Spending Fast"
                              statusColor = "text-yellow-600 bg-yellow-50"
                            } else if (usagePercent < expectedUsage * 0.8) {
                              status = "Under Budget"
                              statusColor = "text-green-600 bg-green-50"
                            }

                            return (
                              <div key={cat.key} className={cn("p-3 rounded-lg", statusColor)}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <cat.icon className="h-4 w-4" />
                                    <span className="font-medium text-sm">{cat.label}</span>
                                  </div>
                                  <span className="text-sm font-semibold">{status}</span>
                                </div>
                                <div className="mt-2 text-xs opacity-80">
                                  {formatCurrency(data.spent)} / {formatCurrency(data.allocated)} ({usagePercent.toFixed(1)}%)
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  {/* Recent Expenses Summary */}
                  {loadingExpenses ? null : expenses.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Expenses</CardTitle>
                        <CardDescription>Latest expenses by category this month</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {expenses.slice(0, 3).map((expense) => {
                            const category = CATEGORIES.find((c) => c.key === expense.category)
                            return (
                              <div
                                key={expense.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <TrendingDown className="h-5 w-5 text-red-500" />
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {category?.label || expense.category}
                                    </div>
                                    {expense.description && (
                                      <div className="text-sm text-gray-500">{expense.description}</div>
                                    )}
                                    <div className="text-xs text-gray-400">
                                      {expense.account?.name} • {formatDate(expense.date)}
                                    </div>
                                  </div>
                                  <div className="font-semibold text-red-600">
                                    -{formatCurrency(expense.amount)}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {expenses.length > 3 && (
                            <div className="text-center pt-2">
                              <button
                                onClick={() => router.push("/dashboard/expenses")}
                                className="text-sm text-indigo-600 hover:underline font-medium"
                              >
                                View all {expenses.length} expenses →
                              </button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              ) : null}
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Analytics & Trends</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Visualize spending patterns and budget trends over time
                </p>
              </div>

              {/* Overall Summary Cards */}
              {loadingSummary ? (
                <SummaryCardsSkeleton />
              ) : tracking && Object.keys(tracking).length > 0 ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(totalAllocated)}</div>
                      <p className="text-xs text-gray-500 mt-1">This month's budget</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</div>
                      <p className="text-xs text-gray-500 mt-1">{overallUsage.toFixed(1)}% of budget used</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Remaining</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRemaining)}</div>
                      <p className="text-xs text-gray-500 mt-1">Available balance</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
                      <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overallUsage.toFixed(1)}%</div>
                      <p className="text-xs text-gray-500 mt-1">Overall utilization</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-indigo-100 p-4">
                          <BarChart3 className="h-12 w-12 text-indigo-600" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900">No Budget Data Available</h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          You need to set up fund allocation and add income to start tracking your budget categories.
                        </p>
                      </div>
                      <div className="pt-4">
                        <Button
                          onClick={() => router.push("/dashboard")}
                          className="inline-flex items-center gap-2"
                        >
                          Go to Dashboard
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Charts Section */}
              {loadingCharts ? (
                <ChartsSkeleton />
              ) : history && Object.keys(history).length > 0 && history.fixedCosts && history.fixedCosts.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Spending Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Spending Trend (6 Months)
                </CardTitle>
                <CardDescription>Monthly spending by category</CardDescription>
              </CardHeader>
              <CardContent>
                {history && Object.keys(history).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={history.fixedCosts.map((_, i) => ({
                      month: history.fixedCosts[i]?.month || "",
                      "Fixed Costs": history.fixedCosts[i]?.spent || 0,
                      "Investment": history.investment[i]?.spent || 0,
                      "Savings": history.savings[i]?.spent || 0,
                      "Guilt-Free": history.guiltFreeSpending[i]?.spent || 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ""} contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} iconSize={12} />
                      <Bar dataKey="Fixed Costs" fill="#ef4444" />
                      <Bar dataKey="Investment" fill="#3b82f6" />
                      <Bar dataKey="Savings" fill="#10b981" />
                      <Bar dataKey="Guilt-Free" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-gray-500">
                    No historical data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Remaining Budget Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Remaining Budget Trend
                </CardTitle>
                <CardDescription>Monthly remaining budget by category</CardDescription>
              </CardHeader>
              <CardContent>
                {history && Object.keys(history).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={history.fixedCosts.map((_, i) => ({
                      month: history.fixedCosts[i]?.month || "",
                      "Fixed Costs": history.fixedCosts[i]?.remaining || 0,
                      "Investment": history.investment[i]?.remaining || 0,
                      "Savings": history.savings[i]?.remaining || 0,
                      "Guilt-Free": history.guiltFreeSpending[i]?.remaining || 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ""} contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} iconSize={12} />
                      <Line type="monotone" dataKey="Fixed Costs" stroke="#ef4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="Investment" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="Savings" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="Guilt-Free" stroke="#8b5cf6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-gray-500">
                    No historical data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-indigo-100 p-4">
                    <BarChart3 className="h-12 w-12 text-indigo-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">No Historical Data Available</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Historical spending data will appear here once you've tracked expenses across multiple months. Start logging expenses to see trends over time.
                  </p>
                </div>
                <div className="pt-4">
                  <Button
                    onClick={() => router.push("/dashboard/expenses")}
                    className="inline-flex items-center gap-2"
                  >
                    Log an Expense
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

              {/* Spending Distribution Pie Chart */}
              {categoryDistribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      Spending Distribution
                    </CardTitle>
                    <CardDescription>Breakdown of spending by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ""} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Details Tab */}
          {activeTab === "details" && (
            <>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Category Details</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Detailed breakdown and metrics for each category
                </p>
              </div>

              {/* Category Details Cards */}
              {loadingDetails ? (
                <CategoryDetailsSkeleton />
              ) : tracking && Object.keys(tracking).length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
          {CATEGORIES.map((cat) => {
            const data = tracking[cat.key]
            if (!data) return null

            const isOverspent = data.overspent > 0
            const Icon = cat.icon

            return (
              <Card key={cat.key} className={cn(isOverspent && "border-red-300")}>
                <CardHeader>
                  <CardTitle className={cn("text-lg flex items-center gap-2", `text-${cat.color}-700`)}>
                    <Icon className={`h-5 w-5 text-${cat.color}-600`} />
                    {cat.label}
                  </CardTitle>
                  <CardDescription>Detailed breakdown for this category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <div className="text-xs text-gray-600 mb-1">Allocated</div>
                      <div className="text-lg font-semibold">{formatCurrency(data.allocated)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50">
                      <div className="text-xs text-red-600 mb-1">{cat.key === "investment" ? "Invested" : "Spent"}</div>
                      <div className="text-lg font-semibold text-red-700">{formatCurrency(data.spent)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50">
                      <div className="text-xs text-green-600 mb-1">Remaining</div>
                      <div className={cn(
                        "text-lg font-semibold",
                        isOverspent ? "text-red-700" : "text-green-700"
                      )}>
                        {formatCurrency(data.remaining)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-50">
                      <div className="text-xs text-indigo-600 mb-1">Usage</div>
                      <div className="text-lg font-semibold text-indigo-700">
                        {data.allocated > 0 ? ((data.spent / data.allocated) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>

                  {data.transferred > 0 && (
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-blue-700">Transferred</span>
                        <span className="font-semibold text-blue-700">{formatCurrency(data.transferred)}</span>
                      </div>
                    </div>
                  )}

                  {(data.carryover > 0 || data.overspending > 0 || data.overspent > 0) && (
                    <div className="pt-3 border-t space-y-2 text-xs">
                      {data.carryover > 0 && (
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-green-700">Carryover from last month</span>
                          <span className="font-semibold text-green-700">+{formatCurrency(data.carryover)}</span>
                        </div>
                      )}
                      {data.overspending > 0 && (
                        <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span className="text-red-700">Overspending from last month</span>
                          <span className="font-semibold text-red-700">-{formatCurrency(data.overspending)}</span>
                        </div>
                      )}
                      {data.overspent > 0 && (
                        <div className="flex justify-between items-center p-2 bg-red-100 rounded border border-red-300">
                          <span className="text-red-800 font-semibold">Overspent this month</span>
                          <span className="font-bold text-red-800">-{formatCurrency(data.overspent)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Budget Usage</span>
                      <span>{data.allocated > 0 ? ((data.spent / data.allocated) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          isOverspent
                            ? "bg-red-500"
                            : data.spent / data.allocated > 0.8
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        )}
                        style={{
                          width: `${Math.min(100, Math.max(0, data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        ) : null}
            </>
          )}

          {/* Insights Tab */}
          {activeTab === "insights" && (
            <>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Insights & Analysis</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Key insights and recommendations based on your spending patterns
                </p>
              </div>

              {loadingSummary ? (
                <CategoryDetailsSkeleton />
              ) : tracking && Object.keys(tracking).length > 0 ? (
                <div className="grid gap-6">
                  {/* Category Performance Comparison */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Category Performance</CardTitle>
                      <CardDescription>Compare budget utilization across categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {CATEGORIES.map((cat) => {
                          const data = tracking[cat.key]
                          if (!data) return null
                          const usagePercent = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0
                          const isOverspent = data.overspent > 0
                          const Icon = cat.icon

                          return (
                            <div key={cat.key} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className={`h-4 w-4 text-${cat.color}-600`} />
                                  <span className="font-medium">{cat.label}</span>
                                </div>
                                <div className="text-right">
                                  <span className={cn(
                                    "font-semibold",
                                    isOverspent ? "text-red-600" : usagePercent > 80 ? "text-yellow-600" : "text-green-600"
                                  )}>
                                    {usagePercent.toFixed(1)}%
                                  </span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {formatCurrency(data.spent)} / {formatCurrency(data.allocated)}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={cn(
                                    "h-2 rounded-full transition-all",
                                    isOverspent
                                      ? "bg-red-500"
                                      : usagePercent > 80
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  )}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, usagePercent))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Metrics */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Budget Health</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {CATEGORIES.map((cat) => {
                          const data = tracking[cat.key]
                          if (!data) return null
                          const usagePercent = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0
                          const isOverspent = data.overspent > 0
                          const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                          const currentDay = new Date().getDate()
                          const expectedUsage = (currentDay / daysInMonth) * 100

                          let status = "On Track"
                          let statusColor = "text-green-600"
                          if (isOverspent) {
                            status = "Overspent"
                            statusColor = "text-red-600"
                          } else if (usagePercent > expectedUsage * 1.2) {
                            status = "Spending Fast"
                            statusColor = "text-yellow-600"
                          } else if (usagePercent < expectedUsage * 0.8) {
                            status = "Under Budget"
                            statusColor = "text-green-600"
                          }

                          return (
                            <div key={cat.key} className="flex items-center justify-between p-2 rounded bg-gray-50">
                              <span className="text-sm font-medium">{cat.label}</span>
                              <span className={cn("text-sm font-semibold", statusColor)}>{status}</span>
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Carryover & Adjustments</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {CATEGORIES.map((cat) => {
                          const data = tracking[cat.key]
                          if (!data) return null

                          return (
                            <div key={cat.key} className="space-y-1 p-2 rounded bg-gray-50">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{cat.label}</span>
                              </div>
                              {data.carryover > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-green-600">Carryover:</span>
                                  <span className="text-green-600 font-medium">+{formatCurrency(data.carryover)}</span>
                                </div>
                              )}
                              {data.overspending > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-red-600">Overspending:</span>
                                  <span className="text-red-600 font-medium">-{formatCurrency(data.overspending)}</span>
                                </div>
                              )}
                              {data.overspent > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-red-700 font-semibold">Overspent this month:</span>
                                  <span className="text-red-700 font-bold">-{formatCurrency(data.overspent)}</span>
                                </div>
                              )}
                              {data.carryover === 0 && data.overspending === 0 && data.overspent === 0 && (
                                <div className="text-xs text-gray-500">No adjustments</div>
                              )}
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {CATEGORIES.map((cat) => {
                          const data = tracking[cat.key]
                          if (!data) return null
                          const usagePercent = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0
                          const isOverspent = data.overspent > 0
                          const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                          const currentDay = new Date().getDate()
                          const daysRemaining = daysInMonth - currentDay
                          const projectedSpending = daysInMonth > 0 ? (data.spent / currentDay) * daysInMonth : 0
                          const projectedOverspend = projectedSpending - data.allocated

                          if (isOverspent) {
                            return (
                              <div key={cat.key} className="p-3 rounded-lg bg-red-50 border border-red-200">
                                <div className="font-medium text-red-800 mb-1">{cat.label}</div>
                                <div className="text-sm text-red-700">
                                  You've overspent by {formatCurrency(data.overspent)}. Consider reducing spending in this category next month.
                                </div>
                              </div>
                            )
                          } else if (projectedOverspend > 0 && daysRemaining > 0) {
                            return (
                              <div key={cat.key} className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                                <div className="font-medium text-yellow-800 mb-1">{cat.label}</div>
                                <div className="text-sm text-yellow-700">
                                  At current spending rate, you may overspend by {formatCurrency(projectedOverspend)}. 
                                  Consider reducing spending to stay within budget.
                                </div>
                              </div>
                            )
                          } else if (usagePercent < 50 && daysRemaining < 7) {
                            return (
                              <div key={cat.key} className="p-3 rounded-lg bg-green-50 border border-green-200">
                                <div className="font-medium text-green-800 mb-1">{cat.label}</div>
                                <div className="text-sm text-green-700">
                                  Great job! You're well under budget. You have {formatCurrency(data.remaining)} remaining.
                                </div>
                              </div>
                            )
                          }
                          return null
                        })}
                        {CATEGORIES.every(cat => {
                          const data = tracking[cat.key]
                          if (!data) return true
                          const usagePercent = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0
                          const isOverspent = data.overspent > 0
                          const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                          const currentDay = new Date().getDate()
                          const daysRemaining = daysInMonth - currentDay
                          const projectedSpending = daysInMonth > 0 ? (data.spent / currentDay) * daysInMonth : 0
                          const projectedOverspend = projectedSpending - data.allocated
                          return !isOverspent && projectedOverspend <= 0 && !(usagePercent < 50 && daysRemaining < 7)
                        }) && (
                          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <div className="text-sm text-blue-700">
                              All categories are on track! Keep up the good work managing your budget.
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-indigo-100 p-4">
                          <Lightbulb className="h-12 w-12 text-indigo-600" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900">No Insights Available</h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          Insights and recommendations will appear here once you've started tracking expenses and spending across your budget categories. Start logging expenses to get personalized insights.
                        </p>
                      </div>
                      <div className="pt-4">
                        <Button
                          onClick={() => router.push("/dashboard/expenses")}
                          className="inline-flex items-center gap-2"
                        >
                          Log an Expense
                        </Button>
                      </div>
                    </div>
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
