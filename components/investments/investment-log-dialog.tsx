"use client"

import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateInput } from "@/components/ui/date-input"
import { AppSelect } from "@/components/ui/app-select"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import {
  investmentConsoleField,
  investmentFieldAria,
  InvestmentFieldInlineError,
  investmentFieldLabelClass,
} from "@/components/investments/investment-console-ui"
import { InvestmentStockCombobox } from "@/components/investments/investment-stock-combobox"
import type { InvestmentAccountSummary } from "@/components/investments/investment-shared"
import type { InvestmentFieldErrors } from "@/hooks/use-investments-page"

type InvestmentLogDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: InvestmentAccountSummary[]
  formatCurrency: (amount: number) => string
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  fieldErrors: InvestmentFieldErrors
  selectedInvestmentAccountId: string
  onAccountChange: (id: string) => void
  investmentSearchRef: React.RefObject<HTMLDivElement | null>
  investmentMarket: "all" | "AU"
  onMarketChange: (market: "all" | "AU") => void
  investmentSearchQuery: string
  investmentName: string
  onQueryChange: (query: string, name: string) => void
  investmentSearchResults: Array<{ symbol: string; name: string }>
  investmentSearchLoading: boolean
  showInvestmentDropdown: boolean
  onDropdownOpenChange: (open: boolean) => void
  onSelectSymbol: (symbol: string) => void
  pricePerUnit: string
  onPricePerUnitChange: (v: string) => void
  numberOfShares: string
  onNumberOfSharesChange: (v: string) => void
  brokerageFee: string
  onBrokerageFeeChange: (v: string) => void
  date: string
  onDateChange: (v: string) => void
  calculatedTotal: string
}

export function InvestmentLogDialog({
  open,
  onOpenChange,
  accounts,
  formatCurrency,
  submitting,
  onSubmit,
  fieldErrors,
  selectedInvestmentAccountId,
  onAccountChange,
  investmentSearchRef,
  investmentMarket,
  onMarketChange,
  investmentSearchQuery,
  investmentName,
  onQueryChange,
  investmentSearchResults,
  investmentSearchLoading,
  showInvestmentDropdown,
  onDropdownOpenChange,
  onSelectSymbol,
  pricePerUnit,
  onPricePerUnitChange,
  numberOfShares,
  onNumberOfSharesChange,
  brokerageFee,
  onBrokerageFeeChange,
  date,
  onDateChange,
  calculatedTotal,
}: InvestmentLogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow:
            "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
        }}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
              Add investment
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Record a position purchase from an investment account.
            </DialogDescription>
          </DialogHeader>

          <form noValidate className="mt-6 space-y-5" onSubmit={onSubmit} inert={submitting}>
            <div>
              <label
                htmlFor="inv-log-account"
                className={investmentFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Account *
              </label>
              <AppSelect
                id="inv-log-account"
                value={selectedInvestmentAccountId}
                onValueChange={onAccountChange}
               
                className={cn(investmentConsoleField, "border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                placeholder="Select investment account"
                {...investmentFieldAria("inv-log-account", fieldErrors.logAccount)}
                options={[
                  { value: "", label: "Select investment account" },
                  ...accounts.map((acc) => ({
                    value: acc.id,
                    label: `${acc.name} (${acc.bankName}) · Cash ${formatCurrency(acc.balance)}`,
                  })),
                ]}
              />
              <InvestmentFieldInlineError
                controlId="inv-log-account"
                message={fieldErrors.logAccount}
              />
            </div>

            <InvestmentStockCombobox
              containerRef={investmentSearchRef}
              investmentMarket={investmentMarket}
              onMarketChange={onMarketChange}
              searchQuery={investmentSearchQuery}
              displayName={investmentName}
              onQueryChange={onQueryChange}
              results={investmentSearchResults}
              loading={investmentSearchLoading}
              open={showInvestmentDropdown}
              onOpenChange={onDropdownOpenChange}
              onSelect={onSelectSymbol}
              fieldError={fieldErrors.logInvestment}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="inv-log-price"
                  className={investmentFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Price per unit *
                </label>
                <Input
                  id="inv-log-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={pricePerUnit}
                  onChange={(e) => onPricePerUnitChange(e.target.value)}
                  className={cn(investmentConsoleField, "border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  {...investmentFieldAria("inv-log-price", fieldErrors.logPrice)}
                />
                <InvestmentFieldInlineError
                  controlId="inv-log-price"
                  message={fieldErrors.logPrice}
                />
              </div>
              <div>
                <label
                  htmlFor="inv-log-shares"
                  className={investmentFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Shares *
                </label>
                <Input
                  id="inv-log-shares"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={numberOfShares}
                  onChange={(e) => onNumberOfSharesChange(e.target.value)}
                  className={cn(investmentConsoleField, "border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  {...investmentFieldAria("inv-log-shares", fieldErrors.logShares)}
                />
                <InvestmentFieldInlineError
                  controlId="inv-log-shares"
                  message={fieldErrors.logShares}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="inv-log-brokerage"
                  className={investmentFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Brokerage (optional)
                </label>
                <Input
                  id="inv-log-brokerage"
                  type="number"
                  min="0"
                  step="0.01"
                  value={brokerageFee}
                  onChange={(e) => onBrokerageFeeChange(e.target.value)}
                  className={cn(investmentConsoleField, "border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="inv-log-date"
                  className={investmentFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Date *
                </label>
                <DateInput
                  id="inv-log-date"
                  value={date}
                  onChange={(e) => onDateChange(e.target.value)}
                  className={cn(investmentConsoleField, "border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  {...investmentFieldAria("inv-log-date", fieldErrors.logDate)}
                />
                <InvestmentFieldInlineError
                  controlId="inv-log-date"
                  message={fieldErrors.logDate}
                />
              </div>
            </div>

            <div
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
            >
              <p
                className={investmentFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Calculated total
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                {calculatedTotal ? formatCurrency(Number(calculatedTotal)) : "—"}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-50",
                consoleFocus,
              )}
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              <Plus className="h-4 w-4" />
              {submitting ? "Saving…" : "Create investment"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
