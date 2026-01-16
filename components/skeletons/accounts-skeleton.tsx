import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AccountsSkeleton() {
  return (
    <>
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Account cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-5 w-24 rounded" />
                </div>
                <div>
                  <Skeleton className="h-3 w-28 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
