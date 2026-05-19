"use client"

import { useSession } from "next-auth/react"
import { useCallback, useMemo } from "react"
import { formatCurrencyAmount } from "@/lib/format-currency"
import { formatMinor } from "@/lib/money"
import {
  normalizeDisplayCurrency,
  DEFAULT_DISPLAY_CURRENCY,
} from "@/lib/display-currency"

export function useFormatCurrency() {
  const { data: session } = useSession()
  const currencyCode = useMemo(
    () => normalizeDisplayCurrency(session?.user?.displayCurrency),
    [session?.user?.displayCurrency]
  )

  const formatCurrency = useCallback(
    (amount: number) => formatCurrencyAmount(amount, currencyCode),
    [currencyCode]
  )

  const formatCurrencyMinor = useCallback(
    (minor: bigint) => formatMinor(minor, currencyCode),
    [currencyCode]
  )

  return {
    formatCurrency,
    formatCurrencyMinor,
    currencyCode,
    /** When session is not loaded yet, formatting still uses a sensible default. */
    defaultCurrencyCode: DEFAULT_DISPLAY_CURRENCY,
  }
}
