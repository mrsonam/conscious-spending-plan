/** Shared helpers for form validation and API error messages. */

export function parseApiError(
  data: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error
    if (typeof err === "string" && err.trim()) return err.trim()
  }
  return fallback
}

const AUTH_CALLBACK_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  OAuthSignin: "Could not start sign-in. Please try again.",
  OAuthCallback: "Sign-in was interrupted. Please try again.",
  OAuthCreateAccount: "Could not create your account with this provider.",
  EmailCreateAccount: "Could not create your account.",
  Callback: "Sign-in failed. Please try again.",
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method. Use email and password, or the provider you signed up with.",
  EmailSignin: "Could not send a sign-in email.",
  SessionRequired: "Please sign in to continue.",
  AccessDenied: "Access was denied.",
  Configuration: "Sign-in is not configured correctly. Contact support.",
  Default: "Sign-in failed. Please try again.",
}

export function authCallbackErrorMessage(code: string | null | undefined): string | null {
  if (!code?.trim()) return null
  return AUTH_CALLBACK_MESSAGES[code] ?? AUTH_CALLBACK_MESSAGES.Default
}
