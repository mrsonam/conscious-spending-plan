export interface InvestmentPurchase {
  id: string
  pricePerUnit: number | null
  numberOfShares: number | null
  amount: number
  date: string
}

export interface InvestmentHolding {
  name: string
  totalShares: number
  totalAmount: number
  averagePrice: number
  purchases: InvestmentPurchase[]
  dividendIncome?: number
  firstPurchaseDate: string
  lastPurchaseDate: string
}

export interface InvestmentAccountSummary {
  id: string
  name: string
  bankName: string
  balance: number
  investedAmount: number
  totalValue: number
  dividendIncomeTotal?: number
  holdings: InvestmentHolding[]
}

export interface RecentDividendRow {
  id: string
  date: string
  amount: number
  name: string
  accountId: string
}

export type InvestmentsApiPayload = {
  accounts?: InvestmentAccountSummary[]
  dividendYtd?: number
  dividendAllTime?: number
  recentDividends?: RecentDividendRow[]
}

export type PortfolioChartPoint = {
  t: number
  value: number
  monthLabel: string
}

export type ChartRange = "1W" | "3M" | "1Y" | "ALL"

export function formatInvestmentDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
