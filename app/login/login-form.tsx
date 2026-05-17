"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Loader2 } from "lucide-react"
import { AuthCard, AuthPageFrame } from "@/components/auth/auth-page-frame"
import { AuthDivider } from "@/components/auth/auth-divider"
import { LoginAuthAside } from "@/components/auth/login-auth-aside"
import { AppNavbarLink } from "@/components/layout/app-navbar"
import { AuthTextInput } from "@/components/auth/auth-text-input"
import { GoogleMark } from "@/components/auth/google-mark"
import { CspBrandMark } from "@/components/brand/csp-brand-mark"
import { consoleFocus } from "@/components/wealth-console/console-ui"
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

  const busy = credentialsLoading || googleLoading

  return (
    <AuthPageFrame
      theme={initialTheme}
      layout="split"
      aside={<LoginAuthAside theme={initialTheme} />}
      navbarTrailing={
        <AppNavbarLink href="/signup" variant={isConsole ? "console" : "classic"}>
          Sign up
        </AppNavbarLink>
      }
    >
      <div
        className={cn(
          "w-full max-w-[26rem]",
          !isConsole && "login-animate-enter motion-reduce:animate-none",
        )}
      >
        <div className="mb-6 flex justify-center lg:hidden">
          <CspBrandMark
            href="/"
            size="md"
            wordmark="responsive"
            variant={isConsole ? "console" : "classic"}
          />
        </div>

        <AuthCard theme={initialTheme}>
          <h1
            className={cn(
              "font-[family-name:var(--font-login-display)] text-center text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[1.9rem]",
              !isConsole && "text-slate-900",
            )}
            style={isConsole ? { color: TOKENS.onSurface } : undefined}
          >
            Welcome back
          </h1>
          <p
            className={cn(
              "mx-auto mt-2 max-w-[18rem] text-center text-sm leading-relaxed",
              !isConsole && "text-slate-600",
            )}
            style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
          >
            Sign in to your Wealth Console. Income, spend, and pillar headroom in one place.
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

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={busy}
            className={cn(
              "group relative mt-8 flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl py-3.5 pl-4 pr-5 text-[15px] font-semibold transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-55",
              consoleFocus,
              !isConsole &&
                "border border-slate-200/90 bg-white text-slate-800 shadow-sm hover:border-indigo-200 hover:bg-slate-50",
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
            {googleLoading ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <GoogleMark
                className={cn("h-5 w-5 shrink-0", !isConsole && "text-slate-700")}
                style={isConsole ? { color: TOKENS.onSurface } : undefined}
              />
            )}
            <span>{googleLoading ? "Signing in…" : "Continue with Google"}</span>
          </button>

          <AuthDivider theme={initialTheme} />

          <form
            onSubmit={(e) => void handleCredentials(e)}
            className="space-y-4"
            inert={credentialsLoading}
          >
            <fieldset disabled={credentialsLoading} className="min-w-0 space-y-4 border-0 p-0">
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
                  disabled={busy}
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
                  disabled={busy}
                  placeholder="••••••••"
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={busy}
              className={cn(
                "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold transition-opacity duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-55",
                consoleFocus,
                !isConsole && "bg-indigo-600 text-white shadow-md hover:bg-indigo-700",
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
              {credentialsLoading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
              ) : null}
              {credentialsLoading ? "Signing in…" : "Sign in with email"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={fillDemoCredentials}
              disabled={busy}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-55",
                consoleFocus,
                !isConsole && "text-indigo-600 hover:bg-indigo-50",
              )}
              style={isConsole ? { color: TOKENS.secondary } : undefined}
            >
              {fromPortfolio ? "Load portfolio demo credentials" : "Try the demo account"}
            </button>
            {fromPortfolio ? (
              <p
                className="mt-2 text-[11px] leading-snug"
                style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
              >
                Prefills email and password. Tap Sign in with email to continue.
              </p>
            ) : null}
          </div>

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
                "cursor-pointer font-semibold underline-offset-4 hover:underline",
                !isConsole && "text-indigo-600",
              )}
              style={isConsole ? { color: TOKENS.primary } : undefined}
            >
              Create one
            </Link>
          </p>
        </AuthCard>

        <p
          className={cn(
            "mt-6 text-center text-[11px] font-medium tracking-wide lg:hidden",
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
