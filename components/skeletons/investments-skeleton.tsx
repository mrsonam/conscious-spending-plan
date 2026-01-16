import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function InvestmentsSkeleton() {
  return (
    <>
      {/* Create Investment Form Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-36 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - 3 cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section - 2 charts side by side */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Account Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded" />
          </CardContent>
        </Card>

        {/* Investment Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-36" />
            </div>
            <Skeleton className="h-4 w-44 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Share Allocation Pie Chart - Full width */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-36" />
          </div>
          <Skeleton className="h-4 w-56 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded" />
        </CardContent>
      </Card>

      {/* Top Holdings Bar Chart - Full width */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded" />
        </CardContent>
      </Card>

      {/* Investment Accounts Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-20 mb-3" />
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
