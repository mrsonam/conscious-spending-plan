"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { Save } from "lucide-react";
import { FundsSkeleton } from "@/components/skeletons/funds-skeleton";
import React from "react";

interface FundAllocation {
  id: string;
  fixedCostsType: string;
  fixedCostsValue: number;
  fixedCostsCap: number | null;
  savingsType: string;
  savingsValue: number;
  savingsCap: number | null;
  investmentType: string;
  investmentValue: number;
  investmentCap: number | null;
  guiltFreeSpendingType: string;
  guiltFreeSpendingValue: number;
  guiltFreeSpendingCap: number | null;
}

interface CategoryBalance {
  id: string;
  category: string;
  balance: number;
}

const FundField = React.memo(({
  label,
  typeField,
  valueField,
  capField,
  categoryName,
  color,
  allocation,
  balances,
  getBalance,
  formatCurrency,
  updateField,
}: {
  label: string;
  typeField: keyof FundAllocation;
  valueField: keyof FundAllocation;
  capField: keyof FundAllocation;
  categoryName: string;
  color: string;
  allocation: FundAllocation;
  balances: CategoryBalance[];
  getBalance: (category: string) => number;
  formatCurrency: (amount: number) => string;
  updateField: (field: keyof FundAllocation, value: string | number | null) => void;
}) => {
  const type = allocation[typeField] as string;
  const value = allocation[valueField] as number;
  const cap = allocation[capField] as number | null;
  const currentBalance = getBalance(categoryName);
  const isCapped = cap !== null && cap !== undefined;
  const remaining = isCapped ? Math.max(0, cap - currentBalance) : null;
  const percentageUsed =
    isCapped && cap > 0 ? (currentBalance / cap) * 100 : 0;

  // Use local state for input values to prevent focus loss
  const [valueInput, setValueInput] = useState(value.toString());
  const [capInput, setCapInput] = useState(cap?.toString() ?? "");

  // Sync local state with allocation when it changes externally
  useEffect(() => {
    setValueInput(value.toString());
  }, [value]);

  useEffect(() => {
    setCapInput(cap?.toString() ?? "");
  }, [cap]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          options={[
            { value: "percentage", label: "Percentage" },
            { value: "fixed", label: "Fixed Amount" },
          ]}
          value={type}
          onValueChange={(val) => updateField(typeField, val)}
        />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={valueInput}
              onChange={(e) => {
                const val = e.target.value;
                setValueInput(val);
                const numVal = parseFloat(val);
                if (!isNaN(numVal) || val === "" || val === ".") {
                  updateField(valueField, val === "" || val === "." ? 0 : numVal);
                }
              }}
              onBlur={(e) => {
                const numVal = parseFloat(e.target.value);
                if (isNaN(numVal) || numVal < 0) {
                  setValueInput(value.toString());
                  updateField(valueField, value);
                } else {
                  setValueInput(numVal.toString());
                  updateField(valueField, numVal);
                }
              }}
              min="0"
              step={type === "percentage" ? "0.1" : "0.01"}
              className="flex-1 bg-gray-50 focus:bg-white"
            />
            <span className="text-sm text-gray-500 w-8">
              {type === "percentage" ? "%" : "$"}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">
              Cap Amount (Optional)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={capInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCapInput(val);
                  if (val === "") {
                    updateField(capField, null);
                  } else {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) {
                      updateField(capField, numVal);
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setCapInput("");
                    updateField(capField, null);
                  } else {
                    const numVal = parseFloat(val);
                    if (isNaN(numVal) || numVal < 0) {
                      setCapInput(cap?.toString() ?? "");
                      updateField(capField, cap);
                    } else {
                      setCapInput(numVal.toString());
                      updateField(capField, numVal);
                    }
                  }
                }}
                placeholder="No cap"
                min="0"
                step="0.01"
                className="flex-1 bg-gray-50 focus:bg-white"
              />
              <span className="text-sm text-gray-500 w-8">$</span>
            </div>
            <p className="text-xs text-gray-500">
              Once this category reaches the cap, excess funds go to savings
            </p>
          </div>
          {isCapped && (
            <div className="mt-3 p-2 bg-gray-50 rounded-lg shadow-sm">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Current Balance:</span>
                <span className="font-medium">
                  {formatCurrency(currentBalance)}
                </span>
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600">Remaining to Cap:</span>
                <span
                  className={
                    remaining !== null && remaining > 0
                      ? "font-medium text-green-600"
                      : "font-medium text-red-600"
                  }
                >
                  {formatCurrency(remaining !== null ? remaining : 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    percentageUsed >= 100
                      ? "bg-red-500"
                      : percentageUsed >= 80
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, percentageUsed)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {percentageUsed >= 100
                  ? "Cap reached"
                  : `${percentageUsed.toFixed(1)}% of cap used`}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

FundField.displayName = "FundField";

export default function FundsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [allocation, setAllocation] = useState<FundAllocation | null>(null);
  const [balances, setBalances] = useState<CategoryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchAllocation();
    }
  }, [status, router]);

  const fetchAllocation = async () => {
    try {
      // Parallelize API calls for faster loading
      const [allocationRes, balancesRes] = await Promise.all([
        fetch("/api/fund-allocation"),
        fetch("/api/category-balances"),
      ]);

      if (allocationRes.ok) {
        const data = await allocationRes.json();
        setAllocation(data);
      }

      if (balancesRes.ok) {
        const data = await balancesRes.json();
        setBalances(data.balances || []);
      }
    } catch (error) {
      console.error("Error fetching allocation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocation) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/fund-allocation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allocation),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
        // Refresh balances after saving
        const balancesRes = await fetch("/api/category-balances");
        if (balancesRes.ok) {
          const data = await balancesRes.json();
          setBalances(data.balances || []);
        }
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (
    field: keyof FundAllocation,
    value: string | number | null
  ) => {
    setAllocation((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Header title="Fund Settings" />
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
          <FundsSkeleton />
        </div>
      </>
    );
  }

  if (!session || !allocation) return null;

  const getBalance = (category: string) => {
    const balance = balances.find((b) => b.category === category);
    return balance?.balance || 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <>
      <Header title="Fund Settings" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configure Fund Allocation</CardTitle>
            <CardDescription>
              Set each category as either a percentage of income or a fixed
              dollar amount
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {message && (
                <div
                  className={`p-3 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <FundField
                  label="Fixed Costs"
                  typeField="fixedCostsType"
                  valueField="fixedCostsValue"
                  capField="fixedCostsCap"
                  categoryName="fixedCosts"
                  color="red"
                  allocation={allocation}
                  balances={balances}
                  getBalance={getBalance}
                  formatCurrency={formatCurrency}
                  updateField={updateField}
                />
                <FundField
                  label="Savings"
                  typeField="savingsType"
                  valueField="savingsValue"
                  capField="savingsCap"
                  categoryName="savings"
                  color="green"
                  allocation={allocation}
                  balances={balances}
                  getBalance={getBalance}
                  formatCurrency={formatCurrency}
                  updateField={updateField}
                />
                <FundField
                  label="Investment"
                  typeField="investmentType"
                  valueField="investmentValue"
                  capField="investmentCap"
                  categoryName="investment"
                  color="blue"
                  allocation={allocation}
                  balances={balances}
                  getBalance={getBalance}
                  formatCurrency={formatCurrency}
                  updateField={updateField}
                />
                <FundField
                  label="Guilt-Free Spending"
                  typeField="guiltFreeSpendingType"
                  valueField="guiltFreeSpendingValue"
                  capField="guiltFreeSpendingCap"
                  categoryName="guiltFreeSpending"
                  color="purple"
                  allocation={allocation}
                  balances={balances}
                  getBalance={getBalance}
                  formatCurrency={formatCurrency}
                  updateField={updateField}
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
