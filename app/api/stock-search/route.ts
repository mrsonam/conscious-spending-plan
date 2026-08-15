import { NextResponse } from "next/server"
import { authFromRequest } from "@/lib/api-auth"

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
}

async function searchYahoo(
  q: string,
  limit: number,
  region?: string
): Promise<Array<{ symbol: string; name: string }>> {
  const params = new URLSearchParams({
    q,
    quotesCount: String(limit),
    newsCount: "0",
  })
  if (region) params.set("region", region)
  const url = `https://query1.finance.yahoo.com/v1/finance/search?${params.toString()}`

  const res = await fetch(url, {
    headers: YAHOO_HEADERS,
    next: { revalidate: 300 },
  })
  if (!res.ok) return []

  const data = (await res.json()) as {
    quotes?: Array<{
      symbol?: string
      shortname?: string
      longname?: string
      quoteType?: string
    }>
  }
  const quotes = data.quotes || []
  return quotes
    .filter((item) => item.symbol && item.quoteType !== "CRYPTOCURRENCY")
    .map((item) => ({
      symbol: item.symbol!,
      name: item.longname || item.shortname || item.symbol!,
    }))
}

/**
 * Search for stocks/symbols via Yahoo Finance v1 search API.
 * GET /api/stock-search?q=aapl
 * GET /api/stock-search?q=bhp&region=AU  (Australian market)
 * Returns [{ symbol, name }] for dropdown/autocomplete.
 */
export async function GET(request: Request) {
  try {
    const authed = await authFromRequest(request)
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()
    if (!q || q.length < 1) {
      return NextResponse.json({ results: [] })
    }

    const limit = Math.min(Number(searchParams.get("limit")) || 10, 20)
    const region = searchParams.get("region") || undefined // "AU" for Australia

    // For Australian market: search with region=AU and also with .AX suffix to get ASX tickers
    if (region === "AU") {
      const cleanQ = q.replace(/\s*\.AX\s*$/i, "").trim()
      const queryAx = cleanQ.includes(".") ? cleanQ : `${cleanQ}.AX`
      const [resultsRegion, resultsSuffix] = await Promise.all([
        searchYahoo(q, limit, "AU"),
        searchYahoo(queryAx, limit, "AU"),
      ])
      const bySymbol = new Map<string, { symbol: string; name: string }>()
      ;[...resultsRegion, ...resultsSuffix].forEach((r) => bySymbol.set(r.symbol, r))
      const results = Array.from(bySymbol.values()).slice(0, limit)
      return NextResponse.json({ results })
    }

    const results = await searchYahoo(q, limit, region)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("Stock search error:", error)
    return NextResponse.json({ results: [] })
  }
}
