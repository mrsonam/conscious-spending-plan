/** Shared client + server password rules. */

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

/** Non-alphanumeric, non-whitespace (symbols and punctuation). */
function hasSymbolChar(p: string): boolean {
  return /[^A-Za-z0-9\s]/.test(p)
}

export const PASSWORD_REQUIREMENTS = [
  {
    id: "length" as const,
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p: string) =>
      p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "lower" as const,
    label: "One lowercase letter",
    test: (p: string) => /[a-z]/.test(p),
  },
  {
    id: "upper" as const,
    label: "One uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "number" as const,
    label: "One number",
    test: (p: string) => /[0-9]/.test(p),
  },
  {
    id: "special" as const,
    label: "One symbol (e.g. !@#$…)",
    test: hasSymbolChar,
  },
] as const

export type PasswordRequirementId = (typeof PASSWORD_REQUIREMENTS)[number]["id"]

export function getPasswordChecks(password: string) {
  return PASSWORD_REQUIREMENTS.map((r) => ({
    id: r.id,
    label: r.label,
    met: r.test(password),
  }))
}

export function passwordMeetsPolicy(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(password))
}

/** Returns a user-visible error, or null if valid. */
export function validatePasswordForCreate(password: string): string | null {
  if (typeof password !== "string") return "Password is required."
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`
  }
  if (!passwordMeetsPolicy(password)) {
    return "Password does not meet the requirements."
  }
  return null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmailFormat(email: string): boolean {
  if (!email || email.length > 254) return false
  return EMAIL_RE.test(normalizeEmail(email))
}

export function validateEmailField(email: string): string | null {
  const n = normalizeEmail(email)
  if (!n) return "Email is required."
  if (!isValidEmailFormat(email)) return "Enter a valid email address."
  return null
}
