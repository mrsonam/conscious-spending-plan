"use client"

import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"
import { CspBrandMark } from "@/components/brand/csp-brand-mark"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { landingFocus } from "@/components/landing/landing-ui"

export type AppNavbarVariant = "console" | "landing"

export function AppNavbar({
  variant = "console",
  homeHref = "/",
  trailing,
  className,
  brandWordmark = "responsive",
  maxWidth = "7xl",
}: {
  variant?: AppNavbarVariant
  homeHref?: string
  trailing?: ReactNode
  className?: string
  brandWordmark?: "none" | "short" | "full" | "responsive"
  maxWidth?: "6xl" | "7xl" | "full"
}) {
  const isLanding = variant === "landing"

  return (
    <header
      className={cn(
        "sticky top-0 z-50 shrink-0 border-b px-4 py-3 sm:px-6",
        className,
      )}
      style={{
        borderColor: TOKENS.outlineGhost,
        backgroundColor: isLanding
          ? "rgba(11, 19, 38, 0.92)"
          : `color-mix(in srgb, ${TOKENS.surface} 96%, transparent)`,
      }}
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between gap-4",
          maxWidth === "6xl" && "max-w-6xl",
          maxWidth === "7xl" && "max-w-7xl",
          maxWidth === "full" && "w-full",
        )}
      >
        <CspBrandMark href={homeHref} size="md" wordmark={brandWordmark} />
        {trailing ? (
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
            {trailing}
          </nav>
        ) : null}
      </div>
    </header>
  )
}

type AppNavbarLinkProps = ComponentProps<typeof Link> & {
  variant?: AppNavbarVariant
}

export function AppNavbarLink({
  className,
  variant = "console",
  children,
  ...props
}: AppNavbarLinkProps) {
  const isLanding = variant === "landing"

  return (
    <Link
      className={cn(
        "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium",
        "transition-[background-color,opacity] duration-150 ease-out",
        "hover:bg-white/5 active:bg-white/[0.07]",
        (isLanding || variant === "console") && landingFocus,
        className,
      )}
      style={{
        color: isLanding ? TOKENS.onSurfaceMutedElevated : TOKENS.onSurfaceMuted,
      }}
      {...props}
    >
      {children}
    </Link>
  )
}

export function AppNavbarCta({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold",
        "transition-opacity duration-150 ease-out hover:opacity-90",
        landingFocus,
        className,
      )}
      style={{
        background: TOKENS.primary,
        color: TOKENS.surface,
      }}
      {...props}
    >
      {children}
    </Link>
  )
}
