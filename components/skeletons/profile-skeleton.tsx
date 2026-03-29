import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar and name section */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Info fields section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
