"use client"

import { Trash2 } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"

type InvestmentDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  holdingName: string
  amount: number
  formatCurrency: (amount: number) => string
  submitting: boolean
  onConfirm: () => void
}

export function InvestmentDeleteDialog({
  open,
  onOpenChange,
  holdingName,
  amount,
  formatCurrency,
  submitting,
  onConfirm,
}: InvestmentDeleteDialogProps) {
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
              Delete purchase
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Are you sure you want to delete this{" "}
              <span className="font-semibold" style={{ color: TOKENS.secondary }}>
                {holdingName}
              </span>{" "}
              purchase of{" "}
              <span className="font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                {formatCurrency(amount)}
              </span>
              ? The funds will be returned to the account balance.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em]",
                consoleFocus,
              )}
              style={{
                background: TOKENS.surfaceLow,
                color: TOKENS.onSurface,
                border: `1px solid ${TOKENS.outlineGhost}`,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onConfirm}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-50",
                consoleFocus,
              )}
              style={{
                background: ERROR_SOFT,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              <Trash2 className="h-4 w-4" />
              {submitting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
