"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { AppSelect } from "@/components/ui/app-select"
import { Calculator } from "lucide-react"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
  requirePositiveNumber,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import {
  FormFieldError,
  formFieldAria,
} from "@/components/forms/form-field-error"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { parseMoneyInput } from "@/lib/money-input"
import { invalidateIncomeDataCaches } from "@/lib/client-fetch-cache"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_WARN_SURFACE as WARN_SURFACE } from "@/lib/income-page-types"
import type { FundAllocation } from "@/lib/income-page-types"
import { toastError, toastSuccess } from "@/lib/app-toast"
import type {
  DashboardConsoleSnapshot,
  DashboardIncomeLogPatch,
} from "@/lib/dashboard-console-optimistic"

interface Account {
  id: string
  name: string
  bankName: string
  isDefault: boolean
  accountType: string
}

interface AddIncomeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void | Promise<void>
  onOptimisticApply?: (
    input: DashboardIncomeLogPatch,
  ) => DashboardConsoleSnapshot
  onOptimisticRollback?: (snapshot: DashboardConsoleSnapshot) => void
}

const consoleField =
  "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

const fieldStyle = {
  background: TOKENS.surfaceLow,
  borderColor: TOKENS.outlineGhost,
  color: TOKENS.onSurface,
} as const

const selectFieldStyle = {
  backgroundColor: TOKENS.surfaceLow,
  borderColor: TOKENS.outlineGhost,
  color: TOKENS.onSurface,
} as const

export function AddIncomeModal({
  open,
  onOpenChange,
  onSuccess,
  onOptimisticApply,
  onOptimisticRollback,
}: AddIncomeModalProps) {
  const [income, setIncome] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [allocation, setAllocation] = useState<FundAllocation | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } =
    useFormFieldErrors<"income" | "date">()
  const [allocateToBudget, setAllocateToBudget] = useState(true)
  const { currencyCode } = useFormatCurrency()

  useEffect(() => {
    if (open) {
      const today = new Date()
      setIncome("")
      setDescription("")
      setDate(today.toISOString().split("T")[0])
      setAllocateToBudget(true)

      Promise.all([fetch("/api/accounts"), fetch("/api/fund-allocation")]).then(
        ([accountsRes, allocationRes]) => {
          if (accountsRes.ok) {
            accountsRes.json().then((data) => {
              setAccounts(data.accounts || [])
              const defaultAccount = data.accounts?.find(
                (acc: Account) => acc.isDefault,
              )
              if (defaultAccount) {
                setSelectedAccountId(defaultAccount.id)
              } else if (data.accounts?.length > 0) {
                setSelectedAccountId(data.accounts[0].id)
              }
            })
          }
          if (allocationRes.ok) {
            allocationRes.json().then((data) => setAllocation(data))
          }
        },
      )
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    clearFieldErrors()

    if (!allocation) {
      setFormError("Please configure your fund allocation settings first")
      return
    }

    const errs = buildFieldErrors([
      ["income", requirePositiveNumber(income, "Income")],
      ["date", requireField(date, "Income date")],
    ] as const)
    if (hasFieldErrors(errs)) {
      setFieldErrors(errs)
      return
    }

    const incomeAmount = parseMoneyInput(income, currencyCode)
    const selectedAccount =
      accounts.find((acc) => acc.id === selectedAccountId) ?? null

    const d = new Date(date + "T12:00:00")
    const periodStart = new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0]
    const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0]

    const payload = {
      income: incomeAmount,
      description: description.trim() || null,
      date,
      periodStart,
      periodEnd,
      accountId: selectedAccountId || null,
      allocateToBudget,
    }

    const snapshot = onOptimisticApply?.({
      amount: incomeAmount,
      date,
      accountId: selectedAccountId || null,
      allocateToBudget,
      allocation,
      account: selectedAccount,
    })

    toastSuccess("Income logged successfully!")
    setFormError(null)
    setIncome("")
    setDescription("")
    const today = new Date()
    setDate(today.toISOString().split("T")[0])
    onOpenChange(false)
    invalidateIncomeDataCaches()

    void (async () => {
      setCalculating(true)
      try {
        const response = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to calculate breakdown")
        }
        await onSuccess?.()
      } catch (error) {
        if (snapshot && onOptimisticRollback) {
          onOptimisticRollback(snapshot)
        }
        const message =
          error instanceof Error
            ? error.message
            : "An error occurred. Please try again."
        setFormError(message)
        toastError(message)
        onOpenChange(true)
      } finally {
        setCalculating(false)
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow:
            "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
        }}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle
              className="text-xl"
              style={{ color: TOKENS.onSurface }}
            >
              Log income
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Enter amount and date. Optionally allocate to your conscious
              spending pillars.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
            inert={calculating}
          >
            <FormErrorAlert error={formError} />

            <fieldset
              disabled={calculating}
              className="min-w-0 space-y-5 border-0 p-0"
            >
              <div>
                <label
                  htmlFor="income"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Income ($)
                </label>
                <Input
                  id="income"
                  type="number"
                  value={income}
                  onChange={(e) => {
                    setIncome(e.target.value)
                    clearFieldError("income")
                  }}
                  min="0"
                  step="0.01"
                  disabled={calculating}
                  placeholder="0.00"
                  className={cn(consoleField, "border-transparent")}
                  style={fieldStyle}
                  {...formFieldAria("income", fieldErrors.income)}
                />
                <FormFieldError controlId="income" message={fieldErrors.income} />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Description (optional)
                </label>
                <Input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Salary, freelance, etc."
                  disabled={calculating}
                  className={cn(consoleField, "border-transparent")}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label
                  htmlFor="date"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Income date *
                </label>
                <DateInput
                  id="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    clearFieldError("date")
                  }}
                  disabled={calculating}
                  className={cn(consoleField, "border-transparent")}
                  style={fieldStyle}
                  aria-invalid={!!fieldErrors.date}
                  {...formFieldAria("date", fieldErrors.date)}
                />
                <FormFieldError controlId="date" message={fieldErrors.date} />
              </div>

              {accounts.length > 0 && (
                <div>
                  <label
                    htmlFor="account"
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Deposit to account
                  </label>
                  <AppSelect
                    id="account"
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                    disabled={calculating}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={selectFieldStyle}
                    options={accounts.map((account) => ({
                      value: account.id,
                      label: (
                        <>
                          {account.name} ({account.bankName})
                          {account.isDefault ? ", Default" : ""}{" "}
                          {account.accountType === "cash" ? ", Cash" : ""}
                        </>
                      ),
                    }))}
                  />
                  {accounts.find((acc) => acc.id === selectedAccountId)
                    ?.accountType === "cash" && (
                    <div
                      className="mt-2 rounded-lg border px-3 py-2 text-xs leading-snug"
                      style={{
                        background: `color-mix(in srgb, ${WARN_SURFACE} 10%, ${TOKENS.surfaceLow})`,
                        borderColor: `color-mix(in srgb, ${WARN_SURFACE} 35%, transparent)`,
                        color: WARN_SURFACE,
                      }}
                    >
                      <strong className="font-semibold">Cash account:</strong>{" "}
                      You can exclude this inflow from allocation below.
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: TOKENS.surfaceLow,
                      accentColor: TOKENS.primary,
                    }}
                    checked={allocateToBudget}
                    disabled={calculating}
                    onChange={(e) => setAllocateToBudget(e.target.checked)}
                  />
                  <span style={{ color: TOKENS.onSurface }}>
                    Allocate to budget categories
                  </span>
                </label>
              </div>

              {accounts.length === 0 && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    background: `color-mix(in srgb, ${WARN_SURFACE} 10%, ${TOKENS.surfaceLow})`,
                    borderColor: `color-mix(in srgb, ${WARN_SURFACE} 35%, transparent)`,
                    color: WARN_SURFACE,
                  }}
                >
                  No accounts found. Add an account first.
                </div>
              )}
            </fieldset>

            <button
              type="submit"
              disabled={calculating || !allocation}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
              }}
            >
              <Calculator className="h-4 w-4" strokeWidth={2} />
              {calculating ? "Logging…" : "Submit"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
