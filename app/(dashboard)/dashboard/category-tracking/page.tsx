"use client"

import { useEffect, useState } from "react"
import { SummaryCardsSkeleton, ChartsSkeleton, CategoryDetailsSkeleton, RecentExpensesSkeleton } from "@/components/skeletons/category-tracking-sections"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingDown, Wallet, TrendingUp, PiggyBank, CreditCard, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

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

  return (
    <>
      <Header title="Category Tracking" />
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
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

        {/* Summary Cards - Dashboard Style */}
        {loadingSummary ? (
          <SummaryCardsSkeleton />
        ) : tracking ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const data = tracking[cat.key]
            if (!data) return null

            const isOverspent = data.overspent > 0
            const Icon = cat.icon

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
                      <span>Spent:</span>
                      <span className="font-medium text-red-600">{formatCurrency(data.spent)}</span>
                    </div>
                    {data.transferred > 0 && (
                      <div className="flex justify-between">
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

        {/* Charts Section */}
        {loadingCharts ? (
          <ChartsSkeleton />
        ) : history ? (
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
        ) : null}

        {/* Category Details Cards */}
        {loadingDetails ? (
          <CategoryDetailsSkeleton />
        ) : tracking ? (
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
                      <div className="text-xs text-red-600 mb-1">Spent</div>
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

        {/* Recent Expenses */}
        {loadingExpenses ? (
          <RecentExpensesSkeleton />
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses by Category</CardTitle>
            <CardDescription>Expenses linked to fund categories for the current month</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No expenses with fund categories yet.</p>
                <p className="text-sm mt-2">
                  <button
                    onClick={() => router.push("/dashboard/expenses")}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Log an expense
                  </button>
                  {" "}and select a fund category to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => {
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
                            {expense.account?.name} ({expense.account?.bankName}) • {formatDate(expense.date)}
                          </div>
                        </div>
                        <div className="font-semibold text-red-600">
                          -{formatCurrency(expense.amount)}
                        </div>
                      </div>
                    </div>
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
