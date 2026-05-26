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
import {
  DEMO_ACCOUNT,
  isDemoAccountEmail,
  PORTFOLIO_DEMO_QUERY_KEY,
  PORTFOLIO_DEMO_QUERY_VALUE,
} from "@/lib/demo-credentials"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import {
  buildFieldErrors,
  formNoValidate,
  hasFieldErrors,
  requireEmail,
  requireField,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { FormFieldError, formFieldAria } from "@/components/forms/form-field-error"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [formError, setFormError] = useState("")
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } =
    useFormFieldErrors<"email" | "password">()
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const fromPortfolio =
    searchParams.get(PORTFOLIO_DEMO_QUERY_KEY) === PORTFOLIO_DEMO_QUERY_VALUE

  const fillDemoCredentials = useCallback(() => {
    setFormError("")
    clearFieldErrors()
    setEmail(DEMO_ACCOUNT.email)
    setPassword(DEMO_ACCOUNT.password)
  }, [clearFieldErrors])

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    const errs = buildFieldErrors([
      ["email", requireEmail(email)],
      ["password", requireField(password, "Password")],
    ] as const)
    if (hasFieldErrors(errs)) {
      setFieldErrors(errs)
      return
    }
    clearFieldErrors()
    setCredentialsLoading(true)
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      })
      if (res?.error) {
        setFormError("Invalid email or password.")
        setCredentialsLoading(false)
        return
      }
      const destination = isDemoAccountEmail(email)
        ? "/dashboard?tour=1"
        : "/dashboard"
      router.push(destination)
      router.refresh()
    } catch {
      setFormError("Something went wrong. Please try again.")
      setCredentialsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setFormError("")
    clearFieldErrors()
    setGoogleLoading(true)
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch {
      setFormError("Failed to sign in with Google. Please try again.")
      setGoogleLoading(false)
    }
  }

  const busy = credentialsLoading || googleLoading

  return (
    <AuthPageFrame
      layout="split"
      aside={<LoginAuthAside />}
      navbarTrailing={
        <AppNavbarLink href="/signup" variant="console">
          Sign up
        </AppNavbarLink>
      }
    >
      <div className="w-full max-w-[26rem]">
        <div className="mb-6 flex justify-center lg:hidden">
          <CspBrandMark href="/" size="md" wordmark="responsive" />
        </div>

        <AuthCard>
          <h1
            className="font-[family-name:var(--font-login-display)] text-center text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[1.9rem]"
            style={{ color: TOKENS.onSurface }}
          >
            Welcome back
          </h1>
          <p
            className="mx-auto mt-2 max-w-[18rem] text-center text-sm leading-relaxed"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Sign in to your Wealth Console. Income, spend, and pillar headroom in one place.
          </p>

          {formError ? (
            <div
              className="mt-6 rounded-xl border px-4 py-3 text-sm leading-snug"
              style={{
                borderColor: "rgba(239,68,68,0.35)",
                background: "rgba(239,68,68,0.1)",
                color: "#fecaca",
              }}
              role="alert"
            >
              {formError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={busy}
            className={cn(
              "group relative mt-8 flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl py-3.5 pl-4 pr-5 text-[15px] font-semibold transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-55",
              consoleFocus,
            )}
            style={{
              background: TOKENS.surfaceHigh,
              color: TOKENS.onSurface,
              border: `1px solid ${TOKENS.outlineGhost}`,
              boxShadow: CARD_INSET,
            }}
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <GoogleMark
                className="h-5 w-5 shrink-0"
                style={{ color: TOKENS.onSurface }}
              />
            )}
            <span>{googleLoading ? "Signing in…" : "Continue with Google"}</span>
          </button>

          <AuthDivider />

          <form
            {...formNoValidate}
            onSubmit={(e) => void handleCredentials(e)}
            className="space-y-4"
            inert={credentialsLoading}
          >
            <fieldset disabled={credentialsLoading} className="min-w-0 space-y-4 border-0 p-0">
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-email"
                  className="text-xs font-semibold"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Email
                </label>
                <AuthTextInput
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearFieldError("email")
                  }}
                  disabled={busy}
                  placeholder="you@example.com"
                  {...formFieldAria("login-email", fieldErrors.email)}
                />
                <FormFieldError
                  controlId="login-email"
                  message={fieldErrors.email}
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Password
                </label>
                <AuthTextInput
                  id="login-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    clearFieldError("password")
                  }}
                  disabled={busy}
                  placeholder="••••••••"
                  {...formFieldAria("login-password", fieldErrors.password)}
                />
                <FormFieldError
                  controlId="login-password"
                  message={fieldErrors.password}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={busy}
              className={cn(
                "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold transition-opacity duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-55",
                consoleFocus,
              )}
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
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
              )}
              style={{ color: TOKENS.secondary }}
            >
              {fromPortfolio ? "Load portfolio demo credentials" : "Try the demo account"}
            </button>
            {fromPortfolio ? (
              <p
                className="mt-2 text-[11px] leading-snug"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Prefills email and password. Tap Sign in with email to continue.
              </p>
            ) : null}
          </div>

          <p
            className="mt-8 text-center text-sm"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            No account?{" "}
            <Link
              href="/signup"
              className="cursor-pointer font-semibold underline-offset-4 hover:underline"
              style={{ color: TOKENS.primary }}
            >
              Create one
            </Link>
          </p>
        </AuthCard>

        <p
          className="mt-6 text-center text-[11px] font-medium tracking-wide lg:hidden"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Conscious Spending Plan · Private by default
        </p>
      </div>
    </AuthPageFrame>
  )
}
