import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function FundsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Fund fields grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Radio buttons */}
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  {/* Value input */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 flex-1" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    {/* Cap input */}
                    <div>
                      <Skeleton className="h-3 w-32 mb-2" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                      <Skeleton className="h-3 w-64 mt-1" />
                    </div>
                    {/* Balance info */}
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <Skeleton className="h-3 w-32 mb-1" />
                      <Skeleton className="h-3 w-28 mb-2" />
                      <Skeleton className="h-2 w-full rounded-full" />
                      <Skeleton className="h-3 w-24 mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Save button */}
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
