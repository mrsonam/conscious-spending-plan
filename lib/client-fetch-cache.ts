type CacheEntry<T> = {
  data?: T
  updatedAt: number
  promise?: Promise<T>
}

const clientFetchCache = new Map<string, CacheEntry<unknown>>()
const cacheGeneration = new Map<string, number>()

function bumpCacheGeneration(key: string) {
  cacheGeneration.set(key, (cacheGeneration.get(key) ?? 0) + 1)
}

function normalizeError(response: Response, bodyText: string) {
  return new Error(
    `Request failed (${response.status} ${response.statusText}): ${bodyText.slice(0, 180)}`,
  )
}

export function peekCachedJson<T>(key: string, maxAgeMs = Number.POSITIVE_INFINITY) {
  const entry = clientFetchCache.get(key) as CacheEntry<T> | undefined
  if (!entry?.data) return undefined
  if (Date.now() - entry.updatedAt > maxAgeMs) return undefined
  return entry.data
}

export function invalidateCachedJson(
  matcher?:
    | string
    | RegExp
    | ((key: string) => boolean),
) {
  if (!matcher) {
    clientFetchCache.clear()
    for (const key of [...cacheGeneration.keys()]) {
      bumpCacheGeneration(key)
    }
    return
  }

  for (const key of clientFetchCache.keys()) {
    const matched =
      typeof matcher === "string"
        ? key.includes(matcher)
        : matcher instanceof RegExp
          ? matcher.test(key)
          : matcher(key)

    if (matched) {
      clientFetchCache.delete(key)
      bumpCacheGeneration(key)
    }
  }

  for (const key of cacheGeneration.keys()) {
    const matched =
      typeof matcher === "string"
        ? key.includes(matcher)
        : matcher instanceof RegExp
          ? matcher.test(key)
          : matcher(key)
    if (matched) {
      bumpCacheGeneration(key)
    }
  }
}

/** Clears category-tracking page cache + dashboard widgets that depend on the same APIs. */
export function invalidateCategoryTrackingAndDashboardCaches() {
  invalidateCachedJson("category-tracking:")
  invalidateCachedJson("dashboard:tracking")
  invalidateCachedJson("dashboard:history")
}

/** Clears caches touched by logging, editing, or deleting income. */
export function invalidateIncomeDataCaches() {
  invalidateCachedJson(/^income:/)
  invalidateCachedJson("accounts")
  invalidateCachedJson("dashboard:income-month")
  invalidateCachedJson("dashboard:income-meta")
  invalidateCachedJson("dashboard:accounts")
  invalidateCachedJson("dashboard:ytd")
  invalidateCategoryTrackingAndDashboardCaches()
}

/** Clears caches touched by logging, editing, or deleting expenses. */
export function invalidateExpenseDataCaches() {
  invalidateCachedJson("accounts")
  invalidateCachedJson("expenses-summary")
  invalidateCachedJson("expenses:")
  invalidateCachedJson("dashboard:expenses-current")
  invalidateCachedJson("dashboard:expenses-last-month")
  invalidateCachedJson("dashboard:accounts")
  invalidateCachedJson("dashboard:income-month")
  invalidateCachedJson("dashboard:income-meta")
  invalidateCachedJson("dashboard:ytd")
  invalidateCategoryTrackingAndDashboardCaches()
}

export type FetchJsonAndCacheOptions = {
  /** Drop in-memory cache and bypass browser HTTP cache for this request. */
  force?: boolean
}

export async function fetchJsonAndCache<T>(
  key: string,
  input: string,
  init?: RequestInit,
  options?: FetchJsonAndCacheOptions,
) {
  const force = options?.force === true

  if (force) {
    clientFetchCache.delete(key)
    bumpCacheGeneration(key)
  }

  const existing = clientFetchCache.get(key) as CacheEntry<T> | undefined
  if (existing?.promise && !force) return existing.promise

  const generationAtStart = cacheGeneration.get(key) ?? 0

  const promise = (async () => {
    const response = await fetch(input, {
      credentials: "same-origin",
      cache: force ? "no-store" : "default",
      ...init,
    })

    if (!response.ok) {
      throw normalizeError(response, await response.text())
    }

    const data = (await response.json()) as T
    if ((cacheGeneration.get(key) ?? 0) === generationAtStart) {
      clientFetchCache.set(key, {
        data,
        updatedAt: Date.now(),
      })
    }
    return data
  })()

  clientFetchCache.set(key, {
    data: force ? undefined : existing?.data,
    updatedAt: existing?.updatedAt ?? 0,
    promise,
  })

  promise.finally(() => {
    const entry = clientFetchCache.get(key) as CacheEntry<T> | undefined
    if (!entry || entry.promise !== promise) return
    clientFetchCache.set(key, {
      data: entry.data,
      updatedAt: entry.updatedAt,
    })
  })

  try {
    return await promise
  } catch (error) {
    if (existing?.data !== undefined && !force) {
      clientFetchCache.set(key, {
        data: existing.data,
        updatedAt: existing.updatedAt,
      })
    } else {
      clientFetchCache.delete(key)
    }
    throw error
  }
}

/** Append a cache-busting query param so browser/CDN caches return fresh JSON. */
export function withCacheBust(path: string): string {
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}t=${Date.now()}`
}
