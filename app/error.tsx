"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RefreshCw, ArrowLeft } from "lucide-react"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Route error boundary:", error)
  }, [error])

  return (
    <div
      className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: TOKENS.surface, color: TOKENS.onSurface }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 sm:p-8"
        style={{
          borderColor: TOKENS.outlineGhost,
          background: TOKENS.surfaceContainer,
          boxShadow: CARD_INSET,
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Something went wrong
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
          This screen hit an error.
        </h1>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: TOKENS.onSurfaceMutedElevated }}
        >
          Your data is safe. Nothing was changed by this error. Try again, or head
          back to the dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45"
            style={{ background: TOKENS.primary, color: TOKENS.surface }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45"
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
