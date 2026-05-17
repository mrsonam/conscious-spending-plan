import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { ScrambleCurrencyValue } from "@/components/ui/scramble-number"
import { SkeletonBlock } from "@/components/wealth-console/console-skeleton"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import type { DetailRow } from "@/components/wealth-console/types"

type IconComponent = React.ComponentType<{
  className?: string
  style?: React.CSSProperties
}>

export function DetailCard({
  title,
  total,
  icon: Icon,
  rows,
  accent,
  size = "default",
  detailHref,
}: {
  title: string
  total: number
  icon: IconComponent
  rows: DetailRow[]
  accent: string
  size?: "default" | "hero" | "compact"
  detailHref: string
}) {
  const { formatCurrency } = useFormatCurrency()
  const isHero = size === "hero"
  const isCompact = size === "compact"

  return (
    <div
      className={`rounded-xl ${isHero ? "p-6 sm:p-7" : isCompact ? "p-4 sm:p-5" : "p-5"}`}
      style={{
        background: TOKENS.surfaceContainer,
        boxShadow: CARD_INSET,
      }}
    >
      <div className={`flex items-start justify-between gap-3 ${isHero ? "mb-5" : "mb-4"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg ${isHero ? "h-12 w-12" : isCompact ? "h-9 w-9" : "h-10 w-10"}`}
            style={{ background: TOKENS.surfaceLow, color: accent }}
          >
            <Icon className={isHero ? "h-6 w-6" : isCompact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
          <div className="min-w-0">
            <p
              className={`font-semibold uppercase tracking-wider ${isHero ? "text-[11px] tracking-[0.15em]" : "text-[10px]"}`}
              style={{ color: TOKENS.onSurfaceMutedElevated }}
            >
              {title}
            </p>
            <div
              className={`tabular-nums tracking-tight ${isHero ? "mt-2 text-xl sm:text-2xl" : isCompact ? "mt-1 text-base" : "mt-1 text-lg"}`}
            >
              <MajorFigureCurrency
                amount={total}
                variant="neutral"
                decimalEm={isCompact ? 0.52 : 0.5}
                className={
                  isHero ? "" : isCompact ? "font-bold!" : "font-semibold!"
                }
              />
            </div>
          </div>
        </div>
        <Link
          href={detailHref}
          className={cn(
            consoleFocus,
            "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/5",
          )}
          style={{ color: TOKENS.onSurfaceMuted }}
          aria-label={`View ${title} details`}
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className={`space-y-2 ${isCompact ? "text-[13px]" : ""}`}>
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            No line items this month
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[1fr_auto] gap-3 text-sm leading-tight"
            >
              <span className="truncate" style={{ color: TOKENS.onSurfaceMuted }}>
                {r.label}
              </span>
              <span
                className="text-right tabular-nums font-medium"
                style={{ color: TOKENS.onSurface }}
              >
                {formatCurrency(r.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function DetailCardSkeleton({
  title,
  icon: Icon,
  accent,
  size = "default",
}: {
  title: string
  icon: IconComponent
  accent: string
  size?: "default" | "hero" | "compact"
}) {
  const isHero = size === "hero"
  const isCompact = size === "compact"

  return (
    <div
      className={`rounded-xl ${isHero ? "p-6 sm:p-7" : isCompact ? "p-4 sm:p-5" : "p-5"}`}
      style={{
        background: TOKENS.surfaceContainer,
        boxShadow: CARD_INSET,
      }}
    >
      <div className={`flex items-start justify-between gap-3 ${isHero ? "mb-5" : "mb-4"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg ${isHero ? "h-12 w-12" : isCompact ? "h-9 w-9" : "h-10 w-10"}`}
            style={{ background: TOKENS.surfaceLow, color: accent }}
          >
            <Icon className={isHero ? "h-6 w-6" : isCompact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
          <div className="min-w-0">
            <p
              className={`font-semibold uppercase tracking-wider ${isHero ? "text-[11px] tracking-[0.15em]" : "text-[10px]"}`}
              style={{ color: TOKENS.onSurfaceMutedElevated }}
            >
              {title}
            </p>
            <div
              className={`tabular-nums tracking-tight ${isHero ? "mt-2 text-xl sm:text-2xl" : isCompact ? "mt-1 text-base" : "mt-1 text-lg"}`}
            >
              <ScrambleCurrencyValue
                min={300}
                max={3200}
                className={isHero ? "" : isCompact ? "font-bold!" : "font-semibold!"}
              />
            </div>
          </div>
        </div>
        <SkeletonBlock className="h-7 w-7 rounded-md" />
      </div>
      <div className={`space-y-2 ${isCompact ? "text-[13px]" : ""}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_auto] gap-3 text-sm leading-tight"
          >
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-20 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  )
}
