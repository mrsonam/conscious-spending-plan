import assert from "node:assert/strict"

import {
  patchDashboardForExpenseLog,
  patchDashboardForIncomeLog,
  type DashboardConsoleSnapshot,
} from "../lib/dashboard-console-optimistic"

const allocation = {
  id: "fa1",
  fixedCostsType: "percentage",
  fixedCostsValue: 50,
  savingsType: "percentage",
  savingsValue: 20,
  investmentType: "percentage",
  investmentValue: 10,
  guiltFreeSpendingType: "percentage",
  guiltFreeSpendingValue: 20,
}

const base: DashboardConsoleSnapshot = {
  breakdown: {
    income: 1000,
    fixedCosts: 500,
    savings: 200,
    investment: 100,
    guiltFreeSpending: 200,
    total: 1000,
  },
  accounts: [
    {
      id: "a1",
      name: "Checking",
      bankName: "Bank",
      accountType: "checking",
      balance: 1000,
    },
  ],
  expenses: [],
  expensesTotalForMonth: 0,
  categoryTracking: {
    fixedCosts: { allocated: 500, spent: 100, remaining: 400 },
    savings: { allocated: 200, spent: 0, remaining: 200 },
  },
  ytdSummary: {
    year: new Date().getFullYear(),
    totalIncome: 1000,
    totalExpenses: 100,
    totalInvested: 0,
  },
}

const today = new Date().toISOString().slice(0, 10)

const incomePatch = patchDashboardForIncomeLog(base, {
  amount: 1000,
  date: today,
  accountId: "a1",
  allocateToBudget: true,
  allocation,
  account: base.accounts[0]!,
})

assert.equal(incomePatch.breakdown?.income, 2000)
assert.equal(incomePatch.accounts[0]?.balance, 2000)
assert.equal(incomePatch.ytdSummary?.totalIncome, 2000)
assert.ok((incomePatch.categoryTracking.fixedCosts?.allocated ?? 0) > 500)

const expensePatch = patchDashboardForExpenseLog(base, {
  id: "optimistic-expense-1",
  accountId: "a1",
  amount: 50,
  description: "Coffee",
  category: "fixedCosts",
  date: today,
})

assert.equal(expensePatch.accounts[0]?.balance, 950)
assert.equal(expensePatch.expenses.length, 1)
assert.equal(expensePatch.expensesTotalForMonth, 50)
assert.equal(expensePatch.categoryTracking.fixedCosts?.spent, 150)
assert.equal(expensePatch.ytdSummary?.totalExpenses, 150)

console.log("dashboard-console-optimistic.test.ts: ok")
