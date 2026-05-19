"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { SplashMarquee } from "./SplashMarquee"

const SPLASH_EASE = [0.32, 0.72, 0, 1] as const

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

export function SplashScreen({ initialTheme }: { initialTheme: DashboardTheme }) {
  const reduceMotion = useReducedMotion()
  const [show, setShow] = useState(true)
  const onLanding = useSyncExternalStore(
    subscribeNoop,
    getLandingSnapshot,
    getServerLandingSnapshot,
  )

  const isConsole = initialTheme === "console" || onLanding

  useEffect(() => {
    const dismiss = () => setShow(false)

    if (document.readyState === "complete") {
      const t = setTimeout(dismiss, 1100)
      return () => clearTimeout(t)
    }

    const onLoad = () => setTimeout(dismiss, 1100)
    window.addEventListener("load", onLoad)
    const maxTimer = setTimeout(dismiss, 2400)
    return () => {
      clearTimeout(maxTimer)
      window.removeEventListener("load", onLoad)
    }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="csp-splash"
          className={`splash-root safe-area-splash ${isConsole ? "splash-root--console" : "splash-root--classic"}`}
          aria-busy="true"
          aria-label="Loading Conscious Spending Plan"
          initial={false}
          exit={
            reduceMotion
              ? { opacity: 0, transition: { duration: 0.22 } }
              : {
                  clipPath: "circle(0% at 50% 38%)",
                  transition: { duration: 0.68, ease: SPLASH_EASE, delay: 0.1 },
                }
          }
          style={reduceMotion ? undefined : { clipPath: "circle(150% at 50% 38%)" }}
        >
          <SplashMarquee isConsole={isConsole} paused={!!reduceMotion} />

          {isConsole ? <div className="splash-grid" aria-hidden /> : null}

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
              exit={
                reduceMotion
                  ? { opacity: 0, transition: { duration: 0.18 } }
                  : {
                      scale: 1.2,
                      opacity: 0,
                      filter: "blur(10px)",
                      transition: { duration: 0.44, ease: SPLASH_EASE, delay: 0.08 },
                    }
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
              exit={
                reduceMotion
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : { opacity: 0, y: -16, transition: { duration: 0.28, ease: SPLASH_EASE } }
              }
            >
              <p
                className={`splash-eyebrow ${isConsole ? "" : "text-indigo-600/90"}`}
                style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
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
              exit={
                reduceMotion
                  ? { opacity: 0, transition: { duration: 0.12 } }
                  : { opacity: 0, y: 10, scale: 0.96, transition: { duration: 0.22 } }
              }
            >
              <div className="splash-loader-dots">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="splash-loader-dot"
                    style={{
                      backgroundColor: isConsole ? TOKENS.primary : "#6366f1",
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
