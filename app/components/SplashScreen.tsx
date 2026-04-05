"use client"

import { useState, useEffect } from "react"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import { TOKENS } from "@/lib/wealth-console-tokens"

export function SplashScreen({ initialTheme }: { initialTheme: DashboardTheme }) {
  const [isVisible, setIsVisible] = useState(true)
  const [isFading, setIsFading] = useState(false)
  const isConsole = initialTheme === "console"

  useEffect(() => {
    const hideSplash = () => {
      setIsFading(true)
      setTimeout(() => {
        setIsVisible(false)
      }, 300)
    }

    if (document.readyState === "complete") {
      setTimeout(hideSplash, 800)
    } else {
      window.addEventListener("load", () => {
        setTimeout(hideSplash, 800)
      })
      const maxTimer = setTimeout(hideSplash, 2000)
      return () => {
        clearTimeout(maxTimer)
        window.removeEventListener("load", hideSplash)
      }
    }
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center safe-area-splash transition-opacity duration-300 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      style={
        isConsole
          ? {
              background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(78, 222, 163, 0.12), transparent 50%), ${TOKENS.surface}`,
            }
          : {
              background:
                "linear-gradient(165deg, #f8fafc 0%, #eef2ff 45%, #e0e7ff 100%)",
            }
      }
    >
      {isConsole ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: `linear-gradient(rgba(218,226,253,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(218,226,253,0.05) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
          aria-hidden
        />
      ) : (
        <div
          className="pointer-events-none absolute -left-16 top-1/4 h-64 w-64 rounded-full bg-indigo-400/30 blur-[72px]"
          aria-hidden
        />
      )}

      <div className="relative z-[1] flex flex-col items-center justify-center space-y-5 px-6">
        <div
          className="relative flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36"
          style={
            isConsole
              ? {
                  filter: `drop-shadow(0 0 28px rgba(78, 222, 163, 0.25))`,
                }
              : {
                  filter: "drop-shadow(0 12px 32px rgba(79, 70, 229, 0.15))",
                }
          }
        >
          {isConsole ? (
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                background: `linear-gradient(145deg, rgba(78,222,163,0.12), transparent 55%)`,
                border: `1px solid ${TOKENS.outlineGhost}`,
              }}
              aria-hidden
            />
          ) : null}
          <img
            src="/icon.svg"
            alt=""
            className="relative z-[1] h-full w-full object-contain"
          />
        </div>

        <div className="text-center">
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${
              isConsole ? "" : "text-indigo-600/90"
            }`}
            style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
          >
            Conscious spending
          </p>
          <h1
            className={`mt-2 text-xl font-semibold tracking-tight sm:text-2xl ${
              isConsole ? "" : "text-slate-900"
            }`}
            style={isConsole ? { color: TOKENS.onSurface } : undefined}
          >
            Conscious Spending Plan
          </h1>
        </div>

        <div className="flex items-center gap-1.5 pt-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 150}ms`,
                backgroundColor: isConsole ? TOKENS.primary : "#6366f1",
              }}
            />
          ))}
        </div>

        <div className="pt-2" aria-hidden>
          <div
            className="h-1 w-24 overflow-hidden rounded-full"
            style={{
              backgroundColor: isConsole ? "rgba(218,226,253,0.1)" : "rgba(99,102,241,0.15)",
            }}
          >
            <div
              className="splash-bar-inner h-full w-1/2"
              style={{
                background: isConsole
                  ? `linear-gradient(90deg, transparent, ${TOKENS.primary}, transparent)`
                  : "linear-gradient(90deg, transparent, #6366f1, transparent)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
