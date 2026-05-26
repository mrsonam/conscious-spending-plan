"use client"

import { TOKENS } from "@/lib/wealth-console-tokens"

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div
        className="absolute inset-0 flex items-center"
        style={{ borderTop: `1px solid ${TOKENS.outlineGhost}` }}
        aria-hidden
      />
      <div className="relative flex justify-center">
        <span
          className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{
            background: TOKENS.surfaceContainer,
            color: TOKENS.onSurfaceMuted,
          }}
        >
          or
        </span>
      </div>
    </div>
  )
}
