import Link from "next/link"
import { BENTO } from "@/lib/app-routes"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"

export function ConsoleEmptyState() {
  return (
    <div
      className="rounded-xl p-10 text-center"
      style={{ background: TOKENS.surfaceContainer }}
    >
      <p className="text-lg font-medium">No allocation data</p>
      <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
        Add income for the current month to see your Conscious Spending Plan.
      </p>
      <Link
        href={BENTO.income}
        className={cn(
          consoleFocus,
          "mt-8 inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold",
        )}
        style={{
          background: TOKENS.primary,
          color: TOKENS.surface,
        }}
      >
        Go to Income
      </Link>
    </div>
  )
}
