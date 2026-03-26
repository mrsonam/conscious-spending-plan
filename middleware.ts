import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

/**
 * Maps legacy `/dashboard/*` URLs to `/classic/*` or `/bento/dashboard`.
 * Keeps bookmarks and OAuth callbackUrl=/dashboard working.
 */
function legacyDashboardRedirect(
  pathname: string,
  dashboardTheme: string | undefined
): string | null {
  if (!pathname.startsWith("/dashboard")) return null

  if (
    pathname === "/dashboard/console-v2" ||
    pathname.startsWith("/dashboard/console-v2/")
  ) {
    return "/bento/dashboard"
  }

  const trimmed = pathname.replace(/^\/dashboard\/?/, "")
  if (trimmed === "" || trimmed === "dashboard") {
    return dashboardTheme === "console"
      ? "/bento/dashboard"
      : "/classic/dashboard"
  }

  return `/classic/${trimmed}`
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const target = legacyDashboardRedirect(
    pathname,
    (
      await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })
    )?.dashboardTheme as string | undefined
  )

  if (!target) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = target
  url.search = request.nextUrl.search
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
}
