import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getProductTourStatus } from "@/lib/product-tour-server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const status = await getProductTourStatus(session.user.id)
  return NextResponse.json(status)
}
