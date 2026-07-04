"use client"

import { useEffect, useRef } from "react"

/**
 * Draw-on animation for an SVG line with `pathLength={100}` and
 * `strokeDasharray={100}`. With those attributes and no offset the line is
 * fully visible, so if this animation can't run (old browser, reduced
 * motion, any failure) the chart simply shows drawn — it can never be stuck
 * invisible. The offset only exists while the Web Animation is active.
 */
export function useLineDrawAnimation<T extends SVGElement>(enabled: boolean) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!enabled || !el || typeof el.animate !== "function") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const animation = el.animate(
      [{ strokeDashoffset: "100" }, { strokeDashoffset: "0" }],
      { duration: 1000, delay: 150, easing: "ease-out", fill: "backwards" },
    )
    return () => animation.cancel()
  }, [enabled])

  return ref
}
