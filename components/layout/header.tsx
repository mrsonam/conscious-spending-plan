"use client"

import { Search } from "lucide-react"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { useCommandPalette } from "@/components/command-palette"
import { CspBrandMark } from "@/components/brand/csp-brand-mark"
import { BENTO } from "@/lib/app-routes"

export function Header({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  const { open: openCommandPalette } = useCommandPalette()

  return (
    <header
      className="sticky top-0 z-30 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-6 lg:pl-6"
      style={{
        background: `color-mix(in srgb, ${TOKENS.surface} 96%, transparent)`,
        borderColor: TOKENS.outlineGhost,
      }}
    >
      <div className="flex items-start justify-between gap-3 pl-12 sm:pl-14 lg:pl-0">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <CspBrandMark
            href={BENTO.dashboard}
            size="sm"
            wordmark="none"
            className="shrink-0 lg:hidden"
          />
          <div className="min-w-0 flex-1">
            <h1
              className="text-lg font-semibold leading-tight tracking-tight sm:text-xl"
              style={{ color: TOKENS.onSurface }}
            >
              {title}
            </h1>
            {description ? (
              <p
                className="mt-1 max-w-2xl text-[11px] leading-snug sm:text-xs"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => openCommandPalette()}
          className="flex shrink-0 touch-manipulation items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1326] sm:px-3"
          style={{
            borderColor: TOKENS.outlineGhost,
            color: TOKENS.onSurfaceMuted,
            background: `color-mix(in srgb, ${TOKENS.surfaceHigh} 70%, transparent)`,
          }}
          aria-label="Search and navigate"
        >
          <Search className="h-4 w-4" style={{ color: TOKENS.onSurface }} />
          <span
            className="hidden text-[10px] opacity-50 sm:inline"
            style={{ color: TOKENS.onSurfaceMuted }}
            aria-hidden
          >
            |
          </span>
          <kbd
            className="hidden font-mono text-[10px] opacity-90 sm:inline"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            F
          </kbd>
        </button>
      </div>
    </header>
  )
}
