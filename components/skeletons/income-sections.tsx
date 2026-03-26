import type { ReactNode } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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

export function IncomeFormSkeleton({
  variant = "classic",
}: {
  variant?: "classic" | "console"
}) {
  const consoleSk = (className?: string) =>
    cn(variant === "console" ? "bg-white/[0.08]" : "bg-gray-200", className)

  if (variant === "console") {
    return (
      <ConsoleSkeletonBlock>
        <Skeleton className={consoleSk("h-3 w-24")} />
        <Skeleton className={consoleSk("mt-3 h-6 w-48")} />
        <Skeleton className={consoleSk("mt-2 h-4 w-full max-w-md")} />
        <div className="mt-6 space-y-4">
          <div>
            <Skeleton className={consoleSk("h-3 w-20 mb-2")} />
            <Skeleton className={consoleSk("h-11 w-full rounded-xl")} />
          </div>
          <div>
            <Skeleton className={consoleSk("h-3 w-28 mb-2")} />
            <Skeleton className={consoleSk("h-11 w-full rounded-xl")} />
          </div>
          <div>
            <Skeleton className={consoleSk("h-3 w-24 mb-2")} />
            <Skeleton className={consoleSk("h-11 w-full rounded-xl")} />
          </div>
          <Skeleton className={consoleSk("h-12 w-full rounded-xl")} />
        </div>
      </ConsoleSkeletonBlock>
    )
  }

  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div>
            <Skeleton className="h-4 w-36 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function IncomeHistorySkeleton({
  variant = "classic",
}: {
  variant?: "classic" | "console"
}) {
  const rowClass =
    variant === "console"
      ? "rounded-xl border p-4"
      : "p-4 rounded-lg border border-gray-200"

  const rowStyle =
    variant === "console"
      ? {
          background: TOKENS.surfaceLow,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }
      : undefined

  const consoleSk = (className?: string) =>
    cn(variant === "console" ? "bg-white/[0.08]" : "bg-gray-200", className)

  if (variant === "console") {
    return (
      <ConsoleSkeletonBlock>
        <Skeleton className={consoleSk("h-3 w-20")} />
        <Skeleton className={consoleSk("mt-3 h-6 w-40")} />
        <Skeleton className={consoleSk("mt-2 h-4 w-56")} />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={rowClass} style={rowStyle}>
              <Skeleton className={consoleSk("h-7 w-36 mb-2")} />
              <Skeleton className={consoleSk("h-4 w-48 mb-1")} />
              <Skeleton className={consoleSk("h-3 w-52")} />
            </div>
          ))}
        </div>
      </ConsoleSkeletonBlock>
    )
  }

  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-gray-200">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-4 w-56 mb-1" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
