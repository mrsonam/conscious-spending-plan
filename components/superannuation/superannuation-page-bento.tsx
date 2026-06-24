"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Building2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { toastSuccess, toastError } from "@/lib/app-toast"
import { tryParseMoneyInput } from "@/lib/money-input"

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
  government: "Government Co-contribution",
}

const CONTRIBUTION_TYPE_COLORS: Record<string, string> = {
  employer: "#60a5fa",
  salary_sacrifice: "#a78bfa",
  personal: TOKENS.primary,
  government: "#fbbf24",
}

function AccountCardSkeleton() {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost }}
    >
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded" style={{ background: TOKENS.surfaceHigh }} />
        <div className="h-8 w-28 animate-pulse rounded" style={{ background: TOKENS.surfaceHigh }} />
        <div className="h-3 w-32 animate-pulse rounded" style={{ background: TOKENS.surfaceHigh }} />
      </div>
    </div>
  )
}

export function SuperannuationPageBento() {
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const [accounts, setAccounts] = useState<SuperAccount[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const [showAddAccount, setShowAddAccount] = useState(false)
  const [editingAccount, setEditingAccount] = useState<SuperAccount | null>(null)
  const [showContribution, setShowContribution] = useState(false)
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Add/edit account form
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
    setShowAddAccount(false)
  }

  const openEditAccount = (account: SuperAccount) => {
    setEditingAccount(account)
    setFormName(account.name)
    setFormFundType(account.fundType ?? "")
    setFormProvider(account.provider ?? "")
    setFormMemberNumber(account.memberNumber ?? "")
    setFormEmployerName(account.employerName ?? "")
    setFormBalance(String(account.balance))
    setShowAddAccount(true)
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
        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          toastError(data.error || "Failed to update account")
          return
        }
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
        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          toastError(data.error || "Failed to create account")
          return
        }
        toastSuccess("Super account added")
      }
      resetAccountForm()
      await load()
    } catch {
      toastError("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/superannuation?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        toastError("Failed to delete account")
        return
      }
      toastSuccess("Super account deleted")
      await load()
    } catch {
      toastError("Something went wrong")
    }
  }

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contribAccountId || !contribAmount) return
    setSubmitting(true)

    const amount = tryParseMoneyInput(contribAmount, currencyCode)
    if (amount === null || amount <= 0) {
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
          amount,
          type: contribType,
          date: contribDate,
          description: contribDescription.trim(),
        }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toastError(data.error || "Failed to add contribution")
        return
      }
      toastSuccess("Contribution recorded")
      setContribAmount("")
      setContribDescription("")
      setContribDate(new Date().toISOString().split("T")[0])
      setShowContribution(false)
      await load()
    } catch {
      toastError("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteContribution = async (id: string) => {
    try {
      const res = await fetch(`/api/superannuation/contributions?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        toastError("Failed to delete contribution")
        return
      }
      toastSuccess("Contribution deleted")
      await load()
    } catch {
      toastError("Something went wrong")
    }
  }

  const totalContributions = useMemo(() => {
    return accounts.reduce(
      (sum, a) => sum + a.contributions.reduce((s, c) => s + c.amount, 0),
      0,
    )
  }, [accounts])

  const contributionsByType = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of accounts) {
      for (const c of a.contributions) {
        map[c.type] = (map[c.type] ?? 0) + c.amount
      }
    }
    return map
  }, [accounts])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountCardSkeleton />
          <AccountCardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary strip */}
      <section
        className="rounded-2xl border p-5 sm:p-6"
        style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "#60a5fa20" }}
            >
              <Shield className="h-5 w-5" style={{ color: "#60a5fa" }} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Total Super Balance
              </p>
              <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: TOKENS.onSurface }}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Accounts
              </p>
              <p className="text-lg font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                {accounts.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Total Contributions
              </p>
              <p className="text-lg font-semibold tabular-nums" style={{ color: TOKENS.primary }}>
                {formatCurrency(totalContributions)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => { resetAccountForm(); setShowAddAccount(true) }}
          className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/[0.04]", consoleFocus)}
          style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.primary }}
        >
          <Plus className="h-4 w-4" /> Add Super Account
        </button>
        {accounts.length > 0 && (
          <button
            type="button"
            onClick={() => { setShowContribution(true); setContribAccountId(accounts[0].id) }}
            className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/[0.04]", consoleFocus)}
            style={{ borderColor: TOKENS.outlineGhost, color: "#60a5fa" }}
          >
            <DollarSign className="h-4 w-4" /> Record Contribution
          </button>
        )}
      </div>

      {/* Add/Edit Account Dialog */}
      {showAddAccount && (
        <section
          className="rounded-2xl border p-5 sm:p-6"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.primary + "40", boxShadow: CARD_INSET }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold" style={{ color: TOKENS.onSurface }}>
              {editingAccount ? "Edit Super Account" : "Add Super Account"}
            </h3>
            <button type="button" onClick={resetAccountForm} className="rounded-lg p-1.5" style={{ color: TOKENS.onSurfaceMuted }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSaveAccount} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Fund Name *</span>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. AustralianSuper"
                required
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#60a5fa]"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Investment Option</span>
              <input
                value={formFundType}
                onChange={(e) => setFormFundType(e.target.value)}
                placeholder="e.g. Balanced, High Growth"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#60a5fa]"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Employer</span>
              <input
                value={formEmployerName}
                onChange={(e) => setFormEmployerName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#60a5fa]"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Member Number</span>
              <input
                value={formMemberNumber}
                onChange={(e) => setFormMemberNumber(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#60a5fa]"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Provider / Trustee</span>
              <input
                value={formProvider}
                onChange={(e) => setFormProvider(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#60a5fa]"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Current Balance</span>
              <input
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] tabular-nums outline-none transition-colors focus:border-[#60a5fa]"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting || !formName.trim()}
                className={cn("rounded-xl px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-40", consoleFocus)}
                style={{ background: "#60a5fa", color: "#050a14" }}
              >
                {submitting ? "Saving..." : editingAccount ? "Update Account" : "Add Account"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Record Contribution Dialog */}
      {showContribution && (
        <section
          className="rounded-2xl border p-5 sm:p-6"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.primary + "40", boxShadow: CARD_INSET }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold" style={{ color: TOKENS.onSurface }}>
              Record Contribution
            </h3>
            <button type="button" onClick={() => setShowContribution(false)} className="rounded-lg p-1.5" style={{ color: TOKENS.onSurfaceMuted }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleAddContribution} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Super Account *</span>
              <select
                value={contribAccountId}
                onChange={(e) => setContribAccountId(e.target.value)}
                required
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surface }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Contribution Type *</span>
              <select
                value={contribType}
                onChange={(e) => setContribType(e.target.value)}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surface }}
              >
                <option value="employer">Employer (SG)</option>
                <option value="salary_sacrifice">Salary Sacrifice</option>
                <option value="personal">Personal</option>
                <option value="government">Government Co-contribution</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Amount *</span>
              <input
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                placeholder="0.00"
                required
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] tabular-nums outline-none transition-colors focus:border-[#60a5fa]"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Date *</span>
              <input
                value={contribDate}
                onChange={(e) => setContribDate(e.target.value)}
                type="date"
                required
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#60a5fa]"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>Description</span>
              <input
                value={contribDescription}
                onChange={(e) => setContribDescription(e.target.value)}
                placeholder="e.g. June 2026 SG contribution"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#60a5fa]"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className={cn("rounded-xl px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-40", consoleFocus)}
                style={{ background: "#60a5fa", color: "#050a14" }}
              >
                {submitting ? "Saving..." : "Record Contribution"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Contribution breakdown by type */}
      {Object.keys(contributionsByType).length > 0 && (
        <section
          className="rounded-2xl border p-5 sm:p-6"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Contributions by Type
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(contributionsByType).map(([type, total]) => {
              const color = CONTRIBUTION_TYPE_COLORS[type] ?? TOKENS.primary
              return (
                <div
                  key={type}
                  className="rounded-xl border px-4 py-3"
                  style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surface }}
                >
                  <p className="text-[11px] font-medium" style={{ color }}>
                    {CONTRIBUTION_TYPE_LABELS[type] ?? type}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                    {formatCurrency(total)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Account cards */}
      {accounts.length === 0 ? (
        <section
          className="flex flex-col items-center justify-center rounded-2xl border py-16"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost }}
        >
          <Shield className="mb-3 h-10 w-10" style={{ color: TOKENS.onSurfaceMuted }} />
          <p className="text-[15px] font-semibold" style={{ color: TOKENS.onSurface }}>
            No super accounts yet
          </p>
          <p className="mt-1 text-[13px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Add your superannuation fund to start tracking your retirement balance.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => {
            const isExpanded = expandedAccountId === account.id
            return (
              <section
                key={account.id}
                className="rounded-2xl border"
                style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: "#60a5fa18" }}
                      >
                        <Shield className="h-4 w-4" style={{ color: "#60a5fa" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold" style={{ color: TOKENS.onSurface }}>
                          {account.name}
                        </p>
                        {account.fundType && (
                          <p className="truncate text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                            {account.fundType}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight" style={{ color: TOKENS.onSurface }}>
                      {formatCurrency(account.balance)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {account.employerName && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                          <Building2 className="h-3 w-3" /> {account.employerName}
                        </span>
                      )}
                      {account.memberNumber && (
                        <span className="text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                          #{account.memberNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditAccount(account)}
                      className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                      title="Edit account"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(account.id)}
                      className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06]"
                      style={{ color: TOKENS.loss }}
                      title="Delete account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contributions toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedAccountId(isExpanded ? null : account.id)}
                  className="flex w-full items-center justify-between border-t px-5 py-3 text-[12px] font-medium transition-colors hover:bg-white/[0.02]"
                  style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
                >
                  <span>{account.contributions.length} contribution{account.contributions.length !== 1 ? "s" : ""}</span>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {/* Contributions list */}
                {isExpanded && account.contributions.length > 0 && (
                  <div className="border-t" style={{ borderColor: TOKENS.outlineGhost }}>
                    {account.contributions.map((c) => {
                      const color = CONTRIBUTION_TYPE_COLORS[c.type] ?? TOKENS.primary
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between border-b px-5 py-2.5 last:border-b-0"
                          style={{ borderColor: TOKENS.outlineGhost }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase"
                                style={{ background: color + "18", color }}
                              >
                                {CONTRIBUTION_TYPE_LABELS[c.type] ?? c.type}
                              </span>
                              <span className="text-[11px] tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                                {new Date(c.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                            {c.description && (
                              <p className="mt-0.5 truncate text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                                {c.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold tabular-nums" style={{ color: TOKENS.primary }}>
                              +{formatCurrency(c.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteContribution(c.id)}
                              className="rounded p-1 transition-colors hover:bg-white/[0.06]"
                              style={{ color: TOKENS.onSurfaceMuted }}
                              title="Delete contribution"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
