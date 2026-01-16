import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20 mb-3" />
            <div className="space-y-1 mb-3">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ChartsSkeleton() {
  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-56 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-52" />
          </div>
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded" />
        </CardContent>
      </Card>
    </div>
  )
}

export function CategoryDetailsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="p-3 rounded-lg bg-gray-50">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function RecentExpensesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
