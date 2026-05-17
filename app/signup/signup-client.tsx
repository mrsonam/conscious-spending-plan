"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { AuthCard, AuthPageFrame } from "@/components/auth/auth-page-frame"
import { AuthDivider } from "@/components/auth/auth-divider"
import { SignupAuthAside } from "@/components/auth/signup-auth-aside"
import { AppNavbarLink } from "@/components/layout/app-navbar"
import { AuthTextInput } from "@/components/auth/auth-text-input"
import { GoogleMark } from "@/components/auth/google-mark"
import { PasswordRequirements } from "@/components/auth/password-requirements"
import { CspBrandMark } from "@/components/brand/csp-brand-mark"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import { PASSWORD_MAX_LENGTH, passwordMeetsPolicy } from "@/lib/password-policy"
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

export function SignupClient({ initialTheme }: { initialTheme: DashboardTheme }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [formError, setFormError] = useState("")
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } =
    useFormFieldErrors<"email" | "password" | "confirm">()
  const [submitLoading, setSubmitLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const isConsole = initialTheme === "console"
  const busy = submitLoading || googleLoading

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    const errs = buildFieldErrors([
      ["email", requireEmail(email)],
      ["password", requireField(password, "Password")],
      ["confirm", requireField(confirm, "Confirm password")],
    ] as const)
    if (password && confirm && password !== confirm) {
      errs.confirm = "Passwords do not match."
    }
    if (password && !passwordMeetsPolicy(password)) {
      errs.password = "Please meet all password requirements below."
    }
    if (hasFieldErrors(errs)) {
      setFieldErrors(errs)
      return
    }
    clearFieldErrors()
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
        setFormError(data.error ?? "Could not create account.")
        setSubmitLoading(false)
        return
      }

      const sign = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      })
      if (sign?.error) {
        setFormError("Account created but sign-in failed. Try logging in from the login page.")
        setSubmitLoading(false)
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setFormError("Something went wrong. Please try again.")
      setSubmitLoading(false)
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

  return (
    <AuthPageFrame
      theme={initialTheme}
      layout="split"
      aside={<SignupAuthAside theme={initialTheme} />}
      navbarTrailing={
        <AppNavbarLink href="/login" variant={isConsole ? "console" : "classic"}>
          Log in
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
            Create your account
          </h1>
          <p
            className={cn(
              "mx-auto mt-2 max-w-[18rem] text-center text-sm leading-relaxed",
              !isConsole && "text-slate-600",
            )}
            style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
          >
            Join the Wealth Console. Set up pillars and track spend in one calm workspace.
          </p>

          {formError ? (
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
              {formError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={busy}
            className={cn(
              "mt-8 flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl py-3.5 pl-4 pr-5 text-[15px] font-semibold transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-55",
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
            <span>{googleLoading ? "Continuing…" : "Continue with Google"}</span>
          </button>

          <AuthDivider theme={initialTheme} />

          <form
            {...formNoValidate}
            onSubmit={(e) => void handleRegister(e)}
            className="space-y-4"
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
                  disabled={busy}
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
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearFieldError("email")
                  }}
                  disabled={busy}
                  placeholder="you@example.com"
                  {...formFieldAria("signup-email", fieldErrors.email)}
                />
                <FormFieldError
                  controlId="signup-email"
                  message={fieldErrors.email}
                  variant={isConsole ? "console" : "classic"}
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
                  onChange={(e) => {
                    setPassword(e.target.value)
                    clearFieldError("password")
                  }}
                  maxLength={PASSWORD_MAX_LENGTH}
                  disabled={busy}
                  placeholder="••••••••"
                  {...formFieldAria("signup-password", fieldErrors.password)}
                />
                <FormFieldError
                  controlId="signup-password"
                  message={fieldErrors.password}
                  variant={isConsole ? "console" : "classic"}
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
                  onChange={(e) => {
                    setConfirm(e.target.value)
                    clearFieldError("confirm")
                  }}
                  maxLength={PASSWORD_MAX_LENGTH}
                  disabled={busy}
                  placeholder="••••••••"
                  {...formFieldAria("signup-confirm", fieldErrors.confirm)}
                />
                <FormFieldError
                  controlId="signup-confirm"
                  message={fieldErrors.confirm}
                  variant={isConsole ? "console" : "classic"}
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
              {submitLoading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
              ) : null}
              {submitLoading ? "Creating account…" : "Create account with email"}
            </button>
          </form>

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
                "cursor-pointer font-semibold underline-offset-4 hover:underline",
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
