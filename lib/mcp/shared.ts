import { z } from "zod"
import { EXPENSE_CATEGORIES, FUND_CATEGORIES } from "@/lib/expense-page-constants"
import { isIsoDate } from "@/lib/mcp/transactions"

export type McpCaller = {
  userId: string
  /** Raw bearer token, forwarded so writes go through the existing API routes unchanged. */
  token: string
  origin: string
}

export const fundEnum = z.enum(FUND_CATEGORIES.map((c) => c.value) as [string, ...string[]])
export const expenseEnum = z.enum(EXPENSE_CATEGORIES.map((c) => c.value) as [string, ...string[]])

export const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const
export const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const
export const DESTRUCTIVE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const

export function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] }
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true }
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10)

/** First invalid YYYY-MM-DD among the given optional dates, as an error result. */
export function badDate(...dates: Array<string | undefined>) {
  const bad = dates.find((d) => d !== undefined && !isIsoDate(d))
  return bad !== undefined ? errorResult(`Invalid date "${bad}"; use YYYY-MM-DD.`) : null
}

type RouteHandler = (
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) => Promise<Response>

/** Invoke an existing API route handler as the caller (bearer token), returning its JSON. */
export async function callRoute(
  handler: RouteHandler,
  caller: McpCaller,
  method: string,
  path: string,
  body?: unknown,
  params: Record<string, string> = {},
) {
  const res = await handler(
    new Request(`${caller.origin}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${caller.token}`,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    { params: Promise.resolve(params as { id: string }) },
  )
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: res.ok, data }
}

export const routeError = (data: Record<string, unknown>, fallback: string) =>
  String(data.error ?? fallback)

/** Call a route and wrap its JSON (or error) as a tool result. */
export async function routeResult(
  run: Promise<{ ok: boolean; data: Record<string, unknown> }>,
  fallback: string,
  shape: (data: Record<string, unknown>) => unknown = (d) => d,
) {
  const { ok, data } = await run
  return ok ? json(shape(data)) : errorResult(routeError(data, fallback))
}
