import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"

export function ProfileSkeleton({
  variant = "classic",
}: {
  variant?: "classic" | "console"
}) {
  const isConsole = variant === "console"

  return (
    <Card
      className={cn(isConsole && "border-0 text-[#dae2fd] shadow-none")}
      style={
        isConsole
          ? {
              background: TOKENS.surfaceContainer,
              border: `1px solid ${TOKENS.outlineGhost}`,
            }
          : undefined
      }
    >
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div>
            <Skeleton className="mb-2 h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        <div
          className={cn(
            "space-y-4 border-t pt-4",
            isConsole && "border-[rgba(218,226,253,0.12)]"
          )}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <div>
              <Skeleton className="mb-1 h-4 w-16" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <div>
              <Skeleton className="mb-1 h-4 w-16" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
