"use client"

import { useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type LandingRevealProps = {
  children: ReactNode
  className?: string
  as?: "div" | "section"
} & Omit<ComponentPropsWithoutRef<"section">, "children" | "className">

/** Scroll-triggered reveal; respects prefers-reduced-motion. */
export function LandingReveal({ children, className, as: Tag = "div", ...props }: LandingRevealProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = Tag === "section" ? sectionRef.current : divRef.current
    if (!el) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      el.classList.add("landing-visible")
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add("landing-visible")
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [Tag])

  const revealClass = cn("landing-reveal", className)

  if (Tag === "section") {
    return (
      <section ref={sectionRef} className={revealClass} {...props}>
        {children}
      </section>
    )
  }

  return (
    <div ref={divRef} className={revealClass} {...props}>
      {children}
    </div>
  )
}
