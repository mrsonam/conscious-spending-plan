import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { completeProductTour } from "@/lib/product-tour-server"
import { routeErrorResponse } from "@/lib/route-error"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await completeProductTour(session.user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return routeErrorResponse(error, "Error completing product tour")
  }
}
