"use client"

import { useCallback, useRef } from "react"
import { BarChart3, FileText, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import {
  investmentConsoleField,
  INVESTMENTS_PANEL_TABS_ID,
} from "@/components/investments/investment-console-ui"

type PanelMode = "analytics" | "reports"

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
  const analyticsTabRef = useRef<HTMLButtonElement>(null)
  const reportsTabRef = useRef<HTMLButtonElement>(null)

  const focusTab = useCallback((mode: PanelMode) => {
    if (mode === "analytics") analyticsTabRef.current?.focus()
    else reportsTabRef.current?.focus()
  }, [])

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      const next: PanelMode = panelMode === "analytics" ? "reports" : "analytics"
      onPanelModeChange(next)
      focusTab(next)
      return
    }
    if (event.key === "Home") {
      event.preventDefault()
      onPanelModeChange("analytics")
      focusTab("analytics")
      return
    }
    if (event.key === "End") {
      event.preventDefault()
      onPanelModeChange("reports")
      focusTab("reports")
    }
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
          <button
            ref={analyticsTabRef}
            type="button"
            role="tab"
            id={`${INVESTMENTS_PANEL_TABS_ID}-analytics`}
            aria-selected={panelMode === "analytics"}
            aria-controls="investments-panel-analytics"
            tabIndex={panelMode === "analytics" ? 0 : -1}
            onClick={() => onPanelModeChange("analytics")}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em]",
              consoleFocus,
            )}
            style={{
              background: panelMode === "analytics" ? TOKENS.surfaceContainer : "transparent",
              color: panelMode === "analytics" ? TOKENS.primary : TOKENS.onSurfaceMuted,
            }}
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Analytics
          </button>
          <button
            ref={reportsTabRef}
            type="button"
            role="tab"
            id={`${INVESTMENTS_PANEL_TABS_ID}-reports`}
            aria-selected={panelMode === "reports"}
            aria-controls="investments-panel-reports"
            tabIndex={panelMode === "reports" ? 0 : -1}
            onClick={() => onPanelModeChange("reports")}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em]",
              consoleFocus,
            )}
            style={{
              background: panelMode === "reports" ? TOKENS.surfaceContainer : "transparent",
              color: panelMode === "reports" ? TOKENS.primary : TOKENS.onSurfaceMuted,
            }}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Reports
          </button>
        </div>
      </div>
    </section>
  )
}
