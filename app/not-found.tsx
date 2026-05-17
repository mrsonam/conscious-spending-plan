import type { Metadata } from "next"
import { NotFoundPage } from "@/components/errors/not-found-page"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Page not found | Conscious Spending Plan",
  description: "This page could not be found. Return to your Wealth Console or home.",
}

export default async function NotFound() {
  const session = await auth()
  return <NotFoundPage isAuthenticated={Boolean(session?.user?.id)} />
}
