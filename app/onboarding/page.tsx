import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"
import { normalizeDisplayCurrency } from "@/lib/display-currency"
import { fundAllocationToApi } from "@/lib/fund-allocation-money"
import { currencyFromSession } from "@/lib/user-currency"
import { defaultAllocationDraft } from "@/lib/onboarding"

export default async function OnboardingPage() {
  const session = await auth()
  const userId = session!.user!.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      displayCurrency: true,
      fundAllocation: true,
    },
  })

  const currency = currencyFromSession(user?.displayCurrency)
  const initialAllocation = user?.fundAllocation
    ? (fundAllocationToApi(user.fundAllocation, currency) as {
        fixedCostsType: string
        fixedCostsValue: number
        savingsType: string
        savingsValue: number
        investmentType: string
        investmentValue: number
        guiltFreeSpendingType: string
        guiltFreeSpendingValue: number
      })
    : defaultAllocationDraft()

  return (
    <OnboardingWizard
      initialName={user?.name ?? ""}
      initialCurrency={normalizeDisplayCurrency(user?.displayCurrency)}
      initialAllocation={initialAllocation}
    />
  )
}
