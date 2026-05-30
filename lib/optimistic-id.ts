export function createOptimisticId(prefix = "optimistic"): string {
  return `${prefix}-${crypto.randomUUID()}`
}

/** True for client-only ids (e.g. goal-uuid) not yet persisted to the database. */
export function isOptimisticClientId(id: string): boolean {
  return /^(goal|account|loan|borrowed|subscription|recurring|purchase|dividend|optimistic)-/.test(
    id
  )
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
