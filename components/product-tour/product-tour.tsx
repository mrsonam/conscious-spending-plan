"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ArrowRight, X } from "lucide-react"
import {
  dispatchOpenSidebar,
  PRODUCT_TOUR_STEPS,
  type ProductTourStep,
} from "@/lib/product-tour"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

const PAD = 10
const Z_OVERLAY = 10050
const Z_TOOLTIP = 10051
const TOOLTIP_W = 320
const TOOLTIP_H = 280
const DIM_COLOR = "rgba(5, 10, 20, 0.82)"
const COLLAPSED_SIZE = 2

export type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

/** Full-screen dim via box-shadow (animates to/from sidebar targets). */
function collapsedSpotlightRect(): SpotlightRect {
  return {
    top: window.innerHeight / 2 - COLLAPSED_SIZE / 2,
    left: window.innerWidth / 2 - COLLAPSED_SIZE / 2,
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
  }
}

function measureTarget(selector: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tour="${selector}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  }
}

function centeredTooltipPosition(): React.CSSProperties {
  const top = Math.max(16, (window.innerHeight - TOOLTIP_H) / 2)
  const left = Math.max(16, (window.innerWidth - TOOLTIP_W) / 2)
  return { position: "fixed", top, left }
}

function anchoredTooltipPosition(
  next: SpotlightRect,
  currentStep: ProductTourStep,
): React.CSSProperties {
  const gap = 16
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top = next.top
  let left = next.left + next.width + gap

  if (currentStep.placement === "bottom" || left + TOOLTIP_W > vw - 16) {
    left = Math.max(16, Math.min(next.left, vw - TOOLTIP_W - 16))
    top = next.top + next.height + gap
  }

  if (top + TOOLTIP_H > vh - 16) {
    top = Math.max(16, vh - TOOLTIP_H - 16)
  }
  if (top < 16) top = 16

  return { position: "fixed", top, left }
}

function spotlightBoxShadow(collapsed: boolean): string {
  const dim = `0 0 0 9999px ${DIM_COLOR}`
  if (collapsed) return dim
  return `${dim}, 0 0 0 2px ${TOKENS.primary}, 0 0 28px color-mix(in srgb, ${TOKENS.primary} 32%, transparent)`
}

function TourSpotlight({
  rect,
  centered,
  motionReady,
}: {
  rect: SpotlightRect
  centered: boolean
  motionReady: boolean
}) {
  return (
    <div
      className={cn(
        "product-tour-spotlight-hole pointer-events-none fixed",
        centered && "is-collapsed",
        motionReady && "is-ready",
      )}
      style={{
        zIndex: Z_OVERLAY,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: centered ? "50%" : "0.75rem",
        boxShadow: spotlightBoxShadow(centered),
      }}
      aria-hidden
    />
  )
}

function TooltipCard({
  step,
  stepIndex,
  total,
  onBack,
  onNext,
  onSkip,
  isLast,
  contentVisible,
}: {
  step: ProductTourStep
  stepIndex: number
  total: number
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  isLast: boolean
  contentVisible: boolean
}) {
  const progress = ((stepIndex + 1) / total) * 100

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-tour-title"
      className="w-[min(100vw-2rem,22rem)] rounded-2xl border p-5 shadow-2xl sm:w-80"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div
        className={cn(
          "product-tour-step-content",
          contentVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{
          transition: "opacity 220ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: TOKENS.primary }}
          >
            Tour {stepIndex + 1} of {total}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg p-1 transition-colors hover:bg-white/10"
            style={{ color: TOKENS.onSurfaceMuted }}
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="mb-3 h-1 overflow-hidden rounded-full"
          style={{ background: "rgba(218,226,253,0.1)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: TOKENS.primary,
              transition: "width 480ms cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          />
        </div>

        <h2
          id="product-tour-title"
          className="text-lg font-semibold tracking-tight"
          style={{ color: TOKENS.onSurface }}
        >
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
          {step.body}
        </p>

        <div className="mt-5 flex gap-2">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={onBack}
              className="product-tour-btn-secondary inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium"
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurface,
                background: TOKENS.surfaceHigh,
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={onNext}
            className="product-tour-btn-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold"
            style={{ background: TOKENS.primary, color: TOKENS.onPrimary }}
          >
            {isLast ? "Start exploring" : "Next"}
            {!isLast ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full text-center text-xs underline-offset-2 hover:underline"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Skip tour
        </button>
      </div>
    </div>
  )
}

type Props = {
  active: boolean
  onComplete: () => void
}

export function ProductTour({ active, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<SpotlightRect>(() =>
    typeof window !== "undefined" ? collapsedSpotlightRect() : { top: 0, left: 0, width: 2, height: 2 },
  )
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>(() =>
    typeof window !== "undefined" ? centeredTooltipPosition() : { position: "fixed", top: 0, left: 0 },
  )
  const [mounted, setMounted] = useState(false)
  const [motionReady, setMotionReady] = useState(false)
  const [contentVisible, setContentVisible] = useState(true)
  const measureGenerationRef = useRef(0)

  const step = PRODUCT_TOUR_STEPS[stepIndex]!
  const isLast = stepIndex === PRODUCT_TOUR_STEPS.length - 1
  const isCenteredStep = !step.target

  const invalidateMeasure = useCallback(() => {
    measureGenerationRef.current += 1
  }, [])

  const applyLayout = useCallback((currentStep: ProductTourStep) => {
    if (!currentStep.target) {
      setRect(collapsedSpotlightRect())
      setTooltipStyle(centeredTooltipPosition())
      return
    }

    const next = measureTarget(currentStep.target)
    if (next) {
      setRect(next)
      setTooltipStyle(anchoredTooltipPosition(next, currentStep))
    }
  }, [])

  const measureStep = useCallback(
    (currentStep: ProductTourStep) => {
      if (typeof window === "undefined") return

      if (!currentStep.target) {
        applyLayout(currentStep)
        return
      }

      if (window.matchMedia("(max-width: 1023px)").matches) {
        dispatchOpenSidebar()
      }

      const target = document.querySelector(`[data-tour="${currentStep.target}"]`)
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      target?.scrollIntoView({ block: "nearest", behavior: "auto" })

      applyLayout(currentStep)

      if (reducedMotion) return

      const generation = measureGenerationRef.current
      requestAnimationFrame(() => {
        if (generation !== measureGenerationRef.current) return
        applyLayout(currentStep)
        requestAnimationFrame(() => {
          if (generation !== measureGenerationRef.current) return
          applyLayout(currentStep)
        })
      })
    },
    [applyLayout],
  )

  useEffect(() => {
    // Canonical client-mount flag for createPortal; must flip after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const finish = useCallback(() => {
    void fetch("/api/product-tour/complete", { method: "POST" })
    onComplete()
  }, [onComplete])

  useLayoutEffect(() => {
    if (!active) return

    // Hide, measure DOM, then reveal: must run before paint to avoid flicker.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContentVisible(false)
    measureStep(step)

    const contentDelay = isCenteredStep ? 200 : 160
    const contentTimer = window.setTimeout(() => setContentVisible(true), contentDelay)

    return () => {
      window.clearTimeout(contentTimer)
      invalidateMeasure()
    }
  }, [active, stepIndex, step, measureStep, invalidateMeasure, isCenteredStep])

  useLayoutEffect(() => {
    if (!active) return
    const onResize = () => measureStep(step)
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onResize, true)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize, true)
    }
  }, [active, step, measureStep])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        finish()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active, finish])

  useEffect(() => {
    if (active) {
      // Tour reset is coupled to body scroll-lock and rAF timing.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex(0)
      setMotionReady(false)
      setRect(collapsedSpotlightRect())
      setTooltipStyle(centeredTooltipPosition())
      document.body.style.overflow = "hidden"
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMotionReady(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setMotionReady(false)
    document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [active])

  const goNext = () => {
    if (isLast) {
      finish()
      return
    }
    setStepIndex((i) => i + 1)
  }

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1))

  if (!active || !mounted) return null

  return createPortal(
    <div
      className="product-tour-root"
      data-tour-motion-ready={motionReady ? "" : undefined}
      aria-live="polite"
    >
      <TourSpotlight rect={rect} centered={isCenteredStep} motionReady={motionReady} />
      <div
        className={cn("product-tour-tooltip-shell", motionReady && "is-ready")}
        style={{ zIndex: Z_TOOLTIP, ...tooltipStyle }}
      >
        <TooltipCard
          step={step}
          stepIndex={stepIndex}
          total={PRODUCT_TOUR_STEPS.length}
          onBack={goBack}
          onNext={goNext}
          onSkip={finish}
          isLast={isLast}
          contentVisible={contentVisible}
        />
      </div>
    </div>,
    document.body,
  )
}
