"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw, Zap } from "lucide-react"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { Button } from "@/components/ui/button"
import { toastSuccess, toastError } from "@/lib/app-toast"

type ConnectionState = {
  webhookToken: string
  hasSecret: boolean
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

function webhookUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/api/redbark/webhook/${token}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
      style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
    >
      <Copy className="h-3 w-3" />
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

export function RedbarkSetupSection() {
  const [connection, setConnection] = useState<ConnectionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [secret, setSecret] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [savingApiKey, setSavingApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRotateField, setShowRotateField] = useState(false)

  useEffect(() => {
    fetch("/api/redbark/connection")
      .then((r) => r.json())
      .then((d: { connection: ConnectionState }) => setConnection(d.connection))
      .catch(() => setConnection(null))
      .finally(() => setLoading(false))
  }, [])

  const saveSecret = async () => {
    if (!secret.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/redbark/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookSecret: secret }),
      })
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? "Failed to save")
        toastError(d.error ?? "Failed to save")
        return
      }
      const d = (await res.json()) as { connection: ConnectionState }
      setConnection(d.connection)
      setSecret("")
      setShowRotateField(false)
      toastSuccess("Signing secret saved. Redbark is active!")
    } catch {
      setError("An error occurred")
      toastError("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const saveApiKey = async () => {
    if (!apiKey.trim()) return
    setSavingApiKey(true)
    setError(null)
    try {
      const res = await fetch("/api/redbark/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      })
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? "Failed to save")
        return
      }
      const d = (await res.json()) as { connection: ConnectionState }
      setConnection(d.connection)
      setApiKey("")
      toastSuccess("API key saved!")
    } catch {
      setError("An error occurred")
    } finally {
      setSavingApiKey(false)
    }
  }

  const disconnect = async () => {
    setSaving(true)
    setError(null)
    try {
      await fetch("/api/redbark/connection", { method: "DELETE" })
      setConnection(null)
      setSecret("")
      setShowRotateField(false)
      toastSuccess("Redbark disconnected")
    } catch {
      setError("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const active = !!connection?.hasSecret

  return (
    <div>
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5" style={{ color: active ? TOKENS.primary : TOKENS.onSurfaceMuted }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
          Redbark Sync
        </p>
        {active && (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: "color-mix(in srgb, #4edea3 12%, transparent)",
              color: TOKENS.primary,
              border: "1px solid color-mix(in srgb, #4edea3 25%, transparent)",
            }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        )}
      </div>

      <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
        Automatic bank transaction import
      </p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
        Connect Redbark Sync to automatically import transactions from your Australian bank accounts via CDR.{" "}
        <a
          href="https://app.redbark.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 underline underline-offset-2"
          style={{ color: TOKENS.secondary }}
        >
          Open Redbark
          <ExternalLink className="h-3 w-3" />
        </a>
      </p>

      {loading ? (
        <div className="mt-4 flex items-center gap-2" style={{ color: TOKENS.onSurfaceMuted }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Loading…</span>
        </div>
      ) : connection ? (
        <div className="mt-4 space-y-5">
          {/* Step 1, always show webhook URL */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
              Step 1, Your webhook URL
            </p>
            <div className="flex items-center gap-2">
              <code
                className="min-w-0 flex-1 truncate rounded-lg border px-3 py-2 font-mono text-xs"
                style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow, color: TOKENS.onSurface }}
              >
                {webhookUrl(connection.webhookToken)}
              </code>
              <CopyButton text={webhookUrl(connection.webhookToken)} />
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              Add this as a <strong style={{ color: TOKENS.onSurface }}>Webhook</strong> destination in{" "}
              <a href="https://app.redbark.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: TOKENS.secondary }}>
                Redbark
              </a>
              {" "}→ click <strong style={{ color: TOKENS.onSurface }}>Generate Secret</strong> → copy the secret.
            </p>
          </div>

          {/* Step 2, signing secret */}
          {active && !showRotateField ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                Step 2, Signing secret
              </p>
              <p className="text-xs" style={{ color: TOKENS.primary }}>
                <CheckCircle2 className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
                Signing secret saved. Webhook is active.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                Step 2, {showRotateField ? "New signing secret" : "Paste signing secret from Redbark"}
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Paste the secret Redbark generated"
                  disabled={saving}
                  className="flex-1 min-w-0 rounded-lg border bg-transparent px-3 py-2 text-xs placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#4edea3]/40 disabled:opacity-50"
                  style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                />
                <button
                  type="button"
                  onClick={() => void saveSecret()}
                  disabled={saving || !secret.trim()}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                  style={{ background: TOKENS.primary, color: TOKENS.surface }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                {showRotateField && (
                  <button
                    type="button"
                    onClick={() => { setShowRotateField(false); setSecret("") }}
                    className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
                    style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3, API key for account picker */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
              Step 3, API key <span className="normal-case tracking-normal font-normal opacity-60">(enables account picker)</span>
            </p>
            {connection?.hasApiKey ? (
              <p className="text-xs" style={{ color: TOKENS.primary }}>
                <CheckCircle2 className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
                API key saved. Account picker is enabled.
              </p>
            ) : (
              <>
                <p className="mb-2 text-[10px] leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                  Create an API key in{" "}
                  <a href="https://app.redbark.com/settings" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: TOKENS.secondary }}>
                    Redbark Settings
                  </a>
                  {" "}→ paste it here so you can pick accounts by name instead of copying UUIDs.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste Redbark API key"
                    disabled={savingApiKey}
                    className="flex-1 min-w-0 rounded-lg border bg-transparent px-3 py-2 text-xs placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#4edea3]/40 disabled:opacity-50"
                    style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                  <button
                    type="button"
                    onClick={() => void saveApiKey()}
                    disabled={savingApiKey || !apiKey.trim()}
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                    style={{ background: TOKENS.primary, color: TOKENS.surface }}
                  >
                    {savingApiKey ? "Saving…" : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>

          {error && <p className="text-xs" style={{ color: TOKENS.loss }}>{error}</p>}

          {/* Management actions */}
          {active && (
            <div className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: TOKENS.outlineGhost }}>
              {!showRotateField && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRotateField(true)}
                  className="gap-2 border-[rgba(218,226,253,0.12)] bg-[#131b2e] text-[#dae2fd] hover:bg-white/10 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rotate secret
                </Button>
              )}
              {connection?.hasApiKey && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await fetch("/api/redbark/connection", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ apiKey: "" }),
                    })
                    setConnection((c) => c ? { ...c, hasApiKey: false } : c)
                    toastSuccess("API key removed")
                  }}
                  className="gap-2 border-[rgba(218,226,253,0.12)] bg-[#131b2e] text-[#dae2fd] hover:bg-white/10 text-xs"
                >
                  Remove API key
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => void disconnect()}
                disabled={saving}
                className="gap-2 border-[rgba(218,226,253,0.12)] bg-[#131b2e] text-[#dae2fd] hover:bg-white/10 text-xs disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Disconnect
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
          Failed to load connection info. Refresh the page to try again.
        </p>
      )}
    </div>
  )
}
