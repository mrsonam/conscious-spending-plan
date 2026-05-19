import { normalizeDisplayCurrency } from "@/lib/display-currency"
import { prisma } from "@/lib/prisma"

export async function getUserDisplayCurrency(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayCurrency: true },
  })
  return normalizeDisplayCurrency(user?.displayCurrency)
}

export function currencyFromSession(
  displayCurrency: unknown
): string {
  return normalizeDisplayCurrency(displayCurrency)
}
