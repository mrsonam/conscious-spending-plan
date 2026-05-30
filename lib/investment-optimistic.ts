import type {
  InvestmentAccountSummary,
  InvestmentHolding,
  RecentDividendRow,
} from "@/components/investments/investment-shared"
import { createOptimisticId, roundMoney } from "@/lib/optimistic-id"

export function cloneInvestmentState(
  accounts: InvestmentAccountSummary[],
  dividendYtd: number,
  dividendAllTime: number,
  recentDividends: RecentDividendRow[]
) {
  return {
    accounts: accounts.map((a) => ({
      ...a,
      holdings: a.holdings.map((h) => ({
        ...h,
        purchases: h.purchases.map((p) => ({ ...p })),
      })),
    })),
    dividendYtd,
    dividendAllTime,
    recentDividends: recentDividends.map((r) => ({ ...r })),
  }
}

function upsertHolding(
  holdings: InvestmentHolding[],
  name: string,
  shares: number,
  cost: number,
  pricePerUnit: number,
  date: string
): InvestmentHolding[] {
  const existing = holdings.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )
  if (!existing) {
    return [
      ...holdings,
      {
        name,
        totalShares: shares,
        totalAmount: cost,
        averagePrice: shares > 0 ? roundMoney(cost / shares) : pricePerUnit,
        purchases: [
          {
            id: createOptimisticId("purchase"),
            pricePerUnit,
            numberOfShares: String(shares),
            amount: cost,
            date,
          },
        ],
        firstPurchaseDate: date,
        lastPurchaseDate: date,
      },
    ]
  }

  const totalShares = roundMoney(existing.totalShares + shares)
  const totalAmount = roundMoney(existing.totalAmount + cost)
  return holdings.map((h) =>
    h.name.toLowerCase() === name.toLowerCase()
      ? {
          ...h,
          totalShares,
          totalAmount,
          averagePrice: totalShares > 0 ? roundMoney(totalAmount / totalShares) : h.averagePrice,
          lastPurchaseDate: date,
          purchases: [
            ...h.purchases,
            {
              id: createOptimisticId("purchase"),
              pricePerUnit,
              numberOfShares: String(shares),
              amount: cost,
              date,
            },
          ],
        }
      : h
  )
}

export function applyOptimisticInvestmentPurchase(
  accounts: InvestmentAccountSummary[],
  input: {
    accountId: string
    investmentName: string
    pricePerUnit: number
    numberOfShares: number
    brokerageFee: number
    date: string
  }
): InvestmentAccountSummary[] {
  const cost = roundMoney(
    input.pricePerUnit * input.numberOfShares + input.brokerageFee
  )

  return accounts.map((acc) => {
    if (acc.id !== input.accountId) return acc
    const holdings = upsertHolding(
      acc.holdings,
      input.investmentName.trim(),
      input.numberOfShares,
      cost,
      input.pricePerUnit,
      input.date
    )
    return {
      ...acc,
      balance: roundMoney(acc.balance - cost),
      investedAmount: roundMoney(acc.investedAmount + cost),
      totalValue: roundMoney(acc.totalValue + cost),
      holdings,
    }
  })
}

export function applyOptimisticDividend(
  accounts: InvestmentAccountSummary[],
  dividendYtd: number,
  dividendAllTime: number,
  recentDividends: RecentDividendRow[],
  input: {
    accountId: string
    symbol: string
    amount: number
    date: string
  }
): {
  accounts: InvestmentAccountSummary[]
  dividendYtd: number
  dividendAllTime: number
  recentDividends: RecentDividendRow[]
} {
  const paymentYear = new Date(input.date).getFullYear()
  const currentYear = new Date().getFullYear()
  const ytdDelta = paymentYear === currentYear ? input.amount : 0

  return {
    accounts: accounts.map((acc) =>
      acc.id === input.accountId
        ? { ...acc, balance: roundMoney(acc.balance + input.amount) }
        : acc
    ),
    dividendYtd: roundMoney(dividendYtd + ytdDelta),
    dividendAllTime: roundMoney(dividendAllTime + input.amount),
    recentDividends: [
      {
        id: createOptimisticId("dividend"),
        date: input.date,
        amount: input.amount,
        name: input.symbol,
        accountId: input.accountId,
      },
      ...recentDividends,
    ],
  }
}
