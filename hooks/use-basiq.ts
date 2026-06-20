"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchJsonAndCache, invalidateCachedJson, peekCachedJson } from "@/lib/client-fetch-cache"
import { toastError, toastSuccess } from "@/lib/app-toast"

type BasiqConnectionState = {
  connection: {
    id: string
    institutionName: string
    status: string
    connectedAt: string
  } | null
  linkedAccounts: Array<{
    id: string
    name: string
    bankName: string
    lastSyncedAt: string | null
  }>
}

const BASIQ_CACHE_KEY = "basiq:connection"
const PENDING_CACHE_KEY = "basiq:pending"

export function useBasiq(status: string) {
  const [state, setState] = useState<BasiqConnectionState>({
    connection: null,
    linkedAccounts: [],
  })
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false

    async function load() {
      try {
        const data = await fetchJsonAndCache<BasiqConnectionState>(
          BASIQ_CACHE_KEY,
          "/api/basiq/connection"
        )
        if (!cancelled) setState(data)
      } catch {
        /* no connection yet */
      }
      try {
        const pending = await fetchJsonAndCache<{ count: number }>(
          PENDING_CACHE_KEY,
          "/api/basiq/pending"
        )
        if (!cancelled) setPendingCount(pending.count ?? 0)
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [status])

  const triggerSync = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/basiq/sync", { method: "POST" })
      const data = (await res.json()) as { created?: number; error?: string }
      if (!res.ok) {
        toastError(data.error ?? "Sync failed")
        return
      }
      toastSuccess(`Synced ${data.created ?? 0} new transactions.`)
      invalidateCachedJson(BASIQ_CACHE_KEY)
      invalidateCachedJson(PENDING_CACHE_KEY)
      const pending = await fetchJsonAndCache<{ count: number }>(
        PENDING_CACHE_KEY,
        `/api/basiq/pending?t=${Date.now()}`
      )
      setPendingCount(pending.count ?? 0)
    } catch {
      toastError("Sync failed")
    } finally {
      setSyncing(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch("/api/basiq/connection", { method: "DELETE" })
      if (!res.ok) {
        toastError("Failed to disconnect")
        return
      }
      setState({ connection: null, linkedAccounts: [] })
      invalidateCachedJson(BASIQ_CACHE_KEY)
      toastSuccess("Bank disconnected.")
    } catch {
      toastError("Failed to disconnect")
    }
  }, [])

  return {
    connection: state.connection,
    linkedAccounts: state.linkedAccounts,
    pendingCount,
    loading,
    syncing,
    triggerSync,
    disconnect,
    setPendingCount,
  }
}
