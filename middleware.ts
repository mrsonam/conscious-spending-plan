import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const hasSessionCookie =
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token")

  // Root: redirect to dashboard if logged in, otherwise to login
  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSessionCookie ? "/dashboard" : "/login", req.url))
  }

  // Dashboard: require login
  if (pathname.startsWith("/dashboard")) {
    if (!hasSessionCookie) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/dashboard"],
}
