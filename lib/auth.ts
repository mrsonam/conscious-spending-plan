import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Please add it to your .env file.\n" +
    "You can generate one by running: npm run generate-secret"
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
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

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
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
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google" && user.email) {
        // Check if user exists, if not create them
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        })

        if (!existingUser) {
          // Create new user with Google OAuth
          // Generate a random password since Google users don't need one
          const randomPassword = await bcrypt.hash(Math.random().toString(36), 10)
          
          await prisma.user.create({
            data: {
              email: user.email,
              password: randomPassword, // Not used for OAuth users, but required by schema
              name: user.name || null,
              fundAllocation: {
                create: {
                  fixedCostsType: "percentage",
                  fixedCostsValue: 50,
                  savingsType: "percentage",
                  savingsValue: 20,
                  investmentType: "percentage",
                  investmentValue: 10,
                  guiltFreeSpendingType: "percentage",
                  guiltFreeSpendingValue: 20,
                }
              }
            }
          })
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      
      // If signing in with Google, fetch user ID from database
      if (account?.provider === "google" && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email }
        })
        if (dbUser) {
          token.id = dbUser.id
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  }
})
