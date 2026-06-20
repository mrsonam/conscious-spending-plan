export type BasiqAccount = {
  id: string
  name: string
  accountType: string
  balance: number
  institution: string
}

export type BasiqTransaction = {
  id: string
  amount: string
  direction: "credit" | "debit"
  description: string
  postDate: string
  category: string | null
  subCategory: string[] | null
  account: string
}

const BASIQ_BASE_URL = "https://au-api.basiq.io"

const BASIQ_ID_RE = /^[a-f0-9-]{36}$/i

function assertBasiqId(value: string, label: string): void {
  if (!BASIQ_ID_RE.test(value)) {
    throw new Error(`Invalid ${label}: expected UUID, got "${value}"`)
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }
  const apiKey = process.env.BASIQ_API_KEY
  if (!apiKey) throw new Error("BASIQ_API_KEY not set")

  const res = await fetch(`${BASIQ_BASE_URL}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "basiq-version": "3.0",
    },
    body: "scope=SERVER_ACCESS",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Basiq token error ${res.status}: ${text}`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.token
}

async function basiqFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  return fetch(`${BASIQ_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "basiq-version": "3.0",
      ...options.headers,
    },
  })
}

export async function createBasiqUser(email: string): Promise<string> {
  const res = await basiqFetch("/users", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create Basiq user: ${text}`)
  }
  const data = (await res.json()) as { id: string }
  return data.id
}

export async function createConsentUrl(basiqUserId: string): Promise<string> {
  assertBasiqId(basiqUserId, "basiqUserId")
  const res = await basiqFetch(`/users/${basiqUserId}/auth_link`, {
    method: "POST",
    body: JSON.stringify({ mobile: false }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create consent URL: ${text}`)
  }
  const data = (await res.json()) as { links: { public: string } }
  return data.links.public
}

export async function getBasiqAccounts(basiqUserId: string): Promise<BasiqAccount[]> {
  assertBasiqId(basiqUserId, "basiqUserId")
  const res = await basiqFetch(`/users/${basiqUserId}/accounts`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch Basiq accounts: ${text}`)
  }
  const data = (await res.json()) as {
    data: Array<{
      id: string
      name: string
      class: { type: string }
      balance: string
      institution: string
    }>
  }
  return data.data.map((a) => ({
    id: a.id,
    name: a.name,
    accountType: a.class?.type ?? "transaction",
    balance: parseFloat(a.balance) || 0,
    institution: a.institution,
  }))
}

export async function getBasiqTransactions(
  basiqUserId: string,
  accountId: string,
  since?: Date
): Promise<BasiqTransaction[]> {
  assertBasiqId(basiqUserId, "basiqUserId")
  assertBasiqId(accountId, "accountId")
  let filter = `account.id.eq('${accountId}')`
  if (since) {
    filter += `,transaction.postDate.gt('${since.toISOString().split("T")[0]}')`
  }
  const res = await basiqFetch(
    `/users/${basiqUserId}/transactions?filter=${encodeURIComponent(filter)}&limit=500`
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch transactions: ${text}`)
  }
  const data = (await res.json()) as {
    data: Array<{
      id: string
      amount: string
      direction: "credit" | "debit"
      description: string
      postDate: string
      enrich?: { category?: string; location?: { category?: string } }
      subClass?: { title?: string }
      account: string
    }>
  }
  return data.data.map((t) => ({
    id: t.id,
    amount: t.amount,
    direction: t.direction,
    description: t.description,
    postDate: t.postDate,
    category: t.enrich?.category ?? t.subClass?.title ?? null,
    subCategory: null,
    account: t.account,
  }))
}

export async function registerBasiqWebhook(webhookUrl: string): Promise<void> {
  const res = await basiqFetch("/events", {
    method: "POST",
    body: JSON.stringify({
      type: "transactions",
      url: webhookUrl,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to register webhook: ${text}`)
  }
}

export async function getBasiqConnections(
  basiqUserId: string
): Promise<Array<{ id: string; institution: { id: string; name: string }; status: string }>> {
  assertBasiqId(basiqUserId, "basiqUserId")
  const res = await basiqFetch(`/users/${basiqUserId}/connections`)
  if (!res.ok) return []
  const data = (await res.json()) as {
    data: Array<{ id: string; institution: { id: string; name: string }; status: string }>
  }
  return data.data
}
