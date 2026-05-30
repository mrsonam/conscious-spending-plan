"use client"

import { Toaster as Sonner } from "sonner"

import { TOKENS } from "@/lib/wealth-console-tokens"

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      closeButton
      richColors={false}
      toastOptions={{
        style: {
          background: TOKENS.surfaceContainer,
          border: `1px solid ${TOKENS.outlineGhost}`,
          color: TOKENS.onSurface,
        },
        classNames: {
          success: "!text-[#4edea3]",
          error: "!text-[#ffb4ab]",
          closeButton: "!border-[rgba(218,226,253,0.12)] !bg-[#131b2e] !text-[#dae2fd]",
        },
      }}
    />
  )
}
