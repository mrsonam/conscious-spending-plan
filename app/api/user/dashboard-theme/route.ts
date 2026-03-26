import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isDashboardTheme } from "@/lib/dashboard-theme"

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const theme =
    body && typeof body === "object" && "dashboardTheme" in body
      ? (body as { dashboardTheme: unknown }).dashboardTheme
      : undefined

  if (!isDashboardTheme(theme)) {
    return NextResponse.json(
      { error: "dashboardTheme must be \"classic\" or \"console\"" },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { dashboardTheme: theme },
  })

  return NextResponse.json({ dashboardTheme: theme })
}
