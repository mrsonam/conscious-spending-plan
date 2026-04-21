import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      /** Persisted dashboard experience: classic or Wealth Console */
      dashboardTheme?: string
      /** ISO 4217 display currency for formatted amounts */
      displayCurrency?: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    picture?: string | null
    dashboardTheme?: string
    displayCurrency?: string
  }
}
