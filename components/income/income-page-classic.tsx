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
import {
  IncomeFormSkeleton,
  IncomeHistorySkeleton,
} from "@/components/skeletons/income-sections"
import type { UseIncomePageResult } from "@/hooks/use-income-page"
import {
  Calculator,
  DollarSign,
  Trash2,
} from "lucide-react"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function IncomePageClassic(p: UseIncomePageResult) {
  return (
    <>
      {p.loadingForm ? (
        <IncomeFormSkeleton variant="classic" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Log Income</CardTitle>
            <CardDescription>
              Enter your income to log it and optionally allocate it to budget
              categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={p.handleSubmit} className="space-y-4">
              {p.error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                  {p.error}
                </div>
              )}

              <div>
                <Label htmlFor="income-classic">Income ($)</Label>
                <Input
                  id="income-classic"
                  type="number"
                  value={p.income}
                  onChange={(e) => p.setIncome(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description-classic">Description (Optional)</Label>
                <Input
                  id="description-classic"
                  type="text"
                  value={p.description}
                  onChange={(e) => p.setDescription(e.target.value)}
                  placeholder="e.g., Salary, Freelance work, etc."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="date-classic">Income Date *</Label>
                <DateInput
                  id="date-classic"
                  value={p.date}
                  onChange={(e) => p.setDate(e.target.value)}
                  required
                  className="mt-1 scheme-light dark:scheme-dark"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The date when you received this income
                </p>
              </div>

              {p.accounts.length > 0 && (
                <div>
                  <Label htmlFor="account-classic">Deposit to Account</Label>
                  <AppSelect
                    id="account-classic"
                    value={p.selectedAccountId}
                    onValueChange={p.setSelectedAccountId}
                    variant="classic"
                    className="mt-1 rounded-lg border border-gray-300"
                    options={p.accounts.map((account) => ({
                      value: account.id,
                      label: (
                        <>
                          {account.name} ({account.bankName})
                          {account.isDefault ? " - Default" : ""}{" "}
                          {account.accountType === "cash" ? " - Cash" : ""}
                        </>
                      ),
                    }))}
                  />
                  {p.accounts.find((acc) => acc.id === p.selectedAccountId)
                    ?.accountType === "cash" && (
                    <p className="mt-1 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                      <strong>Cash Account:</strong> This is a cash account.
                      You can choose whether this income should be included in
                      your budget allocation below.
                    </p>
                  )}
                  {p.accounts.find((acc) => acc.id === p.selectedAccountId)
                    ?.accountType !== "cash" && (
                    <p className="mt-1 text-xs text-gray-500">
                      Select which account to deposit the income to
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={p.allocateToBudget}
                    onChange={(e) => p.setAllocateToBudget(e.target.checked)}
                  />
                  Allocate this income to budget categories
                </Label>
                <p className="text-xs text-gray-500">
                  When checked, this income will be used to fund Fixed Costs,
                  Savings, Investment, and Guilt-Free Spending according to
                  your allocation settings. Uncheck for income that should not
                  affect your budget (e.g., reimbursements, one-off transfers).
                </p>
              </div>

              {p.accounts.length === 0 && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
                  No accounts found. Please create an account first to deposit
                  income.
                </div>
              )}

              <Button
                type="submit"
                disabled={p.calculating || !p.allocation}
                className="w-full"
              >
                <Calculator className="mr-2 h-4 w-4" />
                {p.calculating ? "Logging Income..." : "Log Income"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {p.breakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Income Logged Successfully</CardTitle>
            <CardDescription>
              {p.breakdown.isExcludedFromAllocation
                ? "Income logged without budget allocation"
                : p.breakdown.isCashAccount
                  ? "Income added to cash account"
                  : "Your income allocation for this period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-indigo-50 border-2 border-indigo-200">
                <div className="text-sm text-indigo-600 font-medium mb-1">
                  Total Income
                </div>
                <div className="text-3xl font-bold text-indigo-900">
                  {formatCurrency(p.breakdown.income)}
                </div>
                {p.breakdown.depositedToAccountName && (
                  <div className="text-xs text-indigo-600 mt-2">
                    Deposited to: {p.breakdown.depositedToAccountName}
                  </div>
                )}
              </div>

              {!p.breakdown.isExcludedFromAllocation && (
                <>
                  {p.breakdown.isCashAccount ? (
                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="text-sm font-medium text-yellow-700 mb-2">
                        Cash Account Income
                      </div>
                      <div className="text-sm text-yellow-600">
                        This income has been added directly to your cash account
                        without budget allocation. No funds have been allocated
                        to budget categories.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="text-sm font-medium text-red-700">
                            Fixed Costs
                          </div>
                          <div className="text-xl font-bold text-red-900">
                            {formatCurrency(p.breakdown.fixedCosts)}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                          <div className="text-sm font-medium text-green-700">
                            Savings
                          </div>
                          <div className="text-xl font-bold text-green-900">
                            {formatCurrency(p.breakdown.savings)}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="text-sm font-medium text-blue-700">
                            Investment
                          </div>
                          <div className="text-xl font-bold text-blue-900">
                            {formatCurrency(p.breakdown.investment)}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                          <div className="text-sm font-medium text-purple-700">
                            Guilt-Free Spending
                          </div>
                          <div className="text-xl font-bold text-purple-900">
                            {formatCurrency(p.breakdown.guiltFreeSpending)}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-700">
                            Total Allocated
                          </span>
                          <span className="text-xl font-bold text-gray-900">
                            {formatCurrency(p.breakdown.total)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {p.breakdown.isExcludedFromAllocation && (
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Income Logged
                  </div>
                  <div className="text-sm text-gray-600">
                    This income has been logged but will not be used for budget
                    allocation. It has been deposited to your account.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {p.loadingHistory ? (
        <IncomeHistorySkeleton variant="classic" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Income History</CardTitle>
            <CardDescription>
              {p.incomeTotal === 0
                ? "No income entries yet"
                : "Chronological ledger of recorded inflows"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {p.incomeEntries.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  No income entries yet
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Your income entries will appear here once you calculate your
                  first breakdown
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {p.incomeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-start justify-between gap-4 p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-lg">
                          {formatCurrency(entry.amount)}
                        </div>
                        {entry.description && (
                          <div className="text-sm text-gray-700 mt-1 font-medium">
                            {entry.description}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          Date: {p.formatDate(entry.date)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Logged: {p.formatDate(entry.createdAt)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => p.setDeleteEntryId(entry.id)}
                        className="ml-4 shrink-0 cursor-pointer"
                        aria-label="Delete this income entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <ClassicPaginationBar
                  page={p.incomePage}
                  pageSize={p.incomeLimit}
                  total={p.incomeTotal}
                  onPageChange={p.fetchIncomeEntries}
                />
                <ConfirmDialog
                  open={p.deleteEntryId !== null}
                  onOpenChange={(open) => !open && p.setDeleteEntryId(null)}
                  title="Delete income entry"
                  description="Are you sure you want to delete this income entry? This cannot be undone."
                  confirmText="Delete"
                  cancelText="Cancel"
                  variant="destructive"
                  onConfirm={p.handleDeleteEntry}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
