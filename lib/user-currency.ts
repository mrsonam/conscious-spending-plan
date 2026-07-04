import { normalizeDisplayCurrency } from "@/lib/display-currency"
import { prisma } from "@/lib/prisma"

// Display currency changes only via an explicit settings action (which calls
// invalidateUserDisplayCurrencyCache), so a short in-process cache is safe and
// removes one user lookup from nearly every money endpoint, including the
// chain-rebuild paths that resolve it once per month.
const CURRENCY_CACHE_MS = 60_000
const currencyCache = new Map<string, { value: string; expiresAt: number }>()

export async function getUserDisplayCurrency(userId: string): Promise<string> {
  const cached = currencyCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayCurrency: true },
  })
  const value = normalizeDisplayCurrency(user?.displayCurrency)
  currencyCache.set(userId, { value, expiresAt: Date.now() + CURRENCY_CACHE_MS })
  return value
}

export function invalidateUserDisplayCurrencyCache(userId: string) {
  currencyCache.delete(userId)
}

export function currencyFromSession(
  displayCurrency: unknown
): string {
  return normalizeDisplayCurrency(displayCurrency)
}
