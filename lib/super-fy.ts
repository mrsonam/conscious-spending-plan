export type FYAccount = {
  contributions: { amount: number; date: string }[]
}

export function getFY(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const month = d.getUTCMonth() // 0-indexed; June = 5, July = 6
  const year = d.getUTCFullYear()
  return month >= 6 ? `FY${year + 1}` : `FY${year}`
}

export function getFYBounds(fyLabel: string): { start: Date; end: Date } {
  const year = parseInt(fyLabel.replace("FY", ""), 10)
  return {
    start: new Date(Date.UTC(year - 1, 6, 1)),                    // 1 Jul UTC
    end: new Date(Date.UTC(year, 5, 30, 23, 59, 59, 999)),         // 30 Jun UTC
  }
}

export function currentFY(): string {
  return getFY(new Date())
}

export function deriveTotalFYBalance(
  accounts: FYAccount[],
  fyLabel: string,
): { opening: number; closing: number; net: number } {
  const { start, end } = getFYBounds(fyLabel)

  let openingTotal = 0
  let closingTotal = 0

  for (const account of accounts) {
    // Derive current balance from all contributions (not stored DB balance)
    const currentBalance = account.contributions.reduce((s, c) => s + c.amount, 0)

    // closing = current balance minus everything contributed AFTER this FY ended
    const afterFYSum = account.contributions
      .filter((c) => new Date(c.date) > end)
      .reduce((s, c) => s + c.amount, 0)
    const closing = currentBalance - afterFYSum

    // opening = closing minus everything contributed DURING this FY
    const inFYSum = account.contributions
      .filter((c) => {
        const d = new Date(c.date)
        return d >= start && d <= end
      })
      .reduce((s, c) => s + c.amount, 0)
    const opening = closing - inFYSum

    openingTotal += opening
    closingTotal += closing
  }

  return { opening: openingTotal, closing: closingTotal, net: closingTotal - openingTotal }
}
