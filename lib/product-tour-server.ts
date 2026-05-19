import { isDemoAccountEmail } from "@/lib/demo-credentials"
import { prisma } from "@/lib/prisma"

export type ProductTourStatus = {
  needsTour: boolean
  completed: boolean
  /** Demo logins always receive the spotlight tour (not persisted as completed). */
  isDemoAccount: boolean
}

export async function getProductTourStatus(userId: string): Promise<ProductTourStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      productTourCompletedAt: true,
      onboardingCompletedAt: true,
    },
  })

  if (!user) {
    return { needsTour: false, completed: false, isDemoAccount: false }
  }

  const isDemoAccount = isDemoAccountEmail(user.email)

  if (isDemoAccount) {
    return {
      needsTour: true,
      completed: false,
      isDemoAccount: true,
    }
  }

  const completed = user.productTourCompletedAt != null
  const setupDone = user.onboardingCompletedAt != null

  return {
    needsTour: setupDone && !completed,
    completed,
    isDemoAccount: false,
  }
}

export async function completeProductTour(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })

  if (!user || isDemoAccountEmail(user.email)) {
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: { productTourCompletedAt: new Date() },
  })
}
