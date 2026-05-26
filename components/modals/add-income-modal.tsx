"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { Calculator } from "lucide-react";
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
  requirePositiveNumber,
} from "@/lib/form-validation";
import { useFormFieldErrors } from "@/hooks/use-form-field-errors";
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert";
import { FormFieldError, formFieldAria } from "@/components/forms/form-field-error";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { parseMoneyInput } from "@/lib/money-input";
import { invalidateIncomeDataCaches } from "@/lib/client-fetch-cache";

interface Account {
  id: string;
  name: string;
  bankName: string;
  isDefault: boolean;
  accountType: string;
}

interface AddIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
}

export function AddIncomeModal({
  open,
  onOpenChange,
  onSuccess,
}: AddIncomeModalProps) {
  const [income, setIncome] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allocation, setAllocation] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } =
    useFormFieldErrors<"income" | "date">();
  const [allocateToBudget, setAllocateToBudget] = useState(true);
  const { currencyCode } = useFormatCurrency();

  useEffect(() => {
    if (open) {
      const today = new Date();
      setIncome("");
      setDescription("");
      setDate(today.toISOString().split("T")[0]);
      setAllocateToBudget(true);

      // Fetch accounts and allocation
      Promise.all([fetch("/api/accounts"), fetch("/api/fund-allocation")]).then(
        ([accountsRes, allocationRes]) => {
          if (accountsRes.ok) {
            accountsRes.json().then((data) => {
              setAccounts(data.accounts || []);
              const defaultAccount = data.accounts?.find(
                (acc: Account) => acc.isDefault
              );
              if (defaultAccount) {
                setSelectedAccountId(defaultAccount.id);
              } else if (data.accounts?.length > 0) {
                setSelectedAccountId(data.accounts[0].id);
              }
            });
          }
          if (allocationRes.ok) {
            allocationRes.json().then((data) => setAllocation(data));
          }
        }
      );
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearFieldErrors();

    if (!allocation) {
      setFormError("Please configure your fund allocation settings first");
      return;
    }

    const errs = buildFieldErrors([
      ["income", requirePositiveNumber(income, "Income")],
      ["date", requireField(date, "Income date")],
    ] as const);
    if (hasFieldErrors(errs)) {
      setFieldErrors(errs);
      return;
    }

    const incomeAmount = parseMoneyInput(income, currencyCode);

    const d = new Date(date + "T12:00:00");
    const periodStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
    const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

    const payload = {
      income: incomeAmount,
      description: description.trim() || null,
      date,
      periodStart,
      periodEnd,
      accountId: selectedAccountId || null,
      allocateToBudget,
    };

    setIncome("");
    setDescription("");
    const today = new Date();
    setDate(today.toISOString().split("T")[0]);
    onOpenChange(false);
    invalidateIncomeDataCaches();

    void (async () => {
      setCalculating(true);
      try {
        const response = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to calculate breakdown");
        }
        await onSuccess?.();
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "An error occurred. Please try again.",
        );
        onOpenChange(true);
      } finally {
        setCalculating(false);
      }
    })();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Add Income</DialogTitle>
          <DialogDescription>
            Enter your income to calculate allocation breakdown
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="space-y-4" inert={calculating}>
          <FormErrorAlert error={formError} />

          <fieldset disabled={calculating} className="min-w-0 space-y-4 border-0 p-0">
          <div>
            <Label htmlFor="income">Income ($) *</Label>
            <Input
              id="income"
              type="number"
              value={income}
              onChange={(e) => {
                setIncome(e.target.value);
                clearFieldError("income");
              }}
              min="0"
              step="0.01"
              disabled={calculating}
              placeholder="0.00"
              className="mt-1"
              {...formFieldAria("income", fieldErrors.income)}
            />
            <FormFieldError controlId="income" message={fieldErrors.income} />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={calculating}
              placeholder="e.g., Salary, Freelance work, etc."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="date">Income Date *</Label>
            <DateInput
              id="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                clearFieldError("date");
              }}
              disabled={calculating}
              className="mt-1"
              aria-invalid={!!fieldErrors.date}
              {...formFieldAria("date", fieldErrors.date)}
            />
            <FormFieldError controlId="date" message={fieldErrors.date} />
          </div>

          {accounts.length > 0 && (
            <div>
              <Label htmlFor="account">Deposit to Account</Label>
              <AppSelect
                id="account"
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                disabled={calculating}
               
                className="mt-1 rounded-lg border border-gray-300"
                options={accounts.map((account) => ({
                  value: account.id,
                  label: (
                    <>
                      {account.name} ({account.bankName})
                      {account.isDefault ? " - Default" : ""}{" "}
                      {account.accountType === "cash" ? " - Cash" : ""}
                    </>
                  ),
                }))}
              />
              {accounts.find((acc) => acc.id === selectedAccountId)
                ?.accountType === "cash" && (
                <p className="mt-1 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  <strong>Cash Account:</strong> This is a cash account. You can choose
                  whether this income should be included in your budget allocation below.
                </p>
              )}
            </div>
          )}

          {accounts.length === 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
              No accounts found. Please create an account first.
            </div>
          )}

          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={allocateToBudget}
                disabled={calculating}
                onChange={(e) => setAllocateToBudget(e.target.checked)}
              />
              Allocate this income to budget categories
            </Label>
            <p className="text-xs text-gray-500">
              When checked, this income will be used to fund Fixed Costs, Savings, Investment,
              and Guilt-Free Spending according to your allocation settings. Uncheck for income
              that should not affect your budget (e.g., reimbursements, one-off transfers).
            </p>
          </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={calculating}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={calculating} disabled={!allocation}>
              {!calculating ? <Calculator className="mr-2 h-4 w-4" /> : null}
              Calculate Breakdown
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
