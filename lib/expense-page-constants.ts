export const FUND_CATEGORIES = [
  { value: "fixedCosts", label: "Fixed Costs" },
  { value: "investment", label: "Investment" },
  { value: "savings", label: "Savings" },
  { value: "guiltFreeSpending", label: "Guilt-Free Spending" },
] as const

export const EXPENSE_CATEGORIES = [
  { value: "groceries", label: "Groceries" },
  { value: "food", label: "Food & Dining" },
  { value: "transport", label: "Transportation" },
  { value: "gas", label: "Gas & Fuel" },
  { value: "bills", label: "Bills & Utilities" },
  { value: "rent", label: "Rent & Mortgage" },
  { value: "insurance", label: "Insurance" },
  { value: "entertainment", label: "Entertainment" },
  { value: "shopping", label: "Shopping" },
  { value: "clothing", label: "Clothing & Apparel" },
  { value: "healthcare", label: "Healthcare" },
  { value: "pharmacy", label: "Pharmacy & Medicine" },
  { value: "education", label: "Education" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "personal", label: "Personal Care" },
  { value: "gifts", label: "Gifts & Donations" },
  { value: "travel", label: "Travel" },
  { value: "home", label: "Home & Garden" },
  { value: "pet", label: "Pet Care" },
  { value: "fitness", label: "Fitness & Sports" },
  { value: "technology", label: "Technology & Electronics" },
  { value: "other", label: "Other" },
] as const

export const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const
