"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { toastSuccess, toastError } from "@/lib/app-toast"

export function RebuildTrackingSection() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const onClick = async () => {
    if (busy) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch("/api/category-tracking/rebuild", { method: "POST" })
      const d = (await res.json()) as { ok?: boolean; monthsRebuilt?: number; error?: string }
      if (!res.ok || !d.ok) {
        toastError(d.error ?? "Rebuild failed")
        return
      }
      const msg = `Rebuilt ${d.monthsRebuilt} month${d.monthsRebuilt === 1 ? "" : "s"} of tracking data`
      setResult(msg)
      toastSuccess(msg)
    } catch {
      toastError("Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
        Recalculate category tracking
      </p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
        Recomputes allocations and spending for every month from your income entries and
        expenses. Use this if duplicates were deleted and the dashboard totals look wrong.
      </p>
      {result && (
        <p className="mt-2 text-xs font-medium" style={{ color: TOKENS.primary }}>
          {result}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className="mt-4 flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
        style={{
          background: TOKENS.surfaceHigh,
          color: TOKENS.onSurface,
          border: `1px solid ${TOKENS.outlineGhost}`,
        }}
      >
        <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} aria-hidden />
        {busy ? "Rebuilding…" : "Rebuild tracking"}
      </button>
    </>
  )
}
