"use client"

import type { DashboardTheme } from "@/lib/dashboard-theme"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

export type FormAlertVariant = "console" | "classic"

export function dashboardThemeToFormVariant(theme: DashboardTheme): FormAlertVariant {
 return theme === "console" ? "console" : "classic"
}

export type FormStatusMessage = {
 type: "success" | "error"
 text: string
} | null

type FormStatusAlertProps = {
 message: FormStatusMessage
 className?: string
 variant?: FormAlertVariant
}

export function FormStatusAlert({
 message,
 className,
 variant = "console",
}: FormStatusAlertProps) {
 if (!message) return null

 const isError = message.type === "error"

 if (variant === "classic") {
 return (
 <div
 role={isError ? "alert" : "status"}
 aria-live="polite"
 className={cn(
 "rounded-lg border px-3 py-2.5 text-sm",
 isError
 ? "border-red-200 bg-red-50 text-red-700"
 : "border-green-200 bg-green-50 text-green-700",
 className,
 )}
 >
 {message.text}
 </div>
 )
 }

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
 variant = "console",
}: {
 error: string | null | undefined
 className?: string
 variant?: FormAlertVariant
}) {
 if (!error) return null
 return (
 <FormStatusAlert
 message={{ type: "error", text: error }}
 className={className}
 variant={variant}
 />
 )
}
