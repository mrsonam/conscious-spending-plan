"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { clearAppCachesAndHardReload } from "@/lib/pwa-cache-reset"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

export function AppCacheResetSection({
  variant = "classic",
}: {
  variant?: "classic" | "console"
}) {
  const [busy, setBusy] = useState(false)
  const isConsole = variant === "console"

  const onClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      await clearAppCachesAndHardReload()
    } catch {
      setBusy(false)
    }
  }

  if (isConsole) {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
          This device
        </p>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
          If the app feels stuck or you are not seeing the latest version, reset
          cached files and reload. Your account data stays on the server.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onClick()}
          className="mt-4 flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{
            background: TOKENS.surfaceHigh,
            color: TOKENS.onSurface,
            border: `1px solid ${TOKENS.outlineGhost}`,
            boxShadow: CARD_INSET,
          }}
        >
          <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} aria-hidden />
          {busy ? "Clearing…" : "Reset app cache & reload"}
        </button>
      </>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-4">
      <p className="text-xs text-amber-900/80">
        Clear cached files and hard reload if something looks outdated. Your
        account data is not deleted.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/90 bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition-colors hover:bg-amber-50 disabled:opacity-60 sm:w-auto"
      >
        <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} aria-hidden />
        {busy ? "Clearing…" : "Reset app cache & reload"}
      </button>
    </div>
  )
}
