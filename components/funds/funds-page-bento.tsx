"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BENTO } from "@/lib/app-routes"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { FormStatusAlert } from "@/components/wealth-console/form-status-alert"
import {
  CreditCard,
  PiggyBank,
  Save,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import {
  useFundSettingsPage,
  type FundAllocation,
} from "@/hooks/use-fund-settings-page"
import { parsePercentOrMoneyInput, tryParseMoneyInput } from "@/lib/money-input"

const fieldClass =
  "w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

const FundFieldBento = React.memo(
  ({
    label,
    typeField,
    valueField,
    capField,
    categoryName,
    accent,
    accentSoft: _accentSoft,
    Icon,
    allocation,
    getBalance,
    getAllocatedFromIncome,
    formatCurrency,
    currencyCode,
    updateField,
  }: {
    label: string
    typeField: keyof FundAllocation
    valueField: keyof FundAllocation
    capField: keyof FundAllocation
    categoryName: string
    accent: string
    accentSoft: string
    Icon: LucideIcon
    allocation: FundAllocation
    getBalance: (category: string) => number
    getAllocatedFromIncome: (category: string) => number
    formatCurrency: (amount: number) => string
    currencyCode: string
    updateField: (field: keyof FundAllocation, value: string | number | null) => void
  }) => {
    const type = allocation[typeField] as string
    const value = allocation[valueField] as number
    const cap = allocation[capField] as number | null
    const currentBalance = getBalance(categoryName)
    const allocatedFromIncome = getAllocatedFromIncome(categoryName)
    const isCapped = cap !== null && cap !== undefined
    const remaining = isCapped ? Math.max(0, cap - allocatedFromIncome) : null
    const percentageUsed =
      isCapped && cap > 0 ? (allocatedFromIncome / cap) * 100 : 0

    const [valueInput, setValueInput] = useState(value.toString())
    const [capInput, setCapInput] = useState(cap?.toString() ?? "")

    useEffect(() => {
      setValueInput(value.toString())
    }, [value])

    useEffect(() => {
      setCapInput(cap?.toString() ?? "")
    }, [cap])

    return (
      <div
        className="relative overflow-hidden rounded-2xl border transition-[transform] duration-300 hover:-translate-y-0.5"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div
          className="h-1 w-full opacity-95"
          style={{ background: accent }}
        />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {label}
              </p>
              <p className="mt-1 text-xs italic leading-snug" style={{ color: TOKENS.onSurfaceMuted }}>
                {type === "percentage" ? "Share of income" : "Flat amount each period"}
              </p>
            </div>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
              style={{
                borderColor: TOKENS.outlineGhost,
                background: `color-mix(in srgb, ${accent} 16%, ${TOKENS.surfaceHigh})`,
                boxShadow: CARD_INSET,
              }}
            >
              <Icon className="h-5 w-5" style={{ color: accent }} strokeWidth={2} />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
              Mode
            </p>
            <div
              className="mt-2 flex rounded-xl p-1"
              style={{ background: TOKENS.surfaceHigh, boxShadow: `inset 0 1px 2px rgba(0,0,0,0.2)` }}
            >
              {(
                [
                  { value: "percentage", label: "% Income" },
                  { value: "fixed", label: "Fixed $" },
                ] as const
              ).map((opt) => {
                const active = type === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField(typeField, opt.value)}
                    className="relative flex-1 rounded-lg px-2 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-all duration-200"
                    style={{
                      background: active ? TOKENS.surfaceContainer : "transparent",
                      color: active ? TOKENS.primary : TOKENS.onSurfaceMuted,
                      boxShadow: active ? CARD_INSET : undefined,
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                {type === "percentage" ? "Percent of income" : "Dollar amount"}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  value={valueInput}
                  onChange={(e) => {
                    const val = e.target.value
                    setValueInput(val)
                    const numVal = parsePercentOrMoneyInput(
                      val,
                      type === "percentage" ? "percentage" : "fixed",
                      currencyCode
                    )
                    if (numVal !== null || val === "" || val === ".") {
                      updateField(valueField, numVal ?? 0)
                    }
                  }}
                  onBlur={(e) => {
                    const numVal = parsePercentOrMoneyInput(
                      e.target.value,
                      type === "percentage" ? "percentage" : "fixed",
                      currencyCode
                    )
                    if (numVal === null || numVal < 0) {
                      setValueInput(value.toString())
                      updateField(valueField, value)
                    } else {
                      setValueInput(numVal.toString())
                      updateField(valueField, numVal)
                    }
                  }}
                  min={0}
                  step={type === "percentage" ? 0.1 : 0.01}
                  className={cn(fieldClass, "flex-1")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
                <span
                  className="flex h-10 min-w-9 items-center justify-center rounded-xl border text-xs font-semibold tabular-nums"
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.tertiary,
                    background: TOKENS.surfaceHigh,
                  }}
                >
                  {type === "percentage" ? "%" : "$"}
                </span>
              </div>
            </div>

            <div
              className="border-t pt-5"
              style={{ borderColor: `color-mix(in srgb, ${TOKENS.outlineGhost} 70%, transparent)` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                Cap (optional)
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  value={capInput}
                  onChange={(e) => {
                    const val = e.target.value
                    setCapInput(val)
                    if (val === "") {
                      updateField(capField, null)
                    } else {
                      const numVal = tryParseMoneyInput(val, currencyCode)
                      if (numVal !== null) {
                        updateField(capField, numVal)
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value
                    if (val === "") {
                      setCapInput("")
                      updateField(capField, null)
                    } else {
                      const numVal = tryParseMoneyInput(val, currencyCode)
                      if (numVal === null || numVal < 0) {
                        setCapInput(cap?.toString() ?? "")
                        updateField(capField, cap)
                      } else {
                        setCapInput(numVal.toString())
                        updateField(capField, numVal)
                      }
                    }
                  }}
                  placeholder="No cap"
                  min={0}
                  step={0.01}
                  className={cn(fieldClass, "flex-1")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
                <span
                  className="flex h-10 min-w-9 items-center justify-center rounded-xl border text-xs font-semibold"
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.tertiary,
                    background: TOKENS.surfaceHigh,
                  }}
                >
                  $
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                Caps apply to this month&apos;s income allocations only, not carryover.
              </p>
            </div>

            {isCapped ? (
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  background: `color-mix(in srgb, ${accent} 6%, ${TOKENS.surfaceLow})`,
                  boxShadow: CARD_INSET,
                }}
              >
                <div className="flex justify-between text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                  <span>Envelope balance</span>
                  <span className="font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                    {formatCurrency(currentBalance)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                  <span>Allocated from income</span>
                  <span className="font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                    {formatCurrency(allocatedFromIncome)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                  <span>Room to cap</span>
                  <span
                    className="font-semibold tabular-nums"
                    style={{
                      color: remaining !== null && remaining > 0 ? TOKENS.primary : ERROR_SOFT,
                    }}
                  >
                    {formatCurrency(remaining ?? 0)}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, percentageUsed)}%`,
                      background:
                        percentageUsed >= 100
                          ? ERROR_SOFT
                          : percentageUsed >= 80
                            ? "#eab308"
                            : accent,
                      boxShadow: undefined,
                    }}
                  />
                </div>
                <p className="mt-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                  {percentageUsed >= 100 ? "Cap reached" : `${percentageUsed.toFixed(1)}% of cap used`}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  },
)

FundFieldBento.displayName = "FundFieldBento"

const PILLARS: {
  label: string
  typeField: keyof FundAllocation
  valueField: keyof FundAllocation
  capField: keyof FundAllocation
  categoryName: string
  accent: string
  accentSoft: string
  Icon: LucideIcon
}[] = [
  {
    label: "Fixed costs",
    typeField: "fixedCostsType",
    valueField: "fixedCostsValue",
    capField: "fixedCostsCap",
    categoryName: "fixedCosts",
    accent: "#f87171",
    accentSoft: "#ef4444",
    Icon: Wallet,
  },
  {
    label: "Savings",
    typeField: "savingsType",
    valueField: "savingsValue",
    capField: "savingsCap",
    categoryName: "savings",
    accent: "#34d399",
    accentSoft: "#10b981",
    Icon: PiggyBank,
  },
  {
    label: "Investment",
    typeField: "investmentType",
    valueField: "investmentValue",
    capField: "investmentCap",
    categoryName: "investment",
    accent: "#60a5fa",
    accentSoft: "#3b82f6",
    Icon: TrendingUp,
  },
  {
    label: "Guilt-free",
    typeField: "guiltFreeSpendingType",
    valueField: "guiltFreeSpendingValue",
    capField: "guiltFreeSpendingCap",
    categoryName: "guiltFreeSpending",
    accent: "#c4b5fd",
    accentSoft: "#8b5cf6",
    Icon: CreditCard,
  },
]

export function FundsPageBento() {
  const {
    session,
    status,
    allocation,
    loading,
    saving,
    message,
    handleSubmit,
    updateField,
    getBalance,
    getAllocatedFromIncome,
    formatCurrency,
    currencyCode,
    savingGoalsSummary,
  } = useFundSettingsPage()

  if ((status === "loading" && !session) || (loading && !allocation)) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <section className="px-1 py-2 sm:px-2">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div
              className="h-8 w-28 animate-pulse rounded-lg border"
              style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceHigh }}
            />
          </div>
          <div className="mt-5 space-y-3">
            <div
              className="h-8 w-72 max-w-full animate-pulse rounded"
              style={{ background: TOKENS.surfaceHigh }}
            />
            <div
              className="h-4 w-full max-w-xl animate-pulse rounded"
              style={{ background: TOKENS.surfaceHigh }}
            />
            <div
              className="h-4 w-2/3 max-w-md animate-pulse rounded"
              style={{ background: TOKENS.surfaceHigh }}
            />
          </div>
        </section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "animate-pulse rounded-2xl border border-white/10 bg-white/4",
                i % 2 === 1 ? "h-72" : "h-64",
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!allocation) return null

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="px-1 py-2 sm:px-2" aria-labelledby="funds-hero-heading">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.secondary,
              background: TOKENS.surfaceHigh,
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            Four pillars
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2
              id="funds-hero-heading"
              className="text-2xl font-black tracking-tight sm:text-3xl"
              style={{ color: TOKENS.onSurface }}
            >
              Shape how every dollar of income is routed
            </h2>
            <p
              className="mt-2 max-w-2xl text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Choose a percentage of recognized income or a fixed amount per category. Optional caps
              limit how much can accumulate; overflow is steered into savings.
            </p>
          </div>
        </div>
      </section>

      <form noValidate onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <FormStatusAlert message={message} className="sm:px-5" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:gap-7">
          {PILLARS.map((p) => (
            <FundFieldBento
              key={p.categoryName}
              label={p.label}
              typeField={p.typeField}
              valueField={p.valueField}
              capField={p.capField}
              categoryName={p.categoryName}
              accent={p.accent}
              accentSoft={p.accentSoft}
              Icon={p.Icon}
              allocation={allocation}
              getBalance={getBalance}
              getAllocatedFromIncome={getAllocatedFromIncome}
              formatCurrency={formatCurrency}
              currencyCode={currencyCode}
              updateField={updateField}
            />
          ))}
        </div>

        {savingGoalsSummary ? (
          <Link
            href={BENTO.savingGoals}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-4 transition-opacity hover:opacity-95 sm:px-5"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: `color-mix(in srgb, ${TOKENS.primary} 8%, ${TOKENS.surfaceContainer})`,
              boxShadow: CARD_INSET,
            }}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Savings goals
              </p>
              <p className="mt-1 text-sm" style={{ color: TOKENS.onSurface }}>
                {savingGoalsSummary.activeCount === 0
                  ? "No active goals — create one to split savings allocation"
                  : `${savingGoalsSummary.activeCount} active goal${savingGoalsSummary.activeCount === 1 ? "" : "s"} · ${savingGoalsSummary.assignedPercent}% assigned`}
              </p>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: TOKENS.primary }}>
              Manage goals →
            </span>
          </Link>
        ) : null}

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="max-w-md text-[11px] leading-relaxed sm:text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            Changes apply to new income allocations. Existing envelope balances follow your caps and rollover rules.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-200 hover:opacity-[0.97] active:scale-[0.99] disabled:opacity-50 sm:w-auto sm:min-w-[220px]"
            style={{
              background: TOKENS.primary,
              color: TOKENS.surface,
              boxShadow: "0 14px 36px rgba(0,0,0,0.35), 0 0 0 1px color-mix(in srgb, #fff 8%, transparent)",
            }}
          >
            <Save className="h-4 w-4" strokeWidth={2.5} />
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  )
}
