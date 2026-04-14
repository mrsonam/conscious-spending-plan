type CacheEntry<T> = {
  data?: T
  updatedAt: number
  promise?: Promise<T>
}

const clientFetchCache = new Map<string, CacheEntry<unknown>>()

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
    }
  }
}

/** Clears category-tracking page cache + dashboard widgets that depend on the same APIs. */
export function invalidateCategoryTrackingAndDashboardCaches() {
  invalidateCachedJson("category-tracking:")
  invalidateCachedJson("dashboard:tracking")
  invalidateCachedJson("dashboard:history")
}

export async function fetchJsonAndCache<T>(
  key: string,
  input: string,
  init?: RequestInit,
) {
  const existing = clientFetchCache.get(key) as CacheEntry<T> | undefined
  if (existing?.promise) return existing.promise

  const promise = (async () => {
    const response = await fetch(input, {
      credentials: "same-origin",
      ...init,
    })

    if (!response.ok) {
      throw normalizeError(response, await response.text())
    }

    const data = (await response.json()) as T
    clientFetchCache.set(key, {
      data,
      updatedAt: Date.now(),
    })
    return data
  })()

  clientFetchCache.set(key, {
    data: existing?.data,
    updatedAt: existing?.updatedAt ?? 0,
    promise,
  })

  // Drop the in-flight handle once settled so callers never reuse a rejected
  // promise after navigation/abort (dedupe only applies while still pending).
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
    if (existing?.data !== undefined) {
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
