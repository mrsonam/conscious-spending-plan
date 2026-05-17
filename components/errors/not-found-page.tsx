import Link from "next/link"
import { ArrowRight, Compass } from "lucide-react"
import { Fraunces, DM_Sans } from "next/font/google"
import { AppNavbar, AppNavbarCta, AppNavbarLink } from "@/components/layout/app-navbar"
import { LandingThemeSync } from "@/components/landing/landing-theme-sync"
import {
  LandingGhostLink,
  LandingPrimaryLink,
  SectionEyebrow,
  landingFocus,
} from "@/components/landing/landing-ui"
import { BENTO } from "@/lib/app-routes"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-landing-display",
  display: "swap",
})

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-landing-body",
  display: "swap",
})

const GHOST_BUCKETS = [
  { label: "Fixed", pct: 50, accent: TOKENS.secondary },
  { label: "Save", pct: 20, accent: TOKENS.primary },
  { label: "Invest", pct: 10, accent: TOKENS.tertiary },
  { label: "Guilt-free", pct: 20, accent: TOKENS.primary },
] as const

type NotFoundPageProps = {
  isAuthenticated?: boolean
}

export function NotFoundPage({ isAuthenticated = false }: NotFoundPageProps) {
  const primaryHref = isAuthenticated ? BENTO.dashboard : "/signup"
  const primaryLabel = isAuthenticated ? "Open dashboard" : "Get started"
  const secondaryHref = isAuthenticated ? "/" : "/login"
  const secondaryLabel = isAuthenticated ? "Home" : "Log in"

  return (
    <>
      <LandingThemeSync />
      <div
        className={cn(
          display.variable,
          body.variable,
          "not-found-page-root landing-page-root relative flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden font-[family-name:var(--font-landing-body)] antialiased",
        )}
        style={{ backgroundColor: TOKENS.surface, color: TOKENS.onSurface }}
      >
        <a
          href="#not-found-main"
          className={cn("landing-skip-link sr-only text-sm font-semibold", landingFocus)}
          style={{
            background: TOKENS.surfaceContainer,
            color: TOKENS.onSurface,
          }}
        >
          Skip to content
        </a>

        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 70% 50% at 50% -10%, rgba(78, 222, 163, 0.1), transparent 55%),
                radial-gradient(ellipse 50% 40% at 100% 100%, rgba(137, 206, 255, 0.08), transparent 50%),
                ${TOKENS.surface}
              `,
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.28]"
            style={{
              backgroundImage: `linear-gradient(rgba(218,226,253,0.035) 1px, transparent 1px),
                linear-gradient(90deg, rgba(218,226,253,0.035) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
          <p
            className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 select-none font-[family-name:var(--font-landing-display)] text-[clamp(7rem,22vw,14rem)] font-semibold leading-none tracking-tighter"
            style={{
              color: `color-mix(in srgb, ${TOKENS.onSurface} 6%, transparent)`,
            }}
          >
            404
          </p>
        </div>

        <div className="relative z-[1] flex min-h-[100dvh] flex-col">
          <AppNavbar
            variant="landing"
            homeHref="/"
            maxWidth="6xl"
            trailing={
              isAuthenticated ? (
                <AppNavbarCta href={BENTO.dashboard}>
                  Dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </AppNavbarCta>
              ) : (
                <>
                  <AppNavbarLink href="/login" variant="landing">
                    Log in
                  </AppNavbarLink>
                  <AppNavbarCta href="/signup">
                    Get started
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </AppNavbarCta>
                </>
              )
            }
          />

          <main
            id="not-found-main"
            className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-12 sm:px-6 sm:py-16"
          >
            <div className="landing-hero-enter mx-auto grid w-full max-w-4xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-12">
              <div className="max-w-lg">
                <SectionEyebrow>Page not found</SectionEyebrow>
                <h1
                  className="mt-4 font-[family-name:var(--font-landing-display)] text-[2rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.35rem]"
                  style={{ color: TOKENS.onSurface }}
                >
                  This URL isn&apos;t in your plan.
                </h1>
                <p
                  className="mt-4 text-base leading-relaxed sm:text-[1.05rem]"
                  style={{ color: TOKENS.onSurfaceMutedElevated }}
                >
                  The link may be mistyped, expired, or moved. Nothing broke in your
                  accounts. You&apos;re just off the map.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <LandingPrimaryLink href={primaryHref} className="w-full sm:w-auto">
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </LandingPrimaryLink>
                  <LandingGhostLink href={secondaryHref} className="w-full sm:w-auto">
                    {secondaryLabel}
                  </LandingGhostLink>
                </div>

                <p className="mt-6 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                  Need a specific screen?{" "}
                  <Link
                    href={isAuthenticated ? BENTO.expenses : "/login"}
                    className={cn(
                      "cursor-pointer font-medium underline-offset-4 transition-[color] duration-150 ease-out hover:underline",
                      landingFocus,
                    )}
                    style={{ color: TOKENS.primary }}
                  >
                    {isAuthenticated ? "Go to expenses" : "Sign in first"}
                  </Link>
                </p>
              </div>

              <aside
                className="rounded-2xl border p-5 sm:p-6"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  background: TOKENS.surfaceContainer,
                  boxShadow: CARD_INSET,
                }}
                aria-hidden
              >
                <div className="flex items-center gap-2">
                  <Compass
                    className="h-4 w-4 shrink-0"
                    style={{ color: TOKENS.primary }}
                  />
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Off-route
                  </p>
                </div>
                <ul className="mt-5 space-y-3">
                  {GHOST_BUCKETS.map((bucket, index) => (
                    <li key={bucket.label}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span
                          className="text-xs font-medium"
                          style={{ color: TOKENS.onSurfaceMutedElevated }}
                        >
                          {bucket.label}
                        </span>
                        <span
                          className="text-[10px] tabular-nums"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          {index === 2 ? "—" : `${bucket.pct}%`}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full"
                        style={{ background: TOKENS.surfaceLow }}
                      >
                        <div
                          className="landing-bar-fill h-full rounded-full transition-[width] duration-500 ease-out"
                          style={{
                            width: index === 2 ? "8%" : `${bucket.pct}%`,
                            background:
                              index === 2
                                ? `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 35%, transparent)`
                                : bucket.accent,
                            opacity: index === 2 ? 0.45 : 0.85,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <p
                  className="mt-5 text-xs leading-relaxed"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  One pillar missing, like this page.
                </p>
              </aside>
            </div>

          </main>
        </div>
      </div>
    </>
  )
}
