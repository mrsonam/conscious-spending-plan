"use client"

import {
  ArrowRightLeft,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"
import {
  ScrambleCurrencyValue,
  ScrambleIntegerValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"

const consoleField =
  "w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

/** Matches accounts-page-bento layout: actions → hero → three KPIs → ledger table. */
export function AccountsPageBentoLoading() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-label="Loading accounts">
      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] opacity-45"
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surfaceHigh }}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Transfer
            </button>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] opacity-45"
              style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
            >
              <Link2 className="h-4 w-4" />
              Link account
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: TOKENS.onSurface }}>
              Accounts management
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              Consolidation of liquidity, investment portfolios, and credit facilities across your linked institutions.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="rounded-xl border p-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Operating liquidity
          </p>
          <div className="mt-2">
            <ScrambleCurrencyValue
              variant="income"
              min={1200}
              max={88000}
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Checking &amp; savings
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Investment equity
          </p>
          <div className="mt-2">
            <ScrambleCurrencyValue
              variant="prosperity"
              min={0}
              max={120000}
              colorDecimal={TOKENS.secondary}
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
            <ScrambleIntegerValue min={1} max={4} suffix=" investment accounts" suffixClassName="text-[11px]" />
          </p>
        </div>
        <div
          className="rounded-xl border p-4 sm:col-span-2 lg:col-span-1"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Credit exposure
          </p>
          <div className="mt-2">
            <ScrambleCurrencyValue
              variant="loss"
              min={0}
              max={24000}
              colorDecimal={TOKENS.onSurfaceMuted}
              className="text-xl font-bold! sm:text-2xl!"
              decimalEm={0.45}
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: ERROR_SOFT }}>
            <ScramblePercentValue
              className="text-[11px] font-semibold"
              min={4}
              max={28}
              suffixClassName="text-[11px] font-semibold"
            />{" "}
            <span style={{ color: TOKENS.onSurfaceMuted }}>of combined balances (magnitude)</span>
          </p>
        </div>
      </div>

      <section
        className="rounded-xl border p-4 sm:p-5"
        style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
              Ledger
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
              Linked institutions
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label className="sr-only" htmlFor="sort-ledger-loading">
                Sort
              </label>
              <AppSelect
                id="sort-ledger-loading"
                value="balance"
                onValueChange={() => {}}
                variant="console"
                disabled
                className={cn(consoleField, "mt-0 w-auto min-w-[140px] cursor-not-allowed border-transparent py-2 text-xs opacity-60")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                options={[
                  { value: "balance", label: "Sort: Balance" },
                  { value: "name", label: "Sort: Institution" },
                ]}
              />
            </div>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg border p-2 opacity-50"
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
              aria-label="More"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1 border-b pb-3" style={{ borderColor: TOKENS.outlineGhost }}>
          {(
            [
              ["all", "All"],
              ["cash", "Checking & savings"],
              ["investment", "Investments"],
              ["credit", "Credit"],
            ] as const
          ).map(([id, label]) => (
            <span
              key={id}
              className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                background: id === "all" ? TOKENS.surfaceHigh : "transparent",
                color: id === "all" ? TOKENS.primary : TOKENS.onSurfaceMuted,
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}>
                <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Institution &amp; account
                </th>
                <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Type
                </th>
                <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Status
                </th>
                <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Balance
                </th>
                <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: `1px solid color-mix(in srgb, ${TOKENS.outlineGhost} 55%, transparent)` }}
                >
                  <td className="px-2 py-3">
                    <div className="font-semibold" style={{ color: TOKENS.onSurfaceMuted }}>
                      Institution ··{i + 1}
                    </div>
                    <div className="text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                      Account label ··{i + 1}
                    </div>
                  </td>
                  <td className="px-2 py-3" style={{ color: TOKENS.onSurfaceMuted }}>
                    {i % 3 === 0 ? "Checking" : i % 3 === 1 ? "Investment" : "Savings"}
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary }}
                    >
                      Manual
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                    <ScrambleCurrencyValue min={-2000} max={42000} className="inline text-xs font-semibold!" />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <div className="inline-flex justify-end gap-1">
                      <span className="inline-flex rounded-md p-1.5 opacity-40" style={{ color: TOKENS.onSurfaceMuted }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </span>
                      <span className="inline-flex rounded-md p-1.5 opacity-40" style={{ color: ERROR_SOFT }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
