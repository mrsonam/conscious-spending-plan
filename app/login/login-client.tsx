"use client"

import { signIn } from "next-auth/react"
import { useState, type CSSProperties } from "react"
import { Fraunces, DM_Sans } from "next/font/google"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-login-display",
  display: "swap",
})

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-login-body",
  display: "swap",
})

function GoogleMark({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function LoginClient({ initialTheme }: { initialTheme: DashboardTheme }) {
  const [error, setError] = useState("")
  const [googleLoading, setGoogleLoading] = useState(false)
  const isConsole = initialTheme === "console"

  const handleGoogleSignIn = async () => {
    setError("")
    setGoogleLoading(true)
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch {
      setError("Failed to sign in with Google. Please try again.")
      setGoogleLoading(false)
    }
  }

  return (
    <div
      className={cn(
        display.variable,
        body.variable,
        "relative min-h-screen min-h-[100dvh] overflow-hidden font-[family-name:var(--font-login-body)]",
      )}
      style={isConsole ? { backgroundColor: TOKENS.surface } : undefined}
    >
      {/* Background */}
      {isConsole ? (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(78, 222, 163, 0.14), transparent 55%),
                radial-gradient(ellipse 60% 40% at 100% 100%, rgba(137, 206, 255, 0.08), transparent 50%),
                radial-gradient(ellipse 50% 35% at 0% 80%, rgba(185, 200, 222, 0.06), transparent 45%),
                ${TOKENS.surface}
              `,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: `linear-gradient(rgba(218,226,253,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(218,226,253,0.04) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/90 to-violet-100/80" />
          <div
            className="pointer-events-none absolute -left-24 top-1/4 h-[420px] w-[420px] rounded-full bg-indigo-400/25 blur-[100px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-20 bottom-0 h-[380px] w-[380px] rounded-full bg-violet-400/20 blur-[90px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-sky-300/15 blur-[80px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99, 102, 241, 0.06) 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
            }}
          />
        </>
      )}

      <div className="relative z-[1] flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div
          className={cn(
            "w-full max-w-[420px]",
            !isConsole && "login-animate-enter",
          )}
        >
          {/* Card */}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl px-6 py-8 sm:px-9 sm:py-10",
              !isConsole &&
                "border border-white/60 bg-white/75 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_24px_48px_-12px_rgba(79,70,229,0.18)] backdrop-blur-xl",
            )}
            style={
              isConsole
                ? {
                    background: `linear-gradient(165deg, ${TOKENS.surfaceContainer} 0%, ${TOKENS.surfaceLow} 100%)`,
                    boxShadow: `0 0 0 1px ${TOKENS.outlineGhost}, 0 24px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(218,226,253,0.08)`,
                  }
                : undefined
            }
          >
            {!isConsole ? (
              <div
                className="absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent"
                aria-hidden
              />
            ) : (
              <div
                className="absolute left-0 right-0 top-0 h-[3px] rounded-t-2xl"
                style={{
                  background: `linear-gradient(90deg, transparent, ${TOKENS.primary}, ${TOKENS.secondary}, transparent)`,
                  opacity: 0.95,
                }}
                aria-hidden
              />
            )}

            <p
              className={cn(
                "mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.28em]",
                !isConsole && "text-indigo-600/90",
              )}
              style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
            >
              Conscious spending
            </p>

            <h1
              className={cn(
                "font-[family-name:var(--font-login-display)] text-center text-[1.65rem] font-semibold leading-tight tracking-tight sm:text-[1.85rem]",
                !isConsole && "text-slate-900",
              )}
              style={isConsole ? { color: TOKENS.onSurface } : undefined}
            >
              Welcome back
            </h1>
            <p
              className={cn(
                "mx-auto mt-2 max-w-[320px] text-center text-sm leading-relaxed",
                !isConsole && "text-slate-600",
              )}
              style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
            >
              Sign in to align your money with the plan—one calm dashboard for
              income, spending, and goals.
            </p>

            {error ? (
              <div
                className={cn(
                  "mt-6 rounded-xl border px-4 py-3 text-sm leading-snug",
                  !isConsole && "border-red-200/80 bg-red-50 text-red-800",
                )}
                style={
                  isConsole
                    ? {
                        borderColor: "rgba(239,68,68,0.35)",
                        background: "rgba(239,68,68,0.1)",
                        color: "#fecaca",
                      }
                    : undefined
                }
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <div className="mt-8">
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={googleLoading}
                className={cn(
                  "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl py-3.5 pl-4 pr-5 text-[15px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
                  !isConsole &&
                    "border border-slate-200/90 bg-white text-slate-800 shadow-sm hover:border-indigo-200 hover:shadow-md focus-visible:ring-indigo-500",
                )}
                style={
                  isConsole
                    ? {
                        background: TOKENS.surfaceHigh,
                        color: TOKENS.onSurface,
                        border: `1px solid ${TOKENS.outlineGhost}`,
                        boxShadow: CARD_INSET,
                      }
                    : undefined
                }
              >
                {!isConsole ? (
                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/[0.06] to-indigo-500/0 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                ) : null}
                {googleLoading ? (
                  <span
                    className="inline-flex h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                    style={
                      isConsole
                        ? { borderColor: `${TOKENS.primary}`, borderTopColor: "transparent" }
                        : { borderColor: "#6366f1", borderTopColor: "transparent" }
                    }
                    aria-hidden
                  />
                ) : (
                  <GoogleMark
                    className={cn("h-5 w-5 shrink-0", !isConsole && "text-slate-700")}
                    style={isConsole ? { color: TOKENS.onSurface } : undefined}
                  />
                )}
                <span className="relative">
                  {googleLoading ? "Signing in…" : "Continue with Google"}
                </span>
              </button>
            </div>

            <p
              className={cn(
                "mt-8 text-center text-xs leading-relaxed",
                !isConsole && "text-slate-500",
              )}
              style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
            >
              By continuing, you agree to use this app under your own Google
              account. We never post on your behalf.
            </p>
          </div>

          <p
            className={cn(
              "mt-8 text-center text-[11px] font-medium tracking-wide",
              !isConsole && "text-slate-500/90",
            )}
            style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
          >
            Conscious Spending Plan · Private by default
          </p>
        </div>
      </div>
    </div>
  )
}
