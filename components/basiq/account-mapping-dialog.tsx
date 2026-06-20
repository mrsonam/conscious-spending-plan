"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppSelect } from "@/components/ui/app-select"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { toastError, toastSuccess } from "@/lib/app-toast"

type BasiqAccount = {
  id: string
  name: string
  accountType: string
  balance: number
  institution: string
}

type AppAccount = {
  id: string
  name: string
  bankName: string
  accountType: string
}

type Mapping = {
  basiqAccountId: string
  target: string // appAccountId or "__new__"
}

type AccountMappingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  basiqUserId: string
}

export function AccountMappingDialog({
  open,
  onOpenChange,
  basiqUserId,
}: AccountMappingDialogProps) {
  const [basiqAccounts, setBasiqAccounts] = useState<BasiqAccount[]>([])
  const [appAccounts, setAppAccounts] = useState<AppAccount[]>([])
  const [connections, setConnections] = useState<Array<{ id: string; institution: { id: string; name: string } }>>([])
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !basiqUserId) return
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/basiq/accounts?basiqUserId=${basiqUserId}`)
        const data = (await res.json()) as {
          basiqAccounts: BasiqAccount[]
          appAccounts: AppAccount[]
          connections: Array<{ id: string; institution: { id: string; name: string } }>
        }
        setBasiqAccounts(data.basiqAccounts ?? [])
        setAppAccounts(data.appAccounts ?? [])
        setConnections(data.connections ?? [])
        setMappings(
          (data.basiqAccounts ?? []).map((a) => ({
            basiqAccountId: a.id,
            target: "__new__",
          }))
        )
      } catch {
        toastError("Failed to load bank accounts")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [open, basiqUserId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        basiqUserId,
        connections,
        mappings: mappings.map((m) => {
          const basiqAcc = basiqAccounts.find((a) => a.id === m.basiqAccountId)
          if (m.target === "__new__") {
            return {
              basiqAccountId: m.basiqAccountId,
              createNew: true,
              name: basiqAcc?.name ?? "Bank Account",
              accountType: basiqAcc?.accountType === "savings" ? "savings" : "checking",
            }
          }
          return { basiqAccountId: m.basiqAccountId, appAccountId: m.target }
        }),
      }
      const res = await fetch("/api/basiq/accounts/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toastError(data.error ?? "Failed to link accounts")
        return
      }
      toastSuccess("Bank accounts linked successfully!")
      onOpenChange(false)
      window.location.reload()
    } catch {
      toastError("Failed to save account mapping")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
        }}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
              Link bank accounts
            </DialogTitle>
            <DialogDescription style={{ color: TOKENS.onSurfaceMuted }}>
              Choose how each bank account maps to your app accounts.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="mt-6 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Loading accounts...
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {basiqAccounts.map((ba) => {
                const mapping = mappings.find((m) => m.basiqAccountId === ba.id)
                return (
                  <div
                    key={ba.id}
                    className="rounded-xl border p-4"
                    style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
                  >
                    <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                      {ba.name}
                    </p>
                    <p className="text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                      {ba.institution} · {ba.accountType}
                    </p>
                    <div className="mt-2">
                      <AppSelect
                        value={mapping?.target ?? "__new__"}
                        onValueChange={(v) =>
                          setMappings((prev) =>
                            prev.map((m) =>
                              m.basiqAccountId === ba.id ? { ...m, target: v } : m
                            )
                          )
                        }
                        options={[
                          { value: "__new__", label: `Create new "${ba.name}"` },
                          ...appAccounts.map((a) => ({
                            value: a.id,
                            label: `${a.name} (${a.bankName})`,
                          })),
                        ]}
                      />
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-50",
                  consoleFocus,
                )}
                style={{
                  background: TOKENS.primary,
                  color: TOKENS.surface,
                }}
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving…" : "Finish Setup"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
