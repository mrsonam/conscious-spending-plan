type CategoryMapping = {
  category: string
  expenseCategory: string
}

const BASIQ_CATEGORY_MAP: Record<string, CategoryMapping> = {
  "food-and-dining": { category: "guiltFreeSpending", expenseCategory: "food" },
  groceries: { category: "guiltFreeSpending", expenseCategory: "groceries" },
  "restaurants-and-cafes": { category: "guiltFreeSpending", expenseCategory: "food" },
  utilities: { category: "fixedCosts", expenseCategory: "bills" },
  "rent-and-mortgage": { category: "fixedCosts", expenseCategory: "rent" },
  insurance: { category: "fixedCosts", expenseCategory: "insurance" },
  transport: { category: "fixedCosts", expenseCategory: "transport" },
  fuel: { category: "fixedCosts", expenseCategory: "gas" },
  entertainment: { category: "guiltFreeSpending", expenseCategory: "entertainment" },
  shopping: { category: "guiltFreeSpending", expenseCategory: "shopping" },
  clothing: { category: "guiltFreeSpending", expenseCategory: "clothing" },
  health: { category: "fixedCosts", expenseCategory: "healthcare" },
  medical: { category: "fixedCosts", expenseCategory: "healthcare" },
  pharmacy: { category: "fixedCosts", expenseCategory: "pharmacy" },
  education: { category: "fixedCosts", expenseCategory: "education" },
  "streaming-services": { category: "guiltFreeSpending", expenseCategory: "subscriptions" },
  subscriptions: { category: "guiltFreeSpending", expenseCategory: "subscriptions" },
  "personal-care": { category: "guiltFreeSpending", expenseCategory: "personal" },
  "gifts-and-donations": { category: "guiltFreeSpending", expenseCategory: "gifts" },
  travel: { category: "guiltFreeSpending", expenseCategory: "travel" },
  "home-and-garden": { category: "guiltFreeSpending", expenseCategory: "home" },
  pets: { category: "guiltFreeSpending", expenseCategory: "pet" },
  fitness: { category: "guiltFreeSpending", expenseCategory: "fitness" },
  technology: { category: "guiltFreeSpending", expenseCategory: "technology" },
}

const DEFAULT_MAPPING: CategoryMapping = {
  category: "guiltFreeSpending",
  expenseCategory: "other",
}

export function mapBasiqCategory(
  basiqCategory: string | null | undefined,
  basiqSubcategory: string | null | undefined
): CategoryMapping {
  if (basiqSubcategory) {
    const subKey = basiqSubcategory.toLowerCase().replace(/\s+/g, "-")
    if (BASIQ_CATEGORY_MAP[subKey]) return BASIQ_CATEGORY_MAP[subKey]
  }
  if (basiqCategory) {
    const key = basiqCategory.toLowerCase().replace(/\s+/g, "-")
    if (BASIQ_CATEGORY_MAP[key]) return BASIQ_CATEGORY_MAP[key]
  }
  return DEFAULT_MAPPING
}
