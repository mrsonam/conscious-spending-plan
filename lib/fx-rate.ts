/**
 * Dynamic Exchange Rate Utility
 * Powered by https://open.er-api.com/ (No API Key required, completely free)
 */

interface ERResponse {
  result: string
  rates: Record<string, number>
}

/**
 * Returns the multiplier to convert `fromCurrency` to `toCurrency`
 * E.g. getExchangeRate("USD", "AUD") returns e.g. 1.54 
 */
export async function getExchangeRate(fromCurrency: string, toCurrency: string = "AUD"): Promise<number> {
  const from = fromCurrency.toUpperCase()
  const to = toCurrency.toUpperCase()

  if (from === to) return 1

  try {
    // Next.js standard caching: Revalidate every 24 hours (86400 seconds)
    // Helps avoid rate limits and speeds up API responses.
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      next: { revalidate: 86400 }
    })
    
    if (!res.ok) {
      console.warn(`[FX] Failed to fetch fx from ${from}: ${res.statusText}`)
      return 1 // Fallback so we don't break the app
    }
    
    const data = (await res.json()) as ERResponse
    if (data.result !== "success" || !data.rates[to]) {
      console.warn(`[FX] Missing rate for ${to} in payload`)
      return 1
    }
    
    return data.rates[to]
  } catch (error) {
    console.error("[FX] Network error fetching fx rate:", error)
    return 1 // Graceful degradation
  }
}
