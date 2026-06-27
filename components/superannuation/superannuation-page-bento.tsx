"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Building2,
  DollarSign,
  MinusCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  ScrambleCurrencyValue,
  ScrambleIntegerValue,
} from "@/components/ui/scramble-number"
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { toastSuccess, toastError } from "@/lib/app-toast"
import { tryParseMoneyInput } from "@/lib/money-input"
import { getFY, getFYBounds, currentFY, deriveTotalFYBalance } from "@/lib/super-fy"

type Contribution = {
  id: string
  amount: number
  type: string
  date: string
  description: string | null
}

type SuperAccount = {
  id: string
  name: string
  fundType: string | null
  provider: string | null
  memberNumber: string | null
  employerName: string | null
  balance: number
  createdAt: string
  updatedAt: string
  contributions: Contribution[]
}

const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  employer: "Employer (SG)",
  salary_sacrifice: "Salary Sacrifice",
  personal: "Personal",
  government: "Govt Co-contribution",
  investment: "Investment Return",
  fee: "Admin Fee",
  tax: "Govt Tax",
}

const CONTRIBUTION_TYPE_COLORS: Record<string, string> = {
  employer: "#60a5fa",
  salary_sacrifice: "#a78bfa",
  personal: TOKENS.primary,
  government: "#fbbf24",
  investment: "#34d399",
  fee: "#f87171",
  tax: "#fb923c",
}

const DEDUCTION_TYPES = new Set(["fee", "tax"])
const ROWS_DEFAULT = 10

const fieldClass =
  "w-full rounded-lg border bg-transparent px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-[#60a5fa]"
const labelClass = "block space-y-1.5"
const labelTextClass = "text-[11px] font-semibold uppercase tracking-[0.15em]"
const selectClass =
  "w-full rounded-lg border px-3 py-2.5 text-[13px] outline-none"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className={labelTextClass} style={{ color: TOKENS.onSurfaceMuted }}>
      {children}
    </span>
  )
}

function ModalSubmitButton({
  submitting,
  disabled,
  label,
  loadingLabel,
}: {
  submitting: boolean
  disabled?: boolean
  label: string
  loadingLabel?: string
}) {
  return (
    <button
      type="submit"
      disabled={submitting || disabled}
      className={cn(
        "mt-2 w-full rounded-xl px-5 py-3 text-[13px] font-semibold transition-colors disabled:opacity-40",
        consoleFocus,
      )}
      style={{ background: "#60a5fa", color: "#050a14" }}
    >
      {submitting ? (loadingLabel ?? "Saving…") : label}
    </button>
  )
}

export function SuperannuationPageBento() {
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const [accounts, setAccounts] = useState<SuperAccount[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Modal visibility
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [contribModalOpen, setContribModalOpen] = useState(false)
  const [deductionModalOpen, setDeductionModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<SuperAccount | null>(null)

  // Expanded rows per account (show all toggle)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  const [selectedFY, setSelectedFY] = useState<string>(() => currentFY())

  const availableFYs = useMemo(() => {
    const fySet = new Set<string>([currentFY()])
    for (const account of accounts) {
      for (const c of account.contributions) {
        fySet.add(getFY(c.date))
      }
    }
    return Array.from(fySet).sort()
  }, [accounts])

  const fyBounds = useMemo(() => getFYBounds(selectedFY), [selectedFY])

  const computedTotalBalance = useMemo(
    () => accounts.reduce((s, a) => s + a.contributions.reduce((cs, c) => cs + c.amount, 0), 0),
    [accounts],
  )

  const fyBalance = useMemo(
    () => deriveTotalFYBalance(accounts, selectedFY),
    [accounts, selectedFY],
  )

  useEffect(() => {
    setExpandedAccounts(new Set())
  }, [selectedFY])

  // Account form
  const [formName, setFormName] = useState("")
  const [formFundType, setFormFundType] = useState("")
  const [formProvider, setFormProvider] = useState("")
  const [formMemberNumber, setFormMemberNumber] = useState("")
  const [formEmployerName, setFormEmployerName] = useState("")
  const [formBalance, setFormBalance] = useState("")

  // Contribution form
  const [contribAccountId, setContribAccountId] = useState("")
  const [contribAmount, setContribAmount] = useState("")
  const [contribType, setContribType] = useState("employer")
  const [contribDate, setContribDate] = useState(new Date().toISOString().split("T")[0])
  const [contribDescription, setContribDescription] = useState("")

  // Deduction form
  const [deductAccountId, setDeductAccountId] = useState("")
  const [deductAmount, setDeductAmount] = useState("")
  const [deductType, setDeductType] = useState("fee")
  const [deductDate, setDeductDate] = useState(new Date().toISOString().split("T")[0])
  const [deductDescription, setDeductDescription] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/superannuation")
      const data = (await res.json()) as { accounts: SuperAccount[]; totalBalance: number }
      setAccounts(data.accounts ?? [])
      setTotalBalance(data.totalBalance ?? 0)
    } catch {
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const resetAccountForm = () => {
    setFormName("")
    setFormFundType("")
    setFormProvider("")
    setFormMemberNumber("")
    setFormEmployerName("")
    setFormBalance("")
    setEditingAccount(null)
  }

  const openAddAccount = () => {
    resetAccountForm()
    setAccountModalOpen(true)
  }

  const openEditAccount = (account: SuperAccount) => {
    setEditingAccount(account)
    setFormName(account.name)
    setFormFundType(account.fundType ?? "")
    setFormProvider(account.provider ?? "")
    setFormMemberNumber(account.memberNumber ?? "")
    setFormEmployerName(account.employerName ?? "")
    setFormBalance(String(account.balance))
    setAccountModalOpen(true)
  }

  const openContrib = () => {
    setContribAccountId(accounts[0]?.id ?? "")
    setContribAmount("")
    setContribType("employer")
    setContribDate(new Date().toISOString().split("T")[0])
    setContribDescription("")
    setContribModalOpen(true)
  }

  const openDeduction = () => {
    setDeductAccountId(accounts[0]?.id ?? "")
    setDeductAmount("")
    setDeductType("fee")
    setDeductDate(new Date().toISOString().split("T")[0])
    setDeductDescription("")
    setDeductionModalOpen(true)
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    setSubmitting(true)
    const balance = tryParseMoneyInput(formBalance, currencyCode)
    try {
      if (editingAccount) {
        const res = await fetch("/api/superannuation", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingAccount.id,
            name: formName.trim(),
            fundType: formFundType.trim(),
            provider: formProvider.trim(),
            memberNumber: formMemberNumber.trim(),
            employerName: formEmployerName.trim(),
            balance: balance ?? editingAccount.balance,
          }),
        })
        if (!res.ok) { toastError((await res.json() as { error?: string }).error || "Failed to update"); return }
        toastSuccess("Super account updated")
      } else {
        const res = await fetch("/api/superannuation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            fundType: formFundType.trim(),
            provider: formProvider.trim(),
            memberNumber: formMemberNumber.trim(),
            employerName: formEmployerName.trim(),
            balance: balance ?? 0,
          }),
        })
        if (!res.ok) { toastError((await res.json() as { error?: string }).error || "Failed to create"); return }
        toastSuccess("Super account added")
      }
      setAccountModalOpen(false)
      resetAccountForm()
      await load()
    } catch { toastError("Something went wrong") }
    finally { setSubmitting(false) }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/superannuation?id=${id}`, { method: "DELETE" })
      if (!res.ok) { toastError("Failed to delete account"); return }
      toastSuccess("Super account deleted")
      await load()
    } catch { toastError("Something went wrong") }
  }

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contribAccountId || !contribAmount) return
    setSubmitting(true)
    const parsed = tryParseMoneyInput(contribAmount, currencyCode)
    if (parsed === null || parsed === 0) {
      toastError("Enter a valid amount")
      setSubmitting(false)
      return
    }
    try {
      const res = await fetch("/api/superannuation/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          superAccountId: contribAccountId,
          amount: Math.abs(parsed),
          type: contribType,
          date: contribDate,
          description: contribDescription.trim(),
        }),
      })
      if (!res.ok) { toastError((await res.json() as { error?: string }).error || "Failed to record"); return }
      toastSuccess("Contribution recorded")
      setContribModalOpen(false)
      await load()
    } catch { toastError("Something went wrong") }
    finally { setSubmitting(false) }
  }

  const handleAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deductAccountId || !deductAmount) return
    setSubmitting(true)
    const parsed = tryParseMoneyInput(deductAmount, currencyCode)
    if (parsed === null || parsed === 0) {
      toastError("Enter a valid amount")
      setSubmitting(false)
      return
    }
    try {
      const res = await fetch("/api/superannuation/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          superAccountId: deductAccountId,
          amount: -Math.abs(parsed),
          type: deductType,
          date: deductDate,
          description: deductDescription.trim(),
        }),
      })
      if (!res.ok) { toastError((await res.json() as { error?: string }).error || "Failed to record"); return }
      toastSuccess("Deduction recorded")
      setDeductionModalOpen(false)
      await load()
    } catch { toastError("Something went wrong") }
    finally { setSubmitting(false) }
  }

  const handleDeleteContribution = async (id: string) => {
    try {
      const res = await fetch(`/api/superannuation/contributions?id=${id}`, { method: "DELETE" })
      if (!res.ok) { toastError("Failed to delete"); return }
      toastSuccess("Entry deleted")
      await load()
    } catch { toastError("Something went wrong") }
  }

  const totalContributions = useMemo(() =>
    accounts.reduce(
      (sum, a) =>
        sum +
        a.contributions
          .filter((c) => {
            const d = new Date(c.date)
            return d >= fyBounds.start && d <= fyBounds.end && c.amount > 0
          })
          .reduce((s, c) => s + c.amount, 0),
      0,
    ),
    [accounts, fyBounds])

  const totalDeductions = useMemo(() =>
    accounts.reduce(
      (sum, a) =>
        sum +
        a.contributions
          .filter((c) => {
            const d = new Date(c.date)
            return d >= fyBounds.start && d <= fyBounds.end && c.amount < 0
          })
          .reduce((s, c) => s + c.amount, 0),
      0,
    ),
    [accounts, fyBounds])

  if (loading) {
    const shimmer = "rgba(218,226,253,0.06)"
    return (
      <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-label="Loading superannuation">

        {/* Hero skeleton */}
        <section
          className="rounded-2xl border p-5 sm:p-6"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#60a5fa10" }}>
                  <Shield className="h-5 w-5" style={{ color: "#60a5fa40" }} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: TOKENS.onSurfaceMuted }}>
                  Total Super Balance
                </p>
              </div>
              <div className="mt-3">
                <ScrambleCurrencyValue
                  variant="neutral"
                  min={4000}
                  max={120000}
                  className="text-3xl font-bold! sm:text-4xl!"
                  decimalEm={0.55}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {["Add Account", "Record Contribution", "Record Fee / Tax"].map((label) => (
                <div
                  key={label}
                  className="h-10 animate-pulse rounded-xl border px-4"
                  style={{ borderColor: TOKENS.outlineGhost, background: shimmer, minWidth: "9rem" }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Stat cards skeleton */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Active Accounts", integer: true },
            { label: "Total Contributions", integer: false },
            { label: "Fees & Taxes", integer: false },
          ].map(({ label, integer }) => (
            <div
              key={label}
              className="rounded-xl border p-4 sm:p-5"
              style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                {label}
              </p>
              <div className="mt-2">
                {integer ? (
                  <ScrambleIntegerValue min={1} max={5} className="text-xl font-bold! sm:text-2xl!" />
                ) : (
                  <ScrambleCurrencyValue variant="neutral" min={500} max={12000} className="text-xl font-bold! sm:text-2xl!" decimalEm={0.5} />
                )}
              </div>
              <div className="mt-2 h-3 w-24 animate-pulse rounded" style={{ background: shimmer }} />
            </div>
          ))}
        </div>

        {/* Account card skeleton */}
        <section
          className="overflow-hidden rounded-xl border"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          {/* Account header */}
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-xl" style={{ background: shimmer }} />
              <div>
                <div className="h-4 w-32 animate-pulse rounded" style={{ background: shimmer }} />
                <div className="mt-1.5 h-3 w-52 animate-pulse rounded" style={{ background: shimmer }} />
              </div>
            </div>
            <div className="h-8 w-28 animate-pulse rounded-lg" style={{ background: shimmer }} />
          </div>

          {/* Table header */}
          <div
            className="grid grid-cols-[84px_1fr_auto] gap-3 border-t border-b px-5 py-2"
            style={{ borderColor: TOKENS.outlineGhost }}
          >
            {["Date", "Description", "Amount"].map((h) => (
              <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                {h}
              </span>
            ))}
          </div>

          {/* Table rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[84px_1fr_auto] items-center gap-3 border-b px-5 py-3 last:border-b-0"
              style={{ borderColor: TOKENS.outlineGhost, opacity: 1 - i * 0.12 }}
            >
              <div className="h-3 w-16 animate-pulse rounded" style={{ background: shimmer }} />
              <div>
                <div className="h-5 w-24 animate-pulse rounded" style={{ background: shimmer }} />
                <div className="mt-1 h-3 w-36 animate-pulse rounded" style={{ background: shimmer }} />
              </div>
              <div className="h-4 w-16 animate-pulse rounded" style={{ background: shimmer }} />
            </div>
          ))}
        </section>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <>
        <section
          className="rounded-xl border p-10 text-center"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl"
            style={{ background: "#60a5fa10", border: `1px solid ${TOKENS.outlineGhost}` }}
          >
            <Shield className="h-7 w-7" style={{ color: "#60a5fa" }} />
          </div>
          <h2 className="mt-4 text-xl font-bold" style={{ color: TOKENS.onSurface }}>No super accounts yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
            Add your superannuation fund to start tracking your retirement balance and contributions.
          </p>
          <button
            type="button"
            onClick={openAddAccount}
            className={cn("mt-6 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/[0.04]", consoleFocus)}
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.primary }}
          >
            <Plus className="h-4 w-4" /> Add Super Account
          </button>
        </section>

        {/* Account modal still needs to be available in empty state */}
        <Dialog open={accountModalOpen} onOpenChange={(o) => { setAccountModalOpen(o); if (!o) resetAccountForm() }}>
          <DialogContent
            className="border p-0 shadow-2xl"
            style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)" }}
          >
            <DialogClose onClose={() => { setAccountModalOpen(false); resetAccountForm() }} />
            <div className="p-6 sm:p-8">
              <DialogHeader>
                <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>Add Super Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveAccount} className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  <FieldLabel>Fund Name *</FieldLabel>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. AustralianSuper" required
                    className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
                </label>
                <label className={labelClass}>
                  <FieldLabel>Investment Option</FieldLabel>
                  <input value={formFundType} onChange={(e) => setFormFundType(e.target.value)} placeholder="e.g. High Growth"
                    className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
                </label>
                <label className={labelClass}>
                  <FieldLabel>Employer</FieldLabel>
                  <input value={formEmployerName} onChange={(e) => setFormEmployerName(e.target.value)} placeholder="e.g. Acme Corp"
                    className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
                </label>
                <label className={labelClass}>
                  <FieldLabel>Member Number</FieldLabel>
                  <input value={formMemberNumber} onChange={(e) => setFormMemberNumber(e.target.value)} placeholder="Optional"
                    className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
                </label>
                <label className={labelClass}>
                  <FieldLabel>Provider / Trustee</FieldLabel>
                  <input value={formProvider} onChange={(e) => setFormProvider(e.target.value)} placeholder="Optional"
                    className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
                </label>
                <label className={labelClass}>
                  <FieldLabel>Current Balance</FieldLabel>
                  <input value={formBalance} onChange={(e) => setFormBalance(e.target.value)} placeholder="0.00" type="text" inputMode="decimal"
                    className={cn(fieldClass, "tabular-nums")} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
                </label>
                <div className="sm:col-span-2">
                  <ModalSubmitButton submitting={submitting} disabled={!formName.trim()} label="Add Account" />
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Hero ── */}
      <section
        className="rounded-2xl border p-5 sm:p-6"
        style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#60a5fa20" }}>
                <Shield className="h-5 w-5" style={{ color: "#60a5fa" }} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Total Super Balance
              </p>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl" style={{ color: TOKENS.onSurface }}>
              {formatCurrency(computedTotalBalance)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAddAccount}
              className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/[0.04]", consoleFocus)}
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.primary }}
            >
              <Plus className="h-4 w-4" /> Add Account
            </button>
            <button
              type="button"
              onClick={openContrib}
              className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/[0.04]", consoleFocus)}
              style={{ borderColor: TOKENS.outlineGhost, color: "#60a5fa" }}
            >
              <DollarSign className="h-4 w-4" /> Record Contribution
            </button>
            <button
              type="button"
              onClick={openDeduction}
              className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/[0.04]", consoleFocus)}
              style={{ borderColor: TOKENS.outlineGhost, color: "#f87171" }}
            >
              <MinusCircle className="h-4 w-4" /> Record Fee / Tax
            </button>
          </div>
        </div>
      </section>

      {/* ── FY tab bar ── */}
      {availableFYs.length > 1 && (
        <div
          className="flex gap-1 rounded-xl border p-1"
          style={{ background: TOKENS.surface, borderColor: TOKENS.outlineGhost }}
        >
          {availableFYs.map((fy) => (
            <button
              key={fy}
              type="button"
              onClick={() => setSelectedFY(fy)}
              className={cn(
                "flex-1 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors",
                consoleFocus,
              )}
              style={
                selectedFY === fy
                  ? { background: "#60a5fa20", color: "#60a5fa" }
                  : { color: TOKENS.onSurfaceMuted }
              }
            >
              {fy}
            </button>
          ))}
        </div>
      )}

      {/* ── FY opening / closing summary ── */}
      {accounts.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-6 rounded-xl border px-5 py-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>Opening Balance</p>
            <p className="mt-1 text-[15px] font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>{formatCurrency(fyBalance.opening)}</p>
          </div>
          <span className="text-lg" style={{ color: TOKENS.onSurfaceMuted }}>→</span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
              {selectedFY === currentFY() ? "Current Balance" : "Closing Balance"}
            </p>
            <p className="mt-1 text-[15px] font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>{formatCurrency(fyBalance.closing)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>Net Change</p>
            <p className="mt-1 text-[15px] font-bold tabular-nums" style={{ color: fyBalance.net >= 0 ? TOKENS.primary : "#f87171" }}>
              {fyBalance.net >= 0 ? "+" : "−"}{formatCurrency(Math.abs(fyBalance.net))}
            </p>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4 sm:p-5" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>Active Accounts</p>
          <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl" style={{ color: TOKENS.onSurface }}>{accounts.length}</p>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>Superannuation funds</p>
        </div>
        <div className="rounded-xl border p-4 sm:p-5" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>Total Contributions</p>
          <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl" style={{ color: TOKENS.primary }}>{formatCurrency(totalContributions)}</p>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>FY contributions</p>
        </div>
        <div className="rounded-xl border p-4 sm:p-5" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>Fees & Taxes</p>
          <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl" style={{ color: totalDeductions < 0 ? "#f87171" : TOKENS.onSurface }}>
            {totalDeductions < 0 ? `−${formatCurrency(Math.abs(totalDeductions))}` : formatCurrency(0)}
          </p>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>FY deductions</p>
        </div>
      </div>

      {/* ── Account cards ── */}
      {(
        <div className="space-y-4">
          {accounts.map((account) => {
            const accountBalance = account.contributions.reduce((s, c) => s + c.amount, 0)
            const sorted = [...account.contributions]
              .filter((c) => {
                const d = new Date(c.date)
                return d >= fyBounds.start && d <= fyBounds.end
              })
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            const isExpanded = expandedAccounts.has(account.id)
            const visible = isExpanded ? sorted : sorted.slice(0, ROWS_DEFAULT)
            const hasMore = sorted.length > ROWS_DEFAULT

            return (
              <section
                key={account.id}
                className="overflow-hidden rounded-xl border"
                style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
              >
                {/* Account header */}
                <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#60a5fa18" }}>
                      <Shield className="h-5 w-5" style={{ color: "#60a5fa" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14px] font-semibold" style={{ color: TOKENS.onSurface }}>{account.name}</p>
                        {account.memberNumber && (
                          <span
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                            style={{ background: "rgba(218,226,253,0.07)", color: TOKENS.onSurfaceMuted }}
                          >
                            #{account.memberNumber}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {account.fundType && <span className="text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>{account.fundType}</span>}
                        {account.employerName && (
                          <span className="flex items-center gap-1 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                            <Building2 className="h-3 w-3" /> {account.employerName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-bold tabular-nums tracking-tight sm:text-2xl" style={{ color: TOKENS.onSurface }}>
                      {formatCurrency(accountBalance)}
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditAccount(account)}
                        className="rounded-lg p-2 transition-colors hover:bg-white/[0.06]"
                        style={{ color: TOKENS.onSurfaceMuted }}
                        aria-label={`Edit ${account.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(account.id)}
                        className="rounded-lg p-2 transition-colors hover:bg-white/[0.06]"
                        style={{ color: TOKENS.loss }}
                        aria-label={`Delete ${account.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transaction table */}
                {sorted.length > 0 && (
                  <div className="border-t" style={{ borderColor: TOKENS.outlineGhost }}>
                    {/* Table header */}
                    <div
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-5 py-2"
                      style={{ borderColor: TOKENS.outlineGhost }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>Date</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>Description</span>
                      <span className="text-right text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>Amount</span>
                    </div>

                    {visible.map((c) => {
                      const color = CONTRIBUTION_TYPE_COLORS[c.type] ?? TOKENS.primary
                      const isDeduction = DEDUCTION_TYPES.has(c.type)
                      return (
                        <div
                          key={c.id}
                          className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-5 py-3 last:border-b-0 hover:bg-white/[0.02]"
                          style={{ borderColor: TOKENS.outlineGhost }}
                        >
                          {/* Date */}
                          <span className="w-[84px] shrink-0 text-[11px] tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                            {new Date(c.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" })}
                          </span>

                          {/* Badge + description */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                                style={{ background: color + "20", color }}
                              >
                                {CONTRIBUTION_TYPE_LABELS[c.type] ?? c.type}
                              </span>
                            </div>
                            {c.description && (
                              <p className="mt-0.5 truncate text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                                {c.description}
                              </p>
                            )}
                          </div>

                          {/* Amount + delete */}
                          <div className="flex items-center gap-2">
                            <span
                              className="min-w-[72px] text-right text-[13px] font-semibold tabular-nums"
                              style={{ color: isDeduction ? "#f87171" : TOKENS.primary }}
                            >
                              {isDeduction
                                ? `−${formatCurrency(Math.abs(c.amount))}`
                                : `+${formatCurrency(c.amount)}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteContribution(c.id)}
                              className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/[0.06]"
                              style={{ color: TOKENS.onSurfaceMuted }}
                              aria-label="Delete entry"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Show more / less toggle */}
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAccounts((prev) => {
                            const next = new Set(prev)
                            if (next.has(account.id)) next.delete(account.id)
                            else next.add(account.id)
                            return next
                          })
                        }
                        className="flex w-full items-center justify-center gap-1.5 border-t py-3 text-[12px] font-medium transition-colors hover:bg-white/[0.02]"
                        style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
                      >
                        {isExpanded ? (
                          <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5" /> Show all {sorted.length} entries</>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* ── Modal: Add / Edit Account ── */}
      <Dialog open={accountModalOpen} onOpenChange={(o) => { setAccountModalOpen(o); if (!o) resetAccountForm() }}>
        <DialogContent
          className="border p-0 shadow-2xl"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)" }}
        >
          <DialogClose onClose={() => { setAccountModalOpen(false); resetAccountForm() }} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
                {editingAccount ? "Edit Super Account" : "Add Super Account"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveAccount} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                <FieldLabel>Fund Name *</FieldLabel>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. AustralianSuper" required
                  className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <label className={labelClass}>
                <FieldLabel>Investment Option</FieldLabel>
                <input value={formFundType} onChange={(e) => setFormFundType(e.target.value)} placeholder="e.g. High Growth"
                  className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <label className={labelClass}>
                <FieldLabel>Employer</FieldLabel>
                <input value={formEmployerName} onChange={(e) => setFormEmployerName(e.target.value)} placeholder="e.g. Acme Corp"
                  className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <label className={labelClass}>
                <FieldLabel>Member Number</FieldLabel>
                <input value={formMemberNumber} onChange={(e) => setFormMemberNumber(e.target.value)} placeholder="Optional"
                  className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <label className={labelClass}>
                <FieldLabel>Provider / Trustee</FieldLabel>
                <input value={formProvider} onChange={(e) => setFormProvider(e.target.value)} placeholder="Optional"
                  className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <label className={labelClass}>
                <FieldLabel>Current Balance</FieldLabel>
                <input value={formBalance} onChange={(e) => setFormBalance(e.target.value)} placeholder="0.00" type="text" inputMode="decimal"
                  className={cn(fieldClass, "tabular-nums")} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <div className="sm:col-span-2">
                <ModalSubmitButton submitting={submitting} disabled={!formName.trim()}
                  label={editingAccount ? "Update Account" : "Add Account"} />
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Record Contribution ── */}
      <Dialog open={contribModalOpen} onOpenChange={setContribModalOpen}>
        <DialogContent
          className="border p-0 shadow-2xl"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)" }}
        >
          <DialogClose onClose={() => setContribModalOpen(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>Record Contribution</DialogTitle>
              <p className="text-[13px]" style={{ color: TOKENS.onSurfaceMuted }}>Employer SG, salary sacrifice, or personal contributions.</p>
            </DialogHeader>
            <form onSubmit={handleAddContribution} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                <FieldLabel>Super Account *</FieldLabel>
                <select value={contribAccountId} onChange={(e) => setContribAccountId(e.target.value)} required
                  className={selectClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surface }}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                <FieldLabel>Type *</FieldLabel>
                <select value={contribType} onChange={(e) => setContribType(e.target.value)}
                  className={selectClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surface }}>
                  <option value="employer">Employer (SG)</option>
                  <option value="salary_sacrifice">Salary Sacrifice</option>
                  <option value="personal">Personal</option>
                  <option value="government">Govt Co-contribution</option>
                  <option value="investment">Investment Return</option>
                </select>
              </label>
              <label className={labelClass}>
                <FieldLabel>Amount *</FieldLabel>
                <input value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} placeholder="0.00" required type="text" inputMode="decimal"
                  className={cn(fieldClass, "tabular-nums")} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <label className={labelClass}>
                <FieldLabel>Date *</FieldLabel>
                <input value={contribDate} onChange={(e) => setContribDate(e.target.value)} type="date" required
                  className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <label className={cn(labelClass, "sm:col-span-2")}>
                <FieldLabel>Description</FieldLabel>
                <input value={contribDescription} onChange={(e) => setContribDescription(e.target.value)} placeholder="e.g. June 2026 SG contribution"
                  className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <div className="sm:col-span-2">
                <ModalSubmitButton submitting={submitting} label="Record Contribution" />
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Record Fee / Tax ── */}
      <Dialog open={deductionModalOpen} onOpenChange={setDeductionModalOpen}>
        <DialogContent
          className="border p-0 shadow-2xl"
          style={{ background: TOKENS.surfaceContainer, borderColor: "#f8717130", boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(248,113,113,0.08)" }}
        >
          <DialogClose onClose={() => setDeductionModalOpen(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "#f8717120" }}>
                  <MinusCircle className="h-4.5 w-4.5" style={{ color: "#f87171" }} />
                </div>
                <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>Record Fee / Tax</DialogTitle>
              </div>
              <p className="text-[13px]" style={{ color: TOKENS.onSurfaceMuted }}>
                Admin fees and government taxes deducted from your account.
              </p>
            </DialogHeader>
            <form onSubmit={handleAddDeduction} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                <FieldLabel>Super Account *</FieldLabel>
                <select value={deductAccountId} onChange={(e) => setDeductAccountId(e.target.value)} required
                  className={selectClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surface }}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                <FieldLabel>Type *</FieldLabel>
                <select value={deductType} onChange={(e) => setDeductType(e.target.value)}
                  className={selectClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surface }}>
                  <option value="fee">Admin Fee</option>
                  <option value="tax">Government Tax</option>
                </select>
              </label>
              <label className={labelClass}>
                <FieldLabel>Amount *</FieldLabel>
                <input value={deductAmount} onChange={(e) => setDeductAmount(e.target.value)} placeholder="0.00" required type="text" inputMode="decimal"
                  className={cn(fieldClass, "tabular-nums")} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <label className={labelClass}>
                <FieldLabel>Date *</FieldLabel>
                <input value={deductDate} onChange={(e) => setDeductDate(e.target.value)} type="date" required
                  className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <label className={cn(labelClass, "sm:col-span-2")}>
                <FieldLabel>Description</FieldLabel>
                <input value={deductDescription} onChange={(e) => setDeductDescription(e.target.value)} placeholder="e.g. Monthly admin fee"
                  className={fieldClass} style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }} />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn("mt-2 w-full rounded-xl px-5 py-3 text-[13px] font-semibold transition-colors disabled:opacity-40", consoleFocus)}
                  style={{ background: "#f87171", color: "#1a0000" }}
                >
                  {submitting ? "Saving…" : "Record Deduction"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
