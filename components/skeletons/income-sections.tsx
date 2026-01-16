import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function IncomeFormSkeleton() {
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

export function IncomeHistorySkeleton() {
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
