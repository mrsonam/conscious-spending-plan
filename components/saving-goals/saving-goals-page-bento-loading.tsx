"use client"

import Link from "next/link"
import {
  ArrowRightLeft,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  Wallet,
} from "lucide-react"
import {
  ScrambleCurrencyValue,
  ScrambleIntegerValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import { cn } from "@/lib/utils"
import { BENTO } from "@/lib/app-routes"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"

const actionBtn =
  "cursor-not-allowed rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] opacity-45"

function GoalCardLoading({ seed }: { seed: number }) {
  const names = ["Emergency fund", "Vacation", "New car"]
  const name = names[seed % names.length] ?? "Saving goal"

  return (
    <div
      className="relative overflow-hidden rounded-2xl border"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="h-1 w-full opacity-95" style={{ background: TOKENS.primary }} />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold" style={{ color: TOKENS.onSurface }}>
                {name}
              </h3>
              <span
                className="inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{
                  background: `color-mix(in srgb, ${TOKENS.primary} 18%, transparent)`,
                  color: TOKENS.primary,
                }}
              >
                Active
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              <ScramblePercentValue
                min={8 + seed * 4}
                max={32 + seed * 6}
                className="text-xs font-medium"
                suffixClassName="text-xs"
              />{" "}
              of savings allocation
            </p>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: `color-mix(in srgb, ${TOKENS.primary} 16%, ${TOKENS.surfaceHigh})`,
            }}
          >
            <Target className="h-5 w-5" style={{ color: TOKENS.primary }} aria-hidden />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-2">
          <ScrambleCurrencyValue
            variant="income"
            min={400 + seed * 800}
            max={4800 + seed * 1200}
            className="text-xl font-black tabular-nums"
            decimalEm={0.45}
          />
          <span className="text-xs tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
            of{" "}
            <ScrambleCurrencyValue
              min={2000 + seed * 1000}
              max={12000 + seed * 2000}
              className="inline text-xs font-medium"
            />
          </span>
        </div>

        <div
          className="mt-3 h-2 overflow-hidden rounded-full"
          style={{ background: TOKENS.surfaceHigh }}
          aria-hidden
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${38 + seed * 12}%`,
              background: TOKENS.primary,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={actionBtn}
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
          >
            Edit
          </span>
          <span
            className={cn(actionBtn, "inline-flex items-center gap-1")}
            style={{
              borderColor: `color-mix(in srgb, ${TOKENS.primary} 40%, transparent)`,
              color: TOKENS.primary,
            }}
          >
            <ArrowRightLeft className="h-3 w-3" aria-hidden />
            Transfer
          </span>
          <span
            className={cn(actionBtn, "inline-flex items-center gap-1")}
            style={{
              borderColor: `color-mix(in srgb, ${ERROR_SOFT} 35%, transparent)`,
              color: ERROR_SOFT,
            }}
          >
            <Trash2 className="h-3 w-3" aria-hidden />
            Delete
          </span>
        </div>
      </div>
    </div>
  )
}

/** Matches saving-goals-page-bento layout: hero → KPI strip → active goal grid. */
export function SavingGoalsPageBentoLoading() {
  return (
    <div
      className="w-full min-w-0 space-y-8 sm:space-y-10"
      aria-busy="true"
      aria-label="Loading saving goals"
    >
      <section
        className="relative w-full overflow-hidden rounded-2xl border px-5 py-7 sm:px-8 sm:py-9"
        style={{
          borderColor: TOKENS.outlineGhost,
          background: TOKENS.surfaceContainer,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: TOKENS.primary }} />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Saving goals
              </p>
            </div>
            <h2
              className="mt-5 text-2xl font-black leading-[1.15] tracking-tight sm:text-3xl"
              style={{ color: TOKENS.onSurface }}
            >
              Split savings into named targets
            </h2>
            <p
              className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-[15px]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Each goal takes a percentage of your savings-bucket allocation on every paycheck.
              You can also move funds from your general savings pool into a goal manually.
            </p>
            <Link
              href={BENTO.funds}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-2 transition-colors duration-200 hover:underline"
              style={{ color: TOKENS.primary }}
            >
              <Wallet className="h-3.5 w-3.5" aria-hidden />
              Fund Settings
            </Link>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] opacity-45"
            style={{ background: TOKENS.primary, color: TOKENS.surface }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            New goal
          </button>
        </div>
      </section>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            { label: "Active goals", icon: PiggyBank, kind: "count" as const },
            { label: "Assigned", icon: Target, kind: "percent" as const },
            { label: "General savings", icon: Wallet, kind: "currency" as const },
          ] as const
        ).map(({ label, icon: Icon, kind }) => (
          <div
            key={label}
            className="rounded-2xl border p-4 sm:p-5"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surfaceContainer,
              boxShadow: CARD_INSET,
            }}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color: TOKENS.primary }} aria-hidden />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {label}
              </p>
            </div>
            <div className="mt-2 text-2xl font-black tabular-nums" style={{ color: TOKENS.onSurface }}>
              {kind === "count" ? (
                <ScrambleIntegerValue min={1} max={5} className="text-2xl font-black!" />
              ) : kind === "percent" ? (
                <ScramblePercentValue
                  min={40}
                  max={100}
                  className="text-2xl font-black!"
                  suffixClassName="text-2xl font-black!"
                />
              ) : (
                <ScrambleCurrencyValue
                  variant="income"
                  min={200}
                  max={8400}
                  className="text-2xl font-black!"
                  decimalEm={0.45}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <h3
          className="text-sm font-bold uppercase tracking-[0.18em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Active
        </h3>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GoalCardLoading seed={0} />
          <GoalCardLoading seed={1} />
          <GoalCardLoading seed={2} />
        </div>
      </section>
    </div>
  )
}
