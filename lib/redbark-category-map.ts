type CategoryMapping = {
  category: string
  expenseCategory: string
}

// CDR (Consumer Data Right) primary-category codes → our budget + expense categories
const CDR_CATEGORY_MAP: Record<string, CategoryMapping> = {
  FOOD_AND_DRINK:       { category: "guiltFreeSpending", expenseCategory: "food" },
  GROCERIES:            { category: "guiltFreeSpending", expenseCategory: "groceries" },
  TRANSPORT:            { category: "fixedCosts",        expenseCategory: "transport" },
  FUEL:                 { category: "fixedCosts",        expenseCategory: "gas" },
  UTILITIES:            { category: "fixedCosts",        expenseCategory: "bills" },
  RENT_AND_MORTGAGE:    { category: "fixedCosts",        expenseCategory: "rent" },
  INSURANCE:            { category: "fixedCosts",        expenseCategory: "insurance" },
  HEALTH_AND_MEDICAL:   { category: "fixedCosts",        expenseCategory: "healthcare" },
  EDUCATION:            { category: "fixedCosts",        expenseCategory: "education" },
  ENTERTAINMENT:        { category: "guiltFreeSpending", expenseCategory: "entertainment" },
  SHOPPING:             { category: "guiltFreeSpending", expenseCategory: "shopping" },
  CLOTHING:             { category: "guiltFreeSpending", expenseCategory: "clothing" },
  TRAVEL:               { category: "guiltFreeSpending", expenseCategory: "travel" },
  PERSONAL_CARE:        { category: "guiltFreeSpending", expenseCategory: "personal" },
  GIFTS_AND_CHARITY:    { category: "guiltFreeSpending", expenseCategory: "gifts" },
  HOME_IMPROVEMENT:     { category: "guiltFreeSpending", expenseCategory: "home" },
  PETS:                 { category: "guiltFreeSpending", expenseCategory: "pet" },
  FITNESS:              { category: "guiltFreeSpending", expenseCategory: "fitness" },
  SUBSCRIPTIONS:        { category: "guiltFreeSpending", expenseCategory: "subscriptions" },
  TECHNOLOGY:           { category: "guiltFreeSpending", expenseCategory: "technology" },
  INVESTMENTS:          { category: "investment",        expenseCategory: "investment" },
  SAVINGS:              { category: "savings",           expenseCategory: "savings" },
  LOANS_AND_FINANCE:    { category: "fixedCosts",        expenseCategory: "bills" },
  GOVERNMENT:           { category: "fixedCosts",        expenseCategory: "bills" },
  INCOME:               { category: "guiltFreeSpending", expenseCategory: "other" },
  TRANSFER:             { category: "guiltFreeSpending", expenseCategory: "other" },
  OTHER:                { category: "guiltFreeSpending", expenseCategory: "other" },
}

const DEFAULT_MAPPING: CategoryMapping = {
  category: "guiltFreeSpending",
  expenseCategory: "other",
}

export function mapCdrCategory(cdrCategory: string | null | undefined): CategoryMapping {
  if (!cdrCategory) return DEFAULT_MAPPING
  return CDR_CATEGORY_MAP[cdrCategory.toUpperCase()] ?? DEFAULT_MAPPING
}
