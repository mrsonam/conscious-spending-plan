"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AppSelect } from "@/components/ui/app-select"
import {
  TrendingDown,
  Wallet,
  TrendingUp,
  PiggyBank,
  CreditCard,
  BarChart3,
  PieChart as PieChartIcon,
  Lightbulb,
  Calendar,
  ArrowRight,
  LayoutDashboard,
  Receipt,
  Banknote,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { SummaryCardsSkeleton, ChartsSkeleton } from "@/components/skeletons/category-tracking-sections"
import { useCategoryTrackingPage } from "@/hooks/use-category-tracking-page"
import { TRACKING_FUND_CATEGORIES, expenseTypeLabel } from "@/lib/category-tracking-shared"

export { type CategoryTrackingRow } from "@/lib/category-tracking-shared"

export function CategoryTrackingClassic() {
  const p = useCategoryTrackingPage()
  const {
    status,
    tracking,
    totalIncomeForMonth,
    expenses,
    history,
    loading,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    fetchData,
    monthOptions,
    selectedMonthLabel,
    formatCurrency,
    formatDate,
    totalAllocated,
    totalSpent,
    totalRemaining,
    overallUsage,
    elapsed,
    categoryDistribution,
    allocationMix,
    spendShare,
    expenseTypeRollup,
    momSpend,
    chartRows,
    lineRows,
    insights,
  } = p

  const CATEGORIES = TRACKING_FUND_CATEGORIES

  if (status !== "authenticated") return null

  const hasTracking = tracking != null
  const isCurrentPeriod =
    selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fund buckets</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              Allocation and spend by conscious-spending pillar for{" "}
              <span className="font-medium text-gray-900">{selectedMonthLabel}</span>.
              Expenses are tagged by fund on the{" "}
              <Link
                href="/classic/expenses"
                className="font-medium text-indigo-600 underline-offset-2 hover:underline"
              >
                Expenses
              </Link>{" "}
              page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <label htmlFor="month-select" className="text-sm font-medium text-gray-700">
                Month
              </label>
            </div>
            <AppSelect
              id="month-select"
              value={`${selectedYear}-${selectedMonth}`}
              onValueChange={(v) => {
                const [y, m] = v.split("-").map(Number)
                setSelectedYear(y)
                setSelectedMonth(m)
              }}
              variant="classic"
              className="rounded-lg border border-gray-300 shadow-sm"
              options={monthOptions.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
            {!isCurrentPeriod ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  const d = new Date()
                  setSelectedMonth(d.getMonth() + 1)
                  setSelectedYear(d.getFullYear())
                }}
              >
                This month
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/classic/expenses" className="gap-1.5">
              <Receipt className="h-4 w-4" />
              Log expense
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/classic/income" className="gap-1.5">
              <Banknote className="h-4 w-4" />
              Income
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/classic/dashboard" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>

        {loading ? (
          <>
            <SummaryCardsSkeleton />
            <ChartsSkeleton />
          </>
        ) : !hasTracking ? (
          <Card>
            <CardContent className="py-14">
              <div className="mx-auto max-w-md text-center">
                <p className="text-sm text-gray-600">
                  Couldn&apos;t load category data. Refresh the page or try again later.
                </p>
                <Button
                  className="mt-4"
                  type="button"
                  variant="outline"
                  onClick={() => void fetchData({ bypassCache: true })}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {totalIncomeForMonth === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <span className="font-medium">No income recorded for {selectedMonthLabel}.</span>{" "}
                Allocations may show $0 until you log income with fund splits from the dashboard.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {totalIncomeForMonth != null && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Income (month)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalIncomeForMonth)}</div>
                    <p className="mt-1 text-xs text-gray-500">Allocated to budget</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Allocated</CardTitle>
                  <Wallet className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalAllocated)}</div>
                  <p className="mt-1 text-xs text-gray-500">
                    {totalIncomeForMonth != null &&
                    Math.abs(totalAllocated - totalIncomeForMonth) < 0.02
                      ? "Matches income"
                      : "From income splits"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Spent / invested</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</div>
                  <p className="mt-1 text-xs text-gray-500">{overallUsage.toFixed(1)}% of allocated</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(totalRemaining)}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Left in buckets</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">6-mo trend</CardTitle>
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  {momSpend ? (
                    <>
                      <div
                        className={cn(
                          "text-2xl font-bold",
                          momSpend.delta > 0
                            ? "text-red-600"
                            : momSpend.delta < 0
                              ? "text-emerald-700"
                              : "text-gray-900",
                        )}
                      >
                        {momSpend.delta > 0 ? "+" : ""}
                        {formatCurrency(momSpend.delta)}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Total spend vs prior month in history
                        {momSpend.pct != null && (
                          <span className="ml-1">
                            ({momSpend.pct > 0 ? "+" : ""}
                            {momSpend.pct.toFixed(1)}%)
                          </span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Need 2+ months of data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Income → buckets</CardTitle>
                  <CardDescription>Share of this month&apos;s income assigned to each fund</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allocationMix.length > 0 ? (
                    <>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        {allocationMix.map((a) => (
                          <div
                            key={a.key}
                            title={`${a.label}: ${a.pct.toFixed(1)}%`}
                            className="h-full min-w-[4px] transition-all"
                            style={{
                              width: `${Math.max(0.5, a.pct)}%`,
                              backgroundColor: a.color,
                            }}
                          />
                        ))}
                      </div>
                      <ul className="space-y-2 text-sm">
                        {allocationMix.map((a) => (
                          <li key={a.key} className="flex justify-between gap-2">
                            <span className="flex items-center gap-2 text-gray-700">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: a.color }}
                              />
                              {CATEGORIES.find((c) => c.key === a.key)?.label}
                            </span>
                            <span className="tabular-nums text-gray-900">
                              {formatCurrency(a.amount)}{" "}
                              <span className="text-gray-500">({a.pct.toFixed(1)}%)</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No income recorded for this month.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Spend mix</CardTitle>
                  <CardDescription>
                    Where this month&apos;s spend landed (excl. zero-activity buckets)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {spendShare.length > 0 ? (
                    <ul className="space-y-2">
                      {spendShare.map((s) => (
                        <li key={s.key}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-gray-700">{s.label}</span>
                            <span className="tabular-nums font-medium text-gray-900">
                              {formatCurrency(s.amount)}{" "}
                              <span className="font-normal text-gray-500">({s.pct.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, s.pct)}%`,
                                backgroundColor: s.color,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No spend recorded for this month.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Buckets</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {CATEGORIES.map((cat) => {
                  const data = tracking![cat.key]
                  if (!data) return null
                  const isOverspent = data.overspent > 0
                  const usagePercent =
                    data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0
                  const Icon = cat.Icon
                  let paceLabel = "—"
                  if (elapsed <= 0) paceLabel = "Future month"
                  else if (elapsed >= 1) paceLabel = "Closed month"
                  else {
                    const paceRatio = usagePercent / (elapsed * 100)
                    if (paceRatio > 1.15) paceLabel = "Above pace"
                    else if (paceRatio < 0.85) paceLabel = "Below pace"
                    else paceLabel = "On pace"
                  }

                  return (
                    <Card
                      key={cat.key}
                      className={cn(isOverspent && "border-2 border-red-300")}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{cat.label}</CardTitle>
                        <Icon className={cn("h-4 w-4", cat.iconClass)} />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="text-2xl font-bold">{formatCurrency(data.remaining)}</div>
                          <p className={cn("text-xs", isOverspent ? "text-red-600" : "text-gray-500")}>
                            {isOverspent
                              ? `Over by ${formatCurrency(data.overspent)}`
                              : "Remaining in bucket"}
                          </p>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Allocated</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(data.allocated)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>{cat.key === "investment" ? "Invested" : "Spent"}</span>
                            <span className="font-medium text-red-600">{formatCurrency(data.spent)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Usage</span>
                            <span
                              className={cn(
                                "font-medium",
                                isOverspent
                                  ? "text-red-600"
                                  : usagePercent > 80
                                    ? "text-amber-600"
                                    : "text-emerald-600",
                              )}
                            >
                              {usagePercent.toFixed(1)}%
                            </span>
                          </div>
                          {data.transferred > 0 && (
                            <div className="flex justify-between">
                              <span>Transferred</span>
                              <span className="font-medium text-blue-600">
                                {formatCurrency(data.transferred)}
                              </span>
                            </div>
                          )}
                          {(data.carryover > 0 || data.overspending > 0) && (
                            <div className="mt-2 border-t border-gray-100 pt-2">
                              {data.carryover > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                  <span>Carryover</span>
                                  <span>+{formatCurrency(data.carryover)}</span>
                                </div>
                              )}
                              {data.overspending > 0 && (
                                <div className="flex justify-between text-red-600">
                                  <span>Prior overspend</span>
                                  <span>-{formatCurrency(data.overspending)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="rounded-md bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600">
                          Pace: <span className="font-medium text-gray-900">{paceLabel}</span>
                          {elapsed > 0 && elapsed < 1 && (
                            <span className="text-gray-500">
                              {" "}
                              (~{(elapsed * 100).toFixed(0)}% of month elapsed)
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-200">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              isOverspent
                                ? "bg-red-500"
                                : data.remaining > data.allocated * 0.2
                                  ? "bg-emerald-500"
                                  : "bg-amber-400",
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
            </div>

            {history && history.fixedCosts && history.fixedCosts.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-5 w-5" />
                      Spend by bucket (6 months)
                    </CardTitle>
                    <CardDescription>Stacked from your ledger history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartRows}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: number | undefined) =>
                            v !== undefined ? formatCurrency(v) : ""
                          }
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconSize={12} />
                        <Bar dataKey="Fixed costs" fill="#ef4444" />
                        <Bar dataKey="Investment" fill="#3b82f6" />
                        <Bar dataKey="Savings" fill="#10b981" />
                        <Bar dataKey="Guilt-free" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-5 w-5" />
                      Remaining by bucket
                    </CardTitle>
                    <CardDescription>End-of-month remainder (simplified)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={lineRows}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: number | undefined) =>
                            v !== undefined ? formatCurrency(v) : ""
                          }
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconSize={12} />
                        <Line
                          type="monotone"
                          dataKey="Fixed costs"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="Investment"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="Savings"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="Guilt-free"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {categoryDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChartIcon className="h-5 w-5" />
                    This month&apos;s spend split
                  </CardTitle>
                  <CardDescription>Share of spend by fund ({selectedMonthLabel})</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={88}
                        dataKey="value"
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number | undefined) =>
                          v !== undefined ? formatCurrency(v) : ""
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {expenseTypeRollup.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Expense types</CardTitle>
                    <CardDescription>
                      Subcategories for logged expenses (investment fund excluded from this roll-up)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {expenseTypeRollup.map((row) => (
                        <li
                          key={row.key}
                          className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0"
                        >
                          <span className="text-gray-800">{row.label}</span>
                          <span className="tabular-nums font-semibold text-gray-900">
                            {formatCurrency(row.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">Recent expenses</CardTitle>
                    <CardDescription>Latest in range ({expenses.length} total)</CardDescription>
                  </div>
                  <Link
                    href="/classic/expenses"
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardHeader>
                <CardContent>
                  {expenses.length === 0 ? (
                    <p className="text-sm text-gray-500">No expenses this month in these funds.</p>
                  ) : (
                    <ul className="space-y-2">
                      {expenses.slice(0, 8).map((expense) => {
                        const fund = CATEGORIES.find((c) => c.key === expense.category)
                        return (
                          <li
                            key={expense.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    fund?.borderClass,
                                    "border bg-white",
                                  )}
                                >
                                  {fund?.short ?? expense.category}
                                </span>
                                {expense.expenseCategory && (
                                  <span className="text-xs text-gray-500">
                                    {expenseTypeLabel(expense.expenseCategory)}
                                  </span>
                                )}
                              </div>
                              {expense.description && (
                                <p className="mt-0.5 truncate text-sm text-gray-800">
                                  {expense.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                {expense.account?.name} · {formatDate(expense.date)}
                              </p>
                            </div>
                            <span className="shrink-0 font-semibold text-red-600">
                              -{formatCurrency(expense.amount)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Insights
                </CardTitle>
                <CardDescription>Based on the selected month and your pace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-3 text-sm",
                      item.kind === "warn" && "border-red-200 bg-red-50 text-red-900",
                      item.kind === "tip" && "border-amber-200 bg-amber-50 text-amber-900",
                      item.kind === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-900",
                    )}
                  >
                    <div className="font-medium">{item.title}</div>
                    <p className="mt-1 text-xs opacity-90">{item.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
  )
}
