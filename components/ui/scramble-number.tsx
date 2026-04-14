"use client"

import { useEffect, useState } from "react"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { TOKENS } from "@/lib/wealth-console-tokens"

function useScrambleNumber({
  min,
  max,
  intervalMs = 90,
}: {
  min: number
  max: number
  intervalMs?: number
}) {
  const [displayValue, setDisplayValue] = useState(min)

  useEffect(() => {
    const updateValue = () => {
      setDisplayValue(min + Math.random() * (max - min))
    }

    updateValue()
    const timer = window.setInterval(updateValue, intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs, max, min])

  return displayValue
}

export function ScrambleCurrencyValue({
  variant = "neutral",
  min = 1500,
  max = 12000,
  className,
  colorMain,
  colorDecimal,
  decimalEm,
}: {
  variant?: "income" | "neutral" | "prosperity" | "loss"
  min?: number
  max?: number
  className?: string
  colorMain?: string
  colorDecimal?: string
  /** Passed through to `MajorFigureCurrency` (e.g. hero net on statement). */
  decimalEm?: number
}) {
  const displayValue = useScrambleNumber({ min, max })

  return (
    <span aria-hidden className={className}>
      <MajorFigureCurrency
        amount={displayValue}
        variant={variant}
        colorMain={colorMain}
        colorDecimal={colorDecimal}
        decimalEm={decimalEm}
      />
    </span>
  )
}

export function ScramblePercentValue({
  className,
  color,
  min = 12,
  max = 96,
  suffixClassName = "text-xl font-bold",
}: {
  className?: string
  color?: string
  min?: number
  max?: number
  /** Applied to the `%` glyph (defaults to dashboard-sized; use `text-xs font-bold` for compact rows). */
  suffixClassName?: string
}) {
  const value = useScrambleNumber({ min, max })

  return (
    <span
      aria-hidden
      className={className}
      style={{ color }}
    >
      {value.toFixed(0)}
      <span
        className={`ml-0.5 ${suffixClassName}`}
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        %
      </span>
    </span>
  )
}

/** Compact integer scramble (counts, ranks) — not currency. */
export function ScrambleIntegerValue({
  min = 0,
  max = 99,
  className,
  suffix,
  suffixClassName = "font-bold",
}: {
  min?: number
  max?: number
  className?: string
  /** e.g. " positions" */
  suffix?: string
  suffixClassName?: string
}) {
  const n = useScrambleNumber({ min, max })

  return (
    <span aria-hidden className={`tabular-nums ${className ?? ""}`}>
      {Math.round(n)}
      {suffix ? (
        <span className={`ml-0.5 ${suffixClassName}`} style={{ color: TOKENS.onSurfaceMuted }}>
          {suffix}
        </span>
      ) : null}
    </span>
  )
}
