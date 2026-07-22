"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Layers,
  ListChecks,
  Target,
} from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus, consoleMicroLabel } from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { SmartInsights } from "@/components/ai-chat/smart-insights"
import type { ConsoleCardTone } from "@/components/wealth-console/sections/console-subscriptions-card"
import type {
  InsightsGoalRow,
  InsightsOverview,
  InsightsPillarRow,
} from "@/lib/insights-overview"
import {
  computeCategoryPace,
  categoryPaceMeta,
  type CategoryPaceMode,
} from "@/components/category-tracking/category-tracking-console-ui"

function toneSurfaces(tone: ConsoleCardTone = "raised") {
  const recessed = tone === "recessed"
  return {
    cardBg: recessed ? TOKENS.surfaceLow : TOKENS.surfaceContainer,
    chipBg: recessed ? TOKENS.surfaceContainer : TOKENS.surfaceLow,
  }
}

const PACE_COPY = {
  ahead: { label: "Ahead of pace", color: TOKENS.warning },
  behind: { label: "Under pace", color: TOKENS.primary },
  on_track: { label: "On pace", color: TOKENS.secondary },
  idle: { label: "No allocation", color: TOKENS.onSurfaceMuted },
} as const

const PILLAR_HREF: Record<string, string> = {
  fixedCosts: BENTO.categoryDetail("fixedCosts"),
  savings: BENTO.categoryDetail("savings"),
  investment: BENTO.categoryDetail("investment"),
  guiltFreeSpending: BENTO.categoryDetail("guiltFreeSpending"),
}

type NextStep = {
  title: string
  body: string
  href: string
  cta: string
  tone: "caution" | "positive" | "neutral"
}

function formatCompleteBy(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

function formatDue(days: number) {
  if (days <= 0) return "Today"
  if (days === 1) return "Tomorrow"
  return `In ${days}d`
}

function buildNextSteps(
  overview: InsightsOverview,
  formatCurrency: (n: number) => string,
): NextStep[] {
  const steps: NextStep[] = []

  const overPillar = overview.pillars.find((p) => p.status === "over")
  if (overPillar) {
    steps.push({
      title: `Rebalance ${overPillar.label.toLowerCase()}`,
      body: `${overPillar.label} is over by ${formatCurrency(overPillar.overspent)}. Adjust the envelope or move spend into another pillar.`,
      href: PILLAR_HREF[overPillar.key] ?? BENTO.funds,
      cta: "Review pillar",
      tone: "caution",
    })
  }

  if (overview.health.pace === "ahead") {
    steps.push({
      title: "Slow the burn",
      body: `You've used ${overview.health.budgetUsedPct.toFixed(0)}% of this month's allocation with only ${overview.health.monthElapsedPct.toFixed(0)}% of the month gone.`,
      href: BENTO.expenses,
      cta: "Review expenses",
      tone: "caution",
    })
  }

  if (overview.health.runwayDays != null && overview.health.runwayDays < 10) {
    steps.push({
      title: "Top up liquidity",
      body: `Liquid funds cover about ${overview.health.runwayDays} more day${overview.health.runwayDays === 1 ? "" : "s"} at the current burn rate.`,
      href: BENTO.accounts,
      cta: "Open accounts",
      tone: "caution",
    })
  }

  const soon = overview.subscriptions.upcoming.find((row) => row.daysUntil <= 3)
  if (soon) {
    steps.push({
      title: `Prepare for ${soon.label}`,
      body: `${soon.label} renews ${formatDue(soon.daysUntil).toLowerCase()} for ${formatCurrency(soon.amount)}.`,
      href: BENTO.subscriptions,
      cta: "Open subscriptions",
      tone: "neutral",
    })
  }

  const activeGoals = overview.goals.filter((g) => g.status === "active")
  if (activeGoals.length === 0) {
    steps.push({
      title: "Give savings a job",
      body: "Create a named goal so paycheck savings land somewhere intentional.",
      href: BENTO.savingGoals,
      cta: "Create a goal",
      tone: "positive",
    })
  } else {
    const near = activeGoals.find(
      (g) => g.completionPct != null && g.completionPct >= 85 && g.completionPct < 100,
    )
    if (near) {
      steps.push({
        title: `Finish ${near.name}`,
        body: `${near.name} is at ${near.completionPct?.toFixed(0)}% of target. A small transfer could close the gap.`,
        href: BENTO.savingGoals,
        cta: "Open goals",
        tone: "positive",
      })
    }
  }

  if (overview.health.pace === "behind" && overview.health.budgetUsedPct > 0) {
    steps.push({
      title: "Room to invest or save",
      body: `Only ${overview.health.budgetUsedPct.toFixed(0)}% of allocation is used so far. Consider funding goals or investments.`,
      href: BENTO.funds,
      cta: "Open fund settings",
      tone: "positive",
    })
  }

  if (steps.length === 0) {
    steps.push({
      title: "Keep the plan steady",
      body: "No urgent actions right now. Log income and expenses as they happen to keep insights fresh.",
      href: BENTO.dashboard,
      cta: "Back to dashboard",
      tone: "neutral",
    })
  }

  return steps.slice(0, 4)
}

function CardShell({
  title,
  description,
  icon: Icon,
  accent,
  href,
  hrefLabel,
  children,
  loading,
  className,
  tone = "raised",
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  accent: string
  href: string
  hrefLabel: string
  children: React.ReactNode
  loading?: boolean
  className?: string
  tone?: ConsoleCardTone
}) {
  const { cardBg, chipBg } = toneSurfaces(tone)

  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl p-5 transition-colors hover:opacity-[0.98] sm:p-6",
        className,
      )}
      style={{
        background: cardBg,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: chipBg, color: accent }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={consoleMicroLabel}
            >
              {title}
            </h2>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {description}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className={cn(
            consoleFocus,
            "inline-flex min-h-11 shrink-0 items-center rounded-md p-1 transition-colors hover:bg-white/5",
          )}
          aria-label={hrefLabel}
        >
          <ArrowUpRight
            className="h-4 w-4"
            style={{ color: TOKENS.onSurfaceMuted }}
          />
        </Link>
      </div>
      <div className="mt-5 flex-1">
        {loading ? (
          <div className="space-y-3" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl"
                style={{ background: chipBg }}
              />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

function Metric({
  label,
  amount,
  variant,
  chipBg,
}: {
  label: string
  amount: number
  variant: "income" | "loss"
  chipBg: string
}) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: chipBg,
        boxShadow: CARD_INSET,
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        {label}
      </p>
      <div className="mt-1.5">
        <MajorFigureCurrency
          amount={amount}
          variant={variant}
          className="text-base font-bold! sm:text-lg!"
          decimalEm={0.45}
        />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  color = TOKENS.onSurface,
  chipBg,
}: {
  label: string
  value: string
  color?: string
  chipBg: string
}) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: chipBg,
        boxShadow: CARD_INSET,
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function MonthHealthScorecard({
  health,
  loading,
}: {
  health: InsightsOverview["health"] | null
  loading: boolean
}) {
  const pace = health ? PACE_COPY[health.pace] : PACE_COPY.idle
  const { chipBg } = toneSurfaces("raised")

  return (
    <CardShell
      title="Month health"
      description="Income, spend, pace, and runway at a glance."
      icon={Activity}
      accent={TOKENS.primary}
      href={BENTO.dashboard}
      hrefLabel="Open dashboard"
      loading={loading}
      tone="raised"
    >
      {health ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric
            label="Income"
            amount={health.income}
            variant="income"
            chipBg={chipBg}
          />
          <Metric
            label="Expenses"
            amount={health.expenses}
            variant="loss"
            chipBg={chipBg}
          />
          <Stat
            label="Savings rate"
            value={
              health.savingsRatePct == null
                ? "-"
                : `${health.savingsRatePct.toFixed(0)}%`
            }
            chipBg={chipBg}
          />
          <Stat
            label="Budget used"
            value={`${health.budgetUsedPct.toFixed(0)}%`}
            chipBg={chipBg}
          />
          <Stat
            label="Pace"
            value={pace.label}
            color={pace.color}
            chipBg={chipBg}
          />
          <Stat
            label="Runway"
            value={
              health.runwayDays == null
                ? "-"
                : `${health.runwayDays} day${health.runwayDays === 1 ? "" : "s"}`
            }
            color={
              health.runwayDays != null && health.runwayDays < 10
                ? TOKENS.warning
                : TOKENS.onSurface
            }
            chipBg={chipBg}
          />
        </div>
      ) : null}
    </CardShell>
  )
}

function pillarReportBadge(
  pillar: InsightsPillarRow,
  monthElapsedPct: number,
): { label: string; color: string; hint: string | null } {
  if (pillar.status === "over") {
    return { label: "Over", color: TOKENS.loss, hint: null }
  }
  if (pillar.status === "idle" || pillar.allocated <= 0) {
    return { label: "Idle", color: TOKENS.onSurfaceMuted, hint: null }
  }

  const mode: CategoryPaceMode = pillar.key === "investment" ? "invest" : "spend"
  const elapsed = Math.min(1, Math.max(0, monthElapsedPct / 100))
  const pace = computeCategoryPace(pillar.usedPct, elapsed)
  const meta = categoryPaceMeta(pace.state, mode)

  if (mode === "invest") {
    if (pace.state === "hot") {
      return { label: "Hot", color: meta.color, hint: "ahead of plan" }
    }
    if (pace.state === "cool") {
      return { label: "Cool", color: meta.color, hint: "room to deploy" }
    }
  }

  return { label: pace.label, color: meta.color, hint: null }
}

function PillarReportCard({
  pillars,
  monthElapsedPct,
  loading,
}: {
  pillars: InsightsPillarRow[]
  monthElapsedPct: number
  loading: boolean
}) {
  const { formatCurrency } = useFormatCurrency()

  return (
    <CardShell
      title="Pillar report"
      description="How each fund envelope is tracking this month."
      icon={Layers}
      accent={TOKENS.secondary}
      href={BENTO.categoryTracking}
      hrefLabel="Open category tracking"
      loading={loading}
      tone="recessed"
    >
      <ul className="space-y-3">
        {pillars.map((pillar) => {
          const badge = pillarReportBadge(pillar, monthElapsedPct)
          return (
            <li key={pillar.key}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-medium"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {pillar.label}
                  </p>
                  <p
                    className="mt-0.5 text-[11px]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {pillar.status === "over"
                      ? `Over by ${formatCurrency(pillar.overspent)}`
                      : pillar.allocated > 0
                        ? `${formatCurrency(pillar.remaining)} left of ${formatCurrency(pillar.allocated)}`
                        : "No allocation yet"}
                    {badge.hint ? ` · ${badge.hint}` : null}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{
                    color: badge.color,
                    background: `color-mix(in srgb, ${badge.color} 16%, transparent)`,
                  }}
                >
                  {badge.label}
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full"
                style={{ background: TOKENS.surfaceHigh }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, pillar.usedPct)}%`,
                    background: badge.color,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </CardShell>
  )
}

function SubscriptionAuditCard({
  subscriptions,
  loading,
}: {
  subscriptions: InsightsOverview["subscriptions"] | null
  loading: boolean
}) {
  const { formatCurrency } = useFormatCurrency()
  const upcoming = subscriptions?.upcoming ?? []

  return (
    <CardShell
      title="Subscription audit"
      description="Monthly load and renewals in the next two weeks."
      icon={CalendarClock}
      accent={TOKENS.warning}
      href={BENTO.subscriptions}
      hrefLabel="Open subscriptions"
      loading={loading}
      tone="raised"
    >
      {subscriptions ? (
        <div className="space-y-4">
          <div
            className="rounded-xl px-3 py-3"
            style={{
              background: toneSurfaces("raised").chipBg,
              boxShadow: CARD_INSET,
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Monthly active total
            </p>
            <div className="mt-1.5">
              <MajorFigureCurrency
                amount={subscriptions.monthlyActiveTotal}
                variant="neutral"
                className="text-lg font-bold!"
                decimalEm={0.45}
              />
            </div>
            <p
              className="mt-1 text-[11px]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {subscriptions.upcomingCount} renewal
              {subscriptions.upcomingCount === 1 ? "" : "s"} in the next 14 days
            </p>
          </div>

          {upcoming.length === 0 ? (
            <p
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              No renewals scheduled in the next two weeks.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {upcoming.map((row) => (
                <li
                  key={`${row.subscriptionId}-${row.date}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {row.label}
                    </p>
                    <p
                      className="mt-0.5 text-[11px]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {formatDue(row.daysUntil)}
                      {row.provider ? ` · ${row.provider}` : ""}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-sm font-semibold tabular-nums"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {formatCurrency(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </CardShell>
  )
}

function GoalsProgressCard({
  goals,
  loading,
}: {
  goals: InsightsGoalRow[]
  loading: boolean
}) {
  const { formatCurrency } = useFormatCurrency()

  return (
    <CardShell
      title="Goals progress"
      description="Active targets and projected finish months."
      icon={Target}
      accent={TOKENS.primary}
      href={BENTO.savingGoals}
      hrefLabel="Open saving goals"
      loading={loading}
      tone="recessed"
    >
      {goals.length === 0 ? (
        <p
          className="text-sm leading-relaxed"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          No active saving goals yet. Create one to give your savings a job.
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => {
            const complete =
              goal.status === "complete" ||
              (goal.completionPct != null && goal.completionPct >= 100)
            const barColor = complete ? TOKENS.primary : TOKENS.secondary
            return (
              <li key={goal.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className="min-w-0 truncate text-sm font-medium"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {goal.name}
                  </p>
                  {goal.target != null ? (
                    <span
                      className="shrink-0 text-xs tabular-nums"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {goal.completionPct?.toFixed(0) ?? 0}%
                    </span>
                  ) : (
                    <span
                      className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Ongoing
                    </span>
                  )}
                </div>
                {goal.target != null ? (
                  <>
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full"
                      style={{ background: TOKENS.surfaceHigh }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${goal.completionPct ?? 0}%`,
                          background: barColor,
                        }}
                      />
                    </div>
                    <p
                      className="mt-1.5 text-[11px]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {formatCurrency(goal.current)} of{" "}
                      {formatCurrency(goal.target)}
                      {goal.completeBy
                        ? ` · on track for ${formatCompleteBy(goal.completeBy)}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p
                    className="mt-1.5 text-[11px]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {formatCurrency(goal.current)} saved
                    {goal.completeBy
                      ? ` · on track for ${formatCompleteBy(goal.completeBy)}`
                      : ""}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </CardShell>
  )
}

function WhatToDoNext({
  overview,
  loading,
}: {
  overview: InsightsOverview | null
  loading: boolean
}) {
  const { formatCurrency } = useFormatCurrency()
  const steps = useMemo(
    () => (overview ? buildNextSteps(overview, formatCurrency) : []),
    [overview, formatCurrency],
  )

  const toneColor = {
    caution: TOKENS.warning,
    positive: TOKENS.primary,
    neutral: TOKENS.secondary,
  } as const

  const { cardBg, chipBg } = toneSurfaces("raised")

  return (
    <section
      className="rounded-xl p-5 transition-colors hover:opacity-[0.98] sm:p-6"
      style={{
        background: cardBg,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="insights-next-steps-heading"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: chipBg, color: TOKENS.primary }}
        >
          <ListChecks className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2
            id="insights-next-steps-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={consoleMicroLabel}
          >
            What to do next
          </h2>
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Suggested actions from your current numbers, with links into the right screen.
          </p>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2" aria-hidden>
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl"
                style={{ background: chipBg }}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step) => (
              <Link
                key={step.title}
                href={step.href}
                className={cn(
                  consoleFocus,
                  "group flex flex-col justify-between rounded-xl px-4 py-3.5 transition-colors hover:opacity-[0.98]",
                )}
                style={{
                  background: chipBg,
                  boxShadow: CARD_INSET,
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {step.title}
                    </p>
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: toneColor[step.tone] }}
                      aria-hidden
                    />
                  </div>
                  <p
                    className="mt-1.5 text-[12px] leading-relaxed"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {step.body}
                  </p>
                </div>
                <span
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: toneColor[step.tone] }}
                >
                  {step.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function InsightsPageBento() {
  const [overview, setOverview] = useState<InsightsOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch("/api/insights/overview")
      .then((r) => r.json())
      .then((json) => {
        if (json.overview) setOverview(json.overview as InsightsOverview)
      })
      .catch(() => setOverview(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const pace = overview?.health
    ? PACE_COPY[overview.health.pace]
    : PACE_COPY.idle

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="px-1 py-2 sm:px-2" aria-labelledby="insights-hero-heading">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{
              borderColor: TOKENS.outlineGhost,
              color: pace.color,
              background: TOKENS.surfaceHigh,
            }}
          >
            <Activity className="h-3.5 w-3.5" aria-hidden />
            {loading ? "Loading" : pace.label}
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2
              id="insights-hero-heading"
              className="text-2xl font-black tracking-tight sm:text-3xl"
              style={{ color: TOKENS.onSurface }}
            >
              See what your money is doing
            </h2>
            <p
              className="mt-2 max-w-2xl text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Facts up top, AI judgment in the middle, and clear next steps when
              something needs attention.
            </p>
          </div>
        </div>
      </section>

      {/* Top: facts scorecard */}
      <MonthHealthScorecard
        health={overview?.health ?? null}
        loading={loading}
      />

      {/* Middle: AI judgment */}
      <SmartInsights tone="recessed" />

      {/* Lower: detailed rules cards */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5 lg:items-stretch">
        <PillarReportCard
          pillars={overview?.pillars ?? []}
          monthElapsedPct={overview?.health.monthElapsedPct ?? 0}
          loading={loading}
        />
        <SubscriptionAuditCard
          subscriptions={overview?.subscriptions ?? null}
          loading={loading}
        />
        <GoalsProgressCard goals={overview?.goals ?? []} loading={loading} />
      </div>

      {/* Actionable next steps with deep links */}
      <WhatToDoNext overview={overview} loading={loading} />
    </div>
  )
}
