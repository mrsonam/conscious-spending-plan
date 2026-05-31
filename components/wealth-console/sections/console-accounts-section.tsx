"use client"

import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { accountTypeDisplay } from "@/components/wealth-console/dashboard-utils"
import { consoleMicroLabel } from "@/components/wealth-console/console-ui"
import type { WealthConsoleDashboardVM } from "@/components/wealth-console/use-wealth-console-derived"

export function ConsoleAccountsSection({ vm }: { vm: WealthConsoleDashboardVM }) {
  const {
    formatCurrency,
    accounts,
    ytdSummary,
    loading,
  } = vm


  return (
    <>
            <div
              id="console-accounts"
              className="scroll-mt-28 mt-12 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5"
            >
              <h2 className="sr-only">Accounts and wealth</h2>
              <div
                className="h-fit self-start overflow-hidden rounded-xl lg:col-span-8"
                style={{
                  background: TOKENS.surfaceLow,
                  border: `1px solid ${TOKENS.outlineGhost}`,
                }}
              >
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <h3
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={consoleMicroLabel}
                  >
                    Bank sync · Connected
                  </h3>
                </div>
                <div className="overflow-x-auto px-2 py-2">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr>
                        <th
                          className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMutedElevated }}
                        >
                          Institution
                        </th>
                        <th
                          className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMutedElevated }}
                        >
                          Account type
                        </th>
                        <th
                          className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: TOKENS.onSurfaceMutedElevated }}
                        >
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && accounts.length === 0 ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={`account-skeleton-${i}`}>
                            <td colSpan={3} className="px-3 py-3">
                              <div
                                className="h-12 rounded-lg"
                                style={{ background: TOKENS.surfaceContainer }}
                              />
                            </td>
                          </tr>
                        ))
                      ) : accounts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-8 text-center"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            No accounts linked yet.
                          </td>
                        </tr>
                      ) : (
                        accounts.map((a) => (
                          <tr key={a.id}>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                                  style={{
                                    background: TOKENS.surfaceContainer,
                                    color: TOKENS.secondary,
                                  }}
                                >
                                  {a.bankName.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{a.bankName}</p>
                                  <p
                                    className="truncate text-xs"
                                    style={{ color: TOKENS.onSurfaceMuted }}
                                  >
                                    {a.name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td
                              className="px-3 py-3 capitalize"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              {accountTypeDisplay(a.accountType)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-semibold">
                              {formatCurrency(a.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                id="console-wealth"
                className="scroll-mt-28 flex flex-col gap-3 self-start lg:col-span-4"
              >
                {ytdSummary && (
                  <div className="space-y-3">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.22em]"
                      style={consoleMicroLabel}
                    >
                      Year to date · {ytdSummary.year}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div
                        className="rounded-xl p-4 sm:col-span-2 sm:p-5 lg:col-span-1"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow: CARD_INSET,
                        }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={consoleMicroLabel}
                        >
                          Income
                        </p>
                        <div className="mt-2 text-xl tracking-tight sm:text-2xl">
                          <MajorFigureCurrency
                            amount={ytdSummary.totalIncome}
                            variant="income"
                          />
                        </div>
                      </div>
                      <div
                        className="rounded-xl p-4 sm:p-5"
                        style={{
                          background: TOKENS.surfaceLow,
                          boxShadow: CARD_INSET,
                        }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={consoleMicroLabel}
                        >
                          Expenses
                        </p>
                        <div className="mt-2 text-lg">
                          <MajorFigureCurrency
                            amount={ytdSummary.totalExpenses}
                            variant="loss"
                            className="font-bold!"
                          />
                        </div>
                      </div>
                      <div
                        className="rounded-xl p-4 sm:p-5"
                        style={{
                          background: TOKENS.surfaceContainer,
                          boxShadow: CARD_INSET,
                        }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={consoleMicroLabel}
                        >
                          Invested
                        </p>
                        <div className="mt-2 text-lg">
                          <MajorFigureCurrency
                            amount={ytdSummary.totalInvested}
                            variant="prosperity"
                            className="font-bold!"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {loading && !ytdSummary && (
                  <div className="space-y-3">
                    <div
                      className="h-4 w-32 rounded"
                      style={{ background: TOKENS.surfaceLow }}
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div
                        className="h-24 rounded-xl"
                        style={{ background: TOKENS.surfaceContainer }}
                      />
                      <div
                        className="h-24 rounded-xl"
                        style={{ background: TOKENS.surfaceLow }}
                      />
                      <div
                        className="h-24 rounded-xl"
                        style={{ background: TOKENS.surfaceContainer }}
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>
    </>
  )
}
