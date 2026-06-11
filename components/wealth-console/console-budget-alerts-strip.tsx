"use client"

import Link from "next/link"
import { AlertTriangle, XCircle } from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { SpendingAlert } from "@/components/wealth-console/types"

const WARNING_BG = "rgba(232, 197, 71, 0.12)"
const DANGER_BG = "rgba(255, 180, 171, 0.12)"

function AlertPill({ alert }: { alert: SpendingAlert }) {
  const isWarning = alert.severity === "warning"
  const color = isWarning ? TOKENS.warning : TOKENS.loss
  const bg = isWarning ? WARNING_BG : DANGER_BG

  return (
    <Link
      href={BENTO.categoryTracking}
      className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 transition-opacity hover:opacity-80"
      style={{ background: bg, border: `1px solid ${color}22` }}
      aria-label={`${alert.category}: ${alert.message}`}
    >
      {isWarning ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color }} />
      ) : (
        <XCircle className="h-3.5 w-3.5 shrink-0" style={{ color }} />
      )}
      <span className="text-[12px] font-semibold" style={{ color }}>
        {alert.category}
      </span>
      <span
        className="hidden text-[11px] sm:inline"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        {alert.message}
      </span>
    </Link>
  )
}

export function ConsoleBudgetAlertsStrip({
  alerts,
}: {
  alerts: SpendingAlert[]
}) {
  if (alerts.length === 0) return null

  const dangerCount = alerts.filter((a) => a.severity === "danger").length
  const headerColor = dangerCount > 0 ? TOKENS.loss : TOKENS.warning

  return (
    <div
      className="mb-6 flex items-center gap-3 overflow-x-auto rounded-xl px-4 py-3 sm:mb-8"
      style={{
        background: TOKENS.surfaceLow,
        border: `1px solid ${headerColor}22`,
      }}
      role="alert"
      aria-label="Budget alerts"
    >
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{ color: headerColor }}
      >
        {dangerCount > 0 ? "Over budget" : "Near limit"}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        {alerts.map((a) => (
          <AlertPill key={`${a.category}-${a.severity}`} alert={a} />
        ))}
      </div>
    </div>
  )
}
