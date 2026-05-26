"use client"

import { useSession } from "next-auth/react"

/**
 * Session from the server (root layout) hydrates immediately; only show
 * loading UI when the client truly has no session yet.
 */
export function useHydratedSession() {
  const { data: session, status, update } = useSession()
  const isSessionPending = status === "loading" && !session
  return { session, status, isSessionPending, update }
}
