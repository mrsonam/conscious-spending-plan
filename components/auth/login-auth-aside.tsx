"use client"

import { ShieldCheck, Home, PiggyBank, TrendingUp, PartyPopper } from "lucide-react"
import { CspBrandMark } from "@/components/brand/csp-brand-mark"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

const PILLARS = [
  { label: "Fixed costs", color: TOKENS.loss, icon: Home },
  { label: "Savings", color: TOKENS.secondary, icon: PiggyBank },
  { label: "Investment", color: TOKENS.primary, icon: TrendingUp },
  { label: "Guilt-free", color: TOKENS.tertiary, icon: PartyPopper },
] as const

export function LoginAuthAside() {
  return (
    <aside
      className="hidden flex-col justify-start lg:flex lg:pt-0 lg:pb-8"
      aria-label="About Conscious Spending Plan"
    >
      <CspBrandMark
        href="/"
        size="lg"
        wordmark="full"
        eyebrow="Wealth Console"
        className="pointer-events-auto"
      />

      <h2
        className="mt-10 font-[family-name:var(--font-login-display)] text-[2rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.35rem]"
        style={{ color: TOKENS.onSurface }}
      >
        Your pay, split on purpose.
      </h2>
      <p
        className="mt-4 max-w-md text-base leading-relaxed"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        Route each deposit into fixed costs, savings, investment, and guilt-free spending.
        See what is left before you spend it.
      </p>

      <ul className="mt-8 space-y-3" role="list">
        {PILLARS.map(({ label, color, icon: Icon }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surfaceContainer,
              boxShadow: CARD_INSET,
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: `color-mix(in srgb, ${color} 14%, ${TOKENS.surfaceLow})`,
                color,
                boxShadow: CARD_INSET,
              }}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </span>
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ color: TOKENS.onSurface }}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>

      <p
        className="mt-8 flex items-start gap-2 text-sm leading-relaxed"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: TOKENS.primary }}
          strokeWidth={2}
          aria-hidden
        />
        <span>Credentials stay on your device. We never post on your behalf.</span>
      </p>
    </aside>
  )
}
