import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Header */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
