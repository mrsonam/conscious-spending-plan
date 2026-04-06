"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { AppSelect } from "@/components/ui/app-select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ClassicPaginationBar } from "@/components/ui/classic-pagination-bar"
import { ExpensesListSkeleton } from "@/components/skeletons/expenses-sections"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"
import {
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
  FREQUENCIES,
} from "@/lib/expense-page-constants"
import {
  Plus,
  Trash2,
  TrendingDown,
  Calendar,
  Repeat,
  Play,
  ClipboardList,
} from "lucide-react"

export function ExpensePageClassic(p: UseExpensePageResult) {
  return (
    <>
        {p.message && (
          <div
            className={`p-3 rounded-lg ${
              p.message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {p.message.text}
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Expense Log</h2>
            <p className="text-sm text-gray-500 mt-1">Track your expenses and view history</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={p.showBulkForm ? "outline" : "default"}
              onClick={() => {
                p.setShowBulkForm(!p.showBulkForm)
                p.setMessage(null)
                if (p.accounts.length && !p.bulkAccountId) {
                  p.setBulkAccountId(p.accounts.find((a) => a.isDefault)?.id || p.accounts[0].id)
                }
              }}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              {p.showBulkForm ? "Cancel" : "Bulk add"}
            </Button>
            <Button
              onClick={() => {
                p.setShowAddForm(!p.showAddForm)
                p.setMessage(null)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {p.showAddForm ? "Cancel" : "Add Expense"}
            </Button>
          </div>
        </div>

        {/* Bulk add form */}
        {p.showBulkForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Bulk add expenses
              </CardTitle>
              <CardDescription>
                One expense per line. Columns (comma or tab): <strong>amount</strong>, description, date (DD/MM/YYYY or YYYY-MM-DD), fund category, expense category. Last 4 are optional; use defaults below when omitted. Fund: fixedCosts, investment, savings, guiltFreeSpending (or labels like &quot;Guilt-Free Spending&quot;). Expense: groceries, food, bills, etc. (or labels like &quot;Food &amp; Dining&quot;).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={p.handleBulkSubmit} className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label>Account (Smart Access / default)</Label>
                    <AppSelect
                      value={p.bulkAccountId}
                      onValueChange={p.setBulkAccountId}
                      variant="classic"
                      className="mt-1 rounded-lg"
                      options={p.accounts.map((acc) => ({
                        value: acc.id,
                        label: `${acc.name} (${acc.bankName}) ${acc.isDefault ? "— default" : ""}`,
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Default fund category (used when not in paste)</Label>
                    <AppSelect
                      value={p.bulkFundCategory}
                      onValueChange={p.setBulkFundCategory}
                      variant="classic"
                      className="mt-1 rounded-lg"
                      placeholder="—"
                      options={[
                        { value: "", label: "—" },
                        ...FUND_CATEGORIES.map((c) => ({
                          value: c.value,
                          label: c.label,
                        })),
                      ]}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Default expense category (used when not in paste)</Label>
                    <AppSelect
                      value={p.bulkExpenseCategory}
                      onValueChange={p.setBulkExpenseCategory}
                      variant="classic"
                      className="mt-1 rounded-lg"
                      placeholder="—"
                      options={[
                        { value: "", label: "—" },
                        ...EXPENSE_CATEGORIES.map((c) => ({
                          value: c.value,
                          label: c.label,
                        })),
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <Label>Paste expenses (one per line)</Label>
                  <textarea
                    value={p.bulkText}
                    onChange={(e) => p.setBulkText(e.target.value)}
                    placeholder={"50, lunch, 26/02/2026, guiltFreeSpending, food\n12.5, coffee, 10/02/2026, guiltFreeSpending, food\n30, groceries, 01/02/2026, fixedCosts, groceries"}
                    rows={8}
                    className="mt-1 w-full px-4 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono text-sm"
                  />
                </div>
                <Button type="submit" disabled={p.submittingBulk}>
                  {p.submittingBulk ? "Adding…" : "Add all"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Recurring expenses section */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  Recurring Expenses
                </CardTitle>
                <CardDescription>
                  Add templates for repeat expenses. Use &quot;Log now&quot; to create an expense for today.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  p.setShowRecurringForm(!p.showRecurringForm)
                  p.setMessage(null)
                  if (p.accounts.length && !p.recurringAccountId) {
                    p.setRecurringAccountId(p.accounts.find((a) => a.isDefault)?.id || p.accounts[0].id)
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {p.showRecurringForm ? "Cancel" : "Add Recurring"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {p.showRecurringForm && (
              <form onSubmit={p.handleAddRecurring} className="mb-6 p-4 rounded-lg bg-gray-50 space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label>Account *</Label>
                    <AppSelect
                      value={p.recurringAccountId}
                      onValueChange={p.setRecurringAccountId}
                      required
                      variant="classic"
                      className="mt-1 rounded-lg bg-white"
                      options={p.accounts.map((acc) => ({
                        value: acc.id,
                        label: `${acc.name} (${acc.bankName})`,
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Amount ($) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.recurringAmount}
                      onChange={(e) => p.setRecurringAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Frequency *</Label>
                    <AppSelect
                      value={p.recurringFrequency}
                      onValueChange={p.setRecurringFrequency}
                      variant="classic"
                      className="mt-1 rounded-lg bg-white"
                      options={FREQUENCIES.map((f) => ({
                        value: f.value,
                        label: f.label,
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Start date</Label>
                    <DateInput value={p.recurringStartDate} onChange={(e) => p.setRecurringStartDate(e.target.value)} className="mt-1 scheme-light dark:scheme-dark" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={p.recurringDescription}
                      onChange={(e) => p.setRecurringDescription(e.target.value)}
                      placeholder="e.g. Rent, Netflix"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Fund category</Label>
                    <AppSelect
                      value={p.recurringFundCategory}
                      onValueChange={p.setRecurringFundCategory}
                      variant="classic"
                      className="mt-1 rounded-lg bg-white"
                      placeholder="—"
                      options={[
                        { value: "", label: "—" },
                        ...FUND_CATEGORIES.map((c) => ({
                          value: c.value,
                          label: c.label,
                        })),
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Expense category</Label>
                    <AppSelect
                      value={p.recurringExpenseCategory}
                      onValueChange={p.setRecurringExpenseCategory}
                      variant="classic"
                      className="mt-1 rounded-lg bg-white"
                      placeholder="—"
                      options={[
                        { value: "", label: "—" },
                        ...EXPENSE_CATEGORIES.map((c) => ({
                          value: c.value,
                          label: c.label,
                        })),
                      ]}
                    />
                  </div>
                  <div>
                    <Label>End date (optional)</Label>
                    <DateInput value={p.recurringEndDate} onChange={(e) => p.setRecurringEndDate(e.target.value)} className="mt-1 scheme-light dark:scheme-dark" />
                  </div>
                </div>
                <Button type="submit" disabled={p.submittingRecurring} size="sm">
                  {p.submittingRecurring ? "Adding…" : "Add Recurring Expense"}
                </Button>
              </form>
            )}
            {p.loadingRecurring ? (
              <div className="py-4 text-center text-gray-500 text-sm">Loading…</div>
            ) : p.recurring.length === 0 ? (
              <p className="text-sm text-gray-500">No recurring expenses. Click &quot;Add Recurring&quot; to create one.</p>
            ) : (
              <ul className="space-y-2">
                {p.recurring.map((r) => (
                  <li
                    key={r.id}
                    className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border ${r.isActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900">{p.formatCurrency(r.amount)}</span>
                      <span className="text-xs text-gray-500 capitalize">{r.frequency}</span>
                      {r.description && <span className="text-sm text-gray-600 truncate">{r.description}</span>}
                      <span className="text-xs text-gray-400">{r.account.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => p.handleLogRecurring(r.id)}
                        disabled={p.loggingRecurringId !== null}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {p.loggingRecurringId === r.id ? "Logging…" : "Log now"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => p.handleDeleteRecurring(r.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Add Expense Form */}
        {p.showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Log New Expense</CardTitle>
              <CardDescription>Deduct amount from an account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={p.handleSubmit} className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="account">Account *</Label>
                    <AppSelect
                      id="account"
                      value={p.accountId}
                      onValueChange={(v) => {
                        p.setAccountId(v)
                        const selectedAccount = p.accounts.find((acc) => acc.id === v)
                        if (selectedAccount?.accountType === "cash") {
                          p.setFundCategory("")
                        }
                      }}
                      required
                      variant="classic"
                      className="mt-1 rounded-lg"
                      options={p.accounts.map((account) => ({
                        value: account.id,
                        label: `${account.name} (${account.bankName}) - ${p.formatCurrency(account.balance)}`,
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount ($) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={p.amount}
                      onChange={(e) => p.setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <DateInput
                      id="date"
                      value={p.date}
                      onChange={(e) => p.setDate(e.target.value)}
                      required
                    className="mt-1 scheme-light dark:scheme-dark"
                    />
                  </div>
                  {(() => {
                    const selectedAccount = p.accounts.find(acc => acc.id === p.accountId)
                    const isCashAccount = selectedAccount?.accountType === "cash"
                    
                    if (isCashAccount) {
                      return null // Don't show fund category for cash accounts
                    }
                    
                    return (
                      <div>
                        <Label htmlFor="fundCategory">Fund Category *</Label>
                        <AppSelect
                          id="fundCategory"
                          value={p.fundCategory}
                          onValueChange={p.setFundCategory}
                          required
                          variant="classic"
                          className="mt-1 rounded-lg"
                          placeholder="Select a fund category"
                          options={[
                            { value: "", label: "Select a fund category" },
                            ...FUND_CATEGORIES.map((cat) => ({
                              value: cat.value,
                              label: cat.label,
                            })),
                          ]}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Select which fund this expense belongs to
                        </p>
                      </div>
                    )
                  })()}
                  <div>
                    <Label htmlFor="expenseCategory">Expense Category</Label>
                    <AppSelect
                      id="expenseCategory"
                      value={p.expenseCategory}
                      onValueChange={p.setExpenseCategory}
                      variant="classic"
                      className="mt-1 rounded-lg"
                      placeholder="Select an expense category (optional)"
                      options={[
                        { value: "", label: "Select an expense category (optional)" },
                        ...EXPENSE_CATEGORIES.map((cat) => ({
                          value: cat.value,
                          label: cat.label,
                        })),
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    type="text"
                    value={p.description}
                    onChange={(e) => p.setDescription(e.target.value)}
                    placeholder="Brief description of the expense"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={p.submitting} className="w-full">
                  {p.submitting ? "Logging..." : "Log Expense"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filter by Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="p.filterStartDate">Start Date</Label>
                <DateInput
                  id="p.filterStartDate"
                  value={p.filterStartDate}
                  onChange={(e) => p.setFilterStartDate(e.target.value)}
                  className="mt-1 scheme-light dark:scheme-dark"
                />
              </div>
              <div>
                <Label htmlFor="p.filterEndDate">End Date</Label>
                <DateInput
                  id="p.filterEndDate"
                  value={p.filterEndDate}
                  onChange={(e) => p.setFilterEndDate(e.target.value)}
                  className="mt-1 scheme-light dark:scheme-dark"
                />
              </div>
            </div>
            {(p.filterStartDate || p.filterEndDate) && (
              <Button
                variant="outline"
                onClick={() => {
                  p.setFilterStartDate("")
                  p.setFilterEndDate("")
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Expenses List */}
        {p.loadingExpenses ? (
          <ExpensesListSkeleton />
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>
              {p.expensesTotal === 0
                ? "No expenses logged yet"
                : "Chronological ledger of recorded expenses"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {p.expenses.length === 0 ? (
              <div className="text-center py-12">
                <TrendingDown className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No expenses yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Start tracking your expenses by adding your first expense
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {p.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {p.formatCurrency(expense.amount)}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {expense.account.name} ({expense.account.bankName})
                            </div>
                            {expense.description && (
                              <div className="text-sm text-gray-500 mt-1">{expense.description}</div>
                            )}
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {expense.category && (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                                  Fund: {FUND_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                                </span>
                              )}
                              {expense.expenseCategory && (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                  {EXPENSE_CATEGORIES.find(c => c.value === expense.expenseCategory)?.label || expense.expenseCategory}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-700">
                              {p.formatDate(expense.date)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => p.handleDelete(expense.id)}
                        className="ml-4"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <ClassicPaginationBar
                  page={p.expensesPage}
                  pageSize={p.expensesLimit}
                  total={p.expensesTotal}
                  onPageChange={p.fetchExpenses}
                />
              </>
            )}
          </CardContent>
        </Card>
        )}

        <ConfirmDialog
          open={p.showDeleteConfirm}
          onOpenChange={p.setShowDeleteConfirm}
          title="Delete Expense"
          description="Are you sure you want to delete this expense? The amount will be restored to the account."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={p.confirmDelete}
          variant="destructive"
        />

        <ConfirmDialog
          open={p.showRecurringDeleteConfirm}
          onOpenChange={p.setShowRecurringDeleteConfirm}
          title="Delete recurring expense?"
          description="This only removes the template. Past logged expenses are not affected."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={p.confirmDeleteRecurring}
          variant="destructive"
        />

    </>
  )
}
