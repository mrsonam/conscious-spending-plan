"use client"

import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { cn } from "@/lib/utils"

export type FormFieldErrorVariant = "console" | "classic"

export function formFieldErrorId(controlId: string) {
  return `${controlId}-error`
}

export function formFieldAria(controlId: string, message?: string) {
  if (!message) return {}
  return {
    "aria-invalid": true as const,
    "aria-describedby": formFieldErrorId(controlId),
  }
}

type FormFieldErrorProps = {
  controlId: string
  message?: string
  className?: string
  variant?: FormFieldErrorVariant
}

/** Inline validation message shown directly below a field control. */
export function FormFieldError({
  controlId,
  message,
  className,
  variant = "console",
}: FormFieldErrorProps) {
  if (!message) return null
  if (variant === "classic") {
    return (
      <p
        id={formFieldErrorId(controlId)}
        role="alert"
        className={cn("mt-1 text-xs leading-snug text-red-600", className)}
      >
        {message}
      </p>
    )
  }
  return (
    <p
      id={formFieldErrorId(controlId)}
      role="alert"
      className={cn("mt-1 text-xs leading-snug", className)}
      style={{ color: ERROR_SOFT }}
    >
      {message}
    </p>
  )
}
