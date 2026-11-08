"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { INVESTMENTS_PANEL_TABS_ID } from "@/components/investments/investment-console-ui"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { formatDividendDay, type DividendSummary } from "@/lib/investment-dividends"

type InvestmentDividendsSectionProps = {
  summary: DividendSummary
  filtered: boolean
  formatCurrency: (amount: number) => string
}

const rowBorder = `1px solid color-mix(in srgb, ${TOKENS.outlineGhost} 55%, transparent)`

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-[0.22em]"
      style={{ color: TOKENS.onSurfaceMuted }}
    >
      {children}
    </p>
  )
}

export function InvestmentDividendsSection({
  summary,
  filtered,
  formatCurrency,
}: InvestmentDividendsSectionProps) {
  const newestMonth = summary.byMonth[0]?.key
  // Keys the user toggled away from the default (newest month open, rest closed).
  const [toggled, setToggled] = useState<Set<string>>(() => new Set())
  const isOpen = (key: string) => (key === newestMonth) !== toggled.has(key)
  const toggle = (key: string) =>
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const maxHoldingTotal = summary.byHolding[0]?.total ?? 0

  return (
    <section
      id="investments-panel-dividends"
      role="tabpanel"
      aria-labelledby={`${INVESTMENTS_PANEL_TABS_ID}-dividends`}
      className="space-y-6 rounded-xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div>
        <Eyebrow>Dividend income</Eyebrow>
        <p
          className="mt-1 text-3xl font-bold tabular-nums"
          style={{ color: TOKENS.primary }}
        >
          {formatCurrency(summary.total)}
        </p>
        <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
          {filtered
            ? "All-time, for holdings matching your search"
            : "All-time, across all investment accounts"}
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          {[
            { label: "This year", value: formatCurrency(summary.ytd) },
            { label: "Last 30 days", value: formatCurrency(summary.last30Days) },
            { label: "Payments", value: String(summary.count) },
          ].map((s) => (
            <div key={s.label}>
              <dt className="text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                {s.label}
              </dt>
              <dd
                className="text-base font-semibold tabular-nums"
                style={{ color: TOKENS.onSurface }}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {summary.count === 0 ? (
        <p className="py-6 text-center text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
          {filtered
            ? "No dividends match your search."
            : "No dividends recorded yet. Use “Log dividend” above when a payment lands."}
        </p>
      ) : (
        <>
          <div>
            <Eyebrow>By holding</Eyebrow>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}>
                    {["Holding", "Account", "Payments", "Last paid", "Total"].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "px-2 py-2 font-semibold uppercase tracking-wider",
                          i >= 2 && "text-right",
                        )}
                        style={{ color: h === "Total" ? TOKENS.primary : TOKENS.onSurfaceMuted }}
                      >
                        {h}
                      </th>
                    ))}
                    <th className="w-28 px-2 py-2">
                      <span className="sr-only">Share of dividends</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byHolding.map((h) => (
                    <tr key={h.key} style={{ borderBottom: rowBorder }}>
                      <td className="px-2 py-2.5 font-semibold" style={{ color: TOKENS.onSurface }}>
                        {h.symbol}
                      </td>
                      <td className="px-2 py-2.5" style={{ color: TOKENS.onSurface }}>
                        {h.accountName}
                      </td>
                      <td
                        className="px-2 py-2.5 text-right tabular-nums"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        {h.count}
                      </td>
                      <td
                        className="px-2 py-2.5 text-right tabular-nums"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        {formatDividendDay(h.lastPaid)}
                      </td>
                      <td
                        className="px-2 py-2.5 text-right font-semibold tabular-nums"
                        style={{ color: TOKENS.primary }}
                      >
                        {formatCurrency(h.total)}
                      </td>
                      <td className="px-2 py-2.5">
                        <div
                          className="h-1.5 rounded-full"
                          aria-hidden
                          style={{
                            width: `${maxHoldingTotal > 0 ? Math.max(4, (h.total / maxHoldingTotal) * 100) : 0}%`,
                            background: TOKENS.primary,
                            opacity: 0.7,
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <Eyebrow>By month</Eyebrow>
            <ul className="mt-2">
              {summary.byMonth.map((m) => {
                const open = isOpen(m.key)
                const panelId = `dividend-month-${m.key}`
                return (
                  <li key={m.key} style={{ borderBottom: rowBorder }}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => toggle(m.key)}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-white/4 motion-reduce:transition-none",
                        consoleFocus,
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none",
                            open && "rotate-90",
                          )}
                          style={{ color: TOKENS.onSurfaceMuted }}
                          aria-hidden
                        />
                        <span style={{ color: TOKENS.onSurface }}>{m.label}</span>
                        <span className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                          {m.payments.length} {m.payments.length === 1 ? "payment" : "payments"}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums" style={{ color: TOKENS.primary }}>
                        {formatCurrency(m.total)}
                      </span>
                    </button>
                    {open ? (
                      <ul id={panelId} className="pb-2 pl-8 pr-2">
                        {m.payments.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center gap-3 py-1.5 text-xs"
                            style={{
                              borderTop: `1px dashed color-mix(in srgb, ${TOKENS.outlineGhost} 50%, transparent)`,
                            }}
                          >
                            <span className="w-14 tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                              {formatDividendDay(p.date)}
                            </span>
                            <span className="flex-1 font-semibold" style={{ color: TOKENS.onSurface }}>
                              {p.name.trim().toUpperCase()}
                            </span>
                            <span className="hidden sm:inline" style={{ color: TOKENS.onSurfaceMuted }}>
                              {p.accountName}
                            </span>
                            <span
                              className="w-24 text-right tabular-nums"
                              style={{ color: TOKENS.onSurface }}
                            >
                              {formatCurrency(p.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
