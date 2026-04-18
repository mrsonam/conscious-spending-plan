"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { AuthCard, AuthPageFrame } from "@/components/auth/auth-page-frame"
import { AuthTextInput } from "@/components/auth/auth-text-input"
import { GoogleMark } from "@/components/auth/google-mark"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import {
  DEMO_ACCOUNT,
  PORTFOLIO_DEMO_QUERY_KEY,
  PORTFOLIO_DEMO_QUERY_VALUE,
} from "@/lib/demo-credentials"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

export function LoginForm({ initialTheme }: { initialTheme: DashboardTheme }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const isConsole = initialTheme === "console"

  const fromPortfolio =
    searchParams.get(PORTFOLIO_DEMO_QUERY_KEY) === PORTFOLIO_DEMO_QUERY_VALUE

  const fillDemoCredentials = useCallback(() => {
    setError("")
    setEmail(DEMO_ACCOUNT.email)
    setPassword(DEMO_ACCOUNT.password)
  }, [])

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setCredentialsLoading(true)
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      })
      if (res?.error) {
        setError("Invalid email or password.")
        setCredentialsLoading(false)
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setCredentialsLoading(false)
    }
  }

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
    <AuthPageFrame theme={initialTheme}>
      <div
        className={cn(
          "w-full max-w-[420px]",
          !isConsole && "login-animate-enter",
        )}
      >
        <AuthCard theme={initialTheme}>
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
            Sign in with email or Google—one calm dashboard for income,
            spending, and goals.
          </p>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className={cn(
                "group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-center text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                fromPortfolio && !isConsole
                  ? "border-indigo-400 bg-gradient-to-r from-indigo-50 via-white to-violet-50 text-indigo-900 shadow-[0_0_0_3px_rgba(99,102,241,0.25),0_12px_24px_-8px_rgba(79,70,229,0.35)] focus-visible:ring-indigo-500"
                  : !isConsole &&
                      "border-slate-200/90 bg-white/90 text-slate-800 shadow-sm hover:border-indigo-200 hover:shadow-md focus-visible:ring-indigo-500",
              )}
              style={
                isConsole
                  ? fromPortfolio
                    ? {
                        borderColor: TOKENS.primary,
                        background: `linear-gradient(135deg, color-mix(in srgb, ${TOKENS.primary} 18%, ${TOKENS.surfaceContainer}) 0%, ${TOKENS.surfaceHigh} 100%)`,
                        color: TOKENS.onSurface,
                        boxShadow: `0 0 0 2px ${TOKENS.primary}, 0 16px 40px rgba(0,0,0,0.35), ${CARD_INSET}`,
                      }
                    : {
                        background: TOKENS.surfaceHigh,
                        color: TOKENS.onSurface,
                        border: `1px solid ${TOKENS.outlineGhost}`,
                        boxShadow: CARD_INSET,
                      }
                  : undefined
              }
            >
              {!isConsole && fromPortfolio ? (
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-violet-500/10 opacity-100"
                  aria-hidden
                />
              ) : null}
              <span className="relative">Use demo account</span>
              {fromPortfolio ? (
                <span
                  className={cn(
                    "relative mt-1 block text-[10px] font-normal leading-tight",
                    !isConsole && "text-indigo-700/90",
                  )}
                  style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
                >
                  Fills email & password — then tap Sign in
                </span>
              ) : null}
            </button>
          </div>

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

          <form onSubmit={(e) => void handleCredentials(e)} className="mt-8 space-y-4">
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="login-email"
                className={cn("text-xs font-semibold", !isConsole && "text-slate-700")}
                style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
              >
                Email
              </label>
              <AuthTextInput
                id="login-email"
                theme={initialTheme}
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="login-password"
                className={cn("text-xs font-semibold", !isConsole && "text-slate-700")}
                style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
              >
                Password
              </label>
              <AuthTextInput
                id="login-password"
                theme={initialTheme}
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={credentialsLoading}
              className={cn(
                "w-full rounded-xl py-3.5 text-[15px] font-semibold transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
                !isConsole &&
                  "bg-indigo-600 text-white shadow-md hover:bg-indigo-700 focus-visible:ring-indigo-500",
              )}
              style={
                isConsole
                  ? {
                      background: TOKENS.primary,
                      color: TOKENS.surface,
                      boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
                    }
                  : undefined
              }
            >
              {credentialsLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="relative my-8">
            <div
              className={cn(
                "absolute inset-0 flex items-center",
                !isConsole && "border-t border-slate-200",
              )}
              style={isConsole ? { borderTop: `1px solid ${TOKENS.outlineGhost}` } : undefined}
              aria-hidden
            />
            <div className="relative flex justify-center">
              <span
                className={cn(
                  "px-3 text-xs font-medium",
                  !isConsole && "bg-white/90 text-slate-500 backdrop-blur-sm",
                )}
                style={
                  isConsole
                    ? {
                        background: TOKENS.surfaceContainer,
                        color: TOKENS.onSurfaceMuted,
                      }
                    : undefined
                }
              >
                or
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading || credentialsLoading}
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

          <p
            className={cn(
              "mt-8 text-center text-sm",
              !isConsole && "text-slate-600",
            )}
            style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
          >
            No account?{" "}
            <Link
              href="/signup"
              className={cn(
                "font-semibold underline-offset-4 hover:underline",
                !isConsole && "text-indigo-600",
              )}
              style={isConsole ? { color: TOKENS.primary } : undefined}
            >
              Create one
            </Link>
          </p>

          <p
            className={cn(
              "mt-4 text-center text-xs leading-relaxed",
              !isConsole && "text-slate-500",
            )}
            style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
          >
            By continuing, you agree to use this app under your own account. We
            never post on your behalf.
          </p>
        </AuthCard>

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
    </AuthPageFrame>
  )
}
