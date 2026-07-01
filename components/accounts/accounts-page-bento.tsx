"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
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
import {
  INCOME_PAGE_ERROR_SOFT as ERROR_SOFT,
  INCOME_PAGE_WARN_SURFACE as WARN_SURFACE,
} from "@/lib/income-page-types"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { BENTO } from "@/lib/app-routes"
import {
  useAccountsPage,
  ACCOUNT_FUND_CATEGORIES,
  type AccountRow,
} from "@/hooks/use-accounts-page"
import { FormErrorAlert, FormStatusAlert } from "@/components/wealth-console/form-status-alert"
import {
  FormFieldError,
  formFieldAria,
} from "@/components/forms/form-field-error"
import { AccountsPageBentoLoading } from "@/components/accounts/accounts-page-bento-loading"
import {
  ArrowRightLeft,
  Building2,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

const consoleField =
  "w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

const CASH_TYPES = new Set(["checking", "savings", "cash"])

function typeLabel(t: string) {
  const m: Record<string, string> = {
    checking: "Checking",
    savings: "Savings",
    investment: "Investments",
    credit: "Credit",
    cash: "Other",
  }
  return m[t] ?? t
}

export function AccountsPageBento() {
  const { status } = useSession()
  const router = useRouter()
  const {
    accounts,
    loadingAccounts,
    showAddForm,
    setShowAddForm,
    showTransferForm,
    setShowTransferForm,
    editingAccount,
    message,
    setMessage,
    accountFormError,
    transferFormError,
    fieldErrors,
    clearFieldError,
    showDeleteConfirm,
    setShowDeleteConfirm,
    name,
    setName,
    bankName,
    setBankName,
    accountType,
    setAccountType,
    startingFunds,
    setStartingFunds,
    isDefault,
    setIsDefault,
    accountNumber,
    setAccountNumber,
    bsb,
    setBsb,
    cardLastFour,
    setCardLastFour,
    cardExpiry,
    setCardExpiry,
    cardType,
    setCardType,
    fromAccountId,
    setFromAccountId,
    toAccountId,
    setToAccountId,
    transferAmount,
    setTransferAmount,
    transferDescription,
    setTransferDescription,
    transferDate,
    setTransferDate,
    transferCategory,
    setTransferCategory,
    transferring,
    savingAccount,
    resetForm,
    startEdit,
    handleSubmit,
    handleDelete,
    confirmDeleteAccount,
    handleTransfer,
    formatCurrency,
  } = useAccountsPage(status)

  const [ledgerTab, setLedgerTab] = useState<"all" | "cash" | "investment" | "credit">("all")
  const [sortBy, setSortBy] = useState<"balance" | "name">("balance")

  const operatingLiquidity = useMemo(() => {
    return accounts
      .filter((a) => CASH_TYPES.has(a.accountType))
      .reduce((s, a) => s + a.balance, 0)
  }, [accounts])

  const investmentEquity = useMemo(() => {
    return accounts.filter((a) => a.accountType === "investment").reduce((s, a) => s + a.balance, 0)
  }, [accounts])

  const creditExposure = useMemo(() => {
    return accounts
      .filter((a) => a.accountType === "credit")
      .reduce((s, a) => s + Math.abs(a.balance), 0)
  }, [accounts])

  const investmentCount = useMemo(
    () => accounts.filter((a) => a.accountType === "investment").length,
    [accounts],
  )

  const creditUtilizationHint = useMemo(() => {
    const total = operatingLiquidity + investmentEquity + creditExposure
    if (total <= 0 || creditExposure <= 0) return null
    return Math.min(100, (creditExposure / total) * 100)
  }, [operatingLiquidity, investmentEquity, creditExposure])

  const filteredSorted = useMemo(() => {
    let rows = [...accounts]
    if (ledgerTab === "cash") {
      rows = rows.filter((a) => CASH_TYPES.has(a.accountType))
    } else if (ledgerTab === "investment") {
      rows = rows.filter((a) => a.accountType === "investment")
    } else if (ledgerTab === "credit") {
      rows = rows.filter((a) => a.accountType === "credit")
    }
    rows.sort((a, b) => {
      if (sortBy === "name") {
        return a.bankName.localeCompare(b.bankName) || a.name.localeCompare(b.name)
      }
      return Math.abs(b.balance) - Math.abs(a.balance)
    })
    return rows
  }, [accounts, ledgerTab, sortBy])

  const exportCsv = () => {
    const rows = [["Institution", "Account", "Type", "Balance", "Default"]]
    for (const a of accounts) {
      rows.push([
        a.bankName.replace(/"/g, '""'),
        a.name.replace(/"/g, '""'),
        a.accountType,
        String(a.balance),
        a.isDefault ? "yes" : "",
      ])
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const el = document.createElement("a")
    el.href = url
    el.download = `accounts-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    el.click()
    URL.revokeObjectURL(url)
  }

  const openAdd = () => {
    resetForm()
    setMessage(null)
    setShowTransferForm(false)
    setShowAddForm(true)
  }

  const openTransfer = () => {
    setMessage(null)
    setShowAddForm(false)
    setShowTransferForm(true)
  }

  const ledgerStatus = (a: AccountRow) => {
    if (a.accountType === "credit" && a.balance < 0) {
      return { label: "Review", tone: "warn" as const }
    }
    return { label: "Manual", tone: "ok" as const }
  }

  if (loadingAccounts && accounts.length === 0) {
    return <AccountsPageBentoLoading />
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
          No accounts linked
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
          Add your first institution to consolidate balances and route transfers.
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em]"
          style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
        >
          <Link2 className="h-4 w-4" />
          Link account
        </button>
      </section>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openTransfer}
              disabled={accounts.length < 2}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-40"
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surfaceHigh }}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Transfer
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em]"
              style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
            >
              <Link2 className="h-4 w-4" />
              Link account
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: TOKENS.onSurface }}>
              Accounts management
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              Consolidation of liquidity, investment portfolios, and credit facilities across your linked institutions.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="rounded-xl border p-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Operating liquidity
          </p>
          <div className="mt-2">
            <MajorFigureCurrency
              amount={operatingLiquidity}
              variant="income"
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Checking &amp; savings
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Investment equity
          </p>
          <div className="mt-2">
            <MajorFigureCurrency
              amount={investmentEquity}
              variant="prosperity"
              colorDecimal={TOKENS.secondary}
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
            {investmentCount} investment account{investmentCount === 1 ? "" : "s"}
          </p>
        </div>
        <div
          className="rounded-xl border p-4 sm:col-span-2 lg:col-span-1"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Credit exposure
          </p>
          <div className="mt-2">
            <MajorFigureCurrency
              amount={creditExposure}
              variant="loss"
              colorDecimal={TOKENS.onSurfaceMuted}
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: creditExposure > 0 ? ERROR_SOFT : TOKENS.onSurfaceMuted }}>
            {creditUtilizationHint != null
              ? `${creditUtilizationHint.toFixed(1)}% of combined balances (magnitude)`
              : "No credit accounts"}
          </p>
        </div>
      </div>

      <section
        className="rounded-xl border p-4 sm:p-5"
        style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
              Ledger
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
              Linked institutions
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label className="sr-only" htmlFor="sort-ledger">
                Sort
              </label>
              <AppSelect
                id="sort-ledger"
                value={sortBy}
                onValueChange={(v) => setSortBy(v as "balance" | "name")}
               
                className={cn(consoleField, "mt-0 w-auto min-w-[140px] border-transparent py-2 text-xs")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                options={[
                  { value: "balance", label: "Sort: Balance" },
                  { value: "name", label: "Sort: Institution" },
                ]}
              />
            </div>
            <button
              type="button"
              className="rounded-lg border p-2"
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
              aria-label="More"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1 border-b pb-3" style={{ borderColor: TOKENS.outlineGhost }}>
          {(
            [
              ["all", "All"],
              ["cash", "Checking & savings"],
              ["investment", "Investments"],
              ["credit", "Credit"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setLedgerTab(id)}
              className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                background: ledgerTab === id ? TOKENS.surfaceHigh : "transparent",
                color: ledgerTab === id ? TOKENS.primary : TOKENS.onSurfaceMuted,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}>
                <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Institution &amp; account
                </th>
                <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Type
                </th>
                <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Status
                </th>
                <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Balance
                </th>
                <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((a) => {
                const st = ledgerStatus(a)
                return (
                  <tr
                    key={a.id}
                    className="group cursor-pointer transition-colors duration-150 ease-out hover:bg-white/[0.05]"
                    style={{ borderBottom: `1px solid color-mix(in srgb, ${TOKENS.outlineGhost} 55%, transparent)` }}
                    onClick={() => router.push(`/accounts/${a.id}`)}
                  >
                    {/* Left accent bar on hover */}
                    <td className="border-l-2 border-l-transparent py-3 pl-2 pr-2 transition-[border-color] duration-150 group-hover:border-l-[#4edea3]">
                      <div className="font-semibold" style={{ color: TOKENS.onSurface }}>
                        {a.bankName}
                      </div>
                      <div className="text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                        {a.name}
                        {a.isDefault ? " · Default" : ""}
                      </div>
                    </td>
                    <td className="px-2 py-3" style={{ color: TOKENS.secondary }}>
                      {typeLabel(a.accountType)}
                    </td>
                    <td className="px-2 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: st.tone === "ok" ? TOKENS.primary : WARN_SURFACE,
                          }}
                        />
                        <span style={{ color: TOKENS.onSurface }}>{st.label}</span>
                      </span>
                    </td>
                    <td
                      className="px-2 py-3 text-right font-bold tabular-nums"
                      style={{
                        color: a.balance < 0 ? ERROR_SOFT : TOKENS.onSurface,
                      }}
                    >
                      {formatCurrency(a.balance)}
                    </td>
                    <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null)
                            startEdit(a)
                          }}
                          className="rounded-lg border p-1.5 transition-colors hover:bg-white/[0.06]"
                          style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          className="rounded-lg border p-1.5 transition-colors hover:bg-white/[0.06]"
                          style={{ borderColor: TOKENS.outlineGhost, color: ERROR_SOFT }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-[11px]" style={{ borderColor: TOKENS.outlineGhost }}>
          <span style={{ color: TOKENS.onSurfaceMuted }}>
            Showing {filteredSorted.length} account{filteredSorted.length === 1 ? "" : "s"}
          </span>
          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={exportCsv} className="font-semibold uppercase tracking-wide" style={{ color: TOKENS.secondary }}>
              Export ledger (.csv)
            </button>
            <Link href={BENTO.statement} className="font-semibold uppercase tracking-wide" style={{ color: TOKENS.secondary }}>
              View statements
            </Link>
          </div>
        </div>
      </section>

      <FormStatusAlert message={message} className="text-xs" />

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => setShowAddForm(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
                {editingAccount ? "Edit account" : "Link account"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                {editingAccount
                  ? "Update institution details and current balance."
                  : "Create a manual account to track balances and transfers."}
              </DialogDescription>
            </DialogHeader>
            <form noValidate className="mt-6 space-y-5" onSubmit={handleSubmit} inert={savingAccount}>
              <FormErrorAlert error={accountFormError} />
              <fieldset disabled={savingAccount} className="min-w-0 space-y-5 border-0 p-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Account name *
                  </Label>
                  <Input
                    id="acct-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      clearFieldError("name")
                    }}
                    disabled={savingAccount}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                    {...formFieldAria("acct-name", fieldErrors.name)}
                  />
                  <FormFieldError controlId="acct-name" message={fieldErrors.name} />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Institution *
                  </Label>
                  <Input
                    id="acct-bank"
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value)
                      clearFieldError("bankName")
                    }}
                    disabled={savingAccount}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                    {...formFieldAria("acct-bank", fieldErrors.bankName)}
                  />
                  <FormFieldError controlId="acct-bank" message={fieldErrors.bankName} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Type *
                  </Label>
                  <AppSelect
                    value={accountType}
                    onValueChange={setAccountType}
                    disabled={savingAccount}
                   
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    options={[
                      { value: "checking", label: "Checking" },
                      { value: "savings", label: "Savings" },
                      { value: "investment", label: "Investment" },
                      { value: "credit", label: "Credit card" },
                      { value: "cash", label: "Other" },
                    ]}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    {editingAccount ? "Current balance" : "Starting balance"}
                  </Label>
                  <Input
                    type="number"
                    min={editingAccount ? undefined : "0"}
                    step="0.01"
                    value={startingFunds}
                    onChange={(e) => setStartingFunds(e.target.value)}
                    disabled={savingAccount}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  disabled={savingAccount}
                  className="h-4 w-4 rounded border"
                  style={{ borderColor: TOKENS.outlineGhost, accentColor: TOKENS.primary }}
                />
                Default for income deposits
              </label>

              {accountType !== "cash" && (
                <>
                  <div
                    className="border-t pt-5"
                    style={{ borderColor: TOKENS.outlineGhost }}
                  >
                    <p
                      className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: TOKENS.onSurfaceMutedElevated }}
                    >
                      Account details
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          BSB
                        </Label>
                        <Input
                          value={bsb}
                          onChange={(e) => setBsb(e.target.value)}
                          disabled={savingAccount}
                          placeholder="000-000"
                          maxLength={7}
                          className={cn(consoleField, "mt-1 border-transparent")}
                          style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          Account number
                        </Label>
                        <Input
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          disabled={savingAccount}
                          placeholder="123456789"
                          className={cn(consoleField, "mt-1 border-transparent")}
                          style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="border-t pt-5"
                    style={{ borderColor: TOKENS.outlineGhost }}
                  >
                    <p
                      className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: TOKENS.onSurfaceMutedElevated }}
                    >
                      Card details
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          Card type
                        </Label>
                        <AppSelect
                          value={cardType}
                          onValueChange={setCardType}
                          disabled={savingAccount}
                          className={cn(consoleField, "mt-1 border-transparent")}
                          style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                          placeholder="None"
                          options={[
                            { value: "", label: "None" },
                            { value: "visa", label: "Visa" },
                            { value: "mastercard", label: "Mastercard" },
                            { value: "amex", label: "Amex" },
                            { value: "eftpos", label: "eftpos" },
                          ]}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          Last 4 digits
                        </Label>
                        <Input
                          value={cardLastFour}
                          onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          disabled={savingAccount}
                          placeholder="1234"
                          maxLength={4}
                          inputMode="numeric"
                          className={cn(consoleField, "mt-1 border-transparent")}
                          style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          Expiry
                        </Label>
                        <Input
                          value={cardExpiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "").slice(0, 4)
                            if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2)
                            setCardExpiry(v)
                          }}
                          disabled={savingAccount}
                          placeholder="MM/YY"
                          maxLength={5}
                          className={cn(consoleField, "mt-1 border-transparent")}
                          style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              </fieldset>
              <button
                type="submit"
                disabled={savingAccount}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-60"
                style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
              >
                {savingAccount ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {savingAccount ? "Saving…" : editingAccount ? "Save changes" : "Create account"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferForm} onOpenChange={setShowTransferForm}>
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => setShowTransferForm(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
                Transfer funds
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                Move money between linked accounts.
              </DialogDescription>
            </DialogHeader>
            <form noValidate className="mt-6 space-y-5" onSubmit={handleTransfer} inert={transferring}>
              <FormErrorAlert error={transferFormError} />
              <fieldset disabled={transferring} className="min-w-0 space-y-5 border-0 p-0">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  From *
                </Label>
                <AppSelect
                  id="xfer-from"
                  value={fromAccountId}
                  onValueChange={(v) => {
                    setFromAccountId(v)
                    clearFieldError("fromAccountId")
                  }}
                  disabled={transferring}
                 
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  placeholder="Select account"
                  options={[
                    { value: "", label: "Select account" },
                    ...accounts.map((acc) => ({
                      value: acc.id,
                      label: `${acc.name} (${formatCurrency(acc.balance)})`,
                    })),
                  ]}
                  aria-invalid={!!fieldErrors.fromAccountId}
                  {...formFieldAria("xfer-from", fieldErrors.fromAccountId)}
                />
                <FormFieldError controlId="xfer-from" message={fieldErrors.fromAccountId} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  To *
                </Label>
                <AppSelect
                  id="xfer-to"
                  value={toAccountId}
                  onValueChange={(v) => {
                    setToAccountId(v)
                    clearFieldError("toAccountId")
                  }}
                  disabled={transferring}
                 
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  placeholder="Select account"
                  options={[
                    { value: "", label: "Select account" },
                    ...accounts
                      .filter((acc) => acc.id !== fromAccountId)
                      .map((acc) => ({
                        value: acc.id,
                        label: `${acc.name} (${formatCurrency(acc.balance)})`,
                      })),
                  ]}
                  aria-invalid={!!fieldErrors.toAccountId}
                  {...formFieldAria("xfer-to", fieldErrors.toAccountId)}
                />
                <FormFieldError controlId="xfer-to" message={fieldErrors.toAccountId} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Date *
                </Label>
                <DateInput
                  id="xfer-date"
                  value={transferDate}
                  onChange={(e) => {
                    setTransferDate(e.target.value)
                    clearFieldError("transferDate")
                  }}
                  disabled={transferring}
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  aria-invalid={!!fieldErrors.transferDate}
                  {...formFieldAria("xfer-date", fieldErrors.transferDate)}
                />
                <FormFieldError controlId="xfer-date" message={fieldErrors.transferDate} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Amount *
                </Label>
                <Input
                  id="xfer-amt"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => {
                    setTransferAmount(e.target.value)
                    clearFieldError("transferAmount")
                  }}
                  disabled={transferring}
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  {...formFieldAria("xfer-amt", fieldErrors.transferAmount)}
                />
                <FormFieldError controlId="xfer-amt" message={fieldErrors.transferAmount} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Fund category (optional)
                </Label>
                <AppSelect
                  value={transferCategory}
                  onValueChange={setTransferCategory}
                  disabled={transferring}
                 
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  placeholder="None"
                  options={[
                    { value: "", label: "None" },
                    ...ACCOUNT_FUND_CATEGORIES.map((cat) => ({
                      value: cat.value,
                      label: cat.label,
                    })),
                  ]}
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Note (optional)
                </Label>
                <Input
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  disabled={transferring}
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                />
              </div>
              </fieldset>
              <button
                type="submit"
                disabled={transferring}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-60"
                style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
              >
                {transferring ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {transferring ? "Transferring…" : "Execute transfer"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete account"
        description="This will remove the account from your ledger. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteAccount}
        variant="destructive"
      />
    </div>
  )
}
