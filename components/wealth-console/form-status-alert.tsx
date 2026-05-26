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
  if (!message) return null

  const isError = message.type === "error"

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className={cn("rounded-xl border px-4 py-3 text-sm leading-snug", className)}
      style={{
        background: isError
          ? `color-mix(in srgb, ${ERROR_SOFT} 12%, ${TOKENS.surfaceLow})`
          : `color-mix(in srgb, ${TOKENS.primary} 12%, ${TOKENS.surfaceLow})`,
        borderColor: isError
          ? `color-mix(in srgb, ${ERROR_SOFT} 35%, transparent)`
          : TOKENS.outlineGhost,
        color: isError ? ERROR_SOFT : TOKENS.primary,
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
