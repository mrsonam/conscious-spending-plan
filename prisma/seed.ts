/**
 * Seeds a demo user with realistic data across accounts, income, expenses,
 * transfers, investments, loans, subscriptions, and category ledgers.
 *
 * Run: npx prisma db seed
 * Requires DATABASE_URL (and DIRECT_URL if used by Prisma).
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { DEMO_ACCOUNT } from "../lib/demo-credentials"
import { dollarsToMinor } from "../lib/money"
import { defaultFundAllocationNestedCreate } from "../lib/fund-allocation-fields"
import { Decimal } from "@prisma/client/runtime/library"

const prisma = new PrismaClient()
const SEED_CURRENCY = "AUD"
/** Dollar amounts in seed data → DB minor units */
const m = (amount: number | string, currency = SEED_CURRENCY) =>
  dollarsToMinor(amount, currency)

function utc(y: number, month: number, day: number, hh = 12, mm = 0) {
  return new Date(Date.UTC(y, month - 1, day, hh, mm, 0, 0))
}

function monthEnd(y: number, month: number) {
  return new Date(Date.UTC(y, month, 0, 23, 59, 59, 999))
}

function monthStart(y: number, month: number) {
  return new Date(Date.UTC(y, month - 1, 1, 0, 0, 0, 0))
}

const SALARY = 8500

/** 50% FC, 20% savings, 10% inv, 20% GFS, matches default fund split for demos. */
function salaryAllocations(amount: number) {
  return {
    allocationFixedCosts: m(amount * 0.5),
    allocationSavings: m(amount * 0.2),
    allocationInvestment: m(amount * 0.1),
    allocationGuiltFreeSpending: m(amount * 0.2),
  }
}

async function main() {
  const email = DEMO_ACCOUNT.email.toLowerCase()

  await prisma.user.deleteMany({ where: { email } })

  const passwordHash = await bcrypt.hash(DEMO_ACCOUNT.password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      name: "Demo Explorer",
      dashboardTheme: "console",
      onboardingCompletedAt: new Date(),
      onboardingBucketsSavedAt: new Date(),
      fundAllocation: {
        create: {
          ...defaultFundAllocationNestedCreate(),
          fixedCostsCap: m(6000),
          savingsCap: null,
        },
      },
    },
  })

  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Primary Checking",
      bankName: "Demo National Bank",
      accountType: "checking",
      balance: 0n,
      startingFunds: m(12000),
      isDefault: true,
    },
  })

  const savings = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Emergency Savings",
      bankName: "High-Yield Savings Co.",
      accountType: "savings",
      balance: 0n,
      startingFunds: m(18000),
    },
  })

  const brokerage = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Brokerage, long term",
      bankName: "Fidelity Demo",
      accountType: "investment",
      balance: 0n,
      startingFunds: m(42000),
    },
  })

  const credit = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Rewards Visa",
      bankName: "Demo National Bank",
      accountType: "credit",
      balance: m(-2840),
      startingFunds: 0n,
    },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultAccountId: checking.id },
  })

  const alloc = salaryAllocations(SALARY)
  const payMonths: { y: number; m: number; day: number }[] = [
    { y: 2025, m: 11, day: 1 },
    { y: 2025, m: 12, day: 1 },
    { y: 2026, m: 1, day: 1 },
    { y: 2026, m: 2, day: 3 },
    { y: 2026, m: 3, day: 2 },
    { y: 2026, m: 4, day: 1 },
  ]

  for (const pm of payMonths) {
    const ps = monthStart(pm.y, pm.m)
    const pe = monthEnd(pm.y, pm.m)
    await prisma.incomeEntry.create({
      data: {
        userId: user.id,
        amount: m(SALARY),
        description: `Salary, ${pm.y}-${String(pm.m).padStart(2, "0")}`,
        date: utc(pm.y, pm.m, pm.day),
        periodStart: ps,
        periodEnd: pe,
        accountId: checking.id,
        excludeFromAllocation: false,
        ...alloc,
      },
    })
  }

  await prisma.incomeEntry.create({
    data: {
      userId: user.id,
      amount: m(3200),
      description: "Annual performance bonus (net)",
      date: utc(2026, 3, 15),
      periodStart: monthStart(2026, 3),
      periodEnd: monthEnd(2026, 3),
      accountId: checking.id,
      excludeFromAllocation: false,
      allocationFixedCosts: m(1600),
      allocationSavings: m(640),
      allocationInvestment: m(320),
      allocationGuiltFreeSpending: m(640),
    },
  })

  type Exp = {
    amount: number
    description: string | null
    category: string
    expenseCategory: string
    date: Date
    accountId: string
  }

  const expenses: Exp[] = [
    { amount: 1820, description: "Rent, March", category: "fixedCosts", expenseCategory: "rent", date: utc(2026, 3, 1, 9), accountId: checking.id },
    { amount: 1820, description: "Rent, April", category: "fixedCosts", expenseCategory: "rent", date: utc(2026, 4, 1, 9), accountId: checking.id },
    { amount: 124, description: "Electric & gas", category: "fixedCosts", expenseCategory: "bills", date: utc(2026, 4, 5), accountId: checking.id },
    { amount: 59, description: "Internet", category: "fixedCosts", expenseCategory: "bills", date: utc(2026, 4, 6), accountId: credit.id },
    { amount: 89.5, description: "Mobile family plan", category: "fixedCosts", expenseCategory: "bills", date: utc(2026, 4, 7), accountId: credit.id },
    { amount: 164.23, description: "Groceries, weekend shop", category: "guiltFreeSpending", expenseCategory: "groceries", date: utc(2026, 4, 8, 11), accountId: checking.id },
    { amount: 48.7, description: "Fuel", category: "fixedCosts", expenseCategory: "gas", date: utc(2026, 4, 9), accountId: credit.id },
    { amount: 38, description: "Coffee & lunch", category: "guiltFreeSpending", expenseCategory: "food", date: utc(2026, 4, 10), accountId: checking.id },
    { amount: 215, description: "Dinner, anniversary", category: "guiltFreeSpending", expenseCategory: "food", date: utc(2026, 4, 11, 19), accountId: credit.id },
    { amount: 42, description: "Streaming rental", category: "guiltFreeSpending", expenseCategory: "entertainment", date: utc(2026, 4, 12), accountId: credit.id },
    { amount: 675, description: "Flight, regional trip", category: "guiltFreeSpending", expenseCategory: "travel", date: utc(2026, 4, 2), accountId: credit.id },
    { amount: 120, description: "Pharmacy", category: "fixedCosts", expenseCategory: "pharmacy", date: utc(2026, 3, 22), accountId: checking.id },
    { amount: 220, description: "Quarterly insurance (auto)", category: "fixedCosts", expenseCategory: "insurance", date: utc(2026, 3, 25), accountId: checking.id },
    { amount: 145, description: "Gym annual upgrade", category: "guiltFreeSpending", expenseCategory: "fitness", date: utc(2026, 3, 18), accountId: credit.id },
    { amount: 400, description: "Index fund buy (cash → VTI)", category: "investment", expenseCategory: "technology", date: utc(2026, 4, 4), accountId: checking.id },
    { amount: 250, description: "Charity transfer (from budget bucket)", category: "savings", expenseCategory: "gifts", date: utc(2026, 4, 6), accountId: checking.id },
    { amount: 95, description: "Book & course", category: "guiltFreeSpending", expenseCategory: "education", date: utc(2026, 4, 3), accountId: credit.id },
    { amount: 310, description: "Home repair supplies", category: "fixedCosts", expenseCategory: "home", date: utc(2026, 4, 13), accountId: checking.id },
    { amount: 56, description: "Pet food & vet refills", category: "guiltFreeSpending", expenseCategory: "pet", date: utc(2026, 4, 14), accountId: checking.id },
  ]

  for (const e of expenses) {
    await prisma.expense.create({
      data: {
        userId: user.id,
        accountId: e.accountId,
        amount: m(e.amount),
        description: e.description,
        category: e.category,
        expenseCategory: e.expenseCategory,
        date: e.date,
      },
    })
  }

  await prisma.transfer.create({
    data: {
      userId: user.id,
      fromAccountId: checking.id,
      toAccountId: savings.id,
      amount: m(1500),
      description: "Monthly savings sweep",
      category: "savings",
      date: utc(2026, 4, 3, 8),
    },
  })

  await prisma.transfer.create({
    data: {
      userId: user.id,
      fromAccountId: checking.id,
      toAccountId: brokerage.id,
      amount: m(1200),
      description: "Brokerage contribution",
      category: "investment",
      date: utc(2026, 4, 5, 10),
    },
  })

  await prisma.transfer.create({
    data: {
      userId: user.id,
      fromAccountId: savings.id,
      toAccountId: checking.id,
      amount: m(400),
      description: "Rebalance, liquidity",
      category: "savings",
      date: utc(2026, 4, 12, 14),
    },
  })

  const recurringRent = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      amount: m(1850),
      description: "Apartment rent (recurring)",
      category: "fixedCosts",
      expenseCategory: "rent",
      frequency: "monthly",
      startDate: utc(2025, 6, 1),
      isActive: true,
    },
  })

  await prisma.subscription.create({
    data: {
      userId: user.id,
      recurringExpenseId: recurringRent.id,
      provider: "Oak Street Properties",
      label: "Primary lease",
      status: "active",
      nextRenewalAt: utc(2026, 5, 1, 9),
      reminderDaysBefore: 5,
    },
  })

  const recurringNetflix = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      accountId: credit.id,
      amount: m(15.99),
      description: "Netflix Premium",
      category: "guiltFreeSpending",
      expenseCategory: "subscriptions",
      frequency: "monthly",
      startDate: utc(2024, 1, 10),
      isActive: true,
    },
  })

  await prisma.subscription.create({
    data: {
      userId: user.id,
      recurringExpenseId: recurringNetflix.id,
      provider: "Netflix",
      label: "Premium 4K",
      status: "active",
      trialEndsAt: null,
      nextRenewalAt: utc(2026, 4, 22),
      reminderDaysBefore: 7,
    },
  })

  const recurringSpotify = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      accountId: credit.id,
      amount: m(11.99),
      description: "Music streaming",
      category: "guiltFreeSpending",
      expenseCategory: "subscriptions",
      frequency: "monthly",
      startDate: utc(2023, 5, 1),
      isActive: true,
    },
  })

  await prisma.subscription.create({
    data: {
      userId: user.id,
      recurringExpenseId: recurringSpotify.id,
      provider: "Spotify",
      label: "Individual",
      status: "active",
      nextRenewalAt: utc(2026, 4, 28),
      reminderDaysBefore: 3,
    },
  })

  const recurringCloud = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      accountId: credit.id,
      amount: m(29),
      description: "Cloud IDE & AI tokens",
      category: "fixedCosts",
      expenseCategory: "technology",
      frequency: "monthly",
      startDate: utc(2025, 2, 1),
      isActive: true,
    },
  })

  await prisma.subscription.create({
    data: {
      userId: user.id,
      recurringExpenseId: recurringCloud.id,
      provider: "DevCloud",
      label: "Pro workspace",
      status: "active",
      nextRenewalAt: utc(2026, 4, 18),
      reminderDaysBefore: 7,
      foreignCurrency: "EUR",
      foreignAmount: m(26.5, "EUR"),
    },
  })

  const yearlySoftware = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      amount: m(139),
      description: "Creative suite, annual",
      category: "fixedCosts",
      expenseCategory: "subscriptions",
      frequency: "yearly",
      startDate: utc(2025, 8, 15),
      isActive: true,
    },
  })

  await prisma.subscription.create({
    data: {
      userId: user.id,
      recurringExpenseId: yearlySoftware.id,
      provider: "DesignSoft",
      label: "Suite renewal",
      status: "active",
      nextRenewalAt: utc(2026, 8, 15),
      reminderDaysBefore: 14,
    },
  })

  const pausedGym = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      amount: m(49),
      description: "Local gym (paused)",
      category: "guiltFreeSpending",
      expenseCategory: "fitness",
      frequency: "monthly",
      startDate: utc(2024, 3, 1),
      isActive: true,
    },
  })

  await prisma.subscription.create({
    data: {
      userId: user.id,
      recurringExpenseId: pausedGym.id,
      provider: "FitCity",
      label: "Membership",
      status: "paused",
      nextRenewalAt: utc(2026, 6, 1),
      reminderDaysBefore: 7,
    },
  })

  await prisma.investmentHolding.create({
    data: {
      userId: user.id,
      accountId: brokerage.id,
      name: "VTI",
      amount: m(18000),
      pricePerUnit: m(242.5),
      numberOfShares: new Decimal("74.2"),
      brokerageFee: m(0),
      date: utc(2025, 8, 12),
    },
  })

  await prisma.investmentHolding.create({
    data: {
      userId: user.id,
      accountId: brokerage.id,
      name: "AAPL",
      amount: m(6200),
      pricePerUnit: m(198.4),
      numberOfShares: new Decimal("31.25"),
      brokerageFee: m(4.99),
      date: utc(2026, 1, 8),
    },
  })

  await prisma.investmentHolding.create({
    data: {
      userId: user.id,
      accountId: brokerage.id,
      name: "VXUS",
      amount: m(9500),
      pricePerUnit: m(65.2),
      numberOfShares: new Decimal("145.7"),
      brokerageFee: m(0),
      date: utc(2025, 11, 20),
    },
  })

  await prisma.investmentDividend.create({
    data: {
      userId: user.id,
      accountId: brokerage.id,
      name: "VTI",
      amount: m(112.44),
      date: utc(2026, 3, 28),
    },
  })

  await prisma.investmentDividend.create({
    data: {
      userId: user.id,
      accountId: brokerage.id,
      name: "AAPL",
      amount: m(24.5),
      date: utc(2026, 2, 14),
    },
  })

  await prisma.loan.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      amount: m(2500),
      description: "Covered friend’s move-in deposit",
      borrowerName: "Alex M.",
      date: utc(2025, 10, 5),
      dueDate: utc(2026, 10, 5),
      status: "active",
      repaidAmount: m(500),
    },
  })

  await prisma.loan.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      amount: m(600),
      description: "Short bridge, family",
      borrowerName: "Sam K.",
      date: utc(2026, 2, 1),
      status: "repaid",
      repaidAmount: m(600),
    },
  })

  await prisma.borrowedLoan.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      amount: m(18500),
      description: "Consolidation note, variable rate",
      lenderName: "Metro Credit Union",
      date: utc(2024, 6, 1),
      dueDate: utc(2029, 6, 1),
      status: "active",
      repaidAmount: m(4200),
    },
  })

  await prisma.borrowedLoan.create({
    data: {
      userId: user.id,
      accountId: brokerage.id,
      amount: m(4000),
      description: "Margin line, promotional",
      lenderName: "Fidelity Demo",
      date: utc(2025, 3, 10),
      status: "active",
      repaidAmount: m(800),
    },
  })

  const y2026 = 2026
  const april = 4
  const march = 3

  await prisma.categoryBalance.createMany({
    data: [
      { userId: user.id, category: "fixedCosts", balance: m(2180), month: april, year: y2026 },
      { userId: user.id, category: "savings", balance: m(9240), month: april, year: y2026 },
      { userId: user.id, category: "investment", balance: m(3850), month: april, year: y2026 },
      { userId: user.id, category: "guiltFreeSpending", balance: m(1640), month: april, year: y2026 },
    ],
  })

  await prisma.categoryTransaction.createMany({
    data: [
      { userId: user.id, category: "fixedCosts", type: "income", amount: m(4250), description: "Salary allocation", date: utc(2026, 4, 1), month: april, year: y2026 },
      { userId: user.id, category: "fixedCosts", type: "expense", amount: m(400), description: "Utilities blend", date: utc(2026, 4, 5), month: april, year: y2026 },
      { userId: user.id, category: "savings", type: "income", amount: m(1700), description: "Salary allocation", date: utc(2026, 4, 1), month: april, year: y2026 },
      { userId: user.id, category: "savings", type: "expense", amount: m(300), description: "Planned sweep", date: utc(2026, 4, 8), month: april, year: y2026 },
      { userId: user.id, category: "investment", type: "income", amount: m(850), description: "Salary allocation", date: utc(2026, 4, 1), month: april, year: y2026 },
      { userId: user.id, category: "investment", type: "expense", amount: m(150), description: "Reinvest fee", date: utc(2026, 4, 6), month: april, year: y2026 },
      { userId: user.id, category: "guiltFreeSpending", type: "income", amount: m(1700), description: "Salary allocation", date: utc(2026, 4, 1), month: april, year: y2026 },
      { userId: user.id, category: "guiltFreeSpending", type: "expense", amount: m(420), description: "Weekend & dining", date: utc(2026, 4, 10), month: april, year: y2026 },
    ],
  })

  await prisma.categoryMonthClosing.createMany({
    data: [
      { userId: user.id, category: "fixedCosts", month: march, year: y2026, remaining: m(120), overspent: 0n },
      { userId: user.id, category: "savings", month: march, year: y2026, remaining: m(400), overspent: 0n },
      { userId: user.id, category: "investment", month: march, year: y2026, remaining: 0n, overspent: 0n },
      { userId: user.id, category: "guiltFreeSpending", month: march, year: y2026, remaining: m(80), overspent: m(40) },
    ],
  })

  await prisma.account.update({
    where: { id: checking.id },
    data: {
      balance: m(19650),
      startingFunds: m(12000),
    },
  })
  await prisma.account.update({
    where: { id: savings.id },
    data: {
      balance: m(26840),
      startingFunds: m(18000),
    },
  })
  await prisma.account.update({
    where: { id: brokerage.id },
    data: {
      balance: m(54380),
      startingFunds: m(42000),
    },
  })

  await prisma.account.update({
    where: { id: credit.id },
    data: {
      balance: m(-4185),
    },
  })

  console.log(`Demo user seeded: ${email} (${user.id})`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
