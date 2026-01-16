import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ExpensesSkeleton() {
  return (
    <>
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
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

      {/* Expenses List Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-64 mb-1" />
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-5 w-28 rounded" />
                  </div>
                </div>
                <div className="text-right mr-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                </div>
                <Skeleton className="h-9 w-9 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
