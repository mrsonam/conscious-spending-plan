"use client"

import { useEffect, useRef, useState } from "react"

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/**
 * Animates toward `target` with ease-out, starting from 0 on first mount and
 * from the previously displayed value on subsequent target changes. Snaps
 * straight to `target` under prefers-reduced-motion.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const reduced = prefersReducedMotion()
  const [value, setValue] = useState(() => (reduced ? target : 0))
  const [syncedTarget, setSyncedTarget] = useState<number | undefined>(() =>
    reduced ? target : undefined,
  )
  const displayedRef = useRef(value)

  useEffect(() => {
    displayedRef.current = value
  }, [value])

  // Reduced motion: keep the displayed value in lockstep with target, no
  // animation. Adjusting state during render (guarded against the last
  // synced target) is React's documented pattern for this, avoiding an
  // extra effect round-trip.
  if (reduced && syncedTarget !== target) {
    setSyncedTarget(target)
    setValue(target)
  }

  useEffect(() => {
    if (prefersReducedMotion()) return

    const from = displayedRef.current
    const to = target
    if (from === to) return

    const start = performance.now()
    let raf: number

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
