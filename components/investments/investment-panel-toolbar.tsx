"use client"

import { useRef } from "react"
import { BarChart3, Coins, FileText, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import {
  investmentConsoleField,
  INVESTMENTS_PANEL_TABS_ID,
} from "@/components/investments/investment-console-ui"
import type { InvestmentPanelMode as PanelMode } from "@/components/investments/investment-shared"

const PANEL_TABS: Array<{ mode: PanelMode; label: string; icon: typeof BarChart3 }> = [
  { mode: "analytics", label: "Analytics", icon: BarChart3 },
  { mode: "reports", label: "Reports", icon: FileText },
  { mode: "dividends", label: "Dividends", icon: Coins },
]

type InvestmentPanelToolbarProps = {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  panelMode: PanelMode
  onPanelModeChange: (mode: PanelMode) => void
}

export function InvestmentPanelToolbar({
  searchQuery,
  onSearchQueryChange,
  panelMode,
  onPanelModeChange,
}: InvestmentPanelToolbarProps) {
  const tabRefs = useRef<Partial<Record<PanelMode, HTMLButtonElement | null>>>({})

  const selectTab = (mode: PanelMode) => {
    onPanelModeChange(mode)
    tabRefs.current[mode]?.focus()
  }

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = PANEL_TABS.findIndex((t) => t.mode === panelMode)
    const last = PANEL_TABS.length - 1
    let next: number | null = null
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = last
    if (next === null) return
    event.preventDefault()
    selectTab(PANEL_TABS[next].mode)
  }

  return (
    <section
      className="rounded-xl border p-4 sm:p-5"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="investment-toolbar-heading"
    >
      <h2 id="investment-toolbar-heading" className="sr-only">
        Search and portfolio views
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <label htmlFor="holdings-search" className="sr-only">
            Search holdings by ticker or account
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: TOKENS.onSurfaceMuted }}
            aria-hidden
          />
          <input
            id="holdings-search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search ticker or account…"
            className={cn(investmentConsoleField, "mt-0 pl-9")}
            style={{
              backgroundColor: TOKENS.surfaceLow,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
          />
        </div>
        <div
          id={INVESTMENTS_PANEL_TABS_ID}
          role="tablist"
          aria-label="Portfolio panel"
          className="inline-flex rounded-xl p-1"
          style={{ background: TOKENS.surfaceHigh, boxShadow: CARD_INSET }}
          onKeyDown={handleTabKeyDown}
        >
          {PANEL_TABS.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              ref={(el) => {
                tabRefs.current[mode] = el
              }}
              type="button"
              role="tab"
              id={`${INVESTMENTS_PANEL_TABS_ID}-${mode}`}
              aria-selected={panelMode === mode}
              aria-controls={`investments-panel-${mode}`}
              tabIndex={panelMode === mode ? 0 : -1}
              onClick={() => onPanelModeChange(mode)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-transform duration-150 active:scale-[0.95] motion-reduce:transition-none motion-reduce:active:scale-100",
                consoleFocus,
              )}
              style={{
                background: panelMode === mode ? TOKENS.surfaceContainer : "transparent",
                color: panelMode === mode ? TOKENS.primary : TOKENS.onSurfaceMuted,
              }}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
