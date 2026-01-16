import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  )
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
