"use client"

import * as React from "react"
import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

type TokenRow = {
  id: string
  name: string
  prefix: string
  /** Full plaintext token. Only `null` for legacy rows created before we stored plaintext. */
  token: string | null
  createdAt: string
  lastUsedAt: string | null
}

export function TokenManager() {
  const [tokens, setTokens] = React.useState<TokenRow[] | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [name, setName] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)
  const [justCreatedId, setJustCreatedId] = React.useState<string | null>(null)

  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = React.useState<TokenRow | null>(null)
  const [revoking, setRevoking] = React.useState(false)
  const [revokeError, setRevokeError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch("/api/user/tokens", { cache: "no-store" })
      const data = (await res.json()) as { tokens?: TokenRow[]; error?: string }
      if (!res.ok) {
        throw new Error(data.error || "Failed to load tokens")
      }
      setTokens(data.tokens ?? [])
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load tokens"
      )
      setTokens([])
    }
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const onCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch("/api/user/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = (await res.json()) as Partial<TokenRow> & { error?: string }
      if (!res.ok) {
        throw new Error(data.error || "Could not create token")
      }
      setName("")
      setJustCreatedId(data.id ?? null)
      await refresh()
      if (data.id) {
        window.setTimeout(() => {
          setJustCreatedId((curr) => (curr === data.id ? null : curr))
        }, 2500)
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create token")
    } finally {
      setCreating(false)
    }
  }

  const confirmRevoke = async () => {
    if (!revokeTarget || revoking) return
    setRevoking(true)
    setRevokeError(null)
    try {
      const res = await fetch(`/api/user/tokens/${revokeTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || "Could not revoke token")
      }
      setRevokeTarget(null)
      await refresh()
    } catch (err) {
      setRevokeError(
        err instanceof Error ? err.message : "Could not revoke token"
      )
    } finally {
      setRevoking(false)
    }
  }

  const copyToken = async (row: TokenRow) => {
    if (!row.token) return
    try {
      await navigator.clipboard.writeText(row.token)
      setCopiedId(row.id)
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === row.id ? null : curr))
      }, 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <section
      className="rounded-xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: TOKENS.surfaceLow, color: TOKENS.primary }}
        >
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Personal tokens
          </p>
          <p
            className="mt-1 max-w-xl text-xs leading-relaxed"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Used by Apple Shortcuts (and other automations) to log expenses on
            your behalf. Treat them like passwords — they unlock writes to your
            account.
          </p>
        </div>
      </div>

      <form onSubmit={onCreate} className="mt-5">
        <label
          htmlFor="token-name"
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          New token label
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="token-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="iPhone Shortcut"
            className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              background: TOKENS.surfaceLow,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
          />
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
            style={{
              background: TOKENS.primary,
              color: TOKENS.surface,
            }}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create token
          </button>
        </div>
        {createError ? (
          <p className="mt-2 text-xs" style={{ color: "#ffb4ab" }}>
            {createError}
          </p>
        ) : null}
      </form>

      <div className="mt-6">
        {tokens === null ? (
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tokens…
          </div>
        ) : tokens.length === 0 ? (
          <p
            className="rounded-lg border border-dashed px-4 py-6 text-center text-sm"
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurfaceMuted,
            }}
          >
            No tokens yet. Create one above to wire up your first Shortcut.
          </p>
        ) : (
          <ul className="space-y-3">
            {tokens.map((t) => {
              const isJustCreated = justCreatedId === t.id
              return (
                <li
                  key={t.id}
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: isJustCreated
                      ? TOKENS.primary
                      : TOKENS.outlineGhost,
                    background: TOKENS.surfaceLow,
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: TOKENS.onSurface }}
                      >
                        {t.name}
                      </p>
                      <p
                        className="mt-0.5 truncate text-[11px]"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        Created{" "}
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        {t.lastUsedAt
                          ? ` · last used ${new Date(t.lastUsedAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" }
                            )}`
                          : " · never used"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRevokeError(null)
                        setRevokeTarget(t)
                      }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors hover:bg-white/[0.05]"
                      style={{
                        borderColor: TOKENS.outlineGhost,
                        color: "#ffb4ab",
                      }}
                      aria-label={`Revoke ${t.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {t.token ? (
                      <>
                        <code
                          className="min-w-0 flex-1 truncate rounded-md border px-3 py-2 font-mono text-[12px]"
                          style={{
                            borderColor: TOKENS.outlineGhost,
                            background: TOKENS.surface,
                            color: TOKENS.onSurface,
                          }}
                          title={t.token}
                        >
                          {t.token}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToken(t)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.05]"
                          style={{
                            borderColor: TOKENS.outlineGhost,
                            color: TOKENS.onSurface,
                          }}
                          aria-label={`Copy token for ${t.name}`}
                        >
                          {copiedId === t.id ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> Copy
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <p
                        className="flex-1 rounded-md border border-dashed px-3 py-2 text-xs"
                        style={{
                          borderColor: TOKENS.outlineGhost,
                          color: TOKENS.onSurfaceMuted,
                        }}
                      >
                        <span className="font-mono">{t.prefix}…</span> — token
                        value unavailable (legacy). Revoke and create a new one
                        to see it here.
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {loadError ? (
          <p className="mt-3 text-xs" style={{ color: "#ffb4ab" }}>
            {loadError}
          </p>
        ) : null}
      </div>

      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !revoking) {
            setRevokeTarget(null)
            setRevokeError(null)
          }
        }}
      >
        <DialogContent
          className="p-0"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            color: TOKENS.onSurface,
          }}
        >
          <div className="p-6">
            <DialogHeader className="mb-3">
              <DialogTitle>Revoke token?</DialogTitle>
              <DialogDescription>
                Any Shortcut or automation using this token will stop working
                immediately. This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {revokeTarget ? (
              <div
                className="mt-3 rounded-md border px-3 py-2 text-sm"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  background: TOKENS.surfaceLow,
                  color: TOKENS.onSurface,
                }}
              >
                <p className="font-semibold">{revokeTarget.name}</p>
                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  <span className="font-mono">{revokeTarget.prefix}…</span>
                </p>
              </div>
            ) : null}

            {revokeError ? (
              <p className="mt-3 text-xs" style={{ color: "#ffb4ab" }}>
                {revokeError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (revoking) return
                  setRevokeTarget(null)
                  setRevokeError(null)
                }}
                disabled={revoking}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/[0.06] disabled:opacity-50"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevoke}
                disabled={revoking}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "#ffb4ab",
                  color: TOKENS.surface,
                }}
              >
                {revoking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Revoke
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
