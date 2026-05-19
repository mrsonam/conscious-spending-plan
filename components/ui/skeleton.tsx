import { cn } from "@/lib/utils"

/** Use `<span>` so skeletons can be nested inside `<p>` / inline runs without invalid DOM (div-in-p). */
function Skeleton({
  className,
  variant = "classic",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "classic" | "console"
}) {
  return (
    <span
      className={cn(
        "skeleton-base inline-block rounded-md",
        variant === "console" && "skeleton-console",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
