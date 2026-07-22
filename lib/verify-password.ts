import bcrypt from "bcryptjs"

/**
 * Dummy bcrypt hash compared against when no user/password exists, so
 * response timing doesn't reveal whether an email is registered. Value
 * copied from the existing NextAuth Credentials provider in lib/auth.ts.
 */
const DUMMY_HASH =
  "$2b$12$qbcW7qz9ziTCKV2M/1Y0r.6BNCrzFOq4Dq4sISTS.fawUlzvBT246"

export async function verifyPassword(
  storedHash: string | null | undefined,
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, storedHash ?? DUMMY_HASH)
}
