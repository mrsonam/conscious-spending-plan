# Quick Setup Guide

## Missing NEXTAUTH_SECRET Error?

If you're seeing an error about missing `NEXTAUTH_SECRET`, follow these steps:

### Step 1: Generate a Secret

Run this command:
```bash
npm run generate-secret
```

This will output something like:
```
✅ Generated NEXTAUTH_SECRET:
Sj5O+EICdhSIxYhNumKYCfMEs6m8h90YHGI+ywrMhic=

📝 Add this to your .env file:
NEXTAUTH_SECRET="Sj5O+EICdhSIxYhNumKYCfMEs6m8h90YHGI+ywrMhic="
```

### Step 2: Create/Update .env File

Create a `.env` file in the root directory (if it doesn't exist) and add:

**For Supabase/PostgreSQL (Current Setup):**
```env
DATABASE_URL="postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
NEXTAUTH_SECRET="paste-your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

**For Local SQLite (requires changing schema.prisma provider to "sqlite"):**
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="paste-your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Note:** Google OAuth credentials are optional. Only add them if you want Google sign-in:
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Step 3: Restart the Dev Server

After adding the secret, restart your development server:
```bash
npm run dev
```

## Complete .env Example

**For Supabase/PostgreSQL:**
```env
# Database (PostgreSQL - Supabase)
DATABASE_URL="postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres?sslmode=require"

# NextAuth (REQUIRED)
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (OPTIONAL - only if you want Google sign-in)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

**For Local SQLite (change schema.prisma provider to "sqlite" first):**
```env
# Database (SQLite - Local only)
DATABASE_URL="file:./prisma/dev.db"

# NextAuth (REQUIRED)
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (OPTIONAL - only if you want Google sign-in)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

## Troubleshooting

- **"Environment variable not found: DATABASE_URL"** → Make sure `.env` file exists in root directory with `DATABASE_URL` set
- **"EPERM: operation not permitted"** → Stop all Node processes (see FIX_PRISMA_LOCK.md) or restart computer
- **Error persists?** Make sure the `.env` file is in the root directory (same level as `package.json`)
- **Still not working?** Restart your terminal and dev server after creating/updating `.env`
- **Production?** Make sure to set `NEXTAUTH_SECRET` and `DATABASE_URL` in your production environment variables
- **Using SQLite?** You must change `prisma/schema.prisma` provider from `"postgresql"` to `"sqlite"` first
