import { fetchJsonAndCache, peekCachedJson } from "@/lib/client-fetch-cache"
import { prefetchDashboardConsole } from "@/lib/dashboard-console-cache"
import { ACCOUNTS_LIST_CACHE_KEY } from "@/hooks/use-accounts-page"
import { BENTO } from "@/lib/app-routes"

const CACHE_MS = 45_000

function currentMonthRange() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)
  return { month, year, startOfMonth, endOfMonth }
}

function warmIfMissing<T>(key: string, path: string, maxAgeMs = CACHE_MS) {
  if (peekCachedJson<T>(key, maxAgeMs)) return
  void fetchJsonAndCache<T>(key, path).catch(() => {})
}

/** Prefetch page API data on sidebar hover so navigation paints cached state instantly. */
export function prefetchRouteData(href: string) {
  const t = Date.now()
  const { month, year, startOfMonth, endOfMonth } = currentMonthRange()

  if (href === BENTO.dashboard) {
    prefetchDashboardConsole()
    return
  }
  switch (href) {
    case BENTO.accounts:
      warmIfMissing(ACCOUNTS_LIST_CACHE_KEY, `/api/accounts?t=${t}`)
      break
    case BENTO.investments:
      warmIfMissing("dashboard:investments", `/api/investments?t=${t}`)
      break
    case BENTO.income:
      warmIfMissing("income:allocation", `/api/fund-allocation?t=${t}`)
      warmIfMissing("income:accounts", `/api/accounts?t=${t}`)
      warmIfMissing("income:summary", `/api/income-entries/summary?t=${t}`)
      break
    case BENTO.expenses:
      warmIfMissing("accounts", `/api/accounts?t=${t}`)
      warmIfMissing("expenses-summary", `/api/expenses/summary?t=${t}`)
      break
    case BENTO.categoryTracking:
      warmIfMissing(
        `category-tracking:v4:summary:${year}-${month}`,
        `/api/category-tracking?month=${month}&year=${year}&t=${t}`,
      )
      warmIfMissing("category-tracking:v4:history", `/api/category-tracking/history?t=${t}`)
      break
    case BENTO.savingGoals:
      warmIfMissing("saving-goals:page", `/api/saving-goals?t=${t}`)
      break
    case BENTO.funds:
      warmIfMissing("funds:allocation", `/api/fund-allocation?t=${t}`)
      warmIfMissing("funds:balances", `/api/category-balances?t=${t}`)
      break
    case BENTO.loans:
      warmIfMissing("dashboard:accounts", `/api/accounts?t=${t}`)
      warmIfMissing("loans:lent", `/api/loans?t=${t}`)
      warmIfMissing("loans:borrowed", `/api/borrowed-loans?t=${t}`)
      break
    case BENTO.subscriptions:
      warmIfMissing("subscriptions:list", `/api/subscriptions?upcomingDays=14&t=${t}`)
      warmIfMissing("subscriptions:accounts", `/api/accounts?t=${t}`)
      break
    case BENTO.statement:
      warmIfMissing("statement:accounts", `/api/accounts?t=${t}`)
      warmIfMissing(
        `statement:summary:${year}-${month}`,
        `/api/statement/summary?month=${month}&year=${year}&t=${t}`,
      )
      break
    default:
      break
  }
}
