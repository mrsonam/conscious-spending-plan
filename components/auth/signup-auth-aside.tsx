"use client"

import { ShieldCheck, Home, PiggyBank, TrendingUp, PartyPopper } from "lucide-react"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import { CspBrandMark } from "@/components/brand/csp-brand-mark"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

const PILLARS = [
  { label: "Fixed costs", color: TOKENS.loss, icon: Home },
  { label: "Savings", color: TOKENS.secondary, icon: PiggyBank },
  { label: "Investment", color: TOKENS.primary, icon: TrendingUp },
  { label: "Guilt-free", color: TOKENS.tertiary, icon: PartyPopper },
] as const

export function SignupAuthAside({ theme }: { theme: DashboardTheme }) {
  const isConsole = theme === "console"

  return (
    <aside
      className={cn(
        "hidden flex-col justify-start lg:flex lg:pt-0 lg:pb-8",
        !isConsole && "text-slate-900",
      )}
      aria-label="Why create an account"
    >
      <CspBrandMark
        href="/"
        size="lg"
        wordmark="full"
        variant={isConsole ? "console" : "classic"}
        eyebrow="Wealth Console"
        className="pointer-events-auto"
      />

      <h2
        className={cn(
          "mt-10 font-[family-name:var(--font-login-display)] text-[2rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.35rem]",
          !isConsole && "text-slate-900",
        )}
        style={isConsole ? { color: TOKENS.onSurface } : undefined}
      >
        Start with four buckets.
      </h2>
      <p
        className={cn(
          "mt-4 max-w-md text-base leading-relaxed",
          !isConsole && "text-slate-600",
        )}
        style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
      >
        Create an account, log your income, and assign every dollar to a pillar before you spend it.
      </p>

      <ul className="mt-8 space-y-3" role="list">
        {PILLARS.map(({ label, color, icon: Icon }) => (
          <li
            key={label}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3",
              !isConsole && "border-slate-200/80 bg-white/60",
            )}
            style={
              isConsole
                ? {
                    borderColor: TOKENS.outlineGhost,
                    background: TOKENS.surfaceContainer,
                    boxShadow: CARD_INSET,
                  }
                : undefined
            }
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: `color-mix(in srgb, ${color} 14%, ${isConsole ? TOKENS.surfaceLow : "rgb(248 250 252)"})`,
                color,
                boxShadow: isConsole ? CARD_INSET : undefined,
              }}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </span>
            <span
              className="text-sm font-semibold tracking-tight"
              style={isConsole ? { color: TOKENS.onSurface } : undefined}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>

      <p
        className={cn(
          "mt-8 flex items-start gap-2 text-sm leading-relaxed",
          !isConsole && "text-slate-500",
        )}
        style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
      >
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: isConsole ? TOKENS.primary : undefined }}
          strokeWidth={2}
          aria-hidden
        />
        <span>Your data stays private. We never post on your behalf.</span>
      </p>
    </aside>
  )
}
