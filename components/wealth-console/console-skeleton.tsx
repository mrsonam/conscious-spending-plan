import { TOKENS } from "@/lib/wealth-console-tokens"

export function SkeletonBlock({
  className = "",
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: TOKENS.surfaceLow, ...style }}
    />
  )
}
