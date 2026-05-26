"use client"

import * as React from "react"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

export const authInputClassName = cn(
  "w-full rounded-xl border px-3 py-2.5 text-[15px] outline-none transition-shadow placeholder:opacity-60 focus-visible:ring-2 focus-visible:ring-offset-0 disabled:opacity-50 sm:text-sm",
  "focus-visible:ring-[rgba(78,222,163,0.45)]",
)

export const authInputStyle: React.CSSProperties = {
  background: TOKENS.surfaceHigh,
  borderColor: TOKENS.outlineGhost,
  color: TOKENS.onSurface,
}

export const AuthTextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, style, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(authInputClassName, className)}
    style={{ ...authInputStyle, ...style }}
    {...props}
  />
))
AuthTextInput.displayName = "AuthTextInput"
