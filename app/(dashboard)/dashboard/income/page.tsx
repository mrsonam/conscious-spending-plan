"use client";

import { useEffect, useState } from "react";
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
import { Calculator, DollarSign } from "lucide-react";
import { IncomeSkeleton } from "@/components/skeletons/income-skeleton";
import {
  IncomeFormSkeleton,
  IncomeHistorySkeleton,
} from "@/components/skeletons/income-sections";

interface FundAllocation {
  id: string;
  fixedCostsType: string;
  fixedCostsValue: number;
  savingsType: string;
  savingsValue: number;
  investmentType: string;
  investmentValue: number;
  guiltFreeSpendingType: string;
  guiltFreeSpendingValue: number;
}

interface Breakdown {
  income: number;
  fixedCosts: number;
  savings: number;
  investment: number;
  guiltFreeSpending: number;
  total: number;
  depositedToAccountName?: string | null;
  isCashAccount?: boolean;
}

interface IncomeEntry {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  balance: number;
  isDefault: boolean;
}

export default function IncomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [allocation, setAllocation] = useState<FundAllocation | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [income, setIncome] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [loadingForm, setLoadingForm] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      // Parallelize all initial data fetching for faster loading
      setLoadingForm(true);
      setLoadingHistory(true);

      Promise.all([
        fetch("/api/fund-allocation"),
        fetch("/api/accounts"),
        fetch("/api/income-entries"),
      ])
        .then(([allocationRes, accountsRes, incomeRes]) => {
          if (allocationRes.ok) {
            allocationRes.json().then((data) => {
              setAllocation(data);
              setLoadingForm(false);
            });
          } else {
            setLoadingForm(false);
          }

          if (accountsRes.ok) {
            accountsRes.json().then((data) => {
              const accountsList = data.accounts || [];
              setAccounts(accountsList);
              const defaultAccount = accountsList.find(
                (acc: Account) => acc.isDefault
              );
              if (defaultAccount) {
                setSelectedAccountId(defaultAccount.id);
              } else if (accountsList.length > 0) {
                setSelectedAccountId(accountsList[0].id);
              }
            });
          }

          if (incomeRes.ok) {
            incomeRes.json().then((data) => {
              setIncomeEntries(data.entries || []);
              setLoadingHistory(false);
            });
          } else {
            setLoadingHistory(false);
          }
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          setLoadingForm(false);
          setLoadingHistory(false);
        });

      // Set default dates
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 14);
      setDate(today.toISOString().split("T")[0]);
      setPeriodStart(start.toISOString().split("T")[0]);
      setPeriodEnd(today.toISOString().split("T")[0]);
    }
  }, [status, router]);

  const fetchIncomeEntries = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/income-entries");
      if (response.ok) {
        const data = await response.json();
        setIncomeEntries(data.entries || []);
      }
    } catch (error) {
      console.error("Error fetching income entries:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

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

    if (!date) {
      setError("Please select the income date");
      return;
    }

    if (!periodStart || !periodEnd) {
      setError("Please select both start and end dates");
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
        setBreakdown(data);
        setIncome("");
        setDescription("");
        // Reset date to today
        const today = new Date();
        setDate(today.toISOString().split("T")[0]);
        fetchIncomeEntries(); // Refresh income history
      } else {
        setError(data.error || "Failed to calculate breakdown");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setCalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (status === "loading") {
    return (
      <>
        <Header title="Income" />
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <IncomeSkeleton />
        </div>
      </>
    );
  }

  if (!session) return null;

  return (
    <>
      <Header title="Income" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {loadingForm ? (
          <IncomeFormSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Calculate Breakdown</CardTitle>
              <CardDescription>
                Enter your income to calculate how it will be allocated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="income">Income ($)</Label>
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
                  <p className="mt-1 text-xs text-gray-500">
                    The date when you received this income
                  </p>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="periodStart">Period Start</Label>
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
                    <Label htmlFor="periodEnd">Period End</Label>
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
                        <strong>Cash Account:</strong> Income will be added
                        directly to this account without budget allocation.
                      </p>
                    )}
                    {accounts.find((acc) => acc.id === selectedAccountId)
                      ?.accountType !== "cash" && (
                      <p className="mt-1 text-xs text-gray-500">
                        Select which account to deposit the income to
                      </p>
                    )}
                  </div>
                )}

                {accounts.length === 0 && (
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
                    No accounts found. Please create an account first to deposit
                    income.
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={calculating || !allocation}
                  className="w-full"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {calculating ? "Calculating..." : "Calculate Breakdown"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {breakdown && (
          <Card>
            <CardHeader>
              <CardTitle>Breakdown Results</CardTitle>
              <CardDescription>
                {breakdown.isCashAccount
                  ? "Income added to cash account"
                  : "Your income allocation for this period"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-indigo-50 border-2 border-indigo-200">
                  <div className="text-sm text-indigo-600 font-medium mb-1">
                    Total Income
                  </div>
                  <div className="text-3xl font-bold text-indigo-900">
                    {formatCurrency(breakdown.income)}
                  </div>
                  {breakdown.depositedToAccountName && (
                    <div className="text-xs text-indigo-600 mt-2">
                      Deposited to: {breakdown.depositedToAccountName}
                    </div>
                  )}
                </div>

                {breakdown.isCashAccount ? (
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="text-sm font-medium text-yellow-700 mb-2">
                      Cash Account Income
                    </div>
                    <div className="text-sm text-yellow-600">
                      This income has been added directly to your cash account
                      without budget allocation. No funds have been allocated to
                      budget categories.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <div className="text-sm font-medium text-red-700">
                          Fixed Costs
                        </div>
                        <div className="text-xl font-bold text-red-900">
                          {formatCurrency(breakdown.fixedCosts)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-sm font-medium text-green-700">
                          Savings
                        </div>
                        <div className="text-xl font-bold text-green-900">
                          {formatCurrency(breakdown.savings)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-sm font-medium text-blue-700">
                          Investment
                        </div>
                        <div className="text-xl font-bold text-blue-900">
                          {formatCurrency(breakdown.investment)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="text-sm font-medium text-purple-700">
                          Guilt-Free Spending
                        </div>
                        <div className="text-xl font-bold text-purple-900">
                          {formatCurrency(breakdown.guiltFreeSpending)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-700">
                          Total Allocated
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                          {formatCurrency(breakdown.total)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Income History */}
        {loadingHistory ? (
          <IncomeHistorySkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Income History</CardTitle>
              <CardDescription>
                {incomeEntries.length === 0
                  ? "No income entries yet"
                  : `${incomeEntries.length} income entr${
                      incomeEntries.length !== 1 ? "ies" : "y"
                    } logged`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incomeEntries.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    No income entries yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Your income entries will appear here once you calculate your
                    first breakdown
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-lg">
                              {formatCurrency(entry.amount)}
                            </div>
                            {entry.description && (
                              <div className="text-sm text-gray-700 mt-1 font-medium">
                                {entry.description}
                              </div>
                            )}
                            <div className="text-sm text-gray-600 mt-1">
                              Date: {formatDate(entry.date)}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Period: {formatDate(entry.periodStart)} -{" "}
                              {formatDate(entry.periodEnd)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Logged: {formatDate(entry.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
