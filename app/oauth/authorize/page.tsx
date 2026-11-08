import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseAuthorizeParams } from "@/lib/oauth-server"
import { AuthCard, AuthPageFrame } from "@/components/auth/auth-page-frame"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

type SearchParams = Record<string, string | string[] | undefined>

function ErrorCard({ message }: { message: string }) {
  return (
    <AuthPageFrame>
      <div className="w-full max-w-[26rem]">
        <AuthCard>
          <h1 className="text-center text-xl font-semibold" style={{ color: TOKENS.onSurface }}>
            Can&apos;t connect
          </h1>
          <p className="mt-3 text-center text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            {message}
          </p>
        </AuthCard>
      </div>
    </AuthPageFrame>
  )
}

const PERMISSIONS = [
  "See your accounts, categories and recent income and expenses",
  "Log new income and expenses after you confirm them in the chat",
]

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const raw = await searchParams
  const get = (key: string) => {
    const v = raw[key]
    return Array.isArray(v) ? v[0] : v
  }

  const parsed = parseAuthorizeParams(get)
  if ("error" in parsed) return <ErrorCard message={parsed.error} />

  const client = await prisma.oAuthClient.findUnique({ where: { id: parsed.clientId } })
  if (!client) return <ErrorCard message="This app isn't registered. Try adding the connector again." />
  if (!client.redirectUris.includes(parsed.redirectUri)) {
    return <ErrorCard message="The redirect address doesn't match this app's registration." />
  }

  const session = await auth()
  if (!session?.user?.id) {
    const query = new URLSearchParams()
    for (const [k, v] of Object.entries(raw)) if (typeof v === "string") query.set(k, v)
    redirect(`/login?callbackUrl=${encodeURIComponent(`/oauth/authorize?${query}`)}`)
  }

  const hidden = {
    client_id: parsed.clientId,
    redirect_uri: parsed.redirectUri,
    code_challenge: parsed.codeChallenge,
    state: parsed.state ?? "",
  }

  return (
    <AuthPageFrame>
      <div className="w-full max-w-[26rem]">
        <AuthCard>
          <h1
            className="text-center text-[1.6rem] font-semibold leading-tight tracking-tight"
            style={{ color: TOKENS.onSurface }}
          >
            Connect {client.name}?
          </h1>
          <p className="mt-2 text-center text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            Signed in as {session.user.email ?? "you"}. {client.name} will be able to:
          </p>
          <ul className="mt-6 space-y-2 text-sm" style={{ color: TOKENS.onSurface }}>
            {PERMISSIONS.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden style={{ color: TOKENS.primary }}>
                  •
                </span>
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            After you allow access you&apos;ll be sent back to{" "}
            <span className="font-semibold" style={{ color: TOKENS.onSurface }}>
              {new URL(parsed.redirectUri).host}
            </span>
            . Only continue if that&apos;s where you started.
          </p>
          <p className="mt-2 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            You can disconnect any time by revoking the &ldquo;Claude connector&rdquo; token in
            your profile.
          </p>
          <form method="post" action="/api/oauth/authorize" className="mt-8 flex gap-3">
            {Object.entries(hidden).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button
              type="submit"
              name="decision"
              value="deny"
              className={cn(
                "min-h-11 flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors hover:bg-white/5",
                consoleFocus,
              )}
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
            >
              Deny
            </button>
            <button
              type="submit"
              name="decision"
              value="allow"
              className={cn(
                "min-h-11 flex-1 rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90",
                consoleFocus,
              )}
              style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: CARD_INSET }}
            >
              Allow
            </button>
          </form>
        </AuthCard>
      </div>
    </AuthPageFrame>
  )
}
