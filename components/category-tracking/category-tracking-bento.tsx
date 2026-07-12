"use client"

import { useMemo } from "react"
import type { UseCategoryTrackingPageResult } from "@/hooks/use-category-tracking-page"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { CategoryTrackingAllocationSection } from "@/components/category-tracking/category-tracking-allocation-section"
import { CategoryTrackingBentoLoading } from "@/components/category-tracking/category-tracking-bento-loading"
import { CategoryTrackingCommandSection } from "@/components/category-tracking/category-tracking-command-section"
import { CategoryTrackingErrorSection } from "@/components/category-tracking/category-tracking-error-section"
import { CategoryTrackingHeroSection } from "@/components/category-tracking/category-tracking-hero-section"
import { CategoryTrackingHistorySection } from "@/components/category-tracking/category-tracking-history-section"
import { CategoryTrackingPillarSection } from "@/components/category-tracking/category-tracking-pillar-section"
import { CategoryTrackingBucketTransfersSection } from "@/components/category-tracking/category-tracking-bucket-transfers-section"
import { CategoryTrackingBucketTransferDialog } from "@/components/category-tracking/category-tracking-bucket-transfer-dialog"

export function CategoryTrackingBento(p: UseCategoryTrackingPageResult) {
  const {
    tracking,
    totalIncomeForMonth,
    history,
    loading,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    fetchData,
    monthOptions,
    selectedMonthLabel,
    formatCurrency,
    formatDate,
    totalAllocated,
    totalSpent,
    totalRemaining,
    pillarRemaining,
    overallUsage,
    elapsed,
    categoryDistribution,
    allocationMix,
    momSpend,
    refreshing,
    savingsGeneralAvailable,
    savingsAssignedToGoals,
    bucketTransfers,
    bucketTransferFlow,
    currencyCode,
    isCurrentMonth,
    transferOpen,
    setTransferOpen,
    openTransferDialog,
    transferError,
    transferBucketFunds,
  } = p

  const recentMonthRows = useMemo(() => {
    if (!history?.fixedCosts?.length) return []
    return history.fixedCosts
      .map((_, i) => {
        const fixed = history.fixedCosts[i]?.spent ?? 0
        const investment = history.investment[i]?.spent ?? 0
        const savings = history.savings[i]?.spent ?? 0
        const guilt = history.guiltFreeSpending[i]?.spent ?? 0
        return {
          month: history.fixedCosts[i]?.month ?? "",
          fixed,
          investment,
          savings,
          guilt,
          total: fixed + investment + savings + guilt,
        }
      })
      .slice(-6)
  }, [history])

  const spendMixTotal = useMemo(
    () => categoryDistribution.reduce((s, x) => s + x.value, 0),
    [categoryDistribution],
  )

  const hasTracking = tracking != null
  const showInitialLoad = loading && !hasTracking
  const runwayPct =
    totalAllocated > 0 ? (pillarRemaining / totalAllocated) * 100 : 0
  const isOverDeployed = pillarRemaining < 0

  return (
    <div className="space-y-6 sm:space-y-8">
      {showInitialLoad ? (
        <CategoryTrackingBentoLoading
          monthOptions={monthOptions}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          setSelectedMonth={setSelectedMonth}
          setSelectedYear={setSelectedYear}
          selectedMonthLabel={selectedMonthLabel}
        />
      ) : !hasTracking ? (
        <CategoryTrackingErrorSection onRetry={() => void fetchData({ bypassCache: true })} />
      ) : (
        <>
          {totalIncomeForMonth === 0 && (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: TOKENS.outlineGhost,
                background: `color-mix(in srgb, ${TOKENS.secondary} 10%, ${TOKENS.surfaceLow})`,
                color: TOKENS.onSurface,
              }}
            >
              <span className="font-semibold">No income recorded for {selectedMonthLabel}.</span>{" "}
              <span style={{ color: TOKENS.onSurfaceMuted }}>
                Envelope math waits on inflows. Log income from the dashboard flow.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 lg:items-start">
            <CategoryTrackingHeroSection
              totalRemaining={totalRemaining}
              totalIncomeForMonth={totalIncomeForMonth}
              totalAllocated={totalAllocated}
              totalSpent={totalSpent}
              overallUsage={overallUsage}
              runwayPct={runwayPct}
              isOverDeployed={isOverDeployed}
              momSpend={momSpend}
              selectedMonthLabel={selectedMonthLabel}
              formatCurrency={formatCurrency}
            />
            <CategoryTrackingCommandSection
              monthOptions={monthOptions}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              setSelectedMonth={setSelectedMonth}
              setSelectedYear={setSelectedYear}
              refreshing={refreshing}
              isCurrentMonth={isCurrentMonth}
              onOpenTransfer={openTransferDialog}
            />
          </div>

          <CategoryTrackingBucketTransferDialog
            open={transferOpen}
            onOpenChange={setTransferOpen}
            tracking={tracking}
            savingsGeneralAvailable={savingsGeneralAvailable}
            formatCurrency={formatCurrency}
            currencyCode={currencyCode}
            formError={transferError}
            onSubmit={transferBucketFunds}
          />

          <div className="w-full min-w-0 space-y-6 sm:space-y-8">
            <CategoryTrackingAllocationSection
              allocationMix={allocationMix}
              totalIncomeForMonth={totalIncomeForMonth}
              selectedMonthLabel={selectedMonthLabel}
              formatCurrency={formatCurrency}
              categoryDistribution={categoryDistribution}
              spendMixTotal={spendMixTotal}
            />

            <CategoryTrackingPillarSection
              tracking={tracking}
              bucketTransferFlow={bucketTransferFlow}
              savingsGeneralAvailable={savingsGeneralAvailable}
              savingsAssignedToGoals={savingsAssignedToGoals}
              elapsed={elapsed}
              history={history}
              formatCurrency={formatCurrency}
            />

            <CategoryTrackingBucketTransfersSection
              transfers={bucketTransfers}
              selectedMonthLabel={selectedMonthLabel}
              formatDate={formatDate}
            />
          </div>

          <div className="w-full min-w-0 space-y-6 sm:space-y-8">
            <CategoryTrackingHistorySection
              recentMonthRows={recentMonthRows}
              formatCurrency={formatCurrency}
            />
          </div>
        </>
      )}
    </div>
  )
}
