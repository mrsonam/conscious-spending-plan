import type { FundAllocation } from "@prisma/client"
import { isDemoAccountEmail } from "@/lib/demo-credentials"
import { prisma } from "@/lib/prisma"
import { isDefaultFundAllocation, ONBOARDING_PATH } from "@/lib/onboarding"

export type OnboardingStatus = {
  needsOnboarding: boolean
  hasAccounts: boolean
  bucketsConfigured: boolean
  accountCount: number
}

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      onboardingCompletedAt: true,
      onboardingBucketsSavedAt: true,
      fundAllocation: true,
      _count: { select: { accounts: true } },
    },
  })

  if (!user) {
    return {
      needsOnboarding: false,
      hasAccounts: false,
      bucketsConfigured: false,
      accountCount: 0,
    }
  }

  if (isDemoAccountEmail(user.email)) {
    return {
      needsOnboarding: false,
      hasAccounts: user._count.accounts > 0,
      bucketsConfigured: true,
      accountCount: user._count.accounts,
    }
  }

  if (user.onboardingCompletedAt) {
    return {
      needsOnboarding: false,
      hasAccounts: user._count.accounts > 0,
      bucketsConfigured: user.fundAllocation
        ? !isDefaultFundAllocation(user.fundAllocation)
        : false,
      accountCount: user._count.accounts,
    }
  }

  const accountCount = user._count.accounts
  const hasAccounts = accountCount > 0
  const bucketsConfigured =
    user.onboardingBucketsSavedAt != null ||
    (user.fundAllocation ? !isDefaultFundAllocation(user.fundAllocation) : false)

  // Existing members who already set up accounts + custom splits skip the wizard.
  if (hasAccounts && user.fundAllocation && !isDefaultFundAllocation(user.fundAllocation)) {
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
    })
    return {
      needsOnboarding: false,
      hasAccounts: true,
      bucketsConfigured: true,
      accountCount,
    }
  }

  return {
    needsOnboarding: true,
    hasAccounts,
    bucketsConfigured,
    accountCount,
  }
}

export async function getOnboardingRedirect(userId: string): Promise<string | null> {
  const status = await getOnboardingStatus(userId)
  return status.needsOnboarding ? ONBOARDING_PATH : null
}

export async function completeOnboarding(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompletedAt: new Date() },
  })
}

export function bucketsConfiguredFromRow(row: FundAllocation | null): boolean {
  if (!row) return false
  return !isDefaultFundAllocation(row)
}
