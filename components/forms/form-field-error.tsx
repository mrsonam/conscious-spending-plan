"use client"

import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { cn } from "@/lib/utils"

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
}

/** Inline validation message shown directly below a field control. */
export function FormFieldError({
  controlId,
  message,
  className,
}: FormFieldErrorProps) {
  if (!message) return null
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
