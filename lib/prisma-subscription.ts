import { prisma } from "@/lib/prisma"

/** Prisma `subscription` model delegate (generate client after schema pull). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- delegate exists after `prisma generate`
export const prismaSubscription = (prisma as any).subscription as {
  findMany: (args: object) => Promise<any[]>
  create: (args: object) => Promise<any>
  findFirst: (args: object) => Promise<any | null>
  update: (args: object) => Promise<any>
  delete: (args: object) => Promise<any>
}
