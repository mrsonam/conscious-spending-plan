"use client"

import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

export type FormStatusMessage = {
  type: "success" | "error"
  text: string
} | null

type FormStatusAlertProps = {
  message: FormStatusMessage
  className?: string
}

export function FormStatusAlert({ message, className }: FormStatusAlertProps) {
  if (!message || message.type !== "error") return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn("rounded-xl border px-4 py-3 text-sm leading-snug", className)}
      style={{
        background: `color-mix(in srgb, ${ERROR_SOFT} 12%, ${TOKENS.surfaceLow})`,
        borderColor: `color-mix(in srgb, ${ERROR_SOFT} 35%, transparent)`,
        color: ERROR_SOFT,
      }}
    >
      {message.text}
    </div>
  )
}

export function FormErrorAlert({
  error,
  className,
}: {
  error: string | null | undefined
  className?: string
}) {
  if (!error) return null
  return (
    <FormStatusAlert
      message={{ type: "error", text: error }}
      className={className}
    />
  )
}
