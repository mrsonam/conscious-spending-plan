"use client"

import dynamic from "next/dynamic"
import { useCallback, useState } from "react"
import { Header } from "@/components/layout/header"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { ConsoleEmptyState } from "@/components/wealth-console/console-empty-state"
import { ConsolePulsePlaceholder } from "@/components/wealth-console/console-pulse-placeholder"
import { ConsoleQuickActions } from "@/components/wealth-console/console-quick-actions"
import { AddExpenseModal } from "@/components/modals/add-expense-modal"
import { AddIncomeModal } from "@/components/modals/add-income-modal"
import {
  useWealthConsoleDashboard,
  type WealthConsoleViewProps,
} from "@/components/wealth-console/use-wealth-console-derived"
import type {
  DashboardConsoleSnapshot,
  DashboardExpenseLogPatch,
  DashboardIncomeLogPatch,
} from "@/lib/dashboard-console-optimistic"
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

export function WealthConsoleView(
  props: WealthConsoleViewProps & {
    onActivityLogged?: () => void | Promise<void>
    onOptimisticIncomeLog?: (
      input: DashboardIncomeLogPatch,
    ) => DashboardConsoleSnapshot
    onOptimisticExpenseLog?: (
      input: DashboardExpenseLogPatch,
    ) => DashboardConsoleSnapshot
    onOptimisticRollback?: (snapshot: DashboardConsoleSnapshot) => void
  },
) {
  const {
    onActivityLogged,
    onOptimisticIncomeLog,
    onOptimisticExpenseLog,
    onOptimisticRollback,
    ...viewProps
  } = props
  const vm = useWealthConsoleDashboard(viewProps)
  const { hasBreakdown, loading } = vm

  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)

  const openLogIncome = useCallback(() => setIncomeOpen(true), [])
  const openLogExpense = useCallback(() => setExpenseOpen(true), [])

  const handleActivityLogged = useCallback(async () => {
    await onActivityLogged?.()
  }, [onActivityLogged])

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
          <ConsoleEmptyState
            onLogIncome={openLogIncome}
            onLogExpense={openLogExpense}
          />
        ) : (
          <>
            {loading && !hasBreakdown ? (
              <p role="status" className="sr-only">
                Loading dashboard data
              </p>
            ) : null}
            <ConsoleQuickActions
              className="mb-8 sm:mb-10"
              onLogIncome={openLogIncome}
              onLogExpense={openLogExpense}
            />
            <ConsoleOverviewSection vm={vm}>
              <ConsolePulseSection vm={vm} />
            </ConsoleOverviewSection>
            <ConsolePillarDetailSection vm={vm} />
            <ConsoleAccountsSection vm={vm} />
          </>
        )}
      </div>

      <AddIncomeModal
        open={incomeOpen}
        onOpenChange={setIncomeOpen}
        onSuccess={handleActivityLogged}
        onOptimisticApply={onOptimisticIncomeLog}
        onOptimisticRollback={onOptimisticRollback}
      />
      <AddExpenseModal
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        onSuccess={handleActivityLogged}
        onOptimisticApply={onOptimisticExpenseLog}
        onOptimisticRollback={onOptimisticRollback}
      />

    </div>
  )
}
