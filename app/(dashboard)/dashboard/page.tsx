"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pie, Cell, ResponsiveContainer, Legend, Tooltip, PieLabelRenderProps, LabelList, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line } from "recharts"
import { DollarSign, TrendingUp, Wallet, PiggyBank, CreditCard, Building2, ArrowUpRight, ArrowDownRight, AlertTriangle, Plus, Activity, TrendingDown, Calendar, Clock, Target, BarChart3, ArrowRight } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { CardSkeleton, CardGridSkeleton } from "@/components/skeletons/card-skeleton"
import { ChartSkeleton, PieChartSkeleton } from "@/components/skeletons/chart-skeleton"

// Lazy load modals and charts to improve initial load time
const AddIncomeModal = dynamic(() => import("@/components/modals/add-income-modal").then(mod => ({ default: mod.AddIncomeModal })), { 
  ssr: false,
  loading: () => null
})
const AddExpenseModal = dynamic(() => import("@/components/modals/add-expense-modal").then(mod => ({ default: mod.AddExpenseModal })), { 
  ssr: false,
  loading: () => null
})
const TransferModal = dynamic(() => import("@/components/modals/transfer-modal").then(mod => ({ default: mod.TransferModal })), { 
  ssr: false,
  loading: () => null
})

// Lazy load charts
const LazyPieChart = dynamic(() => import("recharts").then(mod => mod.PieChart), { 
  ssr: false,
  loading: () => <PieChartSkeleton />
})
const LazyLineChart = dynamic(() => import("recharts").then(mod => mod.LineChart), { 
  ssr: false,
  loading: () => <ChartSkeleton />
})

interface Breakdown {
  income: number
  fixedCosts: number
  savings: number
  investment: number
  guiltFreeSpending: number
  total: number
}

interface FundAllocation {
  id: string
  fixedCostsType: string
  fixedCostsValue: number
  fixedCostsCap: number | null
  savingsType: string
  savingsValue: number
  savingsCap: number | null
  investmentType: string
  investmentValue: number
  investmentCap: number | null
  guiltFreeSpendingType: string
  guiltFreeSpendingValue: number
  guiltFreeSpendingCap: number | null
}

interface Account {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  isDefault: boolean
}

interface CategoryBalance {
  id: string
  category: string
  balance: number
}

interface Expense {
  id: string
  amount: number
  description: string | null
  category: string | null
  date: string
  account: {
    id: string
    name: string
    bankName: string
  }
}

interface Transfer {
  id: string
  amount: number
  description: string | null
  category: string | null
  date: string
  fromAccount: {
    id: string
    name: string
    bankName: string
  }
  toAccount: {
    id: string
    name: string
    bankName: string
  }
}

interface IncomeEntry {
  id: string
  amount: number
  date: string
  account: {
    id: string
    name: string
    bankName: string
    accountType?: string
  } | null
}

interface CategoryTracking {
  allocated: number
  spent: number
  transferred: number
  remaining: number
  carryover: number
  overspending: number
  available: number
  overspent: number
}

interface MonthlyHistory {
  month: string
  allocated: number
  spent: number
  remaining: number
}

const COLORS = {
  fixedCosts: "#ef4444",
  savings: "#10b981",
  investment: "#3b82f6",
  guiltFreeSpending: "#8b5cf6",
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null)
  const [fundAllocation, setFundAllocation] = useState<FundAllocation | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<CategoryBalance[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([])
  const [categoryTracking, setCategoryTracking] = useState<Record<string, CategoryTracking>>({})
  const [monthlyHistory, setMonthlyHistory] = useState<Record<string, MonthlyHistory[]>>({})
  const [loading, setLoading] = useState(true)
  const [criticalDataLoaded, setCriticalDataLoaded] = useState(false)
  const [secondaryDataLoaded, setSecondaryDataLoaded] = useState(false)
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchData()
    }
  }, [status, router])

  // Load critical data first (what users see immediately)
  const fetchCriticalData = async () => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      // Load only critical data in parallel
      const [allocationRes, incomeRes, accountsRes, balancesRes] = await Promise.all([
        fetch("/api/fund-allocation"),
        fetch("/api/income-entries?currentMonth=true"),
        fetch("/api/accounts"),
        fetch("/api/category-balances"),
      ])

      if (allocationRes.ok) {
        const allocation = await allocationRes.json()
        setFundAllocation(allocation)
      }

      if (incomeRes.ok) {
        const data = await incomeRes.json()
        if (data.breakdown) {
          setBreakdown(data.breakdown)
        }
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json()
        setAccounts(data.accounts || [])
      }

      if (balancesRes.ok) {
        const data = await balancesRes.json()
        setBalances(data.balances || [])
      }

      setCriticalDataLoaded(true)
    } catch (error) {
      console.error("Error fetching critical data:", error)
    }
  }

  // Load secondary data after critical data is loaded
  const fetchSecondaryData = async () => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      // Load secondary data in parallel
      const [expensesRes, transfersRes, incomeEntriesRes, categoryTrackingRes, historyRes] = await Promise.all([
        fetch(`/api/expenses?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`),
        fetch(`/api/transfers?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`),
        fetch("/api/income-entries"),
        fetch("/api/category-tracking"),
        fetch("/api/category-tracking/history"),
      ])

      if (expensesRes.ok) {
        const data = await expensesRes.json()
        setExpenses(data.expenses || [])
      }

      if (transfersRes.ok) {
        const data = await transfersRes.json()
        setTransfers(data.transfers || [])
      }

      if (incomeEntriesRes.ok) {
        const data = await incomeEntriesRes.json()
        setIncomeEntries(data.entries || [])
      }

      if (categoryTrackingRes.ok) {
        const data = await categoryTrackingRes.json()
        setCategoryTracking(data.tracking || {})
      }

      if (historyRes.ok) {
        const data = await historyRes.json()
        setMonthlyHistory(data.history || {})
      }

      setSecondaryDataLoaded(true)
    } catch (error) {
      console.error("Error fetching secondary data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    // Load critical data first
    await fetchCriticalData()
    // Then load secondary data
    await fetchSecondaryData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (status === "loading") {
    return <DashboardSkeleton />
  }

  if (loading && !criticalDataLoaded) {
    return <DashboardSkeleton />
  }

  if (!session) return null

  const chartData = breakdown
    ? [
        { name: "Fixed Costs", value: breakdown.fixedCosts, color: COLORS.fixedCosts },
        { name: "Savings", value: breakdown.savings, color: COLORS.savings },
        { name: "Investment", value: breakdown.investment, color: COLORS.investment },
        { name: "Guilt-Free Spending", value: breakdown.guiltFreeSpending, color: COLORS.guiltFreeSpending },
      ].filter((item) => item.value > 0)
    : []

  // All money is allocated according to fund settings - no remaining

  const getBalance = (category: string) => {
    const balance = balances.find((b) => b.category === category)
    return balance?.balance || 0
  }

  const getCapInfo = (category: string, cap: number | null) => {
    if (!cap) return null
    const currentBalance = getBalance(category)
    const remaining = Math.max(0, cap - currentBalance)
    const percentageUsed = cap > 0 ? (currentBalance / cap) * 100 : 0
    return { currentBalance, remaining, percentageUsed, cap }
  }

  const categoryInfo = [
    {
      name: "Fixed Costs",
      amount: breakdown?.fixedCosts || 0,
      color: "red",
      cap: fundAllocation?.fixedCostsCap || null,
    },
    {
      name: "Savings",
      amount: breakdown?.savings || 0,
      color: "green",
      cap: fundAllocation?.savingsCap || null,
    },
    {
      name: "Investment",
      amount: breakdown?.investment || 0,
      color: "blue",
      cap: fundAllocation?.investmentCap || null,
    },
    {
      name: "Guilt-Free Spending",
      amount: breakdown?.guiltFreeSpending || 0,
      color: "purple",
      cap: fundAllocation?.guiltFreeSpendingCap || null,
    },
  ]

  return (
    <>
          <Header title="Dashboard" />
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {!breakdown ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No income data</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Calculate your first breakdown to see your financial overview
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
                    {/* Summary Cards */}
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(breakdown.income)}</div>
                  <p className="text-xs text-gray-500 mt-1">Current month total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(breakdown.total)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Savings</CardTitle>
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(breakdown.savings)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Row */}
            {(() => {
              const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
              const totalAllocated = breakdown?.total || 0
              const remainingBudget = totalAllocated - totalExpenses
              const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
              const currentDay = new Date().getDate()
              const daysRemaining = daysInMonth - currentDay
              const avgDailySpending = currentDay > 0 ? totalExpenses / currentDay : 0
              const netWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0)

              return (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">Total Expenses</CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                      <p className="text-xs text-gray-500 mt-1">This month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">Remaining Budget</CardTitle>
                      <Target className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-xl font-bold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(remainingBudget)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Available</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">Daily Average</CardTitle>
                      <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{formatCurrency(avgDailySpending)}</div>
                      <p className="text-xs text-gray-500 mt-1">Per day</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">Days Remaining</CardTitle>
                      <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{daysRemaining}</div>
                      <p className="text-xs text-gray-500 mt-1">In month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">Net Worth</CardTitle>
                      <Wallet className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-indigo-600">{formatCurrency(netWorth)}</div>
                      <p className="text-xs text-gray-500 mt-1">All accounts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">Spending %</CardTitle>
                      <BarChart3 className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">
                        {totalAllocated > 0 ? ((totalExpenses / totalAllocated) * 100).toFixed(0) : 0}%
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Of allocated</p>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Quick Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common tasks and navigation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  <button
                    onClick={() => setShowIncomeModal(true)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Add Income</span>
                  </button>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium">Add Expense</span>
                  </button>
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <ArrowRight className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">Transfer</span>
                  </button>
                  <Link href="/dashboard/statement" className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium">View Statement</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Spending Summary & Comparison */}
            {(() => {
              const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
              const totalAllocated = breakdown?.total || 0
              const spendingPercentage = totalAllocated > 0 ? (totalExpenses / totalAllocated) * 100 : 0
              
              // Get last month data
              const now = new Date()
              const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
              const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
              const lastMonthIncome = incomeEntries
                .filter(entry => {
                  const entryDate = new Date(entry.date)
                  return entryDate >= lastMonthStart && entryDate <= lastMonthEnd
                })
                .reduce((sum, e) => sum + e.amount, 0)
              
              const currentMonthIncome = breakdown?.income || 0
              const incomeChange = lastMonthIncome > 0 
                ? ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 
                : 0

              return (
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Spending Summary</CardTitle>
                      <CardDescription>Spent vs allocated this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Allocated</span>
                          <span className="text-lg font-semibold">{formatCurrency(totalAllocated)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Spent</span>
                          <span className="text-lg font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              spendingPercentage >= 100
                                ? "bg-red-500"
                                : spendingPercentage >= 80
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(100, spendingPercentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{spendingPercentage.toFixed(1)}% spent</span>
                          <span className={`font-medium ${
                            spendingPercentage >= 100 ? "text-red-600" : 
                            spendingPercentage >= 80 ? "text-yellow-600" : 
                            "text-green-600"
                          }`}>
                            {spendingPercentage >= 100 ? "Over budget" : 
                             spendingPercentage >= 80 ? "Near limit" : 
                             "On track"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Comparison</CardTitle>
                      <CardDescription>This month vs last month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Income</span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold">{formatCurrency(currentMonthIncome)}</span>
                              {incomeChange !== 0 && (
                                <span className={`text-xs flex items-center gap-1 ${
                                  incomeChange > 0 ? "text-green-600" : "text-red-600"
                                }`}>
                                  {incomeChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                  {Math.abs(incomeChange).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">Last month: {formatCurrency(lastMonthIncome)}</div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Expenses</span>
                            <span className="text-lg font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Spending Alerts */}
            {(() => {
              const alerts: Array<{ category: string; message: string; severity: "warning" | "danger" }> = []
              
              Object.entries(categoryTracking).forEach(([cat, tracking]) => {
                const categoryName = cat === "fixedCosts" ? "Fixed Costs" :
                                    cat === "investment" ? "Investment" :
                                    cat === "guiltFreeSpending" ? "Guilt-Free Spending" : "Savings"
                
                if (tracking.overspent > 0) {
                  alerts.push({
                    category: categoryName,
                    message: `Overspent by ${formatCurrency(tracking.overspent)}`,
                    severity: "danger"
                  })
                } else if (tracking.remaining < tracking.allocated * 0.2 && tracking.remaining > 0) {
                  alerts.push({
                    category: categoryName,
                    message: `Only ${formatCurrency(tracking.remaining)} remaining (${((tracking.remaining / tracking.allocated) * 100).toFixed(0)}%)`,
                    severity: "warning"
                  })
                }
              })

              if (alerts.length === 0) return null

              return (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-5 w-5" />
                      Spending Alerts
                    </CardTitle>
                    <CardDescription className="text-yellow-700">Important budget warnings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.map((alert, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            alert.severity === "danger"
                              ? "bg-red-50 border-red-200 text-red-800"
                              : "bg-yellow-50 border-yellow-200 text-yellow-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">{alert.category}:</span>
                            <span className="text-sm">{alert.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

                    {/* Chart and Breakdown */}
                    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Allocation Breakdown</CardTitle>
                  <CardDescription>Visual distribution of your monthly funds</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LazyPieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(props: PieLabelRenderProps) => {
                            const { name, percent } = props
                            if (!name || percent === undefined) return ""
                            return `${name}: ${(percent * 100).toFixed(0)}%`
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number | undefined) => 
                          value !== undefined ? formatCurrency(value) : ""
                        } />
                        <Legend wrapperStyle={{ fontSize: '12px' }} iconSize={12} />
                      </LazyPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-gray-500">
                      No data to display
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fund Details</CardTitle>
                  <CardDescription>Monthly breakdown by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryInfo.map((cat) => {
                      const capInfo = getCapInfo(
                        cat.name === "Fixed Costs" ? "fixedCosts" :
                        cat.name === "Savings" ? "savings" :
                        cat.name === "Investment" ? "investment" : "guiltFreeSpending",
                        cat.cap
                      )
                      
                      const getColorClasses = (color: string) => {
                        switch (color) {
                          case "red":
                            return {
                              bg: "bg-red-50",
                              text: "text-red-700",
                              border: "border-red-200",
                              textBold: "text-red-900",
                            }
                          case "green":
                            return {
                              bg: "bg-green-50",
                              text: "text-green-700",
                              border: "border-green-200",
                              textBold: "text-green-900",
                            }
                          case "blue":
                            return {
                              bg: "bg-blue-50",
                              text: "text-blue-700",
                              border: "border-blue-200",
                              textBold: "text-blue-900",
                            }
                          case "purple":
                            return {
                              bg: "bg-purple-50",
                              text: "text-purple-700",
                              border: "border-purple-200",
                              textBold: "text-purple-900",
                            }
                          default:
                            return {
                              bg: "bg-gray-50",
                              text: "text-gray-700",
                              border: "border-gray-200",
                              textBold: "text-gray-900",
                            }
                        }
                      }
                      
                      const colors = getColorClasses(cat.color)

                      return (
                        <div key={cat.name} className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium ${colors.text}`}>{cat.name}</span>
                            <span className={`font-semibold ${colors.textBold}`}>
                              {formatCurrency(cat.amount)}
                            </span>
                          </div>
                          {capInfo && (
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Cap: {formatCurrency(capInfo.cap)}</span>
                                <span className={capInfo.remaining > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                  {capInfo.remaining > 0 
                                    ? `${formatCurrency(capInfo.remaining)} remaining`
                                    : "Cap reached"}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    capInfo.percentageUsed >= 100 
                                      ? "bg-red-500" 
                                      : capInfo.percentageUsed >= 80 
                                      ? "bg-yellow-500" 
                                      : "bg-green-500"
                                  }`}
                                  style={{ width: `${Math.min(100, capInfo.percentageUsed)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Spending Breakdown & Budget Progress */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Category Spending Breakdown</CardTitle>
                  <CardDescription>Spending distribution by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const categorySpending: Record<string, number> = {
                      fixedCosts: 0,
                      investment: 0,
                      savings: 0,
                      guiltFreeSpending: 0,
                    }
                    
                    expenses.forEach(exp => {
                      if (exp.category && categorySpending[exp.category] !== undefined) {
                        categorySpending[exp.category] += exp.amount
                      }
                    })

                    const spendingData = [
                      { name: "Fixed Costs", value: categorySpending.fixedCosts, color: COLORS.fixedCosts },
                      { name: "Investment", value: categorySpending.investment, color: COLORS.investment },
                      { name: "Savings", value: categorySpending.savings, color: COLORS.savings },
                      { name: "Guilt-Free", value: categorySpending.guiltFreeSpending, color: COLORS.guiltFreeSpending },
                    ].filter(item => item.value > 0)

                    if (spendingData.length === 0) {
                      return (
                        <div className="flex h-[250px] items-center justify-center text-gray-500">
                          No spending data this month
                        </div>
                      )
                    }

                    return (
                        <ResponsiveContainer width="100%" height={250}>
                         <LazyPieChart>
                          <Pie
                            data={spendingData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => {
                              const total = spendingData.reduce((sum, d) => sum + d.value, 0)
                              const percent = total > 0 ? ((entry.value / total) * 100).toFixed(0) : "0"
                              return `${entry.name}: ${percent}%`
                            }}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {spendingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number | undefined) =>
                            value !== undefined ? formatCurrency(value) : ""
                          } />
                          <Legend wrapperStyle={{ fontSize: '12px' }} iconSize={12} />
                         </LazyPieChart>
                        </ResponsiveContainer>
                      )
                    })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Budget Progress Indicators</CardTitle>
                  <CardDescription>Spending progress by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(categoryTracking).map(([cat, tracking]) => {
                      const categoryName = cat === "fixedCosts" ? "Fixed Costs" :
                                          cat === "investment" ? "Investment" :
                                          cat === "guiltFreeSpending" ? "Guilt-Free Spending" : "Savings"
                      const progress = tracking.allocated > 0 
                        ? ((tracking.spent + tracking.transferred) / tracking.allocated) * 100 
                        : 0
                      const color = progress >= 100 ? "red" : progress >= 80 ? "yellow" : "green"
                      
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{categoryName}</span>
                            <span className={`font-semibold ${
                              progress >= 100 ? "text-red-600" : 
                              progress >= 80 ? "text-yellow-600" : 
                              "text-green-600"
                            }`}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                progress >= 100 ? "bg-red-500" : 
                                progress >= 80 ? "bg-yellow-500" : 
                                "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Spent: {formatCurrency(tracking.spent + tracking.transferred)}</span>
                            <span>Allocated: {formatCurrency(tracking.allocated)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend Chart */}
            {!secondaryDataLoaded ? (
              <ChartSkeleton />
            ) : (() => {
              const trendData = Object.entries(monthlyHistory).flatMap(([category, history]) => {
                return history.slice(-6).map(h => ({
                  month: h.month,
                  category,
                  allocated: h.allocated,
                  spent: h.spent,
                }))
              })

              const months = Array.from(new Set(trendData.map(d => d.month))).sort()
              const chartData = months.map(month => {
                const monthData = trendData.filter(d => d.month === month)
                return {
                  month,
                  allocated: monthData.reduce((sum, d) => sum + d.allocated, 0),
                  spent: monthData.reduce((sum, d) => sum + d.spent, 0),
                }
              })

              if (chartData.length === 0) return null

              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Trend</CardTitle>
                    <CardDescription>Income allocation and spending over the last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LazyLineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number | undefined) =>
                          value !== undefined ? formatCurrency(value) : ""
                        } />
                        <Legend wrapperStyle={{ fontSize: '12px' }} iconSize={12} />
                        <Line type="monotone" dataKey="allocated" stroke="#3b82f6" strokeWidth={2} name="Allocated" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="spent" stroke="#ef4444" strokeWidth={2} name="Spent" dot={{ r: 4 }} />
                      </LazyLineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Recent Activity Feed & Top Spending Categories */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {!secondaryDataLoaded ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Last 10 transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allTransactions: Array<{
                      id: string
                      type: "income" | "expense" | "transfer"
                      amount: number
                      description: string
                      date: string
                      account?: string
                    }> = []

                    // Add income entries
                    incomeEntries.slice(0, 5).forEach(entry => {
                      allTransactions.push({
                        id: entry.id,
                        type: "income",
                        amount: entry.amount,
                        description: `Income${entry.account ? ` - ${entry.account.name}` : ""}`,
                        date: entry.date,
                        account: entry.account?.name,
                      })
                    })

                    // Add expenses
                    expenses.slice(0, 5).forEach(exp => {
                      allTransactions.push({
                        id: exp.id,
                        type: "expense",
                        amount: exp.amount,
                        description: exp.description || "Expense",
                        date: exp.date,
                        account: exp.account.name,
                      })
                    })

                    // Add transfers
                    transfers.slice(0, 5).forEach(transfer => {
                      allTransactions.push({
                        id: transfer.id,
                        type: "transfer",
                        amount: transfer.amount,
                        description: transfer.description || `Transfer: ${transfer.fromAccount.name} → ${transfer.toAccount.name}`,
                        date: transfer.date,
                      })
                    })

                    // Sort by date and take top 10
                    const sorted = allTransactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 10)

                    if (sorted.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          No recent transactions
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {sorted.map(transaction => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`p-2 rounded-full ${
                                transaction.type === "income" ? "bg-green-100 text-green-600" :
                                transaction.type === "expense" ? "bg-red-100 text-red-600" :
                                "bg-blue-100 text-blue-600"
                              }`}>
                                {transaction.type === "income" ? (
                                  <ArrowUpRight className="h-4 w-4" />
                                ) : transaction.type === "expense" ? (
                                  <ArrowDownRight className="h-4 w-4" />
                                ) : (
                                  <ArrowRight className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{transaction.description}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(transaction.date).toLocaleDateString()} {transaction.account && `• ${transaction.account}`}
                                </p>
                              </div>
                            </div>
                            <div className={`text-sm font-semibold ${
                              transaction.type === "income" ? "text-green-600" :
                              transaction.type === "expense" ? "text-red-600" :
                              "text-blue-600"
                            }`}>
                              {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                              {formatCurrency(transaction.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                  <div className="mt-4 pt-4 border-t">
                    <Link href="/dashboard/statement" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      View all transactions <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Spending Categories</CardTitle>
                  <CardDescription>Where your money goes this month</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const categoryTotals: Record<string, number> = {}
                    
                    expenses.forEach(exp => {
                      const cat = exp.category || "uncategorized"
                      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount
                    })

                    const topCategories = Object.entries(categoryTotals)
                      .map(([category, amount]) => ({
                        category: category === "fixedCosts" ? "Fixed Costs" :
                                 category === "investment" ? "Investment" :
                                 category === "savings" ? "Savings" :
                                 category === "guiltFreeSpending" ? "Guilt-Free Spending" :
                                 category,
                        amount,
                      }))
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 5)

                    if (topCategories.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          No spending data this month
                        </div>
                      )
                    }

                    const maxAmount = Math.max(...topCategories.map(c => c.amount))

                    return (
                      <div className="space-y-3">
                        {topCategories.map((cat, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{cat.category}</span>
                              <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-blue-500 transition-all"
                                style={{ width: `${(cat.amount / maxAmount) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
                </>
              )}
            </div>

            {/* Account Balance Summary */}
            {accounts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Account Balance Summary
                  </CardTitle>
                  <CardDescription>Total balances by account type</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const accountTypes: Record<string, { total: number; count: number; accounts: Account[] }> = {}
                    
                    accounts.forEach(acc => {
                      if (!accountTypes[acc.accountType]) {
                        accountTypes[acc.accountType] = { total: 0, count: 0, accounts: [] }
                      }
                      accountTypes[acc.accountType].total += acc.balance
                      accountTypes[acc.accountType].count += 1
                      accountTypes[acc.accountType].accounts.push(acc)
                    })

                    const totalNetWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0)

                    return (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {Object.entries(accountTypes).map(([type, data]) => (
                            <div key={type} className="p-4 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1 capitalize">{type}</div>
                              <div className="text-2xl font-bold">{formatCurrency(data.total)}</div>
                              <div className="text-xs text-gray-500 mt-1">{data.count} account{data.count !== 1 ? 's' : ''}</div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total Net Worth</span>
                            <span className="text-2xl font-bold text-indigo-600">{formatCurrency(totalNetWorth)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Accounts Section */}
            {accounts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Your Accounts
                  </CardTitle>
                  <CardDescription>Account balances and details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        className={`p-4 rounded-lg border-2 ${
                          account.isDefault
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{account.name}</h4>
                            <p className="text-sm text-gray-500">{account.bankName}</p>
                          </div>
                          {account.isDefault && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-1">Balance</div>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(account.balance)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 capitalize">
                            {account.accountType}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Modals */}
        <AddIncomeModal
          open={showIncomeModal}
          onOpenChange={setShowIncomeModal}
          onSuccess={() => {
            fetchData()
            setShowIncomeModal(false)
          }}
        />
        <AddExpenseModal
          open={showExpenseModal}
          onOpenChange={setShowExpenseModal}
          onSuccess={() => {
            fetchData()
            setShowExpenseModal(false)
          }}
        />
        <TransferModal
          open={showTransferModal}
          onOpenChange={setShowTransferModal}
          onSuccess={() => {
            fetchData()
            setShowTransferModal(false)
          }}
        />
      </div>
    </>
  )
}
