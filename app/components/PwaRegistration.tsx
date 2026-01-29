'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for PWA support (offline cache, install prompt).
 * Mirrors flowfocus behavior without push notification UI.
 */
export function PwaRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    async function register() {
      try {
        const existing = await navigator.serviceWorker.getRegistrations()
        if (existing.length > 0) {
          return
        }
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch {
        // Ignore registration errors (e.g. in dev or unsupported context)
      }
    }

    register()
  }, [])

  return null
}
