import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { completeProductTour } from "@/lib/product-tour-server"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await completeProductTour(session.user.id)
  return NextResponse.json({ ok: true })
}
