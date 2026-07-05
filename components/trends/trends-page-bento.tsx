"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Activity } from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { useTrendsReport } from "@/hooks/use-trends-report"
import { CashFlowForecastBento } from "@/components/trends/cash-flow-forecast-bento"
import { NetWorthBento } from "@/components/net-worth/net-worth-bento"
import { SpendingTrendsChart } from "@/components/trends/spending-trends-chart"
import { TrendsCashFlowTable } from "@/components/trends/trends-cash-flow-table"
import { TrendsCategorySection } from "@/components/trends/trends-category-section"
import { TrendsIncomeSection } from "@/components/trends/trends-income-section"
import { TrendsInsightStrip } from "@/components/trends/trends-insight-strip"
import { TrendsSavingsRateSection } from "@/components/trends/trends-savings-rate-section"
import {
  TrendsCard,
  TrendsPeriodSelector,
  TrendsSectionHeader,
} from "@/components/trends/trends-shared"

function SpendingSkeleton({ bars }: { bars: number }) {
  return (
    <div className="flex items-end gap-1 px-2" style={{ height: 320 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex-1 rounded-t"
          style={{ height: `${40 + (i % 5) * 12}%`, background: TOKENS.surfaceHigh }}
        />
      ))}
    </div>
  )
}

export function TrendsPageBento() {
  const router = useRouter()
  const { formatCurrency } = useFormatCurrency()
  const [months, setMonths] = useState(12)
  const report = useTrendsReport(months)

  const handleMonthClick = (month: number, year: number) => {
    router.push(`${BENTO.expenses}?month=${month}&year=${year}`)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cardless hero + shared period */}
      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div
              className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{
                background: TOKENS.surfaceLow,
                color: TOKENS.secondary,
              }}
            >
              <Activity className="h-3 w-3" aria-hidden />
              Trends report
            </div>
            <h2
              className="text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ color: TOKENS.onSurface }}
            >
              See patterns over time
            </h2>
            <p
              className="mt-2 max-w-2xl text-[13px] leading-relaxed sm:text-sm"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              One period selector drives spending, categories, income, savings rate, and net worth.
            </p>
          </div>
          <TrendsPeriodSelector value={months} onChange={setMonths} />
        </div>
        <div className="mt-4">
          <TrendsInsightStrip insights={report.insights} loading={report.loading} />
        </div>
      </section>

      <TrendsCard>
        <TrendsSectionHeader
          title="Spending trends"
          description="Actual spend by pillar vs income. Click a bar to open expenses."
        />
        {report.loading ? (
          <SpendingSkeleton bars={months === 6 ? 6 : months === 12 ? 12 : 18} />
        ) : report.error ? (
          <div
            className="flex h-[320px] items-center justify-center rounded-xl text-[13px]"
            style={{ background: TOKENS.surface, color: TOKENS.onSurfaceMuted }}
          >
            {report.error}
          </div>
        ) : (
          <SpendingTrendsChart
            data={report.months}
            formatCurrency={formatCurrency}
            avgMonthlySpend={report.avgMonthlySpend}
            momSpendPct={report.momSpendPct}
            onMonthClick={handleMonthClick}
          />
        )}
      </TrendsCard>

      <TrendsCategorySection
        months={report.months}
        topCategories={report.topCategories}
        loading={report.loading}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <TrendsIncomeSection
          months={report.months}
          incomeSources={report.incomeSources}
          avgMonthlyIncome={report.avgMonthlyIncome}
          loading={report.loading}
        />
        <TrendsSavingsRateSection
          months={report.months}
          savingsRateSeries={report.savingsRateSeries}
          loading={report.loading}
        />
      </div>

      <TrendsCashFlowTable
        months={report.months}
        savingsRateSeries={report.savingsRateSeries}
        loading={report.loading}
        onMonthClick={handleMonthClick}
      />

      <NetWorthBento months={months} hideRangeSelector />

      <CashFlowForecastBento />
    </div>
  )
}
