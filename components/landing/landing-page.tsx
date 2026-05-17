import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Layers,
  PieChart,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react"
import { AppNavbar, AppNavbarCta, AppNavbarLink } from "@/components/layout/app-navbar"
import { Fraunces, DM_Sans } from "next/font/google"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { LandingThemeSync } from "@/components/landing/landing-theme-sync"
import { LandingReveal } from "@/components/landing/landing-reveal"
import {
  LandingFooterLink,
  LandingGhostLink,
  LandingPrimaryLink,
  SectionEyebrow,
  SectionTitle,
  landingFocus,
} from "@/components/landing/landing-ui"

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

const BUCKETS = [
  {
    label: "Fixed costs",
    helper: "Rent, bills, essentials",
    pct: 50,
    accent: TOKENS.secondary,
    span: "col-span-12 sm:col-span-7",
    tall: true,
  },
  {
    label: "Savings",
    helper: "Goals and buffer",
    pct: 20,
    accent: TOKENS.primary,
    span: "col-span-6 sm:col-span-5",
    tall: false,
  },
  {
    label: "Investment",
    helper: "Long-term growth",
    pct: 10,
    accent: TOKENS.tertiary,
    span: "col-span-6 sm:col-span-4",
    tall: false,
  },
  {
    label: "Guilt-free",
    helper: "Spend without guilt",
    pct: 20,
    accent: TOKENS.primary,
    span: "col-span-12 sm:col-span-8",
    tall: false,
  },
] as const

const STEPS = [
  {
    icon: Wallet,
    title: "Log your pay",
    body: "Record income on your schedule. Any pay cadence works; nothing is locked to fortnightly.",
  },
  {
    icon: Layers,
    title: "Set your rules",
    body: "Use percentages or fixed amounts per bucket. Leftover income can roll into savings automatically.",
  },
  {
    icon: BarChart3,
    title: "Stay inside the plan",
    body: "Dashboard, expenses, and funds show whether you are still on track before the next pay date.",
  },
] as const

const CAPABILITIES = [
  { icon: ShieldCheck, label: "Private account" },
  { icon: Sparkles, label: "Wealth Console" },
  { icon: PieChart, label: "Expense tracking" },
] as const

const cardSurfaceStyle = {
  background: TOKENS.surfaceContainer,
  boxShadow: CARD_INSET,
} as const

const mutedOnCard = { color: TOKENS.onSurfaceMutedElevated } as const

export function LandingPage() {
  return (
    <>
      <LandingThemeSync />
      <div
        className={cn(
          display.variable,
          body.variable,
          "landing-page-root relative min-h-screen min-h-[100dvh] overflow-x-hidden font-[family-name:var(--font-landing-body)] antialiased",
        )}
        style={{ backgroundColor: TOKENS.surface, color: TOKENS.onSurface }}
      >
        <a
          href="#main-content"
          className={cn(
            "landing-skip-link sr-only text-sm font-semibold",
            landingFocus,
          )}
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
                radial-gradient(ellipse 85% 55% at 50% -15%, rgba(78, 222, 163, 0.12), transparent 58%),
                radial-gradient(ellipse 55% 45% at 100% 90%, rgba(137, 206, 255, 0.09), transparent 52%),
                radial-gradient(ellipse 45% 40% at 0% 70%, rgba(185, 200, 222, 0.07), transparent 48%),
                ${TOKENS.surface}
              `,
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.32]"
            style={{
              backgroundImage: `linear-gradient(rgba(218,226,253,0.035) 1px, transparent 1px),
                linear-gradient(90deg, rgba(218,226,253,0.035) 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative z-[1]">
          <AppNavbar
            variant="landing"
            homeHref="/"
            maxWidth="6xl"
            trailing={
              <>
                <AppNavbarLink href="/login" variant="landing">
                  Log in
                </AppNavbarLink>
                <AppNavbarCta href="/signup">
                  Get started
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </AppNavbarCta>
              </>
            }
          />

          <main id="main-content">
            <section
              className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-14"
              aria-labelledby="hero-heading"
            >
              <div className="landing-hero-enter grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
                <div className="landing-hero-copy max-w-xl">
                  <SectionEyebrow>Inspired by Ramit Sethi&apos;s CSP</SectionEyebrow>
                  <h1
                    id="hero-heading"
                    className="mt-4 font-[family-name:var(--font-landing-display)] text-[2.15rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.65rem] lg:text-[3rem] lg:leading-[1.08]"
                    style={{ color: TOKENS.onSurface }}
                  >
                    Know where every dollar goes before you spend it.
                  </h1>
                  <p
                    className="mt-5 max-w-[38rem] text-base leading-[1.65] sm:text-lg sm:leading-relaxed"
                    style={{ color: TOKENS.onSurfaceMutedElevated }}
                  >
                    Split each pay period across fixed costs, savings, investment, and guilt-free spending.
                    One console for your rules, income entries, and whether you are still inside the plan.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <LandingPrimaryLink href="/signup" className="w-full sm:w-auto">
                      Create your plan
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </LandingPrimaryLink>
                    <LandingGhostLink href="/login" className="w-full sm:w-auto">
                      I have an account
                    </LandingGhostLink>
                  </div>
                </div>

                <AllocationPreview />
              </div>
            </section>

            <section
              className="border-t py-16 sm:py-20"
              style={{ borderColor: TOKENS.outlineGhost }}
              aria-labelledby="how-heading"
            >
              <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="max-w-2xl">
                  <SectionEyebrow>How it works</SectionEyebrow>
                  <SectionTitle id="how-heading">Three checks between paydays</SectionTitle>
                </div>
                <ol className="landing-steps mt-10 grid list-none gap-4 p-0 md:grid-cols-2 md:gap-5">
                  {STEPS.map((step, index) => (
                    <StepCard
                      key={step.title}
                      step={step}
                      index={index}
                      featured={index === 0}
                    />
                  ))}
                </ol>
              </div>
            </section>

            <LandingReveal
              as="section"
              className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
              aria-labelledby="buckets-heading"
            >
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
                <div className="max-w-lg">
                  <SectionEyebrow>The four buckets</SectionEyebrow>
                  <SectionTitle id="buckets-heading">Rules you choose, not vibes</SectionTitle>
                  <p className="mt-3 text-sm leading-relaxed sm:text-base" style={mutedOnCard}>
                    Percentages or fixed amounts per category. When fixed amounts do not add up, the remainder
                    can roll into savings so every dollar still has a job.
                  </p>
                </div>
                <ul className="flex flex-wrap gap-2 sm:gap-3" aria-label="Product capabilities">
                  {CAPABILITIES.map((item) => (
                    <li
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm"
                      style={{
                        borderColor: TOKENS.outlineGhost,
                        ...mutedOnCard,
                        background: TOKENS.surfaceLow,
                      }}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" style={{ color: TOKENS.primary }} aria-hidden />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 grid auto-rows-min grid-cols-12 gap-3 sm:gap-4">
                {BUCKETS.map((bucket) => (
                <article
                  key={bucket.label}
                  className={cn(
                    "landing-bucket-enter landing-card-lift rounded-xl p-5 sm:p-6",
                    "hover:bg-[rgba(255,255,255,0.015)]",
                    bucket.span,
                    bucket.tall && "sm:min-h-[168px]",
                  )}
                    style={cardSurfaceStyle}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={mutedOnCard}>
                      {bucket.label}
                    </p>
                    <p
                      className="mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl"
                      style={{ color: bucket.accent }}
                    >
                      {bucket.pct}%
                    </p>
                    <p className="mt-2 text-sm leading-snug" style={mutedOnCard}>
                      {bucket.helper}
                    </p>
                    <div
                      className="mt-5 h-1.5 overflow-hidden rounded-full"
                      style={{ background: TOKENS.surfaceLow }}
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${bucket.pct}%`,
                          background: bucket.accent,
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-center text-xs leading-relaxed" style={mutedOnCard}>
                Example split only. You set the real percentages or fixed amounts in the app.
              </p>
            </LandingReveal>

            <LandingReveal
              as="section"
              className="border-t px-4 py-16 sm:px-6 sm:py-20"
              style={{ borderColor: TOKENS.outlineGhost }}
              aria-labelledby="cta-heading"
            >
              <div
                className="landing-cta-inner mx-auto max-w-6xl rounded-2xl px-6 py-10 text-center sm:px-10 sm:py-14"
                style={{
                  background: `linear-gradient(165deg, ${TOKENS.surfaceContainer} 0%, ${TOKENS.surfaceLow} 100%)`,
                  boxShadow: `0 0 0 1px ${TOKENS.outlineGhost}, inset 0 1px 0 rgba(218,226,253,0.08)`,
                }}
              >
                <SectionEyebrow elevated>Ready when you are</SectionEyebrow>
                <h2
                  id="cta-heading"
                  className="mt-3 font-[family-name:var(--font-landing-display)] text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{ color: TOKENS.onSurface }}
                >
                  Clarity, control, confidence
                </h2>
                <p
                  className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base"
                  style={mutedOnCard}
                >
                  Open the Wealth Console, log your next pay period, and see whether spending still matches
                  the plan you set.
                </p>
                <LandingPrimaryLink href="/signup" className="mt-8">
                  Start free
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </LandingPrimaryLink>
              </div>
            </LandingReveal>
          </main>

          <footer
            className="border-t px-4 py-8 sm:px-6"
            style={{ borderColor: TOKENS.outlineGhost }}
          >
            <div
              className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left"
            >
              <p className="text-sm font-medium" style={{ color: TOKENS.onSurface }}>
                Conscious Spending Plan
              </p>
              <p className="max-w-md text-xs leading-relaxed sm:text-sm" style={mutedOnCard}>
                Not affiliated with Ramit Sethi. A personal finance tool for CSP-style budgeting.
              </p>
              <nav className="flex items-center gap-1" aria-label="Footer">
                <LandingFooterLink href="/login">Log in</LandingFooterLink>
                <LandingFooterLink href="/signup" accent>
                  Sign up
                </LandingFooterLink>
              </nav>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}

function StepCard({
  step,
  index,
  featured = false,
}: {
  step: (typeof STEPS)[number]
  index: number
  featured?: boolean
}) {
  const Icon = step.icon

  return (
    <li
      className={cn(
        "landing-card-lift list-none rounded-xl p-5 sm:p-6",
        "hover:bg-[rgba(255,255,255,0.02)]",
        featured && "md:col-span-2 md:flex md:items-start md:gap-6",
      )}
      style={cardSurfaceStyle}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          featured ? "h-12 w-12" : "h-10 w-10",
        )}
        style={{
          background: TOKENS.surfaceLow,
          color: TOKENS.primary,
          boxShadow: CARD_INSET,
        }}
      >
        <Icon className={cn(featured ? "h-6 w-6" : "h-5 w-5")} aria-hidden />
      </span>
      <div className={cn(featured && "md:min-w-0 md:flex-1")}>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] md:mt-0" style={mutedOnCard}>
          Step {index + 1}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight" style={{ color: TOKENS.onSurface }}>
          {step.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed" style={mutedOnCard}>
          {step.body}
        </p>
      </div>
    </li>
  )
}

function AllocationPreview() {
  const sampleIncome = 4820
  const rows = [
    { label: "Fixed costs", amount: 2410, pct: 50, color: TOKENS.secondary },
    { label: "Savings", amount: 964, pct: 20, color: TOKENS.primary },
    { label: "Investment", amount: 482, pct: 10, color: TOKENS.tertiary },
    { label: "Guilt-free", amount: 964, pct: 20, color: TOKENS.primary },
  ]

  return (
    <figure
      className="landing-preview-enter m-0 rounded-2xl p-5 sm:p-6 lg:p-7"
      style={{
        background: `linear-gradient(165deg, ${TOKENS.surfaceContainer} 0%, ${TOKENS.surfaceLow} 100%)`,
        boxShadow: `0 0 0 1px ${TOKENS.outlineGhost}, 0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(218,226,253,0.08)`,
      }}
    >
      <figcaption className="sr-only">Example allocation for a single pay period</figcaption>
      <div
        className="flex items-start justify-between gap-4 border-b pb-4"
        style={{ borderColor: TOKENS.outlineGhost }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={mutedOnCard}>
            Sample pay period
          </p>
          <p
            className="mt-2 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tabular-nums tracking-tight sm:text-[2.35rem]"
            style={{ color: TOKENS.onSurface }}
          >
            <span className="sr-only">Total income: </span>
            ${sampleIncome.toLocaleString()}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={mutedOnCard}>
            Allocated across four CSP buckets
          </p>
        </div>
        <span
          className="landing-preview-badge shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{
            background: `color-mix(in srgb, ${TOKENS.primary} 18%, ${TOKENS.surfaceHigh})`,
            color: TOKENS.primary,
          }}
        >
          On plan
        </span>
      </div>

      <ul className="landing-preview-bars mt-5 list-none space-y-3 p-0">
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span style={{ color: TOKENS.onSurface }}>{row.label}</span>
                <span className="tabular-nums font-medium" style={mutedOnCard}>
                  {row.pct}%
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full"
                style={{ background: TOKENS.surface }}
                aria-hidden
              >
                <div
                  className="landing-bar-fill h-full rounded-full"
                  style={{ width: `${row.pct}%`, background: row.color }}
                />
              </div>
            </div>
            <span className="tabular-nums text-sm font-semibold" style={{ color: row.color }}>
              ${row.amount.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[11px] leading-relaxed" style={mutedOnCard}>
        Illustration only. Your dashboard uses your income, rules, and live expense data.
      </p>
    </figure>
  )
}
