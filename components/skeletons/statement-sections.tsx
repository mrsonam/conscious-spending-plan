import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function FilterCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TransactionsListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-40 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-24 rounded" />
                  </div>
                  <Skeleton className="h-4 w-64 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
