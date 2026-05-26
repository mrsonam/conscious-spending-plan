"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"

const LOGO_SRC = "/icon.svg"
const LOGO_ALT = "Conscious Spending Plan"

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
} as const

export type CspBrandMarkProps = {
  /** Link target; omit for non-interactive brand (e.g. decorative). */
  href?: string
  size?: keyof typeof sizeClasses
  className?: string
  /** Eyebrow above title (sidebar: Wealth Console). */
  eyebrow?: string
  /** full = Conscious Spending Plan, short = CSP, responsive = CSP on xs / full on sm+ */
  wordmark?: "none" | "short" | "full" | "responsive"
  titleClassName?: string
  onClick?: () => void
}

export function CspBrandMark({
  href = "/",
  size = "md",
  className,
  eyebrow,
  wordmark = "responsive",
  titleClassName,
  onClick,
}: CspBrandMarkProps) {
  const logo = (
    <img
      src={LOGO_SRC}
      alt=""
      className={cn("shrink-0 object-contain", sizeClasses[size])}
      width={size === "lg" ? 44 : size === "md" ? 36 : 32}
      height={size === "lg" ? 44 : size === "md" ? 36 : 32}
      decoding="async"
    />
  )

  const wordmarkBlock =
    wordmark === "none" ? null : (
      <div className="min-w-0 pt-0.5">
        {eyebrow ? (
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            {eyebrow}
          </p>
        ) : null}
        {wordmark === "short" ? (
          <p
            className={cn(
              "text-lg font-semibold leading-none tracking-tight",
              titleClassName,
            )}
            style={{ color: TOKENS.onSurface }}
          >
            CSP
          </p>
        ) : wordmark === "full" ? (
          <p
            className={cn(
              "text-sm font-semibold leading-tight tracking-tight sm:text-base",
              titleClassName,
            )}
            style={{ color: TOKENS.onSurface }}
          >
            Conscious Spending Plan
          </p>
        ) : (
          <>
            <p
              className={cn(
                "text-sm font-semibold leading-tight tracking-tight sm:hidden",
                titleClassName,
              )}
              style={{ color: TOKENS.onSurface }}
            >
              CSP
            </p>
            <p
              className={cn(
                "hidden text-sm font-semibold leading-tight tracking-tight sm:block",
                titleClassName,
              )}
              style={{ color: TOKENS.onSurface }}
            >
              Conscious Spending Plan
            </p>
          </>
        )}
      </div>
    )

  const inner = (
    <>
      {logo}
      {wordmarkBlock}
    </>
  )

  const rootClass = cn(
    "group flex min-h-11 min-w-11 cursor-pointer items-center gap-2.5 rounded-lg transition-opacity hover:opacity-90",
    className,
  )

  if (!href) {
    return (
      <span className={cn("flex items-center gap-2.5", className)} aria-label={LOGO_ALT}>
        <span className="sr-only">{LOGO_ALT}</span>
        {inner}
      </span>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={rootClass}
      aria-label={`${LOGO_ALT} home`}
    >
      {inner}
    </Link>
  )
}

/** Logo tile with inset well (landing / marketing). */
export function CspBrandLogoWell({
  className,
  size = "md",
}: {
  className?: string
  size?: keyof typeof sizeClasses
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
        sizeClasses[size],
        className,
      )}
      style={{
        background: TOKENS.surfaceContainer,
        boxShadow: CARD_INSET,
      }}
    >
      <img
        src={LOGO_SRC}
        alt=""
        className="h-[85%] w-[85%] object-contain"
        width={32}
        height={32}
        decoding="async"
      />
    </span>
  )
}
