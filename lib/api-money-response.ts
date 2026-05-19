import { NextResponse } from "next/server"
import { parseMoneyFromApi } from "@/lib/money-api"
import { deepSerializeBigIntsForApi } from "@/lib/money-serialize"

function findBigIntPath(value: unknown, path = "root"): string | null {
  if (typeof value === "bigint") {
    return path
  }
  if (value instanceof Date) {
    return null
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findBigIntPath(value[i], `${path}[${i}]`)
      if (hit) return hit
    }
    return null
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const hit = findBigIntPath(nested, `${path}.${key}`)
      if (hit) return hit
    }
  }
  return null
}

/** JSON-safe API response: converts bigint minors to dollar numbers. */
export function moneyJsonResponse(
  body: unknown,
  currencyCode: string,
  init?: ResponseInit
): NextResponse {
  const serialized = deepSerializeBigIntsForApi(body, currencyCode)
  if (process.env.NODE_ENV !== "production") {
    const path = findBigIntPath(serialized)
    if (path) {
      throw new Error(
        `moneyJsonResponse: bigint still present at ${path} after serialization`
      )
    }
  }
  return NextResponse.json(serialized as object, init)
}

/** Parse request body money field to minor units. */
export function parseMoneyBody(
  value: unknown,
  currencyCode: string
): bigint {
  return parseMoneyFromApi(value, currencyCode)
}
