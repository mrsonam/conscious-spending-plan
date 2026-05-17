"use client"

import { useState } from "react"
import { TrendingUp } from "lucide-react"
import { InvestmentAnalyticsSection } from "@/components/investments/investment-analytics-section"
import { InvestmentChartRiskSection } from "@/components/investments/investment-chart-risk-section"
import { InvestmentDividendDialog } from "@/components/investments/investment-dividend-dialog"
import { InvestmentHoldingsSection } from "@/components/investments/investment-holdings-section"
import { InvestmentLogDialog } from "@/components/investments/investment-log-dialog"
import { InvestmentPanelToolbar } from "@/components/investments/investment-panel-toolbar"
import { InvestmentReportsSection } from "@/components/investments/investment-reports-section"
import { InvestmentSleevesSection } from "@/components/investments/investment-sleeves-section"
import { InvestmentSummarySection } from "@/components/investments/investment-summary-section"
import { InvestmentsPageBentoLoading } from "@/components/investments/investments-page-bento-loading"
import type { UseInvestmentsPageResult } from "@/hooks/use-investments-page"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

export function InvestmentsPageBento(p: UseInvestmentsPageResult) {
  const [logOpen, setLogOpen] = useState(false)
  const [dividendOpen, setDividendOpen] = useState(false)

  const openLog = () => {
    p.setMessage(null)
    p.clearFieldErrors()
    setLogOpen(true)
  }

  const openDividend = () => {
    p.setMessage(null)
    p.clearFieldErrors()
    p.setDividendAccountId(p.accounts[0]?.id ?? "")
    setDividendOpen(true)
  }

  const submitLog = async (e: React.FormEvent) => {
    const ok = await p.handleSubmit(e)
    if (ok) setLogOpen(false)
  }

  const submitDividend = async (e: React.FormEvent) => {
    const ok = await p.handleDividendSubmit(e)
    if (ok) setDividendOpen(false)
  }

  if (p.loading) {
    return <InvestmentsPageBentoLoading />
  }

  if (p.accounts.length === 0) {
    return (
      <section
        className="rounded-xl border p-10 text-center"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl"
          style={{
            background: TOKENS.surfaceHigh,
            border: `1px solid ${TOKENS.outlineGhost}`,
          }}
        >
          <TrendingUp className="h-7 w-7" style={{ color: TOKENS.secondary }} />
        </div>
        <h2 className="mt-4 text-xl font-bold" style={{ color: TOKENS.onSurface }}>
          No investment accounts found
        </h2>
        <p
          className="mx-auto mt-2 max-w-xl text-sm leading-relaxed"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Create an investment account on the Accounts page, transfer funds into it,
          then return here to log holdings.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {p.message ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            background:
              p.message.type === "success"
                ? `color-mix(in srgb, ${TOKENS.primary} 12%, ${TOKENS.surfaceLow})`
                : `color-mix(in srgb, ${ERROR_SOFT} 12%, ${TOKENS.surfaceLow})`,
            borderColor:
              p.message.type === "success"
                ? TOKENS.outlineGhost
                : `color-mix(in srgb, ${ERROR_SOFT} 35%, transparent)`,
            color: p.message.type === "success" ? TOKENS.primary : ERROR_SOFT,
          }}
        >
          {p.message.text}
        </div>
      ) : null}

      <InvestmentSummarySection
        totalHoldings={p.totalHoldings}
        portfolioMarkValue={p.portfolioMarkValue}
        portfolioGains={p.portfolioGains}
        dividendYtd={p.dividendYtd}
        dividendAllTime={p.dividendAllTime}
        lastUpdated={p.lastUpdated}
        totalInvested={p.totalInvested}
        totalCash={p.totalCash}
        formatCurrency={p.formatCurrency}
        onLogDividend={openDividend}
        onAddInvestment={openLog}
      />

      <InvestmentChartRiskSection
        chartSubtitle={p.chartSubtitle}
        chartRange={p.chartRange}
        onChartRangeChange={p.setChartRange}
        portfolioChartData={p.portfolioChartData}
        formatCurrency={p.formatCurrency}
        liquidityPct={p.liquidityPct}
        concentrationStdev={p.concentrationStdev}
        sovereignInsight={p.sovereignInsight}
        loadingMarketPrices={p.loadingMarketPrices}
        onRefreshPrices={() => void p.fetchMarketPrices()}
      />

      <InvestmentSleevesSection
        topHoldingsList={p.topHoldingsList}
        totalInvested={p.totalInvested}
        totalCash={p.totalCash}
        portfolioMarkValue={p.portfolioMarkValue}
        accounts={p.accounts}
        formatCurrency={p.formatCurrency}
        onViewAnalytics={() => p.setPanelMode("analytics")}
        onAddPosition={openLog}
      />

      <InvestmentHoldingsSection
        accounts={p.accounts}
        searchQuery={p.searchQuery}
        marketPrices={p.marketPrices}
        formatCurrency={p.formatCurrency}
      />

      <InvestmentPanelToolbar
        searchQuery={p.searchQuery}
        onSearchQueryChange={p.setSearchQuery}
        panelMode={p.panelMode}
        onPanelModeChange={p.setPanelMode}
      />

      {p.panelMode === "analytics" ? (
        <InvestmentAnalyticsSection
          rows={p.allocationBySymbol.rows}
          total={p.allocationBySymbol.total}
          formatCurrency={p.formatCurrency}
        />
      ) : (
        <InvestmentReportsSection
          rows={p.filteredRecentActivity.slice(0, 12)}
          formatCurrency={p.formatCurrency}
        />
      )}

      <InvestmentLogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        accounts={p.accounts}
        formatCurrency={p.formatCurrency}
        submitting={p.submitting}
        onSubmit={submitLog}
        fieldErrors={p.fieldErrors}
        selectedInvestmentAccountId={p.selectedInvestmentAccountId}
        onAccountChange={(id) => {
          p.setSelectedInvestmentAccountId(id)
          p.clearFieldError("logAccount")
        }}
        investmentSearchRef={p.investmentSearchRef}
        investmentMarket={p.investmentMarket}
        onMarketChange={p.setInvestmentMarket}
        investmentSearchQuery={p.investmentSearchQuery}
        investmentName={p.investmentName}
        onQueryChange={(q, n) => {
          p.setInvestmentSearchQuery(q)
          p.setInvestmentName(n)
          p.clearFieldError("logInvestment")
        }}
        investmentSearchResults={p.investmentSearchResults}
        investmentSearchLoading={p.investmentSearchLoading}
        showInvestmentDropdown={p.showInvestmentDropdown}
        onDropdownOpenChange={p.setShowInvestmentDropdown}
        onSelectSymbol={(symbol) => {
          p.setInvestmentName(symbol)
          p.setInvestmentSearchQuery(symbol)
          p.setShowInvestmentDropdown(false)
          p.clearFieldError("logInvestment")
        }}
        pricePerUnit={p.pricePerUnit}
        onPricePerUnitChange={(v) => {
          p.setPricePerUnit(v)
          p.clearFieldError("logPrice")
        }}
        numberOfShares={p.numberOfShares}
        onNumberOfSharesChange={(v) => {
          p.setNumberOfShares(v)
          p.clearFieldError("logShares")
        }}
        brokerageFee={p.brokerageFee}
        onBrokerageFeeChange={p.setBrokerageFee}
        date={p.date}
        onDateChange={(v) => {
          p.setDate(v)
          p.clearFieldError("logDate")
        }}
        calculatedTotal={p.calculatedTotal}
      />

      <InvestmentDividendDialog
        open={dividendOpen}
        onOpenChange={setDividendOpen}
        accounts={p.accounts}
        formatCurrency={p.formatCurrency}
        submitting={p.submittingDividend}
        onSubmit={submitDividend}
        fieldErrors={p.fieldErrors}
        dividendAccountId={p.dividendAccountId}
        onAccountChange={(id) => {
          p.setDividendAccountId(id)
          p.clearFieldError("divAccount")
        }}
        dividendSymbol={p.dividendSymbol}
        onSymbolChange={(v) => {
          p.setDividendSymbol(v)
          p.clearFieldError("divSymbol")
        }}
        dividendSymbolOptions={p.dividendSymbolOptions}
        dividendAmount={p.dividendAmount}
        onAmountChange={(v) => {
          p.setDividendAmount(v)
          p.clearFieldError("divAmount")
        }}
        dividendDate={p.dividendDate}
        onDateChange={(v) => {
          p.setDividendDate(v)
          p.clearFieldError("divDate")
        }}
      />
    </div>
  )
}
