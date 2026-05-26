"use client"

import dynamic from "next/dynamic"
import { useState, useEffect, useSyncExternalStore } from "react"
import Image from "next/image"
import { TOKENS } from "@/lib/wealth-console-tokens"
import {
  hasSeenSplash,
  markSplashSeen,
  SPLASH_DISMISS_MS_MAX,
  splashDismissMs,
} from "@/lib/splash-policy"

const SplashScreenMotion = dynamic(
  () =>
    import("./SplashScreenMotion").then((m) => ({ default: m.SplashScreenMotion })),
  { ssr: false },
)

function isLandingPath(pathname: string) {
  return pathname === "/" || pathname === ""
}

function getLandingSnapshot() {
  return isLandingPath(window.location.pathname)
}

function getServerLandingSnapshot() {
  return false
}

function subscribeNoop() {
  return () => {}
}

function useReturningVisitor() {
  return useSyncExternalStore(
    subscribeNoop,
    () => hasSeenSplash(),
    () => false,
  )
}

function LightSplash({ exiting }: { exiting: boolean }) {
  return (
    <div
      className={`splash-root splash-root--console splash-root--light safe-area-splash${exiting ? " splash-root--light-exit" : ""}`}
      aria-busy="true"
      aria-label="Loading Conscious Spending Plan"
    >
      <div className="splash-grid" aria-hidden />
      <div className="splash-content splash-content--light">
        <div className="splash-hero splash-hero--light">
          <Image
            src="/icon.svg"
            alt=""
            width={128}
            height={128}
            className="splash-logo-img"
            priority
          />
        </div>
        <div className="splash-copy">
          <p
            className="splash-eyebrow"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Conscious spending
          </p>
        </div>
        <div className="splash-loader" aria-hidden>
          <div className="splash-loader-dots">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="splash-loader-dot"
                style={{
                  backgroundColor: TOKENS.primary,
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SplashScreen() {
  const [show, setShow] = useState(true)
  const [exiting, setExiting] = useState(false)
  const onLanding = useSyncExternalStore(
    subscribeNoop,
    getLandingSnapshot,
    getServerLandingSnapshot,
  )
  const returning = useReturningVisitor()
  const lightVisual = onLanding || returning

  useEffect(() => {
    document.documentElement.classList.add("csp-splash-handoff")
  }, [])

  useEffect(() => {
    if (!lightVisual) return

    const dismissMs = splashDismissMs(onLanding)

    const dismiss = () => {
      markSplashSeen()
      setExiting(true)
      window.setTimeout(() => setShow(false), 220)
    }

    if (document.readyState === "complete") {
      const t = setTimeout(dismiss, dismissMs)
      return () => clearTimeout(t)
    }

    const onLoad = () => setTimeout(dismiss, dismissMs)
    window.addEventListener("load", onLoad)
    const maxTimer = setTimeout(dismiss, SPLASH_DISMISS_MS_MAX)
    return () => {
      clearTimeout(maxTimer)
      window.removeEventListener("load", onLoad)
    }
  }, [onLanding, lightVisual])

  if (!show) {
    return null
  }

  if (lightVisual) {
    return <LightSplash exiting={exiting} />
  }

  return (
    <SplashScreenMotion
      onLanding={onLanding}
      onFinished={() => setShow(false)}
    />
  )
}
