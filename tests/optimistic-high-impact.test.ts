import assert from "node:assert/strict"

import {
  applyAccountTransferBalances,
  applyOptimisticAccountCreate,
  applyOptimisticAccountDelete,
} from "../lib/account-optimistic"
import { applyOptimisticGoalTransfer } from "../lib/saving-goals-optimistic"
import { applyOptimisticRecordLoan } from "../lib/loans-optimistic"

const accounts = [
  {
    id: "a1",
    name: "Checking",
    bankName: "Bank",
    accountType: "checking",
    balance: 1000,
    startingFunds: 1000,
    isDefault: true,
  },
  {
    id: "a2",
    name: "Savings",
    bankName: "Bank",
    accountType: "savings",
    balance: 500,
    startingFunds: 500,
    isDefault: false,
  },
]

assert.deepEqual(
  applyAccountTransferBalances(accounts, "a1", "a2", 200).map((a) => a.balance),
  [800, 700]
)

const created = applyOptimisticAccountCreate(accounts, {
  name: "Broker",
  bankName: "Stake",
  accountType: "investment",
  balance: 0,
  isDefault: false,
})
assert.equal(created.length, 3)
assert.ok(created[2]?.id.startsWith("account-"))

const deleted = applyOptimisticAccountDelete(created, "a2")
assert.equal(deleted.length, 2)
assert.ok(!deleted.some((a) => a.id === "a2"))

const goals = [
  {
    id: "g1",
    name: "Holiday",
    target: 2000,
    current: 100,
    percent: 50,
    status: "active" as const,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
]
const summary = {
  activeCount: 1,
  assignedPercent: 50,
  unassignedPercent: 50,
  generalSavingsAvailable: 400,
}

const transfer = applyOptimisticGoalTransfer(goals, summary, "g1", 50)
assert.equal(transfer.goals[0]?.current, 150)
assert.equal(transfer.summary.generalSavingsAvailable, 350)

const loan = applyOptimisticRecordLoan([], accounts, {
  accountId: "a1",
  amount: 100,
  borrowerName: "Alex",
  description: null,
  date: "2026-05-01",
  dueDate: null,
  account: { id: "a1", name: "Checking", bankName: "Bank" },
})
assert.equal(loan.loans.length, 1)
assert.equal(loan.accounts.find((a) => a.id === "a1")?.balance, 900)

console.log("optimistic-high-impact.test.ts: all assertions passed")
