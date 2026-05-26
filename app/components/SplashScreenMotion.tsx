"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { TOKENS } from "@/lib/wealth-console-tokens"
import {
  markSplashSeen,
  SPLASH_DISMISS_MS_MAX,
  splashDismissMs,
} from "@/lib/splash-policy"

const SplashMarquee = dynamic(
  () => import("./SplashMarquee").then((m) => ({ default: m.SplashMarquee })),
  { ssr: false },
)

const SPLASH_EASE = [0.32, 0.72, 0, 1] as const
const RETURNING_EXIT_MS = 0.22

type SplashScreenMotionProps = {
  onLanding: boolean
  onFinished: () => void
}

export function SplashScreenMotion({
  onLanding,
  onFinished,
}: SplashScreenMotionProps) {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(true)
  const [marqueeReady, setMarqueeReady] = useState(false)

  useEffect(() => {
    const dismissMs = splashDismissMs(onLanding)

    const dismiss = () => {
      markSplashSeen()
      setVisible(false)
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
  }, [onLanding])

  useEffect(() => {
    const schedule =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 1)
    const id = schedule(() => setMarqueeReady(true))
    return () => {
      if (typeof cancelIdleCallback !== "undefined" && typeof id === "number") {
        cancelIdleCallback(id)
      } else {
        clearTimeout(id as number)
      }
    }
  }, [])

  const quickExit = splashDismissMs(onLanding) < 500

  const exitTransition =
    reduceMotion || quickExit
      ? { opacity: 0, transition: { duration: RETURNING_EXIT_MS } }
      : {
          clipPath: "circle(0% at 50% 38%)",
          transition: { duration: 0.68, ease: SPLASH_EASE, delay: 0.1 },
        }

  return (
    <AnimatePresence onExitComplete={onFinished}>
      {visible && (
        <motion.div
          key="csp-splash"
          className="splash-root splash-root--console safe-area-splash"
          aria-busy="true"
          aria-label="Loading Conscious Spending Plan"
          initial={false}
          exit={exitTransition}
          style={
            reduceMotion || quickExit
              ? undefined
              : { clipPath: "circle(150% at 50% 38%)" }
          }
        >
          {marqueeReady ? (
            <SplashMarquee isConsole paused={!!reduceMotion} />
          ) : (
            <div className="splash-grid splash-grid--marquee-placeholder" aria-hidden />
          )}

          <div className="splash-grid" aria-hidden />

          <div className="splash-content">
            <motion.div
              className="splash-hero"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0.2 }
                  : { type: "spring", duration: 0.55, bounce: 0.18, delay: 0.05 }
              }
            >
              <Image
                src="/icon.svg"
                alt=""
                width={128}
                height={128}
                className="splash-logo-img"
                priority
              />
            </motion.div>

            <motion.div
              className="splash-copy"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: SPLASH_EASE, delay: 0.22 }}
            >
              <p
                className="splash-eyebrow"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Conscious spending
              </p>
            </motion.div>

            <motion.div
              className="splash-loader"
              aria-hidden
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: SPLASH_EASE, delay: 0.32 }}
            >
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
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
