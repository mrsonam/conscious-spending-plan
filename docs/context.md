# Project context

## What this is

**Conscious Spending Plan** is a personal finance web app inspired by Ramit Sethi’s Conscious Spending Plan. Users allocate income across **Fixed Costs**, **Savings**, **Investment**, and **Guilt-Free Spending**, then track income, expenses, accounts, subscriptions, loans, investments, and category budgets over time.

The primary experience is the **Wealth Console**: a dark obsidian dashboard (see `docs/design.md`). Routes like `/dashboard`, `/income`, and `/expenses` live under `app/(dashboard)/`.

## Stack


| Layer     | Choice                                                               |
| --------- | -------------------------------------------------------------------- |
| Framework | [Next.js](https://nextjs.org/) (App Router)                          |
| UI        | React, Tailwind CSS v4, Framer Motion (dialogs), Lucide icons        |
| Auth      | [NextAuth.js](https://next-auth.js.org/) v5 (email/password, Google) |
| Database  | PostgreSQL via [Prisma](https://www.prisma.io/)                      |
| Charts    | Recharts (where used)                                                |


Package name in `package.json` is `finance`; scripts: `npm run dev`, `npm run build`, `npm run lint`, Prisma helpers (`migrate:dev`, `db:seed`, `studio`).

## Repository map


| Path               | Role                                                  |
| ------------------ | ----------------------------------------------------- |
| `app/`             | Routes, layouts, API route handlers, global providers |
| `app/(dashboard)/` | Authenticated shell: sidebar, main dashboard pages    |
| `components/`      | Shared UI (layout, forms, wealth console views)       |
| `lib/`             | Auth, routing helpers, tokens, domain utilities       |
| `hooks/`           | Client hooks (e.g. currency formatting)               |
| `prisma/`          | Schema, migrations, seed                              |
| `types/`           | TypeScript augmentations (e.g. NextAuth)              |


## Data & auth

- **User** row in Prisma holds credentials, `dashboardTheme`, `displayCurrency`, and relations to financial entities.
- **API routes** under `app/api/` handle CRUD and settings; server code uses Prisma Client.
- **Session**: NextAuth; dashboard layout protects routes (redirect to login if unauthenticated).

## Configuration

- `**DATABASE_URL`** / `**DIRECT_URL**`: PostgreSQL (see `prisma/schema.prisma`).
- `**NEXTAUTH_SECRET**`, `**NEXTAUTH_URL**`: required for auth.
- **Google OAuth**: optional (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

After schema changes: `npx prisma migrate dev` (or deploy migration in production). `npm run build` runs `prisma generate` first.

## Related docs

- `docs/design.md` — Wealth Console tokens, typography, UI patterns.
- `README.md` — install steps, env template, feature list (source of truth for onboarding).

