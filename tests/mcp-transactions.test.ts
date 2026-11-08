import assert from "node:assert/strict"

import {
  checkBudgetSplit,
  findPossibleDuplicates,
  monthBounds,
  summarizeSpending,
  validateTransaction,
} from "../lib/mcp/transactions"
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

// Saving goals: only on savings expenses, only active goals.
const goalCtx = { accounts, defaultAccountId: "acc1", currency: "AUD", savingGoals: [{ id: "g1" }] }
const goalBase = { type: "expense" as const, amount: 10, date: "2026-11-01", description: "Holiday fund", expenseCategory: "travel" }
assert.deepEqual(
  validateTransaction({ ...goalBase, fundCategory: "savings", savingGoalId: "g1" }, goalCtx).issues,
  [],
)
assert.ok(
  validateTransaction({ ...goalBase, fundCategory: "guiltFreeSpending", savingGoalId: "g1" }, goalCtx)
    .issues.some((i) => i.includes("savings fund category")),
)
assert.ok(
  validateTransaction({ ...goalBase, fundCategory: "savings", savingGoalId: "gone" }, goalCtx)
    .issues.some((i) => i.includes("saving goal")),
)

// Transfers: need a different, known destination; source falls back to default.
const tctx = { accounts, defaultAccountId: "acc1", currency: "AUD" }
const transfer = validateTransaction(
  { type: "transfer", amount: 50, date: "2026-11-02", description: "To savings", toAccountId: "acc2" },
  tctx,
)
assert.deepEqual(transfer.issues, [])
assert.equal(transfer.accountId, "acc1")
assert.ok(
  validateTransaction({ type: "transfer", amount: 50, date: "2026-11-02", description: "x", toAccountId: "acc1" }, tctx)
    .issues.some((i) => i.includes("two different accounts")),
)
assert.ok(
  validateTransaction({ type: "transfer", amount: 50, date: "2026-11-02", description: "x" }, tctx)
    .issues.some((i) => i.includes("toAccountId")),
)

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

// --- monthBounds -----------------------------------------------------------

assert.deepEqual(monthBounds("2026-02-14"), { periodStart: "2026-02-01", periodEnd: "2026-02-28" })
assert.deepEqual(monthBounds("2028-02-03"), { periodStart: "2028-02-01", periodEnd: "2028-02-29" })
assert.deepEqual(monthBounds("2026-12-31"), { periodStart: "2026-12-01", periodEnd: "2026-12-31" })

// --- summarizeSpending -----------------------------------------------------

const spend = summarizeSpending([
  { amountMinor: 1000n, fundCategory: "fixedCosts", expenseCategory: "groceries" },
  { amountMinor: 2500n, fundCategory: "guiltFreeSpending", expenseCategory: "food" },
  { amountMinor: 500n, fundCategory: "fixedCosts", expenseCategory: "groceries" },
  { amountMinor: 100n, fundCategory: null, expenseCategory: null },
])
assert.equal(spend.totalMinor, 4100n)
assert.equal(spend.count, 4)
assert.deepEqual(
  spend.byExpenseCategory.map((r) => [r.category, r.totalMinor, r.count]),
  [["food", 2500n, 1], ["groceries", 1500n, 2], ["uncategorized", 100n, 1]],
)
assert.deepEqual(
  spend.byFundCategory.map((r) => [r.category, r.totalMinor]),
  [["guiltFreeSpending", 2500n], ["fixedCosts", 1500n], ["uncategorized", 100n]],
)

// --- checkBudgetSplit ------------------------------------------------------

const split = (fc: number, s: number, inv: number, g: number) => ({
  fixedCosts: { type: "percentage" as const, value: fc },
  savings: { type: "percentage" as const, value: s },
  investment: { type: "percentage" as const, value: inv },
  guiltFreeSpending: { type: "percentage" as const, value: g },
})
assert.deepEqual(checkBudgetSplit(split(50, 20, 10, 20)), [])
assert.ok(checkBudgetSplit(split(60, 20, 10, 20))[0].includes("110%"))
assert.deepEqual(
  checkBudgetSplit({ ...split(50, 20, 10, 0), guiltFreeSpending: { type: "fixed", value: 800 } }),
  [],
)
assert.ok(checkBudgetSplit(split(50, -5, 10, 20)).some((i) => i.includes("savings")))

console.log("mcp-transactions tests passed")
