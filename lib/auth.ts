import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { randomBytes } from "node:crypto"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { verifyPassword } from "./verify-password"
import { normalizeDashboardTheme } from "./dashboard-theme"
import {
  isValidDisplayCurrency,
  normalizeDisplayCurrency,
} from "./display-currency"
import { normalizeEmail } from "./password-policy"
import { defaultFundAllocationNestedCreate } from "@/lib/fund-allocation-fields"

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Please add it to your .env file.\n" +
    "You can generate one by running: npm run generate-secret"
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  // Allow localhost and other dev hosts without explicit NEXTAUTH_URL
  trustHost: true,
  providers: [
    // Only add Google provider if credentials are configured
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = normalizeEmail(credentials.email as string)

        const user = await prisma.user.findFirst({
          where: {
            email: { equals: email, mode: "insensitive" },
          },
        })

        const isPasswordValid = await verifyPassword(
          user?.password,
          credentials.password as string,
        )

        if (!user || !isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google" && user.email) {
        // Check if user exists, if not create them
        const existingUser = await prisma.user.findFirst({
          where: {
            email: {
              equals: normalizeEmail(user.email),
              mode: "insensitive",
            },
          },
        })

        if (!existingUser) {
          // Create new user with Google OAuth
          // Generate an unguessable placeholder password (never used to log in)
          const randomPassword = await bcrypt.hash(randomBytes(32).toString("hex"), 10)

          const googleEmail = normalizeEmail(user.email)
          
          await prisma.user.create({
            data: {
              email: googleEmail,
              password: randomPassword, // Not used for OAuth users, but required by schema
              name: user.name || null,
              fundAllocation: {
                create: defaultFundAllocationNestedCreate(),
              }
            }
          })
        }
      }
      return true
    },
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update" && session && typeof session === "object") {
        const s = session as {
          dashboardTheme?: unknown
          displayCurrency?: unknown
        }
        if (s.dashboardTheme !== undefined) {
          token.dashboardTheme = normalizeDashboardTheme(s.dashboardTheme)
        }
        if (isValidDisplayCurrency(s.displayCurrency)) {
          token.displayCurrency = s.displayCurrency
        }
        return token
      }

      if (user) {
        if (user.email) token.email = normalizeEmail(user.email)
        if (user.image) token.picture = user.image
      }

      // Google: never assign `user.id` (OAuth subject) to `token.id`, only Prisma `User.id`.
      if (account?.provider === "google" && user?.email) {
        const dbUser = await prisma.user.findFirst({
          where: {
            email: {
              equals: normalizeEmail(user.email),
              mode: "insensitive",
            },
          },
          select: { id: true, dashboardTheme: true, displayCurrency: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.dashboardTheme = normalizeDashboardTheme(dbUser.dashboardTheme)
          token.displayCurrency = normalizeDisplayCurrency(dbUser.displayCurrency)
        }
      } else if (user?.id && account?.provider === "credentials") {
        token.id = user.id
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { dashboardTheme: true, displayCurrency: true },
        })
        token.dashboardTheme = normalizeDashboardTheme(dbUser?.dashboardTheme)
        token.displayCurrency = normalizeDisplayCurrency(
          dbUser?.displayCurrency
        )
      }

      if (!token.dashboardTheme) {
        token.dashboardTheme = "console"
      }
      if (!token.displayCurrency) {
        token.displayCurrency = normalizeDisplayCurrency(undefined)
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // Always resolve to a real Prisma User.id (fixes stale JWTs with Google OAuth subject).
        const email = typeof token.email === "string" ? token.email : undefined
        let resolved: {
          id: string
          dashboardTheme: string | null
          displayCurrency: string
        } | null = null
        if (email) {
          resolved = await prisma.user.findFirst({
            where: {
              email: { equals: normalizeEmail(email), mode: "insensitive" },
            },
            select: { id: true, dashboardTheme: true, displayCurrency: true },
          })
        }
        if (!resolved && token.id) {
          resolved = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, dashboardTheme: true, displayCurrency: true },
          })
        }
        if (resolved) {
          session.user.id = resolved.id
          session.user.dashboardTheme = normalizeDashboardTheme(
            resolved.dashboardTheme,
          )
          session.user.displayCurrency = normalizeDisplayCurrency(
            resolved.displayCurrency
          )
        } else {
          session.user.id = ""
        }
        session.user.image = token.picture ?? null
        if (email && !session.user.email) {
          session.user.email = email
        }
      }
      return session
    }
  }
})
