"use client"

import type { ReactNode } from "react"
import { Activity, BarChart3, FileText, Plus, RefreshCw, Search } from "lucide-react"
import {
  ScrambleCurrencyValue,
  ScrambleIntegerValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
const consoleField =
  "w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

/** Matches loaded layout: hero → stat strip → chart + risk → three tiles → search strip → composition teaser. */
export function InvestmentsPageBentoLoading() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-label="Loading investments">
      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary, background: TOKENS.surfaceHigh }}
          >
            <Activity className="h-3.5 w-3.5" />
            <ScrambleIntegerValue min={3} max={18} suffix=" positions" suffixClassName="text-[10px] font-bold uppercase tracking-[0.16em]" />
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: TOKENS.onSurfaceMuted }}>
              Total portfolio value
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <MajorFigureScrambleHero />
              <span
                className="mb-1 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums"
                style={{
                  borderColor: TOKENS.primary,
                  color: TOKENS.primary,
                  background: "color-mix(in srgb, #4edea3 12%, transparent)",
                }}
              >
                <ScramblePercentValue
                  className="text-[11px] font-bold"
                  min={-2}
                  max={14}
                  suffixClassName="text-[11px] font-bold"
                />{" "}
                <span className="ml-0.5 font-bold normal-case" style={{ color: TOKENS.onSurfaceMuted }}>
                  (P/L)
                </span>
              </span>
            </div>
            <p className="mt-2 text-[11px] tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
              Last market refresh — syncing quotes
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] opacity-50"
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              <Plus className="h-4 w-4" />
              Add investment
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatBlock label="Invested" variant="income" />
        <StatBlock label="Available cash" variant="neutral" />
        <StatBlock label="Profit / loss" variant="prosperity" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <section
          className="rounded-xl border p-4 sm:p-5 lg:col-span-8"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Portfolio value
              </p>
              <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                Last 90 days performance
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(["1W", "3M", "1Y", "ALL"] as const).map((r) => (
                <span
                  key={r}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div
            className="relative mt-4 h-[240px] w-full min-h-[220px] overflow-hidden rounded-lg sm:h-[280px]"
            style={{
              background: `linear-gradient(180deg, color-mix(in srgb, ${TOKENS.primary} 18%, transparent) 0%, ${TOKENS.surfaceLow} 55%, ${TOKENS.surfaceHigh} 100%)`,
              border: `1px solid ${TOKENS.outlineGhost}`,
            }}
          >
            <div className="absolute inset-0 flex flex-col justify-between px-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-px w-full"
                  style={{
                    background: `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 18%, transparent)`,
                  }}
                />
              ))}
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 h-[55%] opacity-80"
              style={{
                background: `linear-gradient(180deg, color-mix(in srgb, ${TOKENS.primary} 35%, transparent) 0%, transparent 100%)`,
              }}
            />
          </div>
          <p className="mt-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Curve uses cumulative purchases through each day, then snaps to current portfolio value (cash plus holdings at live prices where available, else cost).
          </p>
        </section>

        <aside
          className="flex flex-col gap-4 rounded-xl border p-4 sm:p-5 lg:col-span-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Risk profile
          </p>
          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span style={{ color: TOKENS.onSurfaceMuted }}>Liquidity coverage</span>
              <span className="font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                <ScramblePercentValue
                  className="text-xs font-bold"
                  min={8}
                  max={42}
                  suffixClassName="text-xs font-bold"
                />
              </span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
              <div
                className="h-full w-[38%] rounded-full transition-all"
                style={{ background: TOKENS.primary }}
              />
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase" style={{ color: TOKENS.secondary }}>
              Moderate
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span style={{ color: TOKENS.onSurfaceMuted }}>Concentration (σ of weights)</span>
              <span className="font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                <ScrambleIntegerValue min={12} max={36} className="text-xs font-bold" />
              </span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
              <div
                className="h-full w-[52%] rounded-full transition-all"
                style={{ background: TOKENS.secondary }}
              />
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase" style={{ color: TOKENS.secondary }}>
              Diversified
            </p>
          </div>
          <div
            className="rounded-lg border p-3 text-xs leading-relaxed"
            style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow, color: TOKENS.onSurfaceMuted }}
          >
            <span className="font-semibold uppercase tracking-wider" style={{ color: TOKENS.primary }}>
              Console insight
            </span>
            <p className="mt-2">
              Balancing deployable cash and priced positions helps you see how much of your portfolio is still liquid versus market-linked.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] opacity-50"
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary, background: TOKENS.surfaceLow }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh prices
          </button>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniListCard title="Core positions" chip={<ScramblePercentValue min={18} max={48} suffixClassName="text-xs font-bold" />} />
        <MiniListCard
          title="Secondary sleeve"
          chip={<span style={{ color: TOKENS.onSurfaceMuted }}>Next tier</span>}
        />
        <MiniListCard title="Cash & sweep" chip={<ScramblePercentValue min={5} max={22} suffixClassName="text-xs font-bold" />} />
      </div>

      <section
        className="rounded-xl border p-4 sm:p-5"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: TOKENS.onSurfaceMuted }}
            />
            <input
              readOnly
              placeholder="Search ticker or account…"
              className={cn(consoleField, "mt-0 cursor-not-allowed pl-9 opacity-60")}
              style={{
                backgroundColor: TOKENS.surfaceLow,
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurface,
              }}
            />
          </div>
          <div
            className="inline-flex rounded-xl p-1"
            style={{ background: TOKENS.surfaceHigh, boxShadow: CARD_INSET }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{
                background: TOKENS.surfaceContainer,
                color: TOKENS.primary,
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              <FileText className="h-3.5 w-3.5" />
              Reports
            </span>
          </div>
        </div>
      </section>

      <section
        className="rounded-xl border p-5 sm:p-6"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
          Portfolio composition
        </p>
        <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
          Top holdings by invested amount
        </p>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold" style={{ color: TOKENS.onSurfaceMuted }}>
                  TICK
                  {i + 1}
                </span>
                <span className="tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                  <ScrambleCurrencyValue min={800} max={42000} className="inline text-xs font-semibold!" />{" "}
                  <span style={{ color: TOKENS.onSurfaceMuted }}>
                    (
                    <ScramblePercentValue
                      min={4}
                      max={32}
                      className="inline text-[11px] font-semibold"
                      suffixClassName="text-[11px] font-semibold"
                    />
                    )
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${28 + i * 14}%`,
                    background: i % 2 === 0 ? TOKENS.primary : TOKENS.secondary,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MajorFigureScrambleHero() {
  return (
    <div className="text-3xl font-black tracking-tight sm:text-4xl!">
      <ScrambleCurrencyValue
        variant="prosperity"
        min={42000}
        max={280000}
        className="font-black!"
        decimalEm={0.45}
      />
    </div>
  )
}

function StatBlock({
  label,
  variant,
}: {
  label: string
  variant: "income" | "neutral" | "prosperity"
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
        {label}
      </p>
      <div className="mt-2">
        <ScrambleCurrencyValue
          variant={variant}
          min={variant === "neutral" ? 1200 : 4000}
          max={variant === "neutral" ? 48000 : 120000}
          className="text-xl font-bold! sm:text-2xl!"
          decimalEm={0.45}
        />
      </div>
      {label === "Profit / loss" ? (
        <p className="mt-1.5 text-[11px] tabular-nums" style={{ color: TOKENS.primary }}>
          <ScramblePercentValue
            className="text-[11px] font-bold"
            min={-4}
            max={18}
            suffixClassName="text-[11px] font-bold"
          />{" "}
          <span style={{ color: TOKENS.onSurfaceMuted }}>on priced holdings</span>
        </p>
      ) : null}
    </div>
  )
}

function MiniListCard({
  title,
  chip,
}: {
  title: string
  chip: ReactNode
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TOKENS.onSurfaceMuted }}>
          {title}
        </p>
        <span className="text-xs font-bold tabular-nums" style={{ color: TOKENS.primary }}>
          {chip}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold" style={{ color: TOKENS.onSurfaceMuted }}>
              SYM{i + 1}
            </span>
            <span className="tabular-nums" style={{ color: TOKENS.secondary }}>
              <ScrambleCurrencyValue min={400} max={12000} className="inline text-xs font-medium!" />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: TOKENS.secondary }}>
        View all assets
      </p>
    </div>
  )
}
