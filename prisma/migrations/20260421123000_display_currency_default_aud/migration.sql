-- AlterTable: new signups and unset values use AUD
ALTER TABLE "User" ALTER COLUMN "displayCurrency" SET DEFAULT 'AUD';
