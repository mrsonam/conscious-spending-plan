import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Category Tracking */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
