/**
 * Clears service workers, Cache Storage, and web storage, then navigates with a
 * cache-busting query so the PWA loads the latest shell and assets.
 */
export async function clearAppCachesAndHardReload(): Promise<void> {
  if (typeof window === "undefined") return

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  }

  if ("caches" in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }

  try {
    sessionStorage.clear()
    localStorage.clear()
  } catch {
    // ignore (private mode, etc.)
  }

  const url = new URL(window.location.href)
  url.searchParams.set("_fresh", String(Date.now()))
  window.location.replace(url.toString())
}
