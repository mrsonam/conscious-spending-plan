"use client"

import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"

type CategoryTrackingErrorSectionProps = {
  onRetry: () => void
}

export function CategoryTrackingErrorSection({ onRetry }: CategoryTrackingErrorSectionProps) {
  return (
    <section
      role="alert"
      aria-live="polite"
      className="rounded-xl border p-10 text-center"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
        Couldn&apos;t load category data.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          "mt-4 inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em]",
          consoleFocus,
        )}
        style={{
          border: `1px solid ${TOKENS.outlineGhost}`,
          color: TOKENS.onSurface,
        }}
      >
        Retry
      </button>
    </section>
  )
}
