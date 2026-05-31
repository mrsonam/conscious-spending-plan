import { redirect } from "next/navigation"

/**
 * Legacy URL `/dashboard/profile` is rewritten by proxy to `/profile`.
 * This page exists so the App Router tree always resolves cleanly during builds.
 */
export default function LegacyDashboardProfileRedirect() {
  redirect("/profile")
}
