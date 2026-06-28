"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRight, CalendarClock } from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  ScrambleCurrencyValue,
  ScrambleIntegerValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import { SkeletonBlock } from "@/components/wealth-console/console-skeleton"
import {
  consoleBudgetFill,
  consoleFocus,
  consoleMicroLabel,
} from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import type { WealthConsoleDashboardVM } from "@/components/wealth-console/use-wealth-console-derived"

export function ConsolePulseSection({ vm }: { vm: WealthConsoleDashboardVM }) {
  const {
    formatCurrency,
    totalExpenses,
    pulseMetrics,
    investmentAllocated,
    expenseChangePct,
    savingsRatePct,
    breakdownData,
    showBreakdownSkeleton,
    showNetWorthSkeleton,
    showExpenseSkeleton,
    showHeadroomSkeleton,
    showInvestmentMonthSkeleton,
    incomeChangePct,
    lastMonthIncome,
    lastMonthExpenses,
    loanSummary,
    subscriptionDash,
    loading,
  } = vm


  return (
    <>
              <div
                id="console-pulse"
                className="scroll-mt-28 space-y-10 lg:space-y-14"
              >
                <h2 className="sr-only">Operational pulse</h2>
                <div className="lg:ml-[min(5vw,3rem)] lg:max-w-2xl">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                    style={{ color: TOKENS.onSurfaceMutedElevated }}
                  >
                    Operational intelligence
                  </p>
                  <p
                    className="mt-3 text-sm leading-relaxed sm:text-[0.9375rem]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Budget load includes this month&apos;s investment purchases.
                    Net worth uses live quotes when symbols resolve.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
                  <div className="flex flex-col gap-4 lg:col-span-5">
                    <div
                      className="flex min-h-[280px] flex-col justify-between rounded-xl p-6 sm:p-8"
                      style={{
                        background: TOKENS.surfaceContainer,
                        boxShadow:
                          "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                      }}
                    >
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                          style={consoleMicroLabel}
                        >
                          Aggregate
                        </p>
                        <p
                          className="mt-4 text-xs font-medium uppercase tracking-widest"
                          style={{ color: TOKENS.secondary }}
                        >
                          Net worth
                        </p>
                        <div className="mt-2 text-3xl leading-[1.05] tracking-tight sm:text-4xl">
                          {showNetWorthSkeleton ? (
                            <ScrambleCurrencyValue min={2500} max={28000} />
                          ) : (
                            <MajorFigureCurrency
                              amount={pulseMetrics.netWorth}
                              variant="neutral"
                            />
                          )}
                        </div>
                      </div>
                      <div
                        className="mt-8 rounded-lg p-4 sm:p-5"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <div>
                          <p
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={consoleMicroLabel}
                          >
                            Liquid · all accounts
                          </p>
                          <div className="mt-2 text-xl sm:text-2xl">
                            {showNetWorthSkeleton ? (
                              <ScrambleCurrencyValue min={1200} max={14000} className="font-bold!" />
                            ) : (
                              <MajorFigureCurrency
                                amount={pulseMetrics.cashBalance}
                                variant="neutral"
                                className="font-bold!"
                              />
                            )}
                          </div>
                        </div>
                        <div
                          className="mt-4 border-t pt-4"
                          style={{ borderColor: TOKENS.outlineGhost }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={consoleMicroLabel}
                          >
                            Invested · holdings
                          </p>
                          <div className="mt-2 text-xl sm:text-2xl">
                            {showNetWorthSkeleton ? (
                              <ScrambleCurrencyValue
                                min={600}
                                max={16000}
                                className="font-bold!"
                                colorMain={TOKENS.tertiary}
                                colorDecimal={TOKENS.onSurfaceMuted}
                              />
                            ) : (
                              <MajorFigureCurrency
                                amount={pulseMetrics.investmentValue}
                                variant="neutral"
                                colorMain={TOKENS.tertiary}
                                colorDecimal={TOKENS.onSurfaceMuted}
                                className="font-bold!"
                              />
                            )}
                          </div>
                        </div>
                        {pulseMetrics.superBalance > 0 && (
                          <div
                            className="mt-4 border-t pt-4"
                            style={{ borderColor: TOKENS.outlineGhost }}
                          >
                            <p
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={consoleMicroLabel}
                            >
                              Super · retirement
                            </p>
                            <div className="mt-2 text-xl sm:text-2xl">
                              {showNetWorthSkeleton ? (
                                <ScrambleCurrencyValue
                                  min={500}
                                  max={20000}
                                  className="font-bold!"
                                  colorMain={TOKENS.secondary}
                                  colorDecimal={TOKENS.onSurfaceMuted}
                                />
                              ) : (
                                <MajorFigureCurrency
                                  amount={pulseMetrics.superBalance}
                                  variant="neutral"
                                  colorMain={TOKENS.secondary}
                                  colorDecimal={TOKENS.onSurfaceMuted}
                                  className="font-bold!"
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {loanSummary && loanSummary.activeCount > 0 && (
                        <div
                          className="mt-4 flex items-end justify-between gap-3 border-t pt-4"
                          style={{ borderColor: TOKENS.outlineGhost }}
                        >
                          <div>
                            <p
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: TOKENS.onSurfaceMutedElevated }}
                            >
                              Active loans · {loanSummary.activeCount} open
                            </p>
                            <div className="mt-1 text-lg">
                              <MajorFigureCurrency
                                amount={loanSummary.outstandingPrincipal}
                                variant="neutral"
                                colorMain={TOKENS.tertiary}
                                colorDecimal={TOKENS.onSurfaceMuted}
                                className="font-bold!"
                              />
                            </div>
                          </div>
                          <Link
                            href={BENTO.loans}
                            className={cn(
                              consoleFocus,
                              "inline-flex min-h-11 shrink-0 items-center px-2 text-[10px] font-bold uppercase tracking-wide",
                            )}
                            style={{ color: TOKENS.primary }}
                          >
                            Manage →
                          </Link>
                        </div>
                      )}
                      {loading && !loanSummary && (
                        <div
                          aria-hidden
                          className="mt-4 min-h-[72px] border-t pt-4"
                          style={{ borderColor: TOKENS.outlineGhost }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 lg:col-span-7">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                      <div
                        className="sm:col-span-7 rounded-xl p-5 sm:p-6"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow:
                            "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={consoleMicroLabel}
                        >
                          Outflow
                        </p>
                        <div className="mt-3 text-2xl leading-none sm:text-3xl lg:text-[2.125rem]">
                          {showExpenseSkeleton ? (
                            <ScrambleCurrencyValue min={400} max={5400} variant="loss" />
                          ) : (
                            <MajorFigureCurrency
                              amount={totalExpenses}
                              variant="loss"
                            />
                          )}
                        </div>
                        <p
                          className="mt-2 text-[11px] leading-snug"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Total expenses · this month
                        </p>
                      </div>
                      <div
                        className="flex flex-col justify-end rounded-xl p-5 sm:col-span-5 sm:p-6"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={consoleMicroLabel}
                        >
                          Savings rate
                        </p>
                        <div className="mt-2 flex items-baseline gap-0.5">
                          {showHeadroomSkeleton ? (
                            <ScramblePercentValue
                              className="text-2xl font-bold leading-none sm:text-3xl"
                              suffixClassName="text-lg font-bold sm:text-xl"
                            />
                          ) : savingsRatePct === null ? (
                            <span
                              className="text-xl font-semibold leading-none sm:text-2xl"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              —
                            </span>
                          ) : (
                            <>
                              <span
                                className="text-2xl font-bold tabular-nums leading-none sm:text-3xl"
                                style={{
                                  color:
                                    savingsRatePct >= 0 ? TOKENS.primary : TOKENS.loss,
                                }}
                              >
                                {savingsRatePct.toFixed(1)}
                              </span>
                              <span
                                className="text-lg font-semibold sm:text-xl"
                                style={{ color: TOKENS.onSurfaceMuted }}
                              >
                                %
                              </span>
                            </>
                          )}
                        </div>
                        <p
                          className="mt-2 text-[10px] leading-snug"
                          style={consoleMicroLabel}
                        >
                          Net savings as a share of monthly income
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex flex-col gap-5 rounded-xl p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"
                      style={{
                        background: TOKENS.surfaceContainer,
                        boxShadow:
                          "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={consoleMicroLabel}
                        >
                          Budget load
                        </p>
                        {showHeadroomSkeleton ? (
                          <>
                            <SkeletonBlock className="mt-4 h-2.5 w-full rounded-full" />
                            <p
                              className="mt-2 text-[10px]"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              Expenses + invested vs monthly allocation
                            </p>
                          </>
                        ) : (
                          <>
                            <div
                              className="mt-4 h-2 overflow-hidden rounded-full sm:h-2.5"
                              style={{ background: TOKENS.surfaceLow }}
                            >
                              <div
                                className={`h-full w-full origin-left rounded-full ${consoleBudgetFill}`}
                                style={{
                                  transform: `scaleX(${Math.min(100, pulseMetrics.budgetUsedPct) / 100})`,
                                  background:
                                    pulseMetrics.budgetUsedPct >= 100
                                      ? TOKENS.loss
                                      : pulseMetrics.budgetUsedPct >= 80
                                        ? TOKENS.warning
                                        : TOKENS.primary,
                                }}
                              />
                            </div>
                            <p
                              className="mt-2 text-[10px]"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              Expenses + invested vs monthly allocation
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 items-baseline sm:pl-6">
                        {showHeadroomSkeleton ? (
                          <ScramblePercentValue
                            className="text-3xl font-black tabular-nums leading-none sm:text-4xl"
                            color={TOKENS.primary}
                          />
                        ) : (
                          <>
                            <span
                              className="text-3xl font-black tabular-nums leading-none sm:text-4xl"
                              style={{
                                color:
                                  pulseMetrics.budgetUsedPct >= 100
                                    ? TOKENS.loss
                                    : pulseMetrics.budgetUsedPct >= 80
                                      ? TOKENS.warning
                                      : TOKENS.primary,
                              }}
                            >
                              {pulseMetrics.budgetUsedPct.toFixed(0)}
                            </span>
                            <span
                              className="ml-0.5 text-xl font-bold"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              %
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3 sm:gap-4">
                      <div
                        className="col-span-12 rounded-xl p-4 sm:col-span-4 sm:p-5"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={consoleMicroLabel}
                        >
                          Invested · month to date
                        </p>
                        <div className="mt-2 text-base sm:text-lg">
                          {showInvestmentMonthSkeleton ? (
                            <ScrambleCurrencyValue min={80} max={1800} className="font-bold!" />
                          ) : (
                            <MajorFigureCurrency
                              amount={pulseMetrics.investedThisMonth}
                              variant="neutral"
                              className="font-bold!"
                            />
                          )}
                        </div>
                        {!showInvestmentMonthSkeleton && investmentAllocated > 0 && (
                          <div
                            className="mt-3 h-1 overflow-hidden rounded-full"
                            style={{ background: TOKENS.surfaceHigh }}
                          >
                            <div
                              className={`h-full w-full origin-left rounded-full ${consoleBudgetFill}`}
                              style={{
                                transform: `scaleX(${Math.min(
                                  100,
                                  (pulseMetrics.investedThisMonth /
                                    investmentAllocated) *
                                    100,
                                ) / 100})`,
                                background: TOKENS.primary,
                              }}
                            />
                          </div>
                        )}
                        {showInvestmentMonthSkeleton ? (
                          <SkeletonBlock className="mt-3 h-1 w-full rounded-full" />
                        ) : null}
                        {showInvestmentMonthSkeleton ? (
                          <div className="mt-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                            allocation syncing
                          </div>
                        ) : null}
                        {!showInvestmentMonthSkeleton && investmentAllocated > 0 && (
                          <p
                            className="mt-2 text-[10px]"
                            style={consoleMicroLabel}
                          >
                            of {formatCurrency(investmentAllocated)} allocated
                          </p>
                        )}
                      </div>
                      <div
                        className="col-span-12 -translate-y-0 rounded-xl p-5 sm:col-span-4 sm:-translate-y-2 sm:p-6 lg:p-7"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow:
                            "inset 0 1px 0 0 rgba(218,226,253,0.08), 0 18px 40px rgba(0,0,0,0.22)",
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.primary }}
                        >
                          Burn rate
                        </p>
                        <div className="mt-3 text-2xl sm:text-3xl">
                          {showExpenseSkeleton ? (
                            <ScrambleCurrencyValue min={20} max={260} />
                          ) : (
                            <MajorFigureCurrency
                              amount={pulseMetrics.avgDailySpending}
                              variant="neutral"
                            />
                          )}
                        </div>
                        <p
                          className="mt-2 text-[10px] leading-snug"
                          style={consoleMicroLabel}
                        >
                          Daily average · month to date
                        </p>
                      </div>
                      <div
                        className="col-span-12 flex flex-col justify-end rounded-xl p-4 text-right sm:col-span-4 sm:p-5"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={consoleMicroLabel}
                        >
                          Runway
                        </p>
                        {showExpenseSkeleton ? (
                          <>
                            <ScrambleIntegerValue className="mt-1 text-2xl font-black tabular-nums leading-none sm:text-3xl" />
                            <p
                              className="mt-1 text-[10px]"
                              style={consoleMicroLabel}
                            >
                              days after today
                            </p>
                          </>
                        ) : (
                          <>
                            <p
                              className="mt-1 text-2xl font-black tabular-nums leading-none sm:text-3xl"
                              style={{ color: TOKENS.secondary }}
                            >
                              {pulseMetrics.daysRemaining}
                            </p>
                            <p
                              className="mt-1 text-[10px]"
                              style={consoleMicroLabel}
                            >
                              days after today
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
                  <div
                    className="flex flex-col justify-between rounded-xl p-6 sm:p-8 lg:col-span-8"
                    style={{
                      background: TOKENS.surfaceContainer,
                      boxShadow:
                        "inset 0 1px 0 0 rgba(218,226,253,0.06)",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                          style={{ color: TOKENS.onSurfaceMutedElevated }}
                        >
                          Compared to last month
                        </p>
                        <p
                          className="mt-2 text-xs font-medium uppercase tracking-widest"
                          style={{ color: TOKENS.onSurface }}
                        >
                          Income
                        </p>
                      </div>
                      {lastMonthIncome > 0 && incomeChangePct !== null && (
                        <div className="text-right">
                          <p
                            className="text-[10px] uppercase tracking-wider"
                            style={{ color: TOKENS.onSurfaceMutedElevated }}
                          >
                            Delta
                          </p>
                          <p
                            className="text-2xl font-black tabular-nums leading-none sm:text-3xl"
                            style={{
                              color:
                                incomeChangePct >= 0
                                  ? TOKENS.primary
                                  : TOKENS.loss,
                            }}
                          >
                            {incomeChangePct >= 0 ? "+" : ""}
                            {incomeChangePct.toFixed(1)}
                            <span
                              className="text-base font-bold sm:text-lg"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              %
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 space-y-2">
                      {showBreakdownSkeleton ? (
                        <p
                          className="text-sm"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          This month syncing
                        </p>
                      ) : (
                        <p
                          className="text-sm"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          This month{" "}
                          <span
                            className="font-semibold tabular-nums"
                            style={{ color: TOKENS.onSurface }}
                          >
                            {formatCurrency(breakdownData.income)}
                          </span>
                        </p>
                      )}
                      {showBreakdownSkeleton ? (
                        <p
                          className="text-sm"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Last month syncing
                        </p>
                      ) : (
                        <p
                          className="text-sm"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          Last month{" "}
                          <span
                            className="font-semibold tabular-nums"
                            style={{ color: TOKENS.onSurface }}
                          >
                            {formatCurrency(lastMonthIncome)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex flex-col justify-between rounded-xl p-6 sm:p-6 lg:col-span-4"
                    style={{ background: TOKENS.surfaceLow }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                            style={consoleMicroLabel}
                    >
                      Expense velocity
                    </p>
                    <div className="mt-4 text-2xl leading-tight sm:text-3xl">
                      <MajorFigureCurrency
                        amount={totalExpenses}
                        variant="loss"
                      />
                    </div>
                    {lastMonthExpenses > 0 && expenseChangePct !== null && (
                      <p
                        className="mt-2 text-base font-bold tabular-nums leading-snug"
                        style={{
                          color:
                            expenseChangePct <= 0
                              ? TOKENS.primary
                              : TOKENS.loss,
                        }}
                      >
                        {expenseChangePct >= 0 ? "+" : ""}
                        {expenseChangePct.toFixed(1)}% vs last month
                      </p>
                    )}
                    <p
                      className="mt-4 text-xs leading-relaxed"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Last month{" "}
                      <span className="font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                        {formatCurrency(lastMonthExpenses)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
                  <div
                    id="console-subscriptions"
                    className="scroll-mt-28 min-w-0 lg:col-span-2"
                  >
                    <div
                      className="rounded-xl border p-5 transition-colors hover:opacity-[0.98] sm:p-6"
                      style={{
                        background: TOKENS.surfaceContainer,
                        boxShadow: CARD_INSET,
                        borderColor: TOKENS.outlineGhost,
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background: TOKENS.surfaceLow,
                              color: TOKENS.secondary,
                            }}
                          >
                            <CalendarClock className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                              style={consoleMicroLabel}
                            >
                              Subscriptions
                            </p>
                            <p
                              className="mt-1 max-w-xl text-xs leading-relaxed"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              Active plans and upcoming renewals.
                            </p>
                          </div>
                        </div>
                        <Link
                          href={BENTO.subscriptions}
                          className={cn(
                            consoleFocus,
                            "inline-flex min-h-11 shrink-0 items-center rounded-md p-1 transition-colors hover:bg-white/5",
                          )}
                          aria-label="Open subscriptions"
                        >
                          <ArrowUpRight
                            className="h-4 w-4"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          />
                        </Link>
                      </div>

                      <div className="mt-5">
                        <div className="text-3xl font-bold tabular-nums tracking-tight sm:text-[1.75rem]">
                          <MajorFigureCurrency
                            amount={subscriptionDash.monthlyActiveTotal}
                            variant="neutral"
                          />
                        </div>
                        <p
                          className="mt-1.5 text-[10px] font-medium uppercase tracking-wider"
                          style={consoleMicroLabel}
                        >
                          Monthly equivalent (active)
                        </p>
                      </div>

                      <div
                        className="mt-5 border-t pt-5"
                        style={{ borderColor: TOKENS.outlineGhost }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: TOKENS.onSurfaceMutedElevated }}
                        >
                          Renewals in the next 14 days
                        </p>
                        <ul className="mt-3 space-y-2.5">
                          {subscriptionDash.upcoming.length === 0 ? (
                            <li
                              className="text-sm leading-snug"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              None scheduled — you&apos;re clear for this window.
                            </li>
                          ) : (
                            subscriptionDash.upcoming.slice(0, 4).map((u) => (
                              <li
                                key={`${u.subscriptionId}-${u.kind}-${u.date}`}
                                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"
                              >
                                <span
                                  className="min-w-0 truncate font-medium"
                                  style={{ color: TOKENS.onSurface }}
                                >
                                  {u.label}
                                  <span
                                    className="ml-1.5 text-[10px] font-normal uppercase tracking-wide"
                                    style={consoleMicroLabel}
                                  >
                                    {u.kind === "trial" ? "trial" : "renewal"}
                                  </span>
                                </span>
                                <span
                                  className="shrink-0 tabular-nums text-xs"
                                  style={{ color: TOKENS.onSurfaceMuted }}
                                >
                                  {new Date(u.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}{" "}
                                  ·{" "}
                                  <MajorFigureCurrency
                                    amount={u.amount}
                                    variant="neutral"
                                    className="inline text-xs font-semibold!"
                                  />
                                </span>
                              </li>
                            ))
                          )}
                        </ul>
                        {subscriptionDash.upcoming.length > 4 ? (
                          <Link
                            href={BENTO.subscriptions}
                            className={cn(
                              consoleFocus,
                              "mt-3 inline-flex min-h-11 items-center text-xs font-semibold",
                            )}
                            style={{ color: TOKENS.primary }}
                          >
                            View all subscriptions
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
    </>
  )
}
