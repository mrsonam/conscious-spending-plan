import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LandingPage } from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: "Conscious Spending Plan | Divide pay into four buckets",
  description:
    "Track income and spending with Ramit Sethi-style CSP buckets: fixed costs, savings, investment, and guilt-free spending.",
}

export default async function Home() {
  const session = await auth()
  if (session?.user?.id) {
    redirect("/dashboard")
  }

  return <LandingPage />
}
