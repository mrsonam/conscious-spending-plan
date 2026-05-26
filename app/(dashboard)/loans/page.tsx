"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { LoansPageBento } from "@/components/loans/loans-page-bento"

export default function BentoLoansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <>
        <Header
          title="Loans"
          description="Lending you extended and borrowing you owe — outside income and expense flows."
         
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="h-80 animate-pulse rounded-xl border border-white/10 bg-white/5 lg:col-span-7" />
            <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5 lg:col-span-5" />
          </div>
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Loans"
        description="Lending you extended and borrowing you owe — outside income and expense flows."
       
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <LoansPageBento />
      </div>
    </>
  )
}
