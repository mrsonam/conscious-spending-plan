"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AuthCard, AuthPageFrame } from "@/components/auth/auth-page-frame"
import { AuthTextInput } from "@/components/auth/auth-text-input"
import { GoogleMark } from "@/components/auth/google-mark"
import { PasswordRequirements } from "@/components/auth/password-requirements"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import { PASSWORD_MAX_LENGTH, passwordMeetsPolicy } from "@/lib/password-policy"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export function SignupClient({ initialTheme }: { initialTheme: DashboardTheme }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const isConsole = initialTheme === "console"

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (!passwordMeetsPolicy(password)) {
      setError("Please meet all password requirements below.")
      return
    }
    setSubmitLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Could not create account.")
        setSubmitLoading(false)
        return
      }

      const sign = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      })
      if (sign?.error) {
        setError("Account created but sign-in failed. Try logging in from the login page.")
        setSubmitLoading(false)
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setSubmitLoading(false)
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
            Create your account
          </h1>

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

          <form
            onSubmit={(e) => void handleRegister(e)}
            className="mt-8 space-y-4"
            inert={submitLoading}
          >
            <fieldset disabled={submitLoading} className="min-w-0 space-y-4 border-0 p-0">
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="signup-name"
                className={cn("text-xs font-semibold", !isConsole && "text-slate-700")}
                style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
              >
                Name{" "}
                <span
                  className={cn("font-normal", !isConsole && "text-slate-500")}
                  style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
                >
                  (optional)
                </span>
              </label>
              <AuthTextInput
                id="signup-name"
                theme={initialTheme}
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitLoading}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="signup-email"
                className={cn("text-xs font-semibold", !isConsole && "text-slate-700")}
                style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
              >
                Email
              </label>
              <AuthTextInput
                id="signup-email"
                theme={initialTheme}
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitLoading}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="signup-password"
                className={cn("text-xs font-semibold", !isConsole && "text-slate-700")}
                style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
              >
                Password
              </label>
              <AuthTextInput
                id="signup-password"
                theme={initialTheme}
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={PASSWORD_MAX_LENGTH}
                disabled={submitLoading}
                placeholder="••••••••"
              />
              <PasswordRequirements password={password} theme={initialTheme} />
            </div>
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="signup-confirm"
                className={cn("text-xs font-semibold", !isConsole && "text-slate-700")}
                style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
              >
                Confirm password
              </label>
              <AuthTextInput
                id="signup-confirm"
                theme={initialTheme}
                type="password"
                name="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                maxLength={PASSWORD_MAX_LENGTH}
                disabled={submitLoading}
                placeholder="••••••••"
              />
            </div>
            </fieldset>

            <button
              type="submit"
              disabled={submitLoading || googleLoading}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
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
              {submitLoading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
              ) : null}
              {submitLoading ? "Creating account…" : "Create account"}
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
                className={cn("px-3 text-xs font-medium", !isConsole && "bg-white/90 text-slate-500")}
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
            disabled={googleLoading || submitLoading}
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
              {googleLoading ? "Continuing…" : "Continue with Google"}
            </span>
          </button>

          <p
            className={cn(
              "mt-8 text-center text-sm",
              !isConsole && "text-slate-600",
            )}
            style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              className={cn(
                "font-semibold underline-offset-4 hover:underline",
                !isConsole && "text-indigo-600",
              )}
              style={isConsole ? { color: TOKENS.primary } : undefined}
            >
              Sign in
            </Link>
          </p>

          <p
            className={cn(
              "mt-4 text-center text-xs leading-relaxed",
              !isConsole && "text-slate-500",
            )}
            style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
          >
            By continuing, you agree to use this app under your own account.
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
