"use client"

import { TOKENS } from "@/lib/wealth-console-tokens"

/** Shown while the pulse section chunk loads (dynamic import). */
export function ConsolePulsePlaceholder() {
  return (
    <div
      aria-busy="true"
      className="min-h-[420px] animate-pulse rounded-xl"
      style={{ background: TOKENS.surfaceLow }}
    >
      <p role="status" className="sr-only">
        Loading operational pulse
      </p>
    </div>
  )
}
