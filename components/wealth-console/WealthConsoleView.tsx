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
import { TransferModal } from "@/components/modals/transfer-modal"
import { AddSuperContributionModal } from "@/components/modals/add-super-contribution-modal"
import { AddInvestmentModal } from "@/components/modals/add-investment-modal"
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
import { ConsoleBudgetAlertsStrip } from "@/components/wealth-console/console-budget-alerts-strip"
import { useSession } from "next-auth/react"
import { PendingReviewBar } from "@/components/basiq/pending-review-bar"
import { TransactionReview } from "@/components/basiq/transaction-review"
import { useBasiq } from "@/hooks/use-basiq"

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
  const [transferOpen, setTransferOpen] = useState(false)
  const [superOpen, setSuperOpen] = useState(false)
  const [investmentOpen, setInvestmentOpen] = useState(false)

  const openLogIncome = useCallback(() => setIncomeOpen(true), [])
  const openLogExpense = useCallback(() => setExpenseOpen(true), [])
  const openTransfer = useCallback(() => setTransferOpen(true), [])
  const openLogSuper = useCallback(() => setSuperOpen(true), [])
  const openLogInvestment = useCallback(() => setInvestmentOpen(true), [])

  const { status } = useSession()
  const basiq = useBasiq(status)
  const [reviewOpen, setReviewOpen] = useState(false)

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
      <PendingReviewBar
        count={basiq.pendingCount}
        onClick={() => setReviewOpen(true)}
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
            <ConsoleBudgetAlertsStrip alerts={vm.spendingAlerts} />
            <ConsoleOverviewSection vm={vm} />
            <ConsoleQuickActions
              className="mt-8 mb-8 sm:mt-10 sm:mb-10"
              onLogIncome={openLogIncome}
              onLogExpense={openLogExpense}
              onTransfer={openTransfer}
              onLogSuper={openLogSuper}
              onLogInvestment={openLogInvestment}
            />
            <ConsolePulseSection vm={vm} />
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
      <TransferModal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onSuccess={handleActivityLogged}
      />
      <AddSuperContributionModal
        open={superOpen}
        onOpenChange={setSuperOpen}
        onSuccess={handleActivityLogged}
      />
      <AddInvestmentModal
        open={investmentOpen}
        onOpenChange={setInvestmentOpen}
        onSuccess={handleActivityLogged}
      />

      <TransactionReview
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onReviewComplete={(count) =>
          basiq.setPendingCount((prev) => Math.max(0, prev - (count > 0 ? 1 : 1)))
        }
      />
    </div>
  )
}
