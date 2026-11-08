import assert from "node:assert/strict"

import { findPossibleDuplicates, validateTransaction } from "../lib/mcp/transactions"
import { isSafeCallbackPath, isAllowedRedirectUri, verifyPkceS256 } from "../lib/oauth-server"

const accounts = [
  { id: "acc1", name: "Everyday", balanceMinor: 10_000n },
  { id: "acc2", name: "Savings", balanceMinor: 500n },
]

// --- validateTransaction ---------------------------------------------------

const ok = validateTransaction(
  {
    type: "expense",
    amount: 42.5,
    date: "2026-11-07",
    description: "Woolworths",
    fundCategory: "guiltFreeSpending",
    expenseCategory: "groceries",
  },
  { accounts, defaultAccountId: "acc1", currency: "AUD" },
)
assert.deepEqual(ok.issues, [])
assert.equal(ok.accountId, "acc1")
assert.equal(ok.amountMinor, 4250n)

const bad = validateTransaction(
  {
    type: "expense",
    amount: -3,
    date: "07/11/2026",
    description: "",
    fundCategory: "fun",
    expenseCategory: "nope",
    accountId: "missing",
  },
  { accounts, defaultAccountId: null, currency: "AUD" },
)
assert.ok(bad.issues.some((i) => i.includes("Amount")))
assert.ok(bad.issues.some((i) => i.includes("YYYY-MM-DD")))
assert.ok(bad.issues.some((i) => i.includes("fund category")))
assert.ok(bad.issues.some((i) => i.includes("expense category")))
assert.ok(bad.issues.some((i) => i.includes("account")))

// Income needs no categories; no account and no default is an issue.
const income = validateTransaction(
  { type: "income", amount: 3000, date: "2026-11-01", description: "Salary" },
  { accounts, defaultAccountId: null, currency: "AUD" },
)
assert.deepEqual(income.issues, [])
assert.equal(income.accountId, null)

// --- findPossibleDuplicates ------------------------------------------------

const existing = [
  { id: "e1", type: "expense" as const, amountMinor: 4250n, date: new Date("2026-11-05T00:00:00Z"), description: "WOOLWORTHS 123" },
  { id: "e2", type: "expense" as const, amountMinor: 4250n, date: new Date("2026-10-20T00:00:00Z"), description: "old" },
  { id: "i1", type: "income" as const, amountMinor: 4250n, date: new Date("2026-11-07T00:00:00Z"), description: "refund" },
]
const dupes = findPossibleDuplicates(
  { type: "expense", amountMinor: 4250n, date: "2026-11-07" },
  existing,
)
assert.deepEqual(dupes.map((d) => d.id), ["e1"])

// --- OAuth helpers ---------------------------------------------------------

assert.equal(isSafeCallbackPath("/oauth/authorize?client_id=x"), true)
assert.equal(isSafeCallbackPath("//evil.com"), false)
assert.equal(isSafeCallbackPath("https://evil.com"), false)
assert.equal(isSafeCallbackPath("/\\evil.com"), false)

assert.equal(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback"), true)
assert.equal(isAllowedRedirectUri("http://localhost:6274/callback"), true)
assert.equal(isAllowedRedirectUri("http://127.0.0.1:33418/callback"), true)
assert.equal(isAllowedRedirectUri("http://evil.com/callback"), false)
assert.equal(isAllowedRedirectUri("javascript:alert(1)"), false)

// RFC 7636 appendix B test vector.
assert.equal(
  verifyPkceS256(
    "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  ),
  true,
)
assert.equal(verifyPkceS256("wrong", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"), false)

console.log("mcp-transactions tests passed")
