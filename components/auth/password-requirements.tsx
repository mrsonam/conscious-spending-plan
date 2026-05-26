"use client"

import { Check, Circle } from "lucide-react"
import { getPasswordChecks } from "@/lib/password-policy"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

export function PasswordRequirements({
  password,
  className,
}: {
  password: string
  className?: string
}) {
  const checks = getPasswordChecks(password)

  return (
    <ul
      className={cn("mt-2 space-y-1.5 text-left text-xs leading-snug", className)}
      aria-live="polite"
      aria-label="Password requirements"
    >
      {checks.map(({ id, label, met }) => (
        <li key={id} className="flex items-start gap-2 rounded-lg px-1 py-0.5">
          {met ? (
            <Check
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: TOKENS.primary }}
              strokeWidth={2.5}
              aria-hidden
            />
          ) : (
            <Circle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50"
              style={{ color: TOKENS.onSurfaceMuted }}
              strokeWidth={2}
              aria-hidden
            />
          )}
          <span style={{ color: met ? TOKENS.primary : TOKENS.onSurfaceMuted }}>
            {label}
          </span>
        </li>
      ))}
    </ul>
  )
}
