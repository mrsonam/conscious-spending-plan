import { headers } from "next/headers"
import { Header } from "@/components/layout/header"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { TokenManager } from "@/components/shortcuts/token-manager"
import { SetupGuide } from "@/components/shortcuts/setup-guide"

async function resolveOriginUrl() {
  const h = await headers()
  const proto = h.get("x-forwarded-proto") ?? "https"
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  return `${proto}://${host}`
}

export default async function ShortcutsPage() {
  const origin = await resolveOriginUrl()

  return (
    <>
      <Header
        title="Shortcuts"
        description="Generate API tokens and wire up Apple Shortcuts to log expenses automatically."
       
      />
      <div
        className="mx-auto max-w-5xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8"
        style={{ background: TOKENS.surface }}
      >
        <TokenManager />
        <SetupGuide originUrl={origin} />
      </div>
    </>
  )
}
