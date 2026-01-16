import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-lg" />
        <div className="flex gap-4 mt-4 justify-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

export function PieChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <Skeleton className="h-[250px] w-[250px] rounded-full" />
        </div>
        <div className="flex gap-4 mt-4 justify-center flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
