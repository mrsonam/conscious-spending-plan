"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import {
  invalidateCachedJson,
  fetchJsonAndCache,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import { DateInput } from "@/components/ui/date-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { AppSelect } from "@/components/ui/app-select"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { toastError, toastSuccess } from "@/lib/app-toast"
import {
  applyOptimisticSubscriptionCreate,
  applyOptimisticSubscriptionDelete,
  applyOptimisticSubscriptionUpdate,
  cloneSubscriptionState,
} from "@/lib/subscription-optimistic"
import { createOptimisticId } from "@/lib/optimistic-id"
import { FormStatusAlert } from "@/components/wealth-console/form-status-alert"
import {
  monthlyEquivalent,
  formatRecurringFrequencyLabel,
  SUPPORTED_SUBSCRIPTION_FREQUENCIES,
  type SubscriptionFrequency,
} from "@/lib/subscription-utils"
import { CalendarClock, Plus, Trash2, Pencil, Calendar, ArrowRight, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { getLocalDateString } from "@/lib/date-utils"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { parseMoneyInput } from "@/lib/money-input"

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
  intervalDays?: number | null
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
  foreignCurrency: string | null
  foreignAmount: number | null
  recurringExpense: Recurring
}

const FUND_OPTIONS = [
  { value: "", label: "-" },
  { value: "fixedCosts", label: "Fixed costs" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
  { value: "guiltFreeSpending", label: "Guilt-free" },
]

const FREQ_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom (every N days)" },
]

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
]

const EXPENSE_CATEGORIES = [
  { value: "groceries", label: "Groceries" },
  { value: "food", label: "Food & Dining" },
  { value: "transport", label: "Transportation" },
  { value: "gas", label: "Gas & Fuel" },
  { value: "bills", label: "Bills & Utilities" },
  { value: "rent", label: "Rent & Mortgage" },
  { value: "insurance", label: "Insurance" },
  { value: "entertainment", label: "Entertainment" },
  { value: "shopping", label: "Shopping" },
  { value: "clothing", label: "Clothing & Apparel" },
  { value: "healthcare", label: "Healthcare" },
  { value: "pharmacy", label: "Pharmacy & Medicine" },
  { value: "education", label: "Education" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "personal", label: "Personal Care" },
  { value: "gifts", label: "Gifts & Donations" },
  { value: "travel", label: "Travel" },
  { value: "home", label: "Home & Garden" },
  { value: "pet", label: "Pet Care" },
  { value: "fitness", label: "Fitness & Sports" },
  { value: "technology", label: "Technology & Electronics" },
  { value: "other", label: "Other" },
]

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function SubscriptionsPageBento() {
  const { currencyCode } = useFormatCurrency()
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
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [provider, setProvider] = useState("")
  const [label, setLabel] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [intervalDays, setIntervalDays] = useState("30")
  const [fundCategory, setFundCategory] = useState("")
  const [expenseCategory, setExpenseCategory] = useState("")
  const [startDate, setStartDate] = useState("")
  const [trialEndsAt, setTrialEndsAt] = useState("")
  const [nextRenewalAt, setNextRenewalAt] = useState("")
  const [reminderDays, setReminderDays] = useState("7")
  const [status, setStatus] = useState("active")
  
  const [isInternational, setIsInternational] = useState(false)
  const [foreignCurrency, setForeignCurrency] = useState("")
  const [foreignAmount, setForeignAmount] = useState("")

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

  useLayoutEffect(() => {
    const cachedAccounts =
      peekCachedJson<{ accounts?: Account[] }>("subscriptions:accounts", 60_000) ??
      peekCachedJson<{ accounts?: Account[] }>("dashboard:accounts", 45_000)
    if (cachedAccounts?.accounts) {
      setAccounts(cachedAccounts.accounts)
    }

    const cachedSubs = peekCachedJson<{
      subscriptions?: SubscriptionRow[]
      monthlyActiveTotal?: number
      upcoming?: typeof upcoming
    }>(CACHE_KEY, 30_000)
    if (cachedSubs?.subscriptions) {
      setSubscriptions(cachedSubs.subscriptions)
      setMonthlyActiveTotal(cachedSubs.monthlyActiveTotal ?? 0)
      setUpcoming(cachedSubs.upcoming ?? [])
      setLoading(false)
    }
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
        const subFirst = peekCachedJson<{
          subscriptions?: SubscriptionRow[]
          monthlyActiveTotal?: number
          upcoming?: typeof upcoming
        }>(CACHE_KEY, 30_000)
        if (subFirst?.subscriptions) {
          setSubscriptions(subFirst.subscriptions)
          setMonthlyActiveTotal(subFirst.monthlyActiveTotal ?? 0)
          setUpcoming(subFirst.upcoming ?? [])
          setLoading(false)
        } else {
          setLoading(true)
        }
        const [accRes] = await Promise.all([
          fetchJsonAndCache<{ accounts?: Account[] }>(
            "subscriptions:accounts",
            `/api/accounts?t=${Date.now()}`
          ),
          refetch(),
        ])
        if (cancelled) return
        setAccounts(accRes.accounts ?? [])
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
    setIntervalDays("30")
    setFundCategory("")
    setExpenseCategory("")
    setStartDate(getLocalDateString())
    setTrialEndsAt("")
    setNextRenewalAt("")
    setReminderDays("7")
    setStatus("active")
    setIsInternational(false)
    setForeignCurrency("")
    setForeignAmount("")
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
    setIntervalDays(
      s.recurringExpense.intervalDays != null
        ? String(s.recurringExpense.intervalDays)
        : "30",
    )
    setFundCategory(s.recurringExpense.category ?? "")
    setExpenseCategory(s.recurringExpense.expenseCategory ?? "")
    setStartDate(s.recurringExpense.startDate.slice(0, 10))
    setTrialEndsAt(s.trialEndsAt ? s.trialEndsAt.slice(0, 10) : "")
    setNextRenewalAt(s.nextRenewalAt ? s.nextRenewalAt.slice(0, 10) : "")
    setReminderDays(String(s.reminderDaysBefore))
    setStatus(s.status)
    setIsInternational(!!s.foreignCurrency)
    setForeignCurrency(s.foreignCurrency ?? "")
    setForeignAmount(s.foreignAmount ? String(s.foreignAmount) : "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let amt: number
    try {
      amt = parseMoneyInput(amount, currencyCode)
    } catch {
      amt = NaN
    }
    if (!accountId || !Number.isFinite(amt) || amt <= 0) {
      setMessage({ type: "error", text: "Choose an account and a valid amount." })
      return
    }
    if (frequency === "custom") {
      const days = parseInt(intervalDays, 10)
      if (!Number.isInteger(days) || days < 1 || days > 366) {
        setMessage({
          type: "error",
          text: "Custom frequency requires days between 1 and 366.",
        })
        return
      }
    }
    const account = accounts.find((a) => a.id === accountId)
    if (!account) {
      setMessage({ type: "error", text: "Choose an account and a valid amount." })
      return
    }

    const snapshot = cloneSubscriptionState(subscriptions, monthlyActiveTotal)
    const editingId = editId
    const recurringBase = {
      accountId,
      amount: amt,
      description: description.trim() || null,
      category: fundCategory || null,
      expenseCategory: expenseCategory || null,
      frequency,
      intervalDays:
        frequency === "custom" ? parseInt(intervalDays, 10) : null,
      startDate,
    }
    const subscriptionMeta = {
      provider: provider.trim() || null,
      label: label.trim() || null,
      status,
      trialEndsAt: trialEndsAt || null,
      nextRenewalAt: nextRenewalAt || null,
      reminderDaysBefore: parseInt(reminderDays, 10) || 7,
      foreignCurrency: isInternational ? foreignCurrency.trim() || null : null,
      foreignAmount:
        isInternational && foreignAmount && foreignCurrency.trim()
          ? parseMoneyInput(foreignAmount, foreignCurrency.trim())
          : null,
    }

    if (editId) {
      const existing = subscriptions.find((s) => s.id === editId)
      const optimistic = applyOptimisticSubscriptionUpdate(
        subscriptions,
        monthlyActiveTotal,
        editId,
        {
          ...subscriptionMeta,
          recurringExpense: {
            ...(existing?.recurringExpense ?? {
              id: createOptimisticId("recurring"),
              endDate: null,
              isActive: true,
            }),
            amount: amt,
            description: recurringBase.description,
            frequency,
            intervalDays:
              frequency === "custom" ? parseInt(intervalDays, 10) : null,
            startDate,
            category: recurringBase.category,
            expenseCategory: recurringBase.expenseCategory,
            account,
          },
        }
      )
      setSubscriptions(optimistic.subscriptions)
      setMonthlyActiveTotal(optimistic.monthlyActiveTotal)
      toastSuccess("Subscription updated.")
    } else {
      const optimistic = applyOptimisticSubscriptionCreate(
        subscriptions,
        monthlyActiveTotal,
        {
          account,
          amount: amt,
          description: recurringBase.description,
          category: recurringBase.category,
          expenseCategory: recurringBase.expenseCategory,
          frequency,
          intervalDays:
            frequency === "custom" ? parseInt(intervalDays, 10) : null,
          startDate,
          ...subscriptionMeta,
        }
      )
      setSubscriptions(optimistic.subscriptions)
      setMonthlyActiveTotal(optimistic.monthlyActiveTotal)
      toastSuccess("Subscription added.")
    }

    setOpen(false)
    resetForm()

    void (async () => {
      setSubmitting(true)
      try {
        if (editingId) {
          const res = await fetch(`/api/subscriptions/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...subscriptionMeta,
              recurring: recurringBase,
            }),
          })
          const data = (await res.json()) as { error?: string }
          if (!res.ok) {
            setSubscriptions(snapshot.subscriptions)
            setMonthlyActiveTotal(snapshot.monthlyActiveTotal)
            setMessage({ type: "error", text: data.error || "Update failed." })
            toastError(data.error || "Update failed.")
            return
          }
        } else {
          const res = await fetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...recurringBase,
              ...subscriptionMeta,
            }),
          })
          const data = (await res.json()) as { error?: string }
          if (!res.ok) {
            setSubscriptions(snapshot.subscriptions)
            setMonthlyActiveTotal(snapshot.monthlyActiveTotal)
            setMessage({ type: "error", text: data.error || "Could not create." })
            toastError(data.error || "Could not create.")
            return
          }
        }
        invalidateCachedJson(CACHE_KEY)
        invalidateCachedJson("dashboard:subscriptions")
        invalidateCachedJson("dashboard:console")
        await refetch()
      } catch {
        setSubscriptions(snapshot.subscriptions)
        setMonthlyActiveTotal(snapshot.monthlyActiveTotal)
        setMessage({ type: "error", text: "Request failed." })
        toastError("Request failed.")
      } finally {
        setSubmitting(false)
      }
    })()
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    const id = deleteId
    setDeleteId(null)

    const snapshot = cloneSubscriptionState(subscriptions, monthlyActiveTotal)
    const optimistic = applyOptimisticSubscriptionDelete(subscriptions, monthlyActiveTotal, id)
    setSubscriptions(optimistic.subscriptions)
    setMonthlyActiveTotal(optimistic.monthlyActiveTotal)
    toastSuccess("Removed from subscriptions.")

    void (async () => {
      try {
        const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          setSubscriptions(snapshot.subscriptions)
          setMonthlyActiveTotal(snapshot.monthlyActiveTotal)
          setMessage({ type: "error", text: data.error || "Delete failed." })
          toastError(data.error || "Delete failed.")
          return
        }
        invalidateCachedJson(CACHE_KEY)
        invalidateCachedJson("dashboard:subscriptions")
        invalidateCachedJson("dashboard:console")
        await refetch()
      } catch {
        setSubscriptions(snapshot.subscriptions)
        setMonthlyActiveTotal(snapshot.monthlyActiveTotal)
        setMessage({ type: "error", text: "Delete failed." })
        toastError("Delete failed.")
      }
    })()
  }

  const rows = useMemo(() => {
    return subscriptions.map((s) => {
      const freq = s.recurringExpense.frequency as SubscriptionFrequency
      const m =
        SUPPORTED_SUBSCRIPTION_FREQUENCIES.includes(freq)
          ? monthlyEquivalent(
              s.recurringExpense.amount,
              freq,
              s.recurringExpense.intervalDays,
            )
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

  const PILLAR_COLORS: Record<string, string> = {
    fixedCosts: "rgba(248,113,113,0.92)",
    savings: "rgba(74,222,128,0.92)",
    investment: "rgba(137,206,255,0.95)",
    guiltFreeSpending: "rgba(196,181,253,0.92)",
  }

  const activeSubs = rows.filter((r) => r.s.status === "active")
  const categorySplit = FUND_OPTIONS.filter((o) => o.value)
    .map((opt) => {
      const amt = activeSubs
        .filter((r) => r.s.recurringExpense.category === opt.value)
        .reduce((sum, r) => sum + r.monthlyEq, 0)
      return { key: opt.value as string, label: opt.label, amount: amt }
    })
    .sort((a, b) => b.amount - a.amount)

  const annualEq = monthlyActiveTotal * 12

  return (
    <div className="space-y-6 sm:space-y-8">
      <FormStatusAlert message={message} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 lg:items-start">
        {/* Telemetry Hero */}
        <section className="lg:col-span-7">
          <div className="px-1 py-2 sm:px-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: TOKENS.primary, boxShadow: CARD_INSET }}
                />
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Live fund telemetry
                </p>
              </div>
            </div>

            <p
              className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Monthly commit
            </p>
            <div className="mt-2 min-h-[2.75rem] text-4xl font-black leading-none tracking-tight sm:min-h-[3.25rem] sm:text-5xl lg:min-h-[3.5rem] lg:text-[3.5rem]">
              {loading ? (
                <Skeleton
                  className="block h-10 w-40 max-w-full sm:h-12 sm:w-48 lg:h-14 lg:w-56"
                  aria-hidden
                />
              ) : (
                <MajorFigureCurrency
                  amount={monthlyActiveTotal}
                  variant="prosperity"
                  className="font-black!"
                  decimalEm={0.45}
                />
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              Total scheduled outflow. These auto-renewing charges anchor your envelope requirements.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3" style={{ borderColor: TOKENS.outlineGhost }}>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Annual anchor
                </p>
                <div className="mt-2 min-h-7">
                  {loading ? (
                    <Skeleton className="block h-7 w-28" aria-hidden />
                  ) : (
                    <MajorFigureCurrency
                      amount={annualEq}
                      variant="neutral"
                      className="text-lg font-bold!"
                      decimalEm={0.45}
                    />
                  )}
                </div>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Active contracts
                </p>
                <div className="mt-2 min-h-7">
                  {loading ? (
                    <Skeleton className="inline-block h-7 w-10" aria-hidden />
                  ) : (
                    <span className="text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                      {activeSubs.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Subscriptions by envelope */}
            {loading ? (
              <div className="mt-6 space-y-3">
                <Skeleton className="block h-2.5 w-36" aria-hidden />
                <Skeleton className="block h-2.5 w-full rounded-full" aria-hidden />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="block h-3 w-20" aria-hidden />
                      <Skeleton className="block h-3 w-14" aria-hidden />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              categorySplit.some((c) => c.amount > 0) && (
              <div className="mt-6">
                <p
                  className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Envelope Distribution
                </p>
                <div className="flex h-2.5 w-full min-w-0 overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
                  {categorySplit.map((cat) => {
                    if (cat.amount <= 0) return null
                    const w = (cat.amount / monthlyActiveTotal) * 100
                    const color = PILLAR_COLORS[cat.key] || TOKENS.tertiary
                    return (
                      <div
                        key={cat.key}
                        className="min-w-[2px] shrink-0 transition-[width] duration-300 motion-reduce:transition-none"
                        style={{ width: `${w}%`, background: color }}
                        title={`${cat.label} (${w.toFixed(1)}%)`}
                      />
                    )
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {categorySplit.map((cat) => {
                    if (cat.amount <= 0) return null
                    const pct = (cat.amount / monthlyActiveTotal) * 100
                    const color = PILLAR_COLORS[cat.key] || TOKENS.tertiary
                    return (
                      <div key={cat.key}>
                        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: TOKENS.onSurface }}>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                          <span className="truncate">{cat.label}</span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-1 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                          <span>{pct.toFixed(0)}%</span>
                          <span className="opacity-50">·</span>
                          <MajorFigureCurrency amount={cat.amount} variant="neutral" className="text-[11px] font-medium!" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
            )}
          </div>
        </section>

        {/* Command surface, Upcoming Renewals */}
        <section className="lg:col-span-5">
          <div
            className="rounded-xl border p-5 sm:p-6 lg:sticky lg:top-4"
            style={{
              background: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              boxShadow: CARD_INSET,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.28em]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" style={{ color: TOKENS.secondary }} />
                <span style={{ color: TOKENS.onSurfaceMuted }}>Radar</span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-snug" style={{ color: TOKENS.onSurfaceMuted }}>
              Upcoming renewals & trial expirations within next 14 days.
            </p>

            {loading ? (
              <ul className="mt-5 space-y-3" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-2 rounded-lg border p-3.5"
                    style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
                  >
                    <div className="flex justify-between gap-3">
                      <Skeleton className="block h-4 flex-1 max-w-[70%]" />
                      <Skeleton className="block h-4 w-16 shrink-0" />
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <Skeleton className="block h-3 w-24" />
                      <Skeleton className="block h-3 w-20" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : upcoming.length === 0 ? (
              <div className="mt-5 rounded-xl border p-4 text-center text-xs" style={{ borderColor: TOKENS.outlineGhost, background: `color-mix(in srgb, ${TOKENS.surfaceLow} 50%, transparent)` }}>
                <span style={{ color: TOKENS.onSurfaceMuted }}>No events on radar.</span>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {(showAllUpcoming ? upcoming : upcoming.slice(0, 6)).map((u) => (
                  <li
                    key={`${u.subscriptionId}-${u.kind}-${u.date}`}
                    className="flex flex-col gap-1.5 rounded-lg border p-3.5 transition-colors"
                    style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
                  >
                    <div className="flex justify-between items-start font-semibold" style={{ color: TOKENS.onSurface }}>
                      <span className="text-sm truncate pr-2">{u.label}</span>
                      <MajorFigureCurrency amount={u.amount} variant="neutral" className="text-sm shrink-0!" />
                    </div>
                    <div className="flex items-center justify-between text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                      <span className="uppercase tracking-wider font-bold" style={{ color: u.kind === 'trial' ? ERROR_SOFT : TOKENS.secondary }}>
                        {u.kind === 'trial' ? 'Trial Ending' : 'Renews'}
                      </span>
                      <span className="font-medium">{formatShort(u.date)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!loading && upcoming.length > 6 ? (
              <button
                type="button"
                onClick={() => setShowAllUpcoming((v) => !v)}
                className={cn(
                  "mt-3 inline-flex min-h-9 items-center text-xs font-semibold transition-colors hover:text-white",
                  consoleFocus,
                )}
                style={{ color: TOKENS.secondary }}
              >
                {showAllUpcoming ? "Show fewer" : `+${upcoming.length - 6} more`}
              </button>
            ) : null}
          </div>
        </section>
      </div>

      {/* Grid Ledger */}
      <div className="space-y-5 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" style={{ color: TOKENS.secondary }} />
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: TOKENS.onSurface }}>Registry</h2>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold uppercase tracking-wider transition-[opacity,transform] duration-150 hover:opacity-95 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
              consoleFocus,
            )}
            style={{ background: TOKENS.primary, color: TOKENS.surface }}
          >
            <Plus className="h-4 w-4" />
            Add Entity
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy aria-label="Loading subscriptions">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-xl border p-5"
                style={{
                  background: TOKENS.surfaceContainer,
                  borderColor: TOKENS.outlineGhost,
                  boxShadow: CARD_INSET,
                }}
              >
                <div>
                  <Skeleton className="block h-5 w-[78%] max-w-full" />
                  <Skeleton className="mt-2 block h-3 w-[42%]" />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Skeleton className="block h-6 w-14 rounded" />
                    <Skeleton className="block h-6 w-24 rounded" />
                    <Skeleton className="block h-6 w-20 rounded" />
                  </div>
                </div>
                <div className="mt-6 flex items-end justify-between border-t pt-4" style={{ borderColor: TOKENS.outlineGhost }}>
                  <div>
                    <Skeleton className="block h-2.5 w-12" />
                    <Skeleton className="mt-2 block h-5 w-16" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="ml-auto block h-2.5 w-14" />
                    <Skeleton className="mt-2 inline-block h-7 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm rounded-xl border" style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceContainer }}>
            <p style={{ color: TOKENS.onSurfaceMuted }}>No active contracts on file.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ s, monthlyEq, title }) => {
              const catOpt = FUND_OPTIONS.find((o) => o.value === s.recurringExpense.category)
              const catLabel = catOpt?.label || "Uncategorized"
              const isInactive = s.status !== "active"

              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEdit(s)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      openEdit(s)
                    }
                  }}
                  aria-label={`Edit ${title}`}
                  className={cn(
                    "group relative flex cursor-pointer flex-col justify-between rounded-xl border p-5 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                    consoleFocus,
                  )}
                  style={{
                    background: TOKENS.surfaceContainer,
                    borderColor: isInactive ? ERROR_SOFT : TOKENS.outlineGhost,
                    boxShadow: CARD_INSET,
                  }}
                >
                  <div className="absolute top-3 right-3 flex opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(s)
                      }}
                      className={cn(
                        "rounded-lg p-2 transition-colors hover:bg-white/10",
                        consoleFocus,
                      )}
                      style={{ color: TOKENS.secondary }}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(s.id)
                      }}
                      className={cn(
                        "rounded-lg p-2 transition-colors hover:bg-white/10",
                        consoleFocus,
                      )}
                      style={{ color: ERROR_SOFT }}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <div className="pr-16">
                      <p className="text-base font-bold truncate" style={{ color: TOKENS.onSurface }}>
                        {title}
                      </p>
                      <p className="mt-0.5 text-xs truncate" style={{ color: TOKENS.onSurfaceMuted }}>
                        {s.recurringExpense.account.name}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                      <span className="rounded px-2 py-1" style={{ background: `color-mix(in srgb, ${TOKENS.secondary} 15%, transparent)`, color: TOKENS.secondary }}>
                        {formatRecurringFrequencyLabel(
                          s.recurringExpense.frequency,
                          s.recurringExpense.intervalDays,
                        )}
                      </span>
                      <span className="rounded px-2 py-1" style={{ background: TOKENS.surfaceLow, color: TOKENS.onSurfaceMuted }}>
                        {catLabel}
                      </span>
                      {s.recurringExpense.expenseCategory && (
                        <span className="rounded px-2 py-1" style={{ background: TOKENS.surfaceLow, color: TOKENS.onSurfaceMuted }}>
                          {EXPENSE_CATEGORIES.find(c => c.value === s.recurringExpense.expenseCategory)?.label || s.recurringExpense.expenseCategory}
                        </span>
                      )}
                      {isInactive && (
                        <span className="rounded px-2 py-1" style={{ background: `color-mix(in srgb, ${ERROR_SOFT} 15%, transparent)`, color: ERROR_SOFT }}>
                          {s.status}
                        </span>
                      )}
                      {s.foreignCurrency && s.foreignAmount && (
                        <span className="rounded px-2 py-1" style={{ background: `color-mix(in srgb, ${TOKENS.primary} 15%, transparent)`, color: TOKENS.primary }}>
                          ~{s.foreignAmount} {s.foreignCurrency}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex items-end justify-between border-t pt-4" style={{ borderColor: TOKENS.outlineGhost }}>
                    <div>
                      <p className="text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1" style={{ color: TOKENS.onSurfaceMuted }}>
                        {s.foreignCurrency ? "Live Equiv." : "Base"}
                      </p>
                      <div className="mt-1">
                        <MajorFigureCurrency amount={s.recurringExpense.amount} variant="neutral" className="text-sm font-bold!" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: TOKENS.secondary }}>/mo eq.</p>
                      <div className="mt-1">
                        <MajorFigureCurrency amount={monthlyEq} variant="prosperity" className="text-xl font-black!" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
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
          <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label>Account</Label>
              <AppSelect
                className="mt-1"
               
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
                <Label>{isInternational ? "Projected Equiv. (AUD fallback)" : "Amount"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn("mt-1", consoleFieldClass)}
                  style={consoleFieldStyle}
                />
              </div>
              <div>
                <Label>Frequency</Label>
                <AppSelect
                  className="mt-1"
                 
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
            {frequency === "custom" && (
              <div>
                <Label>Days between payments</Label>
                <Input
                  type="number"
                  min="1"
                  max="366"
                  step="1"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  className={cn("mt-1", consoleFieldClass)}
                  style={consoleFieldStyle}
                />
              </div>
            )}
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
            <div className="grid grid-cols-1 border-t pt-4" style={{ borderColor: TOKENS.outlineGhost }}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="intl-sub"
                  checked={isInternational}
                  onChange={(e) => setIsInternational(e.target.checked)}
                  className="rounded border-gray-600 bg-transparent"
                />
                <Label htmlFor="intl-sub" className="cursor-pointer">International / Forex Subscription?</Label>
              </div>
              
              {isInternational && (
                <div className="grid grid-cols-2 gap-3 mt-2 mb-2">
                  <div>
                    <Label>Foreign Currency (e.g. USD, EUR)</Label>
                    <Input
                      value={foreignCurrency}
                      onChange={(e) => setForeignCurrency(e.target.value)}
                      className={cn("mt-1", consoleFieldClass)}
                      style={consoleFieldStyle}
                      placeholder="USD"
                    />
                  </div>
                  <div>
                    <Label>Foreign Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={foreignAmount}
                      onChange={(e) => setForeignAmount(e.target.value)}
                      className={cn("mt-1", consoleFieldClass)}
                      style={consoleFieldStyle}
                      placeholder="e.g. 15.99"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: TOKENS.outlineGhost }}>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fund category</Label>
                <AppSelect
                  className="mt-1"
                 
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
                <Label>Expense category</Label>
                <AppSelect
                  className="mt-1"
                 
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  value={expenseCategory}
                  onValueChange={setExpenseCategory}
                  options={[
                    { value: "", label: "-" },
                    ...EXPENSE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))
                  ]}
                />
              </div>
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
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  resetForm()
                }}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-white/6 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
                  consoleFocus,
                )}
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-bold transition-[opacity,transform] duration-150 hover:opacity-95 active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
                  consoleFocus,
                )}
                style={{ background: TOKENS.primary, color: TOKENS.surface }}
              >
                {submitting ? "Saving…" : editId ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remove subscription"
        description="Remove this subscription from the list? The recurring charge will stay in Expenses until you delete it there."
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
