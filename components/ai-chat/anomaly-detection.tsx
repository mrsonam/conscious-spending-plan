"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  CheckCircle2,
} from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"

type Anomaly = {
  severity: "high" | "medium" | "low"
  title: string
  description: string
  category: string
}

const SEVERITY_CONFIG = {
  high: {
    Icon: AlertTriangle,
    color: "#f87171",
    bg: "rgba(248, 113, 113, 0.12)",
    label: "High",
  },
  medium: {
    Icon: AlertCircle,
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.12)",
    label: "Medium",
  },
  low: {
    Icon: Info,
    color: "#60a5fa",
    bg: "rgba(96, 165, 250, 0.12)",
    label: "Low",
  },
} as const

function AnomalySkeleton() {
  return (
    <div
      className="rounded-xl border px-4 py-3.5"
      style={{
        borderColor: TOKENS.outlineGhost,
        background: TOKENS.surface,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 h-5 w-5 animate-pulse rounded"
          style={{ background: TOKENS.surfaceHigh }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div
              className="h-3.5 w-28 animate-pulse rounded"
              style={{ background: TOKENS.surfaceHigh }}
            />
            <div
              className="h-4 w-14 animate-pulse rounded-full"
              style={{ background: TOKENS.surfaceHigh }}
            />
          </div>
          <div
            className="mt-2 h-3 w-full animate-pulse rounded"
            style={{ background: TOKENS.surfaceHigh }}
          />
        </div>
      </div>
    </div>
  )
}

export function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnomalies = useCallback(() => {
    fetch("/api/ai-anomaly-detection")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setAnomalies(json.anomalies ?? [])
      })
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  // Retry from the error state (event handler, so sync setState is fine here).
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchAnomalies()
  }, [fetchAnomalies])

  useEffect(() => {
    // State already initializes to loading — kick off the request only.
    fetchAnomalies()
  }, [fetchAnomalies])

  return (
    <section
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="anomaly-heading"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "rgba(248, 113, 113, 0.15)" }}
          >
            <ShieldAlert
              className="h-4 w-4"
              style={{ color: "#f87171" }}
            />
          </div>
          <div>
            <h2
              id="anomaly-heading"
              className="text-[15px] font-semibold"
              style={{ color: TOKENS.onSurface }}
            >
              Anomaly Detection
            </h2>
            <p
              className="text-[11px]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Unusual transactions flagged by AI
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className={cn(
            "rounded-lg p-2 transition-colors disabled:opacity-40",
            consoleFocus,
          )}
          style={{ color: TOKENS.onSurfaceMuted }}
          aria-label="Refresh anomaly detection"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AnomalySkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div
          className="flex h-24 items-center justify-center rounded-xl text-[13px]"
          style={{
            background: TOKENS.surface,
            color: TOKENS.onSurfaceMuted,
          }}
        >
          {error}
        </div>
      ) : anomalies.length === 0 ? (
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-4"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.surface,
          }}
        >
          <CheckCircle2
            className="h-5 w-5 flex-shrink-0"
            style={{ color: TOKENS.primary }}
          />
          <div>
            <p
              className="text-[13px] font-medium"
              style={{ color: TOKENS.onSurface }}
            >
              All clear
            </p>
            <p
              className="text-[11px]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              No unusual transactions detected in the last 30 days.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((anomaly, i) => {
            const config = SEVERITY_CONFIG[anomaly.severity] ?? SEVERITY_CONFIG.low
            const { Icon, color, bg, label } = config

            return (
              <div
                key={i}
                className="rounded-xl border px-4 py-3.5"
                style={{
                  borderColor: `${color}30`,
                  background: TOKENS.surface,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: bg }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="text-[13px] font-semibold"
                        style={{ color: TOKENS.onSurface }}
                      >
                        {anomaly.title}
                      </p>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                        style={{ background: bg, color }}
                      >
                        {label}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        {anomaly.category}
                      </span>
                    </div>
                    <p
                      className="mt-1 text-[12px] leading-relaxed"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {anomaly.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
