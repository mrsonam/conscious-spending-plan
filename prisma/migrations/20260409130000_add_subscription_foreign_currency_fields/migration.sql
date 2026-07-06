-- Corrective migration: `Subscription.foreignCurrency` and `foreignAmount`
-- were added to the Prisma schema alongside the `add_subscription` change,
-- but the `20260409120000_add_subscription` migration's CREATE TABLE never
-- included them. The later `20260519120000_money_minor_units` migration
-- assumes these columns already exist (it converts `foreignAmount` from a
-- float to minor-unit BigInt), so replaying migration history from scratch
-- into an empty shadow database fails at that point with
-- "column s.foreignAmount does not exist".
--
-- This migration fills the gap at the point in history where it belongs.
-- It is guarded with IF NOT EXISTS so it is a no-op against any database
-- (such as this repo's real dev database) where these columns were already
-- added out-of-band before this fix was written — no existing data is
-- touched.
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "foreignCurrency" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "foreignAmount" DOUBLE PRECISION;
