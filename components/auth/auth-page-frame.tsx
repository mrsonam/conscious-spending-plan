"use client"

import type { ReactNode } from "react"
import { Fraunces, DM_Sans } from "next/font/google"
import { AppNavbar } from "@/components/layout/app-navbar"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-login-display",
  display: "swap",
})

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-login-body",
  display: "swap",
})

export function AuthPageFrame({
  children,
  navbarTrailing,
  layout = "center",
  aside,
}: {
  children: ReactNode
  navbarTrailing?: ReactNode
  /** Split: optional left column (login marketing panel). */
  layout?: "center" | "split"
  aside?: ReactNode
}) {
  return (
    <div
      className={cn(
        display.variable,
        body.variable,
        "relative flex min-h-[100dvh] flex-col overflow-hidden font-[family-name:var(--font-login-body)]",
      )}
      style={{ backgroundColor: TOKENS.surface }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(78, 222, 163, 0.14), transparent 55%),
                radial-gradient(ellipse 60% 40% at 100% 100%, rgba(137, 206, 255, 0.08), transparent 50%),
                radial-gradient(ellipse 50% 35% at 0% 80%, rgba(185, 200, 222, 0.06), transparent 45%),
                ${TOKENS.surface}
              `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(rgba(218,226,253,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(218,226,253,0.04) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <AppNavbar
          variant="console"
          homeHref="/"
          maxWidth="full"
          trailing={navbarTrailing}
        />
        <div
          className={cn(
            "flex flex-1 p-4 sm:p-6 lg:p-8",
            layout === "split"
              ? "items-start justify-center"
              : "items-center justify-center",
          )}
        >
          {layout === "split" && aside ? (
            <div className="mx-auto grid w-full max-w-6xl items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,28rem)]">
              {aside}
              <div className="flex w-full justify-center lg:justify-end">{children}</div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center">{children}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-6 py-8 sm:px-9 sm:py-10"
      style={{
        background: `linear-gradient(165deg, ${TOKENS.surfaceContainer} 0%, ${TOKENS.surfaceLow} 100%)`,
        boxShadow: `0 0 0 1px ${TOKENS.outlineGhost}, 0 24px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(218,226,253,0.08)`,
      }}
    >
      {children}
    </div>
  )
}
