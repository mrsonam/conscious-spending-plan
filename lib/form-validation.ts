import { validateEmailField } from "@/lib/password-policy"
import { parseMoneyInput } from "@/lib/money-input"

/** Use on `<form>` so the browser does not show native validation tooltips. */
export const formNoValidate = { noValidate: true as const }

export function firstFormError(
  ...errors: Array<string | null | undefined>
): string | null {
  for (const e of errors) {
    if (e) return e
  }
  return null
}

/** Non-empty text (trimmed). */
export function requireField(
  value: string | null | undefined,
  label: string,
): string | null {
  if (value == null || String(value).trim() === "") {
    return `${label} is required.`
  }
  return null
}

/** Non-empty select / combobox value. */
export function requireSelection(
  value: string | null | undefined,
  label: string,
): string | null {
  if (!value?.trim()) {
    return `Please select ${label}.`
  }
  return null
}

/** Positive number from a string input. */
export function requirePositiveNumber(
  value: string,
  label: string,
): string | null {
  const empty = requireField(value, label)
  if (empty) return empty
  const n = parseFloat(value)
  if (!Number.isFinite(n)) {
    return `Enter a valid ${label.toLowerCase()}.`
  }
  if (n <= 0) {
    return `${label} must be greater than 0.`
  }
  return null
}

/** Positive money amount (rounded via minor units). */
export function requirePositiveMoney(
  value: string,
  label: string,
  currencyCode: string
): string | null {
  const empty = requireField(value, label)
  if (empty) return empty
  try {
    const dollars = parseMoneyInput(value, currencyCode)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      return `${label} must be greater than 0.`
    }
  } catch {
    return `Enter a valid ${label.toLowerCase()}.`
  }
  return null
}

export function requireEmail(value: string): string | null {
  return validateEmailField(value)
}

export function requireDifferent(
  a: string,
  b: string,
  labelA: string,
  labelB: string,
): string | null {
  if (a && b && a === b) {
    return `${labelA} and ${labelB} must be different.`
  }
  return null
}

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>

/** Build a map of field keys to validation messages (skips null/empty). */
export function buildFieldErrors<K extends string>(
  checks: Array<[K, string | null | undefined]>,
): FieldErrors<K> {
  const out: FieldErrors<K> = {}
  for (const [key, err] of checks) {
    if (err) out[key] = err
  }
  return out
}

export function hasFieldErrors<K extends string>(
  errors: FieldErrors<K>,
): boolean {
  return Object.keys(errors).length > 0
}

export function clearFieldErrorKey<K extends string>(
  errors: FieldErrors<K>,
  key: K,
): FieldErrors<K> {
  if (!errors[key]) return errors
  const next = { ...errors }
  delete next[key]
  return next
}
