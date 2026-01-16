"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  DollarSign,
  User,
  Wallet,
  CreditCard,
  TrendingDown,
  FileText,
  X,
  Menu,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Category Tracking",
    href: "/dashboard/category-tracking",
    icon: BarChart3,
  },
  { name: "Income", href: "/dashboard/income", icon: DollarSign },
  { name: "Expenses", href: "/dashboard/expenses", icon: TrendingDown },
  { name: "Statement", href: "/dashboard/statement", icon: FileText },
  { name: "Investments", href: "/dashboard/investments", icon: TrendingUp },
  { name: "Accounts", href: "/dashboard/accounts", icon: CreditCard },
  { name: "Fund Settings", href: "/dashboard/funds", icon: Wallet },
  { name: "Profile", href: "/dashboard/profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-white shadow-md hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-white shadow-lg lg:shadow-none transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Finance</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
