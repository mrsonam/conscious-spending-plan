"use client"

import { useState } from "react"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { toastError } from "@/lib/app-toast"
import { AccountMappingDialog } from "@/components/basiq/account-mapping-dialog"

export function ConnectBankButton() {
  const [connecting, setConnecting] = useState(false)
  const [basiqUserId, setBasiqUserId] = useState<string | null>(null)
  const [mappingOpen, setMappingOpen] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch("/api/basiq/connect", { method: "POST" })
      const data = (await res.json()) as { consentUrl?: string; basiqUserId?: string; error?: string }
      if (!res.ok || !data.consentUrl) {
        toastError(data.error ?? "Failed to start connection")
        return
      }

      setBasiqUserId(data.basiqUserId ?? null)

      const popup = window.open(data.consentUrl, "basiq-consent", "width=500,height=700")

      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer)
          setMappingOpen(true)
        }
      }, 500)
    } catch {
      toastError("Failed to connect bank")
    } finally {
      setConnecting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-50",
          consoleFocus,
        )}
        style={{
          background: TOKENS.primary,
          color: TOKENS.surface,
          boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
        }}
      >
        <Building2 className="h-4 w-4" />
        {connecting ? "Connecting…" : "Connect Bank Account"}
      </button>

      {basiqUserId && (
        <AccountMappingDialog
          open={mappingOpen}
          onOpenChange={setMappingOpen}
          basiqUserId={basiqUserId}
        />
      )}
    </>
  )
}
