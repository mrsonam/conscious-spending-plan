"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  invalidateCachedJson,
  fetchJsonAndCache,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppSelect } from "@/components/ui/app-select"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { monthlyEquivalent, type SubscriptionFrequency } from "@/lib/subscription-utils"
import { CalendarClock, Plus, Trash2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

const CACHE_KEY = "subscriptions:list"

type Account = {
  id: string
  name: string
  bankName: string
  accountType: string
}

type Recurring = {
  id: string
  amount: number
  description: string | null
  frequency: string
  startDate: string
  endDate: string | null
  isActive: boolean
  category: string | null
  expenseCategory: string | null
  account: { id: string; name: string; bankName: string }
}

export type SubscriptionRow = {
  id: string
  provider: string | null
  label: string | null
  status: string
  trialEndsAt: string | null
  nextRenewalAt: string | null
  reminderDaysBefore: number
  recurringExpense: Recurring
}

const FUND_OPTIONS = [
  { value: "", label: "—" },
  { value: "fixedCosts", label: "Fixed costs" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
  { value: "guiltFreeSpending", label: "Guilt-free" },
]

const FREQ_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
]

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function SubscriptionsPageBento() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [monthlyActiveTotal, setMonthlyActiveTotal] = useState(0)
  const [upcoming, setUpcoming] = useState<
    Array<{
      subscriptionId: string
      label: string
      provider: string | null
      amount: number
      date: string
      kind: "renewal" | "trial"
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [provider, setProvider] = useState("")
  const [label, setLabel] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [fundCategory, setFundCategory] = useState("")
  const [startDate, setStartDate] = useState("")
  const [trialEndsAt, setTrialEndsAt] = useState("")
  const [nextRenewalAt, setNextRenewalAt] = useState("")
  const [reminderDays, setReminderDays] = useState("7")
  const [status, setStatus] = useState("active")
  const [submitting, setSubmitting] = useState(false)

  const refetch = useCallback(async () => {
    const data = await fetchJsonAndCache<{
      subscriptions?: SubscriptionRow[]
      monthlyActiveTotal?: number
      upcoming?: typeof upcoming
    }>(CACHE_KEY, `/api/subscriptions?upcomingDays=14&t=${Date.now()}`)
    setSubscriptions(data.subscriptions ?? [])
    setMonthlyActiveTotal(data.monthlyActiveTotal ?? 0)
    setUpcoming(data.upcoming ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cached = peekCachedJson<{ accounts?: Account[] }>(
          "subscriptions:accounts",
          60_000
        )
        if (cached?.accounts) setAccounts(cached.accounts)
        const [accRes, subFirst] = await Promise.all([
          fetchJsonAndCache<{ accounts?: Account[] }>(
            "subscriptions:accounts",
            `/api/accounts?t=${Date.now()}`
          ),
          peekCachedJson<{
            subscriptions?: SubscriptionRow[]
            monthlyActiveTotal?: number
            upcoming?: typeof upcoming
          }>(CACHE_KEY, 30_000),
        ])
        if (cancelled) return
        setAccounts(accRes.accounts ?? [])
        if (subFirst?.subscriptions) {
          setSubscriptions(subFirst.subscriptions)
          setMonthlyActiveTotal(subFirst.monthlyActiveTotal ?? 0)
          setUpcoming(subFirst.upcoming ?? [])
          setLoading(false)
        }
        await refetch()
      } catch {
        if (!cancelled) setMessage({ type: "error", text: "Failed to load data." })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refetch])

  const resetForm = () => {
    setEditId(null)
    setAccountId(accounts[0]?.id ?? "")
    setAmount("")
    setDescription("")
    setProvider("")
    setLabel("")
    setFrequency("monthly")
    setFundCategory("")
    setStartDate(new Date().toISOString().split("T")[0])
    setTrialEndsAt("")
    setNextRenewalAt("")
    setReminderDays("7")
    setStatus("active")
  }

  useEffect(() => {
    if (open && accounts.length && !accountId) {
      setAccountId(accounts[0].id)
    }
  }, [open, accounts, accountId])

  const openCreate = () => {
    resetForm()
    setOpen(true)
  }

  const openEdit = (s: SubscriptionRow) => {
    setEditId(s.id)
    setAccountId(s.recurringExpense.account.id)
    setAmount(String(s.recurringExpense.amount))
    setDescription(s.recurringExpense.description ?? "")
    setProvider(s.provider ?? "")
    setLabel(s.label ?? "")
    setFrequency(s.recurringExpense.frequency)
    setFundCategory(s.recurringExpense.category ?? "")
    setStartDate(s.recurringExpense.startDate.slice(0, 10))
    setTrialEndsAt(s.trialEndsAt ? s.trialEndsAt.slice(0, 10) : "")
    setNextRenewalAt(s.nextRenewalAt ? s.nextRenewalAt.slice(0, 10) : "")
    setReminderDays(String(s.reminderDaysBefore))
    setStatus(s.status)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!accountId || !Number.isFinite(amt) || amt <= 0) {
      setMessage({ type: "error", text: "Choose an account and a valid amount." })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      if (editId) {
        const res = await fetch(`/api/subscriptions/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: provider.trim() || null,
            label: label.trim() || null,
            status,
            trialEndsAt: trialEndsAt || null,
            nextRenewalAt: nextRenewalAt || null,
            reminderDaysBefore: parseInt(reminderDays, 10) || 7,
            recurring: {
              accountId,
              amount: amt,
              description: description.trim() || null,
              category: fundCategory || null,
              frequency,
              startDate,
            },
          }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setMessage({ type: "error", text: data.error || "Update failed." })
          return
        }
        setMessage({ type: "success", text: "Subscription updated." })
      } else {
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            amount: amt,
            description: description.trim() || null,
            category: fundCategory || null,
            frequency,
            startDate,
            provider: provider.trim() || null,
            label: label.trim() || null,
            trialEndsAt: trialEndsAt || null,
            nextRenewalAt: nextRenewalAt || null,
            reminderDaysBefore: parseInt(reminderDays, 10) || 7,
            status,
          }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setMessage({ type: "error", text: data.error || "Could not create." })
          return
        }
        setMessage({ type: "success", text: "Subscription added." })
      }
      invalidateCachedJson(CACHE_KEY)
      invalidateCachedJson("dashboard:subscriptions")
      await refetch()
      setOpen(false)
      resetForm()
    } catch {
      setMessage({ type: "error", text: "Request failed." })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this subscription from the list? The recurring charge will stay in Expenses until you delete it there.")) return
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setMessage({ type: "error", text: data.error || "Delete failed." })
        return
      }
      invalidateCachedJson(CACHE_KEY)
      invalidateCachedJson("dashboard:subscriptions")
      await refetch()
      setMessage({ type: "success", text: "Removed from subscriptions." })
    } catch {
      setMessage({ type: "error", text: "Delete failed." })
    }
  }

  const rows = useMemo(() => {
    return subscriptions.map((s) => {
      const freq = s.recurringExpense.frequency as SubscriptionFrequency
      const m =
        ["weekly", "monthly", "yearly"].includes(freq)
          ? monthlyEquivalent(s.recurringExpense.amount, freq)
          : s.recurringExpense.amount
      const title =
        s.label?.trim() ||
        s.recurringExpense.description?.trim() ||
        s.provider?.trim() ||
        "Subscription"
      return { s, monthlyEq: m, title }
    })
  }, [subscriptions])

  const consoleFieldClass =
    "rounded-xl border tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark] placeholder:text-white/45"
  const consoleFieldStyle: React.CSSProperties = {
    background: TOKENS.surfaceLow,
    borderColor: TOKENS.outlineGhost,
    color: TOKENS.onSurface,
  }

  return (
    <div className="space-y-8">
      {message ? (
        <p
          className="text-sm font-medium"
          style={{
            color: message.type === "success" ? TOKENS.primary : "#ffb4ab",
          }}
        >
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="rounded-xl border p-5"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: CARD_INSET,
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Active (monthly eq.)
          </p>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {loading ? (
              "—"
            ) : (
              <MajorFigureCurrency
                amount={monthlyActiveTotal}
                variant="neutral"
                className="text-2xl font-bold!"
              />
            )}
          </div>
        </div>
        <div
          className="rounded-xl border p-5 sm:col-span-2"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: CARD_INSET,
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Next 14 days
          </p>
          {loading ? (
            <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Loading…
            </p>
          ) : upcoming.length === 0 ? (
            <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              No renewals or trial endings in this window.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcoming.slice(0, 6).map((u) => (
                <li
                  key={`${u.subscriptionId}-${u.kind}-${u.date}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span style={{ color: TOKENS.onSurface }}>
                    {u.label}
                    <span
                      className="ml-2 text-[10px] uppercase tracking-wide"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {u.kind === "trial" ? "trial ends" : "renews"}
                    </span>
                  </span>
                  <span className="tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                    {formatShort(u.date)} ·{" "}
                    <MajorFigureCurrency
                      amount={u.amount}
                      variant="neutral"
                      className="inline text-sm font-semibold!"
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" style={{ color: TOKENS.secondary }} />
          <h2 className="text-lg font-semibold tracking-tight">Your subscriptions</h2>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          className="gap-2 rounded-xl font-bold uppercase tracking-wider"
          style={{ background: TOKENS.primary, color: TOKENS.surface }}
        >
          <Plus className="h-4 w-4" />
          Add subscription
        </Button>
      </div>

      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
      >
        {loading ? (
          <p className="p-6 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            No subscriptions yet. Add one to link a recurring charge and see renewals here.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: TOKENS.outlineGhost }}>
            {rows.map(({ s, monthlyEq, title }) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: TOKENS.onSurface }}>
                    {title}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                    {s.recurringExpense.account.name} · {s.recurringExpense.frequency} ·{" "}
                    <MajorFigureCurrency
                      amount={s.recurringExpense.amount}
                      variant="neutral"
                      className="inline text-xs!"
                    />
                    {s.status !== "active" ? (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        {s.status}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase" style={{ color: TOKENS.onSurfaceMuted }}>
                      /mo eq.
                    </p>
                    <MajorFigureCurrency
                      amount={monthlyEq}
                      variant="prosperity"
                      className="text-base font-bold!"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="rounded-lg p-2 transition-colors hover:bg-white/10"
                    style={{ color: TOKENS.secondary }}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(s.id)}
                    className="rounded-lg p-2 transition-colors hover:bg-white/10"
                    style={{ color: "#ffb4ab" }}
                    aria-label="Remove from list"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "max-h-[90vh] overflow-y-auto border sm:max-w-lg",
          )}
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            color: TOKENS.onSurface,
          }}
        >
          <DialogHeader>
            <DialogTitle>{editId ? "Edit subscription" : "Add subscription"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label>Account</Label>
              <AppSelect
                className="mt-1"
                variant="console"
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                value={accountId}
                onValueChange={setAccountId}
                options={accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.bankName})`,
                }))}
                placeholder="Select account"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn("mt-1", consoleFieldClass)}
                  style={consoleFieldStyle}
                  required
                />
              </div>
              <div>
                <Label>Frequency</Label>
                <AppSelect
                  className="mt-1"
                  variant="console"
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  value={frequency}
                  onValueChange={setFrequency}
                  options={FREQ_OPTIONS}
                />
              </div>
            </div>
            <div>
              <Label>Charge description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={cn("mt-1", consoleFieldClass)}
                style={consoleFieldStyle}
                placeholder="e.g. Netflix"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provider (optional)</Label>
                <Input
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className={cn("mt-1", consoleFieldClass)}
                  style={consoleFieldStyle}
                />
              </div>
              <div>
                <Label>Display label (optional)</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className={cn("mt-1", consoleFieldClass)}
                  style={consoleFieldStyle}
                />
              </div>
            </div>
            <div>
              <Label>Fund category</Label>
              <AppSelect
                className="mt-1"
                variant="console"
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                value={fundCategory}
                onValueChange={setFundCategory}
                options={FUND_OPTIONS}
              />
            </div>
            <div>
              <Label>Start date</Label>
              <DateInput
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn("mt-1", consoleFieldClass)}
                style={consoleFieldStyle}
                popoverClassName="border"
                popoverStyle={{
                  background: TOKENS.surfaceContainer,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Trial ends (optional)</Label>
                <DateInput
                  value={trialEndsAt}
                  onChange={(e) => setTrialEndsAt(e.target.value)}
                  className={cn("mt-1", consoleFieldClass)}
                  style={consoleFieldStyle}
                  popoverClassName="border"
                  popoverStyle={{
                    background: TOKENS.surfaceContainer,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <div>
                <Label>Next renewal override</Label>
                <DateInput
                  value={nextRenewalAt}
                  onChange={(e) => setNextRenewalAt(e.target.value)}
                  className={cn("mt-1", consoleFieldClass)}
                  style={consoleFieldStyle}
                  popoverClassName="border"
                  popoverStyle={{
                    background: TOKENS.surfaceContainer,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Remind (days before)</Label>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={reminderDays}
                  onChange={(e) => setReminderDays(e.target.value)}
                  className={cn("mt-1", consoleFieldClass)}
                  style={consoleFieldStyle}
                />
              </div>
              <div>
                <Label>Status</Label>
                <AppSelect
                  className="mt-1"
                  variant="console"
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  value={status}
                  onValueChange={setStatus}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  resetForm()
                }}
                className="rounded-xl border"
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl font-bold"
                style={{ background: TOKENS.primary, color: TOKENS.surface }}
              >
                {submitting ? "Saving…" : editId ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
