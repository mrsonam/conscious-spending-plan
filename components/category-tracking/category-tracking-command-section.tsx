"use client"

import { Calendar, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppSelect } from "@/components/ui/app-select"
import { CategoryTrackingTransferTrigger } from "@/components/category-tracking/category-tracking-bucket-transfer-dialog"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  CATEGORY_TRACKING_PERIOD_ID,
  categoryTrackingConsoleField,
} from "@/components/category-tracking/category-tracking-console-ui"

type MonthOption = { value: string; label: string }

type CategoryTrackingCommandSectionProps = {
  monthOptions: MonthOption[]
  selectedMonth: number
  selectedYear: number
  setSelectedMonth: (m: number) => void
  setSelectedYear: (y: number) => void
  refreshing: boolean
  isCurrentMonth: boolean
  onOpenTransfer: () => void
}

export function CategoryTrackingCommandSection({
  monthOptions,
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
  refreshing,
  isCurrentMonth,
  onOpenTransfer,
}: CategoryTrackingCommandSectionProps) {
  return (
    <section className="lg:col-span-5">
      <div
        className="rounded-xl border p-5 sm:p-6 lg:sticky lg:top-4"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Command surface
        </p>
        <p className="mt-3 text-sm leading-snug" style={{ color: TOKENS.onSurfaceMuted }}>
          Select the statement month, then route spend or adjust envelopes. Fund weights live in
          settings.
        </p>

        <div
          className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" style={{ color: TOKENS.onSurfaceMuted }} />
            <span id="ct-period-label">Period</span>
          </div>
          {refreshing ? (
            <span
              className="inline-flex items-center gap-1.5 normal-case tracking-normal"
              style={{ color: TOKENS.secondary }}
              aria-live="polite"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
              Syncing
            </span>
          ) : null}
        </div>
        <div className="mt-2">
          <label htmlFor={CATEGORY_TRACKING_PERIOD_ID} className="sr-only">
            Statement period
          </label>
          <AppSelect
            id={CATEGORY_TRACKING_PERIOD_ID}
            aria-labelledby="ct-period-label"
            value={`${selectedYear}-${selectedMonth}`}
            onValueChange={(v) => {
              const [y, m] = v.split("-").map(Number)
              setSelectedYear(y)
              setSelectedMonth(m)
            }}
           
            className={cn(categoryTrackingConsoleField, "mt-1 border-transparent")}
            style={{
              backgroundColor: TOKENS.surfaceLow,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
            options={monthOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
        </div>

        <CategoryTrackingTransferTrigger
          disabled={!isCurrentMonth}
          disabledReason={
            isCurrentMonth
              ? undefined
              : "Switch to the current month to move funds between buckets."
          }
          onOpen={onOpenTransfer}
        />
      </div>
    </section>
  )
}
