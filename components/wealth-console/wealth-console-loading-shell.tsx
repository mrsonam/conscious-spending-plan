import { Header } from "@/components/layout/header"
import { Skeleton } from "@/components/ui/skeleton"
import { TOKENS } from "@/lib/wealth-console-tokens"

/** Shown while NextAuth session resolves so the dashboard route is not a blank screen. */
export function WealthConsoleLoadingShell() {
  return (
    <div
      className="pb-10"
      style={{ background: TOKENS.surface, color: TOKENS.onSurface }}
      aria-busy="true"
    >
      <p role="status" className="sr-only">
        Loading Wealth Console
      </p>
      <Header
        title="Wealth Console"
        description="Monthly flow, allocation, and balances in one view."
        variant="console"
      />
      <div className="mx-auto max-w-7xl space-y-6 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-10 w-40 max-w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[280px] w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
