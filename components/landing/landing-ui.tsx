import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

/** Focus ring via CSS vars on `.landing-page-root` (see globals.css). */
export const landingFocus = "landing-focus-visible"

export function SectionEyebrow({
  children,
  elevated = false,
}: {
  children: ReactNode
  elevated?: boolean
}) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-[0.22em]"
      style={{ color: elevated ? TOKENS.onSurfaceMutedElevated : TOKENS.onSurfaceMuted }}
    >
      {children}
    </p>
  )
}

export function SectionTitle({
  id,
  children,
  className,
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <h2
      id={id}
      className={cn(
        "mt-3 font-[family-name:var(--font-landing-display)] text-2xl font-semibold tracking-tight sm:text-3xl",
        className,
      )}
      style={{ color: TOKENS.onSurface }}
    >
      {children}
    </h2>
  )
}

type LandingLinkProps = ComponentProps<typeof Link>

export function LandingPrimaryLink({ className, children, ...props }: LandingLinkProps) {
  return (
    <Link
      className={cn(
        "landing-pressable inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
        landingFocus,
        className,
      )}
      style={{
        background: TOKENS.primary,
        color: TOKENS.surface,
        boxShadow: `inset 0 1px 0 0 rgba(218,226,253,0.06), 0 12px 28px rgba(0,0,0,0.25)`,
      }}
      {...props}
    >
      {children}
    </Link>
  )
}

export function LandingGhostLink({ className, children, ...props }: LandingLinkProps) {
  return (
    <Link
      className={cn(
        "landing-pressable landing-pressable-ghost inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-6 py-3 text-sm font-medium",
        "transition-[background-color] duration-150 ease-out hover:bg-white/5 active:bg-white/[0.07]",
        landingFocus,
        className,
      )}
      style={{
        borderColor: TOKENS.outlineGhost,
        color: TOKENS.onSurface,
      }}
      {...props}
    >
      {children}
    </Link>
  )
}

export function LandingNavLink({ className, children, ...props }: LandingLinkProps) {
  return (
    <Link
      className={cn(
        "landing-pressable inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium",
        "transition-[background-color] duration-150 ease-out hover:bg-white/5 active:bg-white/[0.07]",
        landingFocus,
        className,
      )}
      style={{ color: TOKENS.onSurfaceMutedElevated }}
      {...props}
    >
      {children}
    </Link>
  )
}

export function LandingNavCta({ className, children, ...props }: LandingLinkProps) {
  return (
    <Link
      className={cn(
        "landing-pressable inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold",
        landingFocus,
        className,
      )}
      style={{
        background: TOKENS.primary,
        color: TOKENS.surface,
        boxShadow: CARD_INSET,
      }}
      {...props}
    >
      {children}
    </Link>
  )
}

export function LandingFooterLink({
  className,
  children,
  accent = false,
  ...props
}: LandingLinkProps & { accent?: boolean }) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm",
        "transition-colors duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]",
        accent
          ? "font-semibold hover:brightness-110"
          : "font-medium hover:bg-white/5 active:bg-white/[0.07]",
        landingFocus,
        className,
      )}
      style={{
        color: accent ? TOKENS.primary : TOKENS.onSurfaceMutedElevated,
      }}
      {...props}
    >
      {children}
    </Link>
  )
}
