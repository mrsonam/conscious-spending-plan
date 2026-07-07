-- Custom recurring frequency: user-defined day interval between charges.
ALTER TABLE "RecurringExpense" ADD COLUMN "intervalDays" INTEGER;
