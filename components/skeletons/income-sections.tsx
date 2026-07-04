import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

function ConsoleSkeletonBlock({ children }: { children: ReactNode }) {
  return (
    <section
      className="rounded-xl border p-6 sm:p-8"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      {children}
    </section>
  )
}

const CONSOLE_ROW_STYLE = {
  background: TOKENS.surfaceLow,
  borderColor: TOKENS.outlineGhost,
  boxShadow: CARD_INSET,
} as const

const LEDGER_TITLE_WIDTHS = ["w-[42%]", "w-[55%]", "w-[38%]", "w-[48%]", "w-[44%]"] as const

const consoleSk = (className?: string) =>
  cn("bg-white/[0.08]", className)

function IncomeLedgerConsoleRowSkeleton({ index }: { index: number }) {
  const titleWidth = LEDGER_TITLE_WIDTHS[index % LEDGER_TITLE_WIDTHS.length]
  const showSecondBadge = index % 3 !== 2

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      style={CONSOLE_ROW_STYLE}
      aria-hidden
    >
      <div className="min-w-0 flex-1 space-y-2.5">
        <Skeleton className={cn("block h-4 max-w-full rounded-md", titleWidth)} />
        <div className="flex flex-wrap items-center gap-1.5">
          <Skeleton className="block h-5 w-[4.5rem] rounded-full" />
          {showSecondBadge ? (
            <Skeleton className="block h-5 w-[5.75rem] rounded-full" />
          ) : null}
          <Skeleton className="block h-3 w-20 rounded-md" />
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <div className="space-y-2 sm:text-right">
          <Skeleton className="block h-6 w-[5.5rem] rounded-md sm:ml-auto" />
          <Skeleton className="block h-3 w-16 rounded-md sm:ml-auto" />
        </div>
        <Skeleton className="block h-9 w-9 shrink-0 rounded-lg" />
      </div>
    </div>
  )
}

function IncomeLedgerConsolePaginationSkeleton() {
  return (
    <div
      className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4"
      style={{ borderColor: TOKENS.outlineGhost }}
      aria-hidden
    >
      <Skeleton className="block h-3 w-36 rounded-md" />
      <div className="flex gap-2">
        <Skeleton className="block h-9 w-9 rounded-lg" />
        <Skeleton className="block h-9 w-9 rounded-lg" />
      </div>
    </div>
  )
}

function IncomeLedgerConsoleRows({
  rowCount,
  showPagination = true,
}: {
  rowCount: number
  showPagination?: boolean
}) {
  return (
    <>
      <div className="space-y-3">
        {Array.from({ length: rowCount }).map((_, index) => (
          <IncomeLedgerConsoleRowSkeleton key={index} index={index} />
        ))}
      </div>
      {showPagination ? <IncomeLedgerConsolePaginationSkeleton /> : null}
    </>
  )
}

export function IncomeFormSkeleton() {
  return (
    <ConsoleSkeletonBlock>
      <Skeleton className={consoleSk("h-3 w-24")} />
      <Skeleton className={consoleSk("mt-3 h-6 w-48")} />
      <Skeleton className={consoleSk("mt-2 h-4 w-full max-w-md")} />
      <div className="mt-6 space-y-4">
        <div>
          <Skeleton className={consoleSk("mb-2 h-3 w-20")} />
          <Skeleton className={consoleSk("h-11 w-full rounded-xl")} />
        </div>
        <div>
          <Skeleton className={consoleSk("mb-2 h-3 w-28")} />
          <Skeleton className={consoleSk("h-11 w-full rounded-xl")} />
        </div>
        <div>
          <Skeleton className={consoleSk("mb-2 h-3 w-24")} />
          <Skeleton className={consoleSk("h-11 w-full rounded-xl")} />
        </div>
        <Skeleton className={consoleSk("h-12 w-full rounded-xl")} />
      </div>
    </ConsoleSkeletonBlock>
  )
}

export function IncomeHistorySkeleton({
  layout = "section",
  rowCount = 4,
}: {
  /** `rows`, ledger body only (inside an existing section). `section`, full card shell. */
  layout?: "section" | "rows"
  rowCount?: number
}) {
  const rows = <IncomeLedgerConsoleRows rowCount={rowCount} showPagination />

  if (layout === "rows") {
    return rows
  }

  return (
    <ConsoleSkeletonBlock>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="block h-6 w-36 rounded-md" />
        <Skeleton className="block h-9 w-9 rounded-lg" />
      </div>
      <div className="mt-6">{rows}</div>
    </ConsoleSkeletonBlock>
  )
}
