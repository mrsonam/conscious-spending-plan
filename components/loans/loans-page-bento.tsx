"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateInput } from "@/components/ui/date-input"
import { AppSelect } from "@/components/ui/app-select"
import { Label } from "@/components/ui/label"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { useLoansPage } from "@/hooks/use-loans-page"
import { FormErrorAlert, FormStatusAlert } from "@/components/wealth-console/form-status-alert"
import {
  FormFieldError,
  formFieldAria,
} from "@/components/forms/form-field-error"
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  HandCoins,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

const consoleField =
  "w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

export function LoansPageBento() {
  const { status } = useSession()
  const {
    accounts,
    loans,
    borrowedLoans,
    loading,
    message,
    setMessage,
    lentFormError,
    borrowedFormError,
    fieldErrors,
    clearFieldError,
    accountId,
    setAccountId,
    amount,
    setAmount,
    borrowerName,
    setBorrowerName,
    description,
    setDescription,
    date,
    setDate,
    dueDate,
    setDueDate,
    submitting,
    borrowedAccountId,
    setBorrowedAccountId,
    borrowedAmount,
    setBorrowedAmount,
    lenderName,
    setLenderName,
    borrowedDescription,
    setBorrowedDescription,
    borrowedDate,
    setBorrowedDate,
    borrowedDueDate,
    setBorrowedDueDate,
    borrowedSubmitting,
    repaySubmitting,
    handleSubmit,
    handleMarkRepaid,
    handleSubmitBorrowed,
    handleMarkBorrowedRepaid,
    formatCurrency,
    formatDate,
  } = useLoansPage(status)

  const [lentOpen, setLentOpen] = useState(false)
  const [borrowedOpen, setBorrowedOpen] = useState(false)
  const [lentRepayDialog, setLentRepayDialog] = useState<{ loanId: string; toAccountId: string } | null>(null)
  const [borrowedRepayDialog, setBorrowedRepayDialog] = useState<{
    borrowedLoanId: string
    fromAccountId: string
  } | null>(null)

  const activeLoans = useMemo(
    () => loans.filter((l) => l.status === "active"),
    [loans],
  )
  const repaidLoans = useMemo(
    () => loans.filter((l) => l.status === "repaid"),
    [loans],
  )
  const activeBorrowed = useMemo(
    () => borrowedLoans.filter((l) => l.status === "active"),
    [borrowedLoans],
  )
  const repaidBorrowed = useMemo(
    () => borrowedLoans.filter((l) => l.status === "repaid"),
    [borrowedLoans],
  )

  const outstandingLent = useMemo(
    () =>
      activeLoans.reduce((s, l) => s + (l.amount - l.repaidAmount), 0),
    [activeLoans],
  )

  const outstandingBorrowed = useMemo(
    () =>
      activeBorrowed.reduce((s, l) => s + (l.amount - l.repaidAmount), 0),
    [activeBorrowed],
  )

  const netExposure = useMemo(
    () => outstandingLent - outstandingBorrowed,
    [outstandingLent, outstandingBorrowed],
  )

  const repayAccountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: `${a.name} (${a.bankName}) · ${formatCurrency(a.balance)}`,
      })),
    [accounts, formatCurrency],
  )

  const openLent = () => {
    setMessage(null)
    setBorrowedOpen(false)
    setLentOpen(true)
  }

  const openBorrowed = () => {
    setMessage(null)
    setLentOpen(false)
    setBorrowedOpen(true)
  }

  const onLentSubmit = async (e: React.FormEvent) => {
    const ok = await handleSubmit(e)
    if (ok) setLentOpen(false)
  }

  const onBorrowedSubmit = async (e: React.FormEvent) => {
    const ok = await handleSubmitBorrowed(e)
    if (ok) setBorrowedOpen(false)
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="h-80 animate-pulse rounded-xl border border-white/10 bg-white/5 lg:col-span-7" />
          <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5 lg:col-span-5" />
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <section
        className="rounded-xl border p-10 text-center"
        style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
      >
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl"
          style={{ background: TOKENS.surfaceHigh, border: `1px solid ${TOKENS.outlineGhost}` }}
        >
          <Building2 className="h-7 w-7" style={{ color: TOKENS.secondary }} />
        </div>
        <h2 className="mt-4 text-xl font-bold" style={{ color: TOKENS.onSurface }}>
          No accounts yet
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
          Add an account first — loans move balances between your books and these facilities.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary, background: TOKENS.surfaceHigh }}
          >
            <HandCoins className="h-3.5 w-3.5" />
            {activeLoans.length + activeBorrowed.length} active
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: TOKENS.onSurface }}>
              Lending &amp; liabilities
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              Money you lent out and money you borrowed — both adjust account balances without flowing through income or
              expense categories.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={openBorrowed}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surfaceHigh }}
            >
              <ArrowDownRight className="h-3.5 w-3.5" />
              Record borrowing
            </button>
            <button
              type="button"
              onClick={openLent}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em]"
              style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
            >
              <ArrowUpRight className="h-4 w-4" />
              Record loan
            </button>
          </div>
        </div>
      </section>

      <FormStatusAlert message={message} className="text-xs" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="rounded-xl border p-4 sm:p-5"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Outstanding receivables
          </p>
          <div className="mt-2">
            <MajorFigureCurrency
              amount={outstandingLent}
              variant="income"
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
            You lent · still outstanding
          </p>
        </div>
        <div
          className="rounded-xl border p-4 sm:p-5"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Outstanding payables
          </p>
          <div className="mt-2">
            <MajorFigureCurrency
              amount={outstandingBorrowed}
              variant="loss"
              colorDecimal={TOKENS.onSurfaceMuted}
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
            You owe · still due
          </p>
        </div>
        <div
          className="rounded-xl border p-4 sm:p-5 sm:col-span-2 lg:col-span-1"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Net exposure
          </p>
          <div className="mt-2">
            <MajorFigureCurrency
              amount={netExposure}
              variant={netExposure >= 0 ? "prosperity" : "loss"}
              colorDecimal={TOKENS.secondary}
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Receivables minus payables
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <section
          className="rounded-xl border p-4 sm:p-5 lg:col-span-7"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Receivables
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                Active loans (you lent)
              </p>
            </div>
            <TrendingUp className="h-5 w-5 shrink-0" style={{ color: TOKENS.primary }} />
          </div>
          <div className="mt-4 space-y-3">
            {activeLoans.length === 0 ? (
              <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                No active loans.
              </p>
            ) : (
              activeLoans.map((loan) => {
                const out = loan.amount - loan.repaidAmount
                return (
                  <div
                    key={loan.id}
                    className="rounded-xl border p-4"
                    style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow, boxShadow: CARD_INSET }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                          {formatCurrency(out)}{" "}
                          <span className="text-xs font-normal" style={{ color: TOKENS.onSurfaceMuted }}>
                            outstanding
                          </span>
                        </p>
                        <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.secondary }}>
                          {loan.borrowerName || "Borrower"}
                        </p>
                        <p className="mt-1 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                          From {loan.account.name} · {loan.account.bankName}
                        </p>
                        {loan.description ? (
                          <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                            {loan.description}
                          </p>
                        ) : null}
                        <p className="mt-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                          Loaned {formatDate(loan.date)}
                          {loan.dueDate ? ` · Due ${formatDate(loan.dueDate)}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setLentRepayDialog({ loanId: loan.id, toAccountId: loan.accountId })
                        }
                        className="shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{ borderColor: TOKENS.primary, color: TOKENS.primary, background: TOKENS.surfaceContainer }}
                      >
                        Mark repaid
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <aside
          className="flex flex-col gap-4 lg:col-span-5"
          style={{ alignSelf: "stretch" }}
        >
          <div
            className="rounded-xl border p-4 sm:p-5"
            style={{
              background: TOKENS.surfaceLow,
              borderColor: TOKENS.outlineGhost,
              boxShadow: CARD_INSET,
              minHeight: "100%",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.onSurfaceMuted }}>
                  Payables
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                  Active borrowing
                </p>
              </div>
              <TrendingDown className="h-5 w-5 shrink-0" style={{ color: ERROR_SOFT }} />
            </div>
            <div className="mt-4 space-y-3">
              {activeBorrowed.length === 0 ? (
                <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                  No active borrowings.
                </p>
              ) : (
                activeBorrowed.map((loan) => {
                  const out = loan.amount - loan.repaidAmount
                  return (
                    <div
                      key={loan.id}
                      className="rounded-xl border p-4"
                      style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceContainer }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                            {formatCurrency(out)}{" "}
                            <span className="text-xs font-normal" style={{ color: TOKENS.onSurfaceMuted }}>
                              owed
                            </span>
                          </p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.secondary }}>
                            {loan.lenderName || "Lender"}
                          </p>
                          <p className="mt-1 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                            In {loan.account.name} · {loan.account.bankName}
                          </p>
                          {loan.description ? (
                            <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                              {loan.description}
                            </p>
                          ) : null}
                          <p className="mt-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                            Borrowed {formatDate(loan.date)}
                            {loan.dueDate ? ` · Due ${formatDate(loan.dueDate)}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBorrowedRepayDialog({
                              borrowedLoanId: loan.id,
                              fromAccountId: loan.accountId,
                            })
                          }
                          className="shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                          style={{
                            borderColor: ERROR_SOFT,
                            color: ERROR_SOFT,
                            background: TOKENS.surfaceContainer,
                          }}
                        >
                          Mark repaid
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <section
          className="rounded-xl border p-4 sm:p-5 lg:col-span-5"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Settled receivables
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            Repaid loans
          </p>
          <div className="mt-4 space-y-2">
            {repaidLoans.length === 0 ? (
              <p className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                None yet.
              </p>
            ) : (
              repaidLoans.slice(0, 8).map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                  style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
                >
                  <span className="min-w-0 truncate font-medium" style={{ color: TOKENS.onSurface }}>
                    {loan.borrowerName || "Loan"}
                  </span>
                  <span className="flex items-center gap-1 tabular-nums font-semibold" style={{ color: TOKENS.primary }}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {formatCurrency(loan.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section
          className="rounded-xl border p-4 sm:p-5 lg:col-span-7"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Settled payables
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            Repaid borrowings
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {repaidBorrowed.length === 0 ? (
              <p className="text-xs sm:col-span-2" style={{ color: TOKENS.onSurfaceMuted }}>
                None yet.
              </p>
            ) : (
              repaidBorrowed.slice(0, 10).map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                  style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
                >
                  <span className="min-w-0 truncate font-medium" style={{ color: TOKENS.onSurface }}>
                    {loan.lenderName || "Borrower"}
                  </span>
                  <span className="flex items-center gap-1 tabular-nums font-semibold" style={{ color: TOKENS.primary }}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {formatCurrency(loan.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Dialog open={lentOpen} onOpenChange={setLentOpen}>
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => setLentOpen(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
                Record loan (lent)
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                Deducts from the selected account without counting as spending.
              </DialogDescription>
            </DialogHeader>
            <form noValidate className="mt-6 space-y-5" onSubmit={onLentSubmit} inert={submitting}>
              <FormErrorAlert error={lentFormError} />
              <fieldset disabled={submitting} className="min-w-0 space-y-5 border-0 p-0">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Account *
                </Label>
                <AppSelect
                  id="loan-acct"
                  value={accountId}
                  onValueChange={(v) => {
                    setAccountId(v)
                    clearFieldError("accountId")
                  }}
                  disabled={submitting}
                 
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.bankName}) · ${formatCurrency(a.balance)}`,
                  }))}
                  aria-invalid={!!fieldErrors.accountId}
                  {...formFieldAria("loan-acct", fieldErrors.accountId)}
                />
                <FormFieldError controlId="loan-acct" message={fieldErrors.accountId} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Amount *
                  </Label>
                  <Input
                    id="loan-amt"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                      clearFieldError("amount")
                    }}
                    disabled={submitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                    {...formFieldAria("loan-amt", fieldErrors.amount)}
                  />
                  <FormFieldError controlId="loan-amt" message={fieldErrors.amount} />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Borrower
                  </Label>
                  <Input
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Optional"
                    disabled={submitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Date *
                  </Label>
                  <DateInput
                    id="loan-date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value)
                      clearFieldError("date")
                    }}
                    disabled={submitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                    aria-invalid={!!fieldErrors.date}
                    {...formFieldAria("loan-date", fieldErrors.date)}
                  />
                  <FormFieldError controlId="loan-date" message={fieldErrors.date} />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Due (optional)
                  </Label>
                  <DateInput
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={submitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Note (optional)
                </Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                />
              </div>
              </fieldset>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-60"
                style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {submitting ? "Saving…" : "Save loan"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={borrowedOpen} onOpenChange={setBorrowedOpen}>
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => setBorrowedOpen(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
                Record borrowing
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                Credits the selected account without counting as income.
              </DialogDescription>
            </DialogHeader>
            <form noValidate className="mt-6 space-y-5" onSubmit={onBorrowedSubmit} inert={borrowedSubmitting}>
              <FormErrorAlert error={borrowedFormError} />
              <fieldset disabled={borrowedSubmitting} className="min-w-0 space-y-5 border-0 p-0">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Account *
                </Label>
                <AppSelect
                  id="borrowed-acct"
                  value={borrowedAccountId}
                  onValueChange={(v) => {
                    setBorrowedAccountId(v)
                    clearFieldError("borrowedAccountId")
                  }}
                  disabled={borrowedSubmitting}
                 
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.bankName}) · ${formatCurrency(a.balance)}`,
                  }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Amount *
                  </Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={borrowedAmount}
                    onChange={(e) => setBorrowedAmount(e.target.value)}
                    disabled={borrowedSubmitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Lender
                  </Label>
                  <Input
                    value={lenderName}
                    onChange={(e) => setLenderName(e.target.value)}
                    placeholder="Optional"
                    disabled={borrowedSubmitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Date *
                  </Label>
                  <DateInput
                    value={borrowedDate}
                    onChange={(e) => setBorrowedDate(e.target.value)}
                    disabled={borrowedSubmitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Due (optional)
                  </Label>
                  <DateInput
                    value={borrowedDueDate}
                    onChange={(e) => setBorrowedDueDate(e.target.value)}
                    disabled={borrowedSubmitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Note (optional)
                </Label>
                <Input
                  value={borrowedDescription}
                  onChange={(e) => setBorrowedDescription(e.target.value)}
                  disabled={borrowedSubmitting}
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                />
              </div>
              </fieldset>
              <button
                type="submit"
                disabled={borrowedSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-60"
                style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
              >
                {borrowedSubmitting ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {borrowedSubmitting ? "Saving…" : "Save borrowing"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={lentRepayDialog !== null}
        onOpenChange={(open) => {
          if (!open && repaySubmitting) return
          if (!open) setLentRepayDialog(null)
        }}
      >
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl sm:max-w-md"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => setLentRepayDialog(null)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
                Mark loan repaid
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                Choose which account receives the repayment. This does not count as new income for fund allocation.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-5">
              <fieldset disabled={repaySubmitting} className="min-w-0 border-0 p-0">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Receive into
                </Label>
                <AppSelect
                  value={lentRepayDialog?.toAccountId ?? ""}
                  onValueChange={(value) =>
                    setLentRepayDialog((d) => (d ? { ...d, toAccountId: value } : d))
                  }
                  disabled={repaySubmitting}
                 
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  options={repayAccountOptions}
                  placeholder="Select account"
                />
              </div>
              </fieldset>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={repaySubmitting}
                  onClick={() => setLentRepayDialog(null)}
                  className="rounded-xl border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-50"
                  style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surfaceHigh }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!lentRepayDialog?.toAccountId || repaySubmitting}
                  onClick={() => {
                    if (!lentRepayDialog) return
                    void (async () => {
                      const ok = await handleMarkRepaid(lentRepayDialog.loanId, lentRepayDialog.toAccountId)
                      if (ok) setLentRepayDialog(null)
                    })()
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-50"
                  style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
                >
                  {repaySubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : null}
                  {repaySubmitting ? "Processing…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={borrowedRepayDialog !== null}
        onOpenChange={(open) => {
          if (!open && repaySubmitting) return
          if (!open) setBorrowedRepayDialog(null)
        }}
      >
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl sm:max-w-md"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => setBorrowedRepayDialog(null)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
                Mark borrowing repaid
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                Choose which account the repayment is deducted from. This is not counted as a spending category.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-5">
              <fieldset disabled={repaySubmitting} className="min-w-0 border-0 p-0">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Pay from
                </Label>
                <AppSelect
                  value={borrowedRepayDialog?.fromAccountId ?? ""}
                  onValueChange={(value) =>
                    setBorrowedRepayDialog((d) => (d ? { ...d, fromAccountId: value } : d))
                  }
                  disabled={repaySubmitting}
                 
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  options={repayAccountOptions}
                  placeholder="Select account"
                />
              </div>
              </fieldset>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={repaySubmitting}
                  onClick={() => setBorrowedRepayDialog(null)}
                  className="rounded-xl border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-50"
                  style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surfaceHigh }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!borrowedRepayDialog?.fromAccountId || repaySubmitting}
                  onClick={() => {
                    if (!borrowedRepayDialog) return
                    void (async () => {
                      const ok = await handleMarkBorrowedRepaid(
                        borrowedRepayDialog.borrowedLoanId,
                        borrowedRepayDialog.fromAccountId,
                      )
                      if (ok) setBorrowedRepayDialog(null)
                    })()
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-50"
                  style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
                >
                  {repaySubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : null}
                  {repaySubmitting ? "Processing…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
