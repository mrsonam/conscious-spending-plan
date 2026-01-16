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
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

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
  onSuccess?: () => void;
}

export function AddIncomeModal({
  open,
  onOpenChange,
  onSuccess,
}: AddIncomeModalProps) {
  const [income, setIncome] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allocation, setAllocation] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 14);
      setIncome("");
      setDescription("");
      setDate(today.toISOString().split("T")[0]);
      setPeriodStart(start.toISOString().split("T")[0]);
      setPeriodEnd(today.toISOString().split("T")[0]);

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
    setError("");

    if (!allocation) {
      setError("Please configure your fund allocation settings first");
      return;
    }

    const incomeAmount = parseFloat(income);
    if (!incomeAmount || incomeAmount <= 0) {
      setError("Please enter a valid income amount");
      return;
    }

    if (!date || !periodStart || !periodEnd) {
      setError("Please select all required dates");
      return;
    }

    setCalculating(true);

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income: incomeAmount,
          description: description.trim() || null,
          date,
          periodStart,
          periodEnd,
          accountId: selectedAccountId || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIncome("");
        setDescription("");
        const today = new Date();
        setDate(today.toISOString().split("T")[0]);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        setError(data.error || "Failed to calculate breakdown");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setCalculating(false);
    }
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="income">Income ($) *</Label>
            <Input
              id="income"
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Salary, Freelance work, etc."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="date">Income Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <Label htmlFor="periodStart">Period Start *</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="periodEnd">Period End *</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <Label htmlFor="account">Deposit to Account</Label>
              <select
                id="account"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.bankName})
                    {account.isDefault ? " - Default" : ""}{" "}
                    {account.accountType === "cash" ? " - Cash" : ""}
                  </option>
                ))}
              </select>
              {accounts.find((acc) => acc.id === selectedAccountId)
                ?.accountType === "cash" && (
                <p className="mt-1 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  <strong>Cash Account:</strong> Income will be added directly
                  to this account without budget allocation.
                </p>
              )}
            </div>
          )}

          {accounts.length === 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
              No accounts found. Please create an account first.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={calculating || !allocation}>
              <Calculator className="mr-2 h-4 w-4" />
              {calculating ? "Calculating..." : "Calculate Breakdown"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
