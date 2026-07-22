"use client"

import { Banknote } from "lucide-react"
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
import type { InvestmentAccountSummary } from "@/components/investments/investment-shared"
import type { InvestmentFieldErrors } from "@/hooks/use-investments-page"

type InvestmentDividendDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: InvestmentAccountSummary[]
  formatCurrency: (amount: number) => string
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  fieldErrors: InvestmentFieldErrors
  dividendAccountId: string
  onAccountChange: (id: string) => void
  dividendSymbol: string
  onSymbolChange: (v: string) => void
  dividendSymbolOptions: string[]
  dividendAmount: string
  onAmountChange: (v: string) => void
  dividendDate: string
  onDateChange: (v: string) => void
}

export function InvestmentDividendDialog({
  open,
  onOpenChange,
  accounts,
  formatCurrency,
  submitting,
  onSubmit,
  fieldErrors,
  dividendAccountId,
  onAccountChange,
  dividendSymbol,
  onSymbolChange,
  dividendSymbolOptions,
  dividendAmount,
  onAmountChange,
  dividendDate,
  onDateChange,
}: InvestmentDividendDialogProps) {
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
              Record dividend income
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Cash dividends are credited to the selected brokerage account.
              Pick a holding you already own in that account.
            </DialogDescription>
          </DialogHeader>

          <form noValidate className="mt-6 space-y-5" onSubmit={onSubmit} inert={submitting}>
            <div>
              <label
                htmlFor="inv-div-account"
                className={investmentFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Investment account *
              </label>
              <AppSelect
                id="inv-div-account"
                value={dividendAccountId}
                onValueChange={onAccountChange}
               
                className={cn(investmentConsoleField, "border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                placeholder="Select account"
                {...investmentFieldAria("inv-div-account", fieldErrors.divAccount)}
                options={[
                  { value: "", label: "Select investment account" },
                  ...accounts.map((acc) => ({
                    value: acc.id,
                    label: `${acc.name} (${acc.bankName}) · Cash ${formatCurrency(acc.balance)}`,
                  })),
                ]}
              />
              <InvestmentFieldInlineError
                controlId="inv-div-account"
                message={fieldErrors.divAccount}
              />
            </div>

            <div>
              <label
                htmlFor="inv-div-symbol"
                className={investmentFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Holding *
              </label>
              <AppSelect
                id="inv-div-symbol"
                value={dividendSymbol}
                onValueChange={onSymbolChange}
                disabled={submitting || dividendSymbolOptions.length === 0}
                className={cn(investmentConsoleField, "border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                placeholder={
                  dividendSymbolOptions.length === 0
                    ? "No holdings in this account"
                    : "Select a holding"
                }
                {...investmentFieldAria("inv-div-symbol", fieldErrors.divSymbol)}
                options={[
                  { value: "", label: "Select a holding" },
                  ...dividendSymbolOptions.map((s) => ({
                    value: s,
                    label: s,
                  })),
                ]}
              />
              <InvestmentFieldInlineError
                controlId="inv-div-symbol"
                message={fieldErrors.divSymbol}
              />
              {dividendAccountId && dividendSymbolOptions.length === 0 ? (
                <p className="mt-1.5 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                  Log a purchase in this account before recording a dividend.
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="inv-div-amount"
                className={investmentFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Dividend amount *
              </label>
              <Input
                id="inv-div-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={dividendAmount}
                onChange={(e) => onAmountChange(e.target.value)}
                className={cn(investmentConsoleField, "border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                {...investmentFieldAria("inv-div-amount", fieldErrors.divAmount)}
              />
              <InvestmentFieldInlineError
                controlId="inv-div-amount"
                message={fieldErrors.divAmount}
              />
            </div>

            <div>
              <label
                htmlFor="inv-div-date"
                className={investmentFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Payment date *
              </label>
              <DateInput
                id="inv-div-date"
                value={dividendDate}
                onChange={(e) => onDateChange(e.target.value)}
                className={cn(investmentConsoleField, "border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                {...investmentFieldAria("inv-div-date", fieldErrors.divDate)}
              />
              <InvestmentFieldInlineError
                controlId="inv-div-date"
                message={fieldErrors.divDate}
              />
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
              <Banknote className="h-4 w-4" />
              {submitting ? "Saving…" : "Record dividend"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
