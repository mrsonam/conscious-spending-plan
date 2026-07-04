import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Bento is the only supported dashboard shell.
 *
 * Keep old bookmarks working:
 * - `/bento/*` → `/*`
 * - `/classic/*` → `/*`
 * - legacy `/dashboard/*` routes → new top-level routes
 */
function redirectTarget(pathname: string): string | null {
  if (pathname === "/bento" || pathname === "/bento/") return "/dashboard"
  if (pathname.startsWith("/bento/")) {
    const rest = pathname.replace(/^\/bento\//, "")
    return rest === "dashboard" ? "/dashboard" : `/${rest}`
  }

  if (pathname === "/classic" || pathname === "/classic/") return "/dashboard"
  if (pathname.startsWith("/classic/")) {
    const rest = pathname.replace(/^\/classic\//, "")
    return rest === "dashboard" ? "/dashboard" : `/${rest}`
  }

  if (!pathname.startsWith("/dashboard")) return null

  const trimmed = pathname.replace(/^\/dashboard\/?/, "")
  // `/dashboard` and `/dashboard/dashboard` are already the real App Router URLs, do not redirect (avoids ERR_TOO_MANY_REDIRECTS).
  if (trimmed === "" || trimmed === "dashboard") return null
  if (trimmed === "console-v2" || trimmed.startsWith("console-v2/")) {
    return "/dashboard"
  }
  if (trimmed === "profile") return "/profile"
  return `/${trimmed}`
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const target = redirectTarget(pathname)

  if (!target || target === pathname) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = target
  url.search = request.nextUrl.search
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/bento",
    "/bento/:path*",
    "/classic",
    "/classic/:path*",
    "/dashboard",
    "/dashboard/:path*",
  ],
}
