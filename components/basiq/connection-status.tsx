"use client"

import { Building2, RefreshCw, Unlink } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { formatInvestmentDateShort } from "@/components/investments/investment-shared"

type ConnectionStatusProps = {
  institutionName: string
  connectedAt: string
  linkedAccounts: Array<{ name: string; lastSyncedAt: string | null }>
  syncing: boolean
  onSync: () => void
  onDisconnect: () => void
}

export function ConnectionStatus({
  institutionName,
  connectedAt,
  linkedAccounts,
  syncing,
  onSync,
  onDisconnect,
}: ConnectionStatusProps) {
  const oldestSync = linkedAccounts
    .map((a) => a.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow, boxShadow: CARD_INSET }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: TOKENS.surfaceContainer }}
          >
            <Building2 className="h-5 w-5" style={{ color: TOKENS.primary }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
              {institutionName}
            </p>
            <p className="text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
              Connected {formatInvestmentDateShort(connectedAt)}
              {oldestSync && ` · Last sync ${formatInvestmentDateShort(oldestSync)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className={cn("rounded-lg p-2 transition-colors hover:bg-white/[0.04]", consoleFocus)}
            style={{ color: TOKENS.onSurfaceMuted }}
            title="Sync now"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            className={cn("rounded-lg p-2 transition-colors hover:bg-white/[0.04]", consoleFocus)}
            style={{ color: TOKENS.onSurfaceMuted }}
            title="Disconnect bank"
          >
            <Unlink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {linkedAccounts.length > 0 && (
        <div className="mt-3 space-y-1">
          {linkedAccounts.map((a) => (
            <p key={a.name} className="text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
              {a.name}
              {a.lastSyncedAt && (
                <span style={{ color: TOKENS.primary }}> · synced</span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
