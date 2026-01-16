"use client";

import { useEffect, useState } from "react";
import { SummaryCardsSkeleton, FilterCardSkeleton, TransactionsListSkeleton } from "@/components/skeletons/statement-sections";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingDown,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  CreditCard,
  Download,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface IncomeEntry {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  periodStart: string;
  periodEnd: string;
  accountId: string | null;
  createdAt: string;
  account: {
    id: string;
    name: string;
    bankName: string;
  } | null;
}

interface Expense {
  id: string;
  accountId: string;
  amount: number;
  description: string | null;
  category: string | null;
  expenseCategory: string | null;
  date: string;
  createdAt: string;
  account: {
    id: string;
    name: string;
    bankName: string;
  };
}

interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
  createdAt: string;
  fromAccount: {
    id: string;
    name: string;
    bankName: string;
  };
  toAccount: {
    id: string;
    name: string;
    bankName: string;
  };
}

interface Account {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  balance: number;
  isDefault: boolean;
}

const FUND_CATEGORIES = [
  { value: "fixedCosts", label: "Fixed Costs" },
  { value: "investment", label: "Investment" },
  { value: "savings", label: "Savings" },
  { value: "guiltFreeSpending", label: "Guilt-Free Spending" },
];

type Transaction = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  description: string | null;
  category: string | null;
  account?: {
    id: string;
    name: string;
    bankName: string;
  };
  fromAccount?: {
    id: string;
    name: string;
    bankName: string;
  };
  toAccount?: {
    id: string;
    name: string;
    bankName: string;
  };
  periodStart?: string;
  periodEnd?: string;
};

export default function StatementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterAccountId, setFilterAccountId] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchAccounts();
      fetchData();
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [filterStartDate, filterEndDate, filterAccountId, status]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const fetchData = async () => {
    setLoadingSummary(true);
    setLoadingTransactions(true);
    
    try {
      const [incomeRes, expensesRes, transfersRes] = await Promise.all([
        fetch("/api/income-entries"),
        fetch(
          filterStartDate || filterEndDate
            ? `/api/expenses?${new URLSearchParams({
                ...(filterStartDate && { startDate: filterStartDate }),
                ...(filterEndDate && { endDate: filterEndDate }),
              }).toString()}`
            : "/api/expenses"
        ),
        fetch(
          filterStartDate || filterEndDate
            ? `/api/transfers?${new URLSearchParams({
                ...(filterStartDate && { startDate: filterStartDate }),
                ...(filterEndDate && { endDate: filterEndDate }),
              }).toString()}`
            : "/api/transfers"
        ),
      ]);

      // Set data independently as each response completes
      if (incomeRes.ok) {
        const data = await incomeRes.json();
        setIncomeEntries(data.entries || []);
      }

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data.expenses || []);
      }

      if (transfersRes.ok) {
        const data = await transfersRes.json();
        setTransfers(data.transfers || []);
      }

      // Summary cards can show once we have any data
      if (incomeRes.ok || expensesRes.ok || transfersRes.ok) {
        setLoadingSummary(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoadingSummary(false);
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    // Combine and sort transactions
    const combined: Transaction[] = [];

    // Add income entries (filter by account if filter is set)
    incomeEntries.forEach((entry) => {
      // Filter by account if filter is set
      if (filterAccountId && entry.accountId !== filterAccountId) return;

      // Filter by date if filters are set - use the income date field
      const entryDate = new Date(entry.date);
      if (filterStartDate && entryDate < new Date(filterStartDate)) return;
      if (filterEndDate && entryDate > new Date(filterEndDate)) return;

      combined.push({
        id: entry.id,
        type: "income",
        amount: entry.amount,
        date: entry.date,
        description: entry.description || `Income for period ${formatDate(
          entry.periodStart
        )} - ${formatDate(entry.periodEnd)}`,
        category: null,
        periodStart: entry.periodStart,
        periodEnd: entry.periodEnd,
        account: entry.account || undefined,
      });
    });

    // Add expenses
    expenses.forEach((expense) => {
      // Filter by account if filter is set
      if (filterAccountId && expense.accountId !== filterAccountId) return;

      combined.push({
        id: expense.id,
        type: "expense",
        amount: expense.amount,
        date: expense.date,
        description: expense.description,
        category: expense.category,
        account: expense.account,
      });
    });

    // Add transfers
    transfers.forEach((transfer) => {
      // Filter by account if filter is set (show if from or to account matches)
      if (
        filterAccountId &&
        transfer.fromAccountId !== filterAccountId &&
        transfer.toAccountId !== filterAccountId
      )
        return;

      // Filter by date if filters are set - use the transfer date field
      const transferDate = new Date(transfer.date);
      if (filterStartDate && transferDate < new Date(filterStartDate)) return;
      if (filterEndDate && transferDate > new Date(filterEndDate)) return;

      combined.push({
        id: transfer.id,
        type: "transfer",
        amount: transfer.amount,
        date: transfer.date, // Use the transfer date field
        description: transfer.description,
        category: transfer.category || null,
        fromAccount: transfer.fromAccount,
        toAccount: transfer.toAccount,
      });
    });

    // Sort by date (newest first)
    combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setTransactions(combined);
    // Transactions list can show once we've processed the data
    setLoadingTransactions(false);
  }, [
    incomeEntries,
    expenses,
    transfers,
    filterStartDate,
    filterEndDate,
    filterAccountId,
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getTotalIncome = () => {
    return transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalExpenses = () => {
    return transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getNetAmount = () => {
    return getTotalIncome() - getTotalExpenses();
  };

  const downloadStatement = () => {
    if (transactions.length === 0) {
      // Show error message - you can add a toast or message state here
      console.error("No transactions to download");
      return;
    }

    // Create CSV header
    const headers = [
      "Date",
      "Type",
      "Amount",
      "Description",
      "Category",
      "Account",
      "From Account",
      "To Account",
      "Period Start",
      "Period End",
    ];

    // Create CSV rows
    const rows = transactions.map((transaction) => {
      const date = formatDate(transaction.date);
      const type =
        transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
      const amount =
        transaction.type === "income"
          ? `+${formatCurrency(transaction.amount)}`
          : transaction.type === "expense"
          ? `-${formatCurrency(transaction.amount)}`
          : formatCurrency(transaction.amount); // Transfer - no sign
      const description = transaction.description || "";
      const category = transaction.category
        ? FUND_CATEGORIES.find((c) => c.value === transaction.category)
            ?.label || transaction.category
        : "";
      const account = transaction.account
        ? `${transaction.account.name} (${transaction.account.bankName})`
        : "";
      const fromAccount = transaction.fromAccount
        ? `${transaction.fromAccount.name} (${transaction.fromAccount.bankName})`
        : "";
      const toAccount = transaction.toAccount
        ? `${transaction.toAccount.name} (${transaction.toAccount.bankName})`
        : "";
      const periodStart = transaction.periodStart
        ? formatDate(transaction.periodStart)
        : "";
      const periodEnd = transaction.periodEnd
        ? formatDate(transaction.periodEnd)
        : "";

      return [
        date,
        type,
        amount,
        description,
        category,
        account,
        fromAccount,
        toAccount,
        periodStart,
        periodEnd,
      ];
    });

    // Add summary rows
    const summaryRows = [
      [],
      ["Summary"],
      ["Total Income", formatCurrency(getTotalIncome())],
      ["Total Expenses", formatCurrency(getTotalExpenses())],
      [
        "Total Transfers",
        formatCurrency(
          transactions
            .filter((t) => t.type === "transfer")
            .reduce((sum, t) => sum + t.amount, 0)
        ),
      ],
      ["Net Amount", formatCurrency(getNetAmount())],
    ];

    // Combine all rows
    const allRows = [headers, ...rows, ...summaryRows];

    // Convert to CSV format
    const csvContent = allRows
      .map((row) => {
        return row
          .map((cell) => {
            // Escape cells that contain commas, quotes, or newlines
            if (
              cell &&
              (cell.toString().includes(",") ||
                cell.toString().includes('"') ||
                cell.toString().includes("\n"))
            ) {
              return `"${cell.toString().replace(/"/g, '""')}"`;
            }
            return cell || "";
          })
          .join(",");
      })
      .join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // Generate filename with date range
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filterStr =
      filterStartDate || filterEndDate
        ? `_${filterStartDate || "start"}_${filterEndDate || "end"}`
        : "";
    const accountStr = filterAccountId
      ? `_${
          accounts
            .find((a) => a.id === filterAccountId)
            ?.name.replace(/\s+/g, "_") || "account"
        }`
      : "";
    const filename = `statement_${dateStr}${filterStr}${accountStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    if (transactions.length === 0) {
      // Show error message - you can add a toast or message state here
      console.error("No transactions to download");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let yPosition = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Financial Statement", pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 10;

    // Date range and filters
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Generated: ${dateStr}`, margin, yPosition);
    yPosition += 5;

    if (filterStartDate || filterEndDate) {
      const start = filterStartDate ? formatDate(filterStartDate) : "Start";
      const end = filterEndDate ? formatDate(filterEndDate) : "End";
      doc.text(`Period: ${start} - ${end}`, margin, yPosition);
      yPosition += 5;
    }

    if (filterAccountId) {
      const account = accounts.find((a) => a.id === filterAccountId);
      if (account) {
        doc.text(
          `Account: ${account.name} (${account.bankName})`,
          margin,
          yPosition
        );
        yPosition += 5;
      }
    }

    yPosition += 5;

    // Prepare table data - optimized to fit page width
    const tableData = transactions.map((transaction) => {
      const date = formatDate(transaction.date);
      const type =
        transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
      const amount =
        transaction.type === "income"
          ? `+${formatCurrency(transaction.amount)}`
          : transaction.type === "expense"
          ? `-${formatCurrency(transaction.amount)}`
          : formatCurrency(transaction.amount);

      // Truncate description if too long
      let description = transaction.description || "-";
      if (description.length > 40) {
        description = description.substring(0, 37) + "...";
      }

      const category = transaction.category
        ? FUND_CATEGORIES.find((c) => c.value === transaction.category)
            ?.label || transaction.category
        : "-";

      // Combine account info based on transaction type
      let accountInfo = "-";
      if (transaction.type === "transfer") {
        if (transaction.fromAccount && transaction.toAccount) {
          accountInfo = `${transaction.fromAccount.name} → ${transaction.toAccount.name}`;
        }
      } else if (transaction.account) {
        accountInfo = `${transaction.account.name}`;
      }

      return [date, type, amount, description, category, accountInfo];
    });

    // Calculate available width (A4 page width - margins)
    const availableWidth = pageWidth - margin * 2;

    // Add transactions table with proportional column widths
    autoTable(doc, {
      head: [["Date", "Type", "Amount", "Description", "Category", "Account"]],
      body: tableData,
      startY: yPosition,
      styles: {
        fontSize: 7,
        cellPadding: 1,
        overflow: "linebreak",
        cellWidth: "wrap",
        halign: "left",
        valign: "middle",
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.11, halign: "left" }, // Date
        1: { cellWidth: availableWidth * 0.06, halign: "center" }, // Type
        2: { cellWidth: availableWidth * 0.12, halign: "center" }, // Amount
        3: { cellWidth: availableWidth * 0.4, halign: "left" }, // Description
        4: { cellWidth: availableWidth * 0.1, halign: "left" }, // Category
        5: { cellWidth: availableWidth * 0.17, halign: "left" }, // Account
      },
      didParseCell: function (data: any) {
        // Enable text wrapping for description and account columns
        if (data.column.index === 3 || data.column.index === 5) {
          data.cell.styles.overflow = "wrap";
          data.cell.styles.cellWidth = "wrap";
        }
      },
    });

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;

    // Add summary section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, finalY + 10);

    const summaryData = [
      ["Total Income", formatCurrency(getTotalIncome())],
      ["Total Expenses", formatCurrency(getTotalExpenses())],
      [
        "Total Transfers",
        formatCurrency(
          transactions
            .filter((t) => t.type === "transfer")
            .reduce((sum, t) => sum + t.amount, 0)
        ),
      ],
      ["Net Amount", formatCurrency(getNetAmount())],
    ];

    autoTable(doc, {
      body: summaryData,
      startY: finalY + 15,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: "bold" },
        1: { cellWidth: 80, halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

    // Generate filename
    const dateStrFile = now.toISOString().split("T")[0];
    const filterStr =
      filterStartDate || filterEndDate
        ? `_${filterStartDate || "start"}_${filterEndDate || "end"}`
        : "";
    const accountStr = filterAccountId
      ? `_${
          accounts
            .find((a) => a.id === filterAccountId)
            ?.name.replace(/\s+/g, "_") || "account"
        }`
      : "";
    const filename = `statement_${dateStrFile}${filterStr}${accountStr}.pdf`;

    // Save PDF
    doc.save(filename);
  };

  if (status === "loading") {
    return (
      <>
        <Header title="Statement" />
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <SummaryCardsSkeleton />
          <FilterCardSkeleton />
          <TransactionsListSkeleton />
        </div>
      </>
    );
  }

  if (!session) return null;

  return (
    <>
      <Header title="Statement" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        {loadingSummary ? (
          <SummaryCardsSkeleton />
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Income
              </CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(getTotalIncome())}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {transactions.filter((t) => t.type === "income").length} entr
                {transactions.filter((t) => t.type === "income").length !== 1
                  ? "ies"
                  : "y"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(getTotalExpenses())}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {transactions.filter((t) => t.type === "expense").length}{" "}
                expense
                {transactions.filter((t) => t.type === "expense").length !== 1
                  ? "s"
                  : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transfers</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {transactions.filter((t) => t.type === "transfer").length}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(
                  transactions
                    .filter((t) => t.type === "transfer")
                    .reduce((sum, t) => sum + t.amount, 0)
                )}{" "}
                transferred
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  getNetAmount() >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(getNetAmount())}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {getNetAmount() >= 0 ? "Surplus" : "Deficit"}
              </p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="filterStartDate">Start Date</Label>
                <Input
                  id="filterStartDate"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="filterEndDate">End Date</Label>
                <Input
                  id="filterEndDate"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="filterAccount">Account</Label>
                <select
                  id="filterAccount"
                  value={filterAccountId}
                  onChange={(e) => setFilterAccountId(e.target.value)}
                  className="mt-1 w-full px-4 py-2 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white border border-gray-300"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.bankName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(filterStartDate || filterEndDate || filterAccountId) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setFilterAccountId("");
                }}
                className="mt-4"
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Transactions List */}
        {loadingTransactions ? (
          <TransactionsListSkeleton />
        ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  {transactions.length === 0
                    ? "No transactions found"
                    : `${transactions.length} transaction${
                        transactions.length !== 1 ? "s" : ""
                      } found`}
                </CardDescription>
              </div>
              {transactions.length > 0 && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={downloadStatement}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    onClick={downloadPDF}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  No transactions yet
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Your income, expense, and transfer transactions will appear
                  here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={`${transaction.type}-${transaction.id}`}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      transaction.type === "income"
                        ? "border-green-200 bg-green-50"
                        : transaction.type === "expense"
                        ? "border-red-200 bg-red-50"
                        : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          transaction.type === "income"
                            ? "bg-green-100 text-green-700"
                            : transaction.type === "expense"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <ArrowUpCircle className="h-5 w-5" />
                        ) : transaction.type === "expense" ? (
                          <ArrowDownCircle className="h-5 w-5" />
                        ) : (
                          <ArrowLeftRight className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-lg ${
                              transaction.type === "income"
                                ? "text-green-900"
                                : transaction.type === "expense"
                                ? "text-red-900"
                                : "text-blue-900"
                            }`}
                          >
                            {transaction.type === "income"
                              ? "+"
                              : transaction.type === "expense"
                              ? "-"
                              : ""}
                            {formatCurrency(transaction.amount)}
                          </span>
                          {transaction.category && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                              {FUND_CATEGORIES.find(
                                (c) => c.value === transaction.category
                              )?.label || transaction.category}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {transaction.description || "No description"}
                        </div>
                        {transaction.account && (
                          <div className="text-xs text-gray-500 mt-1">
                            Account: {transaction.account.name} (
                            {transaction.account.bankName})
                          </div>
                        )}
                        {transaction.fromAccount && transaction.toAccount && (
                          <div className="text-xs text-gray-500 mt-1">
                            From: {transaction.fromAccount.name} (
                            {transaction.fromAccount.bankName}) → To:{" "}
                            {transaction.toAccount.name} (
                            {transaction.toAccount.bankName})
                          </div>
                        )}
                        {transaction.periodStart && transaction.periodEnd && (
                          <div className="text-xs text-gray-500 mt-1">
                            Period: {formatDate(transaction.periodStart)} -{" "}
                            {formatDate(transaction.periodEnd)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">
                          {formatDate(transaction.date)}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            transaction.type === "income"
                              ? "text-green-600"
                              : transaction.type === "expense"
                              ? "text-red-600"
                              : "text-blue-600"
                          }`}
                        >
                          {transaction.type === "income"
                            ? "Income"
                            : transaction.type === "expense"
                            ? "Expense"
                            : "Transfer"}
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
