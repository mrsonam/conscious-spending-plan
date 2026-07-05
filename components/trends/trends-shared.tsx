"use client"

import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

export const TRENDS_MONTH_OPTIONS = [
  { label: "6 months", value: 6 },
  { label: "12 months", value: 12 },
  { label: "24 months", value: 24 },
] as const

export function TrendsCard({
  children,
  className,
  tone = "raised",
}: {
  children: React.ReactNode
  className?: string
  tone?: "raised" | "recessed"
}) {
  const recessed = tone === "recessed"
  return (
    <div
      className={cn("rounded-xl p-5 sm:p-6", className)}
      style={{
        background: recessed ? TOKENS.surfaceLow : TOKENS.surfaceContainer,
        boxShadow: CARD_INSET,
      }}
    >
      {children}
    </div>
  )
}

export function TrendsSectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold" style={{ color: TOKENS.onSurface }}>
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[12px]" style={{ color: TOKENS.onSurfaceMuted }}>
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function TrendsPeriodSelector({
  value,
  onChange,
  options = TRENDS_MONTH_OPTIONS,
}: {
  value: number
  onChange: (months: number) => void
  options?: readonly { label: string; value: number }[]
}) {
  return (
    <div
      className="flex rounded-xl border p-0.5"
      style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surface }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
          style={{
            background: value === opt.value ? TOKENS.surfaceHigh : "transparent",
            color: value === opt.value ? TOKENS.onSurface : TOKENS.onSurfaceMuted,
            boxShadow: value === opt.value ? CARD_INSET : "none",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function TrendsStatChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "positive" | "caution" | "neutral"
}) {
  const color =
    tone === "positive"
      ? TOKENS.primary
      : tone === "caution"
        ? TOKENS.warning
        : TOKENS.onSurfaceMuted
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-[11px]"
      style={{ background: TOKENS.surfaceLow }}
    >
      <span style={{ color: TOKENS.onSurfaceMuted }}>{label}: </span>
      <span className="font-semibold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

export function formatCategoryLabel(key: string): string {
  if (key === "other") return "Other"
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Compact dollar label under trend bars. */
export function formatBarAmount(
  amount: number,
  formatCurrency: (n: number) => string,
): string {
  if (amount === 0) return "$0"
  if (amount < 100) return formatCurrency(amount)
  if (amount < 10_000) return `$${Math.round(amount)}`
  return `$${(amount / 1000).toFixed(1)}k`
}

/** "Aug 25" → "Aug" for narrow bar columns. */
export function shortMonthLabel(label: string): string {
  return label.split(" ")[0] ?? label
}
