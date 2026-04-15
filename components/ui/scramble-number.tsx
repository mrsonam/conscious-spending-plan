"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { TOKENS } from "@/lib/wealth-console-tokens"

/**
 * Currency-sized loading strip — uses shared `skeleton-base` shimmer (see `globals.css`),
 * not fake numbers or opacity-only pulse.
 */
export function ScrambleCurrencyValue({
  className,
}: {
  variant?: "income" | "neutral" | "prosperity" | "loss"
  min?: number
  max?: number
  className?: string
  colorMain?: string
  colorDecimal?: string
  decimalEm?: number
}) {
  return (
    <span aria-hidden className={cn("inline-flex min-w-0 max-w-full items-center", className)}>
      <Skeleton className="inline-block h-[0.95em] min-h-[11px] w-[6.5em] max-w-[10.5rem] shrink-0 align-middle rounded-md" />
    </span>
  )
}

export function ScramblePercentValue({
  className,
  suffixClassName = "text-xl font-bold",
}: {
  className?: string
  color?: string
  min?: number
  max?: number
  suffixClassName?: string
}) {
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-0.5", className)}>
      <Skeleton className="inline-block h-[0.65em] min-h-[12px] w-[2.25em] min-w-[2.75rem] shrink-0 align-middle rounded-md" />
      <span className={suffixClassName} style={{ color: TOKENS.onSurfaceMuted }}>
        %
      </span>
    </span>
  )
}

/** Compact integer-sized strip + optional muted suffix. */
export function ScrambleIntegerValue({
  className,
  suffix,
  suffixClassName = "font-bold",
}: {
  min?: number
  max?: number
  className?: string
  suffix?: string
  suffixClassName?: string
  color?: string
}) {
  return (
    <span aria-hidden className={cn("inline-flex max-w-full items-center gap-1", className)}>
      <Skeleton className="inline-block h-[0.65em] min-h-[12px] w-[2.25em] min-w-[2.75rem] shrink-0 align-middle rounded-md" />
      {suffix ? (
        <span className={suffixClassName} style={{ color: TOKENS.onSurfaceMuted }}>
          {suffix}
        </span>
      ) : null}
    </span>
  )
}
