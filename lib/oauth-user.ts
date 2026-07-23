import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { normalizeEmail } from "./password-policy"
import { defaultFundAllocationNestedCreate } from "@/lib/fund-allocation-fields"

/**
 * Find a user by email, or create one with an unguessable placeholder
 * password (never used to log in — OAuth users don't have a password).
 * Shared by NextAuth's Google provider callback and the mobile Google
 * login endpoint so both create/match users identically.
 */
export async function findOrCreateOAuthUser(
  email: string,
  name: string | null,
): Promise<{ id: string; displayCurrency: string }> {
  const normalizedEmail = normalizeEmail(email)

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    select: { id: true, displayCurrency: true },
  })
  if (existingUser) {
    return { id: existingUser.id, displayCurrency: existingUser.displayCurrency }
  }

  const randomPassword = await bcrypt.hash(randomBytes(32).toString("hex"), 10)
  const created = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: randomPassword,
      name: name || null,
      fundAllocation: {
        create: defaultFundAllocationNestedCreate(),
      },
    },
    select: { id: true, displayCurrency: true },
  })
  return { id: created.id, displayCurrency: created.displayCurrency }
}
