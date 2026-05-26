import { cn } from "@/lib/utils"

/** Use `<span>` so skeletons can be nested inside `<p>` / inline runs without invalid DOM (div-in-p). */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("skeleton-base skeleton-console inline-block rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
