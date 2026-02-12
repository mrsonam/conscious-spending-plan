import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default function middleware(req: NextRequest) {
  // Simple, non-database check to avoid using Prisma on the Edge runtime.
  // If a next-auth session token cookie is missing, redirect to login for dashboard routes.
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const hasSessionCookie =
      req.cookies.has("next-auth.session-token") ||
      req.cookies.has("__Secure-next-auth.session-token")

    if (!hasSessionCookie) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard"],
}
