# Conscious Spending Plan App

A Next.js finance application based on Ramit Sethi's Conscious Spending Plan. This app helps you divide your fortnightly income into four key categories: Fixed Costs, Savings, Investment, and Guilt-Free Spending.

## Features

- 🔐 User authentication with NextAuth.js (Email/Password and Google OAuth)
- 💰 Personalize fund allocation (percentage or fixed amount)
- 📊 Calculate income breakdown based on your settings
- 💾 Save income entries and track your finances
- 📱 Responsive, modern UI

## Getting Started

### Prerequisites

- Node.js 20.14+ (or compatible version)
- npm or yarn

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following:
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**⚠️ IMPORTANT: NEXTAUTH_SECRET is required!**

To generate a secure `NEXTAUTH_SECRET`, you can run:
```bash
npm run generate-secret
```

This will generate a secure random secret. Copy the output and add it to your `.env` file.

Alternatively, you can use:
```bash
openssl rand -base64 32
```

### Setting up Google OAuth (Optional)

To enable Google sign-in:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your `.env` file

**Note**: Google OAuth is optional. The app will work with email/password authentication even without Google credentials.

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Register**: 
   - Create a new account with your email and password, OR
   - Sign in with Google (if configured)
2. **Configure Fund Allocation**: 
   - Set each category (Fixed Costs, Savings, Investment, Guilt-Free Spending) as either:
     - **Percentage**: A percentage of your total income
     - **Fixed Amount**: A specific dollar amount
   - If you use fixed amounts, any remaining income will automatically go to savings
3. **Calculate Breakdown**: 
   - Enter your fortnightly income
   - Select the period start and end dates
   - Click "Calculate Breakdown" to see how your income is divided
4. **View Results**: See a visual breakdown of your income allocation with percentages and amounts

## Fund Allocation Logic

- Each category can be set as either a **percentage** of total income or a **fixed dollar amount**
- If any category is set to a fixed amount, the remaining income after all allocations will automatically go to **Savings**
- If all categories are set to percentages, they will be calculated based on your specified percentages
- The app ensures all income is allocated (any remainder goes to savings)

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **NextAuth.js** - Authentication
- **Prisma** - Database ORM
- **PostgreSQL** (Supabase) - Production database
- **SQLite** - Local development database (optional)
- **Tailwind CSS** - Styling
- **bcryptjs** - Password hashing

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── layout.tsx        # Root layout
├── components/           # React components
├── lib/                  # Utility functions
├── prisma/               # Database schema
└── types/                # TypeScript type definitions
```

## Database Schema

- **User**: Stores user account information
- **FundAllocation**: Stores user's fund allocation preferences
- **IncomeEntry**: Stores income entries and calculations

## Production Deployment

### Quick Deploy to Vercel + Supabase

See `VERCEL_DEPLOYMENT.md` for detailed instructions.

**Quick steps:**
1. Create a Supabase project and get your database URL
2. Update `prisma/schema.prisma` to use `postgresql` (already done)
3. Run migrations: `npx prisma migrate dev --name init`
4. Deploy to Vercel and set environment variables
5. See `VERCEL_DEPLOYMENT.md` for complete guide

### Manual Deployment

Before deploying to production:

1. Change the database from SQLite to PostgreSQL or MySQL
2. Update `DATABASE_URL` in your production environment
3. Set a strong `NEXTAUTH_SECRET` in your production environment
4. Update `NEXTAUTH_URL` to your production domain
5. Update Google OAuth redirect URI in Google Cloud Console to your production domain
6. Run database migrations: `npx prisma migrate deploy`

## License

MIT
