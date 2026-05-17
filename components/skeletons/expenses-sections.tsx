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

export function ExpensesListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-64 mb-1" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-5 w-28 rounded" />
                </div>
              </div>
              <div className="text-right mr-4">
                <Skeleton className="h-4 w-24 mb-2" />
              </div>
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Console loading shell for `/expenses` (summary + actions column). */
export function ExpensesPageLoadingSkeleton() {
  const sk = (className?: string) => cn("bg-white/[0.08]", className)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      <div className="lg:col-span-8 space-y-4">
        <ConsoleSkeletonBlock>
          <Skeleton className={sk("h-3 w-32")} />
          <Skeleton className={sk("mt-4 h-9 w-48")} />
          <Skeleton className={sk("mt-4 h-6 w-36")} />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className={sk("h-28 w-full rounded-xl")} />
            <Skeleton className={sk("h-28 w-full rounded-xl")} />
          </div>
        </ConsoleSkeletonBlock>
        <ConsoleSkeletonBlock>
          <Skeleton className={sk("h-3 w-40")} />
          <Skeleton className={sk("mt-4 h-6 w-64")} />
          <Skeleton className={sk("mt-6 h-52 w-full rounded-xl")} />
        </ConsoleSkeletonBlock>
      </div>
      <div className="lg:col-span-4">
        <ConsoleSkeletonBlock>
          <Skeleton className={sk("h-3 w-28")} />
          <Skeleton className={sk("mt-3 h-4 w-full")} />
          <Skeleton className={sk("mt-6 h-12 w-full rounded-xl")} />
          <Skeleton className={sk("mt-3 h-11 w-full rounded-xl")} />
        </ConsoleSkeletonBlock>
      </div>
    </div>
  )
}
