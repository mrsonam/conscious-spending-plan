"use client"

import dynamic from "next/dynamic"
import { Header } from "@/components/layout/header"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { ConsoleEmptyState } from "@/components/wealth-console/console-empty-state"
import { ConsolePulsePlaceholder } from "@/components/wealth-console/console-pulse-placeholder"
import {
  useWealthConsoleDashboard,
  type WealthConsoleViewProps,
} from "@/components/wealth-console/use-wealth-console-derived"
import { ConsoleOverviewSection } from "@/components/wealth-console/sections/console-overview-section"
import { ConsolePillarDetailSection } from "@/components/wealth-console/sections/console-pillar-detail-section"
import { ConsoleAccountsSection } from "@/components/wealth-console/sections/console-accounts-section"

const ConsolePulseSection = dynamic(
  () =>
    import("@/components/wealth-console/sections/console-pulse-section").then(
      (m) => m.ConsolePulseSection,
    ),
  { loading: () => <ConsolePulsePlaceholder /> },
)

export type {
  Account,
  Breakdown,
  CategoryTracking,
  Expense,
  InvestmentAccount,
  InvestmentHolding,
  LoanSummary,
  SubscriptionDashboardSnapshot,
  TrajectoryPoint,
  YtdSummary,
} from "@/components/wealth-console/types"
export { TOKENS } from "@/lib/wealth-console-tokens"

export function WealthConsoleView(props: WealthConsoleViewProps) {
  const vm = useWealthConsoleDashboard(props)
  const { hasBreakdown, loading } = vm

  return (
    <div
      className="pb-10"
      style={{
        background: TOKENS.surface,
        color: TOKENS.onSurface,
      }}
    >
      <Header
        title="Wealth Console"
        description="Monthly flow, allocation, and balances in one view."
       
      />
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        {!hasBreakdown && !loading ? (
          <ConsoleEmptyState />
        ) : (
          <>
            {loading && !hasBreakdown ? (
              <p role="status" className="sr-only">
                Loading dashboard data
              </p>
            ) : null}
            <ConsoleOverviewSection vm={vm}>
              <ConsolePulseSection vm={vm} />
            </ConsoleOverviewSection>
            <ConsolePillarDetailSection vm={vm} />
            <ConsoleAccountsSection vm={vm} />
          </>
        )}
      </div>

    </div>
  )
}
