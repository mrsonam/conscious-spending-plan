"use client"

import { useMemo, useState } from "react"
import { ArrowRightLeft, Loader2 } from "lucide-react"

import { AppSelect } from "@/components/ui/app-select"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import { categoryTrackingConsoleField } from "@/components/category-tracking/category-tracking-console-ui"
import {
  TRACKING_FUND_CATEGORIES,
  netPillarHeadroom,
  type CategoryTrackingRow,
  type TrackingFundKey,
} from "@/lib/category-tracking-shared"
import {
  computeMaxTransferFromBucketMinor,
  isFundCategory,
} from "@/lib/category-bucket-transfer-shared"
import { tryParseMoneyInput } from "@/lib/money-input"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { dollarsToMinor, minorToDollars } from "@/lib/money"
import type { FundCategory } from "@/lib/fund-allocation-fields"

const modalShellStyle = {
  background: TOKENS.surfaceContainer,
  borderColor: TOKENS.outlineGhost,
  boxShadow:
    "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
} as const

const fieldStyle = {
  backgroundColor: TOKENS.surfaceLow,
  borderColor: TOKENS.outlineGhost,
  color: TOKENS.onSurface,
} as const

const labelClass = "text-[10px] font-semibold uppercase tracking-wider"

type CategoryTrackingBucketTransferDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tracking: Record<string, CategoryTrackingRow>
  savingsGeneralAvailable: number
  formatCurrency: (amount: number) => string
  currencyCode: string
  submitting?: boolean
  formError: string | null
  onSubmit: (payload: {
    fromCategory: FundCategory
    toCategory: FundCategory
    amount: number
  }) => Promise<void>
}

function maxTransferForSource(
  source: FundCategory,
  tracking: Record<string, CategoryTrackingRow>,
  savingsGeneralAvailable: number,
  currencyCode: string
): number {
  const row = tracking[source]
  if (!row) return 0
  const headroomMinor = dollarsToMinor(netPillarHeadroom(row), currencyCode)
  const savingsGeneralMinor =
    source === "savings" ? dollarsToMinor(savingsGeneralAvailable, currencyCode) : undefined
  const maxMinor = computeMaxTransferFromBucketMinor(
    source,
    headroomMinor,
    savingsGeneralMinor
  )
  return minorToDollars(maxMinor, currencyCode)
}

export function CategoryTrackingBucketTransferDialog({
  open,
  onOpenChange,
  tracking,
  savingsGeneralAvailable,
  formatCurrency,
  currencyCode,
  submitting = false,
  formError,
  onSubmit,
}: CategoryTrackingBucketTransferDialogProps) {
  const [fromCategory, setFromCategory] = useState<FundCategory>("savings")
  const [toCategory, setToCategory] = useState<FundCategory>("guiltFreeSpending")
  const [amount, setAmount] = useState("")

  const categoryOptions = useMemo(
    () =>
      TRACKING_FUND_CATEGORIES.map((c) => ({
        value: c.key,
        label: c.label,
      })),
    []
  )

  const toOptions = useMemo(
    () => categoryOptions.filter((o) => o.value !== fromCategory),
    [categoryOptions, fromCategory]
  )

  const maxTransfer = useMemo(
    () => maxTransferForSource(fromCategory, tracking, savingsGeneralAvailable, currencyCode),
    [fromCategory, tracking, savingsGeneralAvailable, currencyCode]
  )

  const handleFromChange = (value: string) => {
    if (!isFundCategory(value)) return
    setFromCategory(value)
    if (value === toCategory) {
      const fallback = categoryOptions.find((o) => o.value !== value)
      if (fallback && isFundCategory(fallback.value)) {
        setToCategory(fallback.value)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = tryParseMoneyInput(amount, currencyCode)
    if (parsed == null || parsed <= 0) return
    await onSubmit({ fromCategory, toCategory, amount: parsed })
  }

  const fromMeta = TRACKING_FUND_CATEGORIES.find((c) => c.key === fromCategory)
  const toMeta = TRACKING_FUND_CATEGORIES.find((c) => c.key === toCategory)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl sm:max-w-md"
        style={modalShellStyle}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
              Transfer between buckets
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Move unspent envelope headroom from one pillar to another. Total deployable balance
              stays the same, you are reallocating within your plan.
            </DialogDescription>
          </DialogHeader>

          <form
            noValidate
            className="mt-6 space-y-5"
            onSubmit={(e) => void handleSubmit(e)}
            inert={submitting}
          >
            <FormErrorAlert error={formError} />

            <fieldset disabled={submitting} className="min-w-0 space-y-5 border-0 p-0">
              <div>
                <Label htmlFor="bucket-from" className={labelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  From *
                </Label>
                <AppSelect
                  id="bucket-from"
                  value={fromCategory}
                  onValueChange={handleFromChange}
                  options={categoryOptions}
                  className={cn(categoryTrackingConsoleField, "mt-1 border-transparent")}
                  style={fieldStyle}
                />
                <p className="mt-1.5 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                  {formatCurrency(maxTransfer)} available
                  {fromCategory === "savings" ? " (after saving goals)" : ""}
                </p>
              </div>

              <div>
                <Label htmlFor="bucket-to" className={labelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  To *
                </Label>
                <AppSelect
                  id="bucket-to"
                  value={toCategory}
                  onValueChange={(v) => isFundCategory(v) && setToCategory(v)}
                  options={toOptions}
                  className={cn(categoryTrackingConsoleField, "mt-1 border-transparent")}
                  style={fieldStyle}
                />
              </div>

              <div>
                <Label htmlFor="bucket-amount" className={labelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Amount *
                </Label>
                <Input
                  id="bucket-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting}
                  className={cn(categoryTrackingConsoleField, "mt-1 border-transparent")}
                  style={fieldStyle}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>
            </fieldset>

            {fromMeta && toMeta ? (
              <div
                className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  background: TOKENS.surfaceLow,
                  boxShadow: CARD_INSET,
                }}
              >
                <span style={{ color: fromMeta.colorHex }}>{fromMeta.short}</span>
                <ArrowRightLeft className="h-4 w-4 shrink-0" style={{ color: TOKENS.onSurfaceMuted }} aria-hidden />
                <span style={{ color: toMeta.colorHex }}>{toMeta.short}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || maxTransfer <= 0}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-opacity duration-200 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: TOKENS.primary, color: TOKENS.surface }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Transferring…
                </>
              ) : (
                "Transfer funds"
              )}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type CategoryTrackingTransferTriggerProps = {
  disabled?: boolean
  disabledReason?: string
  onOpen: () => void
}

export function CategoryTrackingTransferTrigger({
  disabled,
  disabledReason,
  onOpen,
}: CategoryTrackingTransferTriggerProps) {
  return (
    <div className="mt-6 border-t pt-6" style={{ borderColor: TOKENS.outlineGhost }}>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        Envelope moves
      </p>
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        style={{
          borderColor: `color-mix(in srgb, ${TOKENS.primary} 35%, transparent)`,
          color: TOKENS.primary,
          background: `color-mix(in srgb, ${TOKENS.primary} 8%, ${TOKENS.surfaceLow})`,
        }}
      >
        <ArrowRightLeft className="h-4 w-4 shrink-0" aria-hidden />
        Transfer between buckets
      </button>
      {disabled && disabledReason ? (
        <p className="mt-2 text-[11px] leading-snug" style={{ color: TOKENS.onSurfaceMuted }}>
          {disabledReason}
        </p>
      ) : null}
    </div>
  )
}

export function computeSourceMaxTransfer(
  source: TrackingFundKey,
  tracking: Record<string, CategoryTrackingRow>,
  savingsGeneralAvailable: number,
  currencyCode: string
): number {
  if (!isFundCategory(source)) return 0
  return maxTransferForSource(source, tracking, savingsGeneralAvailable, currencyCode)
}
