"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, CreditCard, Hash, Landmark, Pencil } from "lucide-react"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { cn } from "@/lib/utils"
import { ScrambleCurrencyValue } from "@/components/ui/scramble-number"

interface AccountDetail {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  startingFunds: number
  isDefault: boolean
  accountNumber?: string | null
  bsb?: string | null
  cardLastFour?: string | null
  cardExpiry?: string | null
  cardType?: string | null
}

function typeLabel(t: string) {
  const m: Record<string, string> = {
    checking: "Checking",
    savings: "Savings",
    investment: "Investment",
    credit: "Credit card",
    cash: "Other",
  }
  return m[t] ?? t
}

function cardGradient(cardType: string | null | undefined, accountType: string) {
  if (cardType === "visa") return "linear-gradient(135deg, #0a1628 0%, #1565c0 60%, #0d2137 100%)"
  if (cardType === "mastercard") return "linear-gradient(135deg, #1a0a0a 0%, #7b1010 55%, #c0392b 100%)"
  if (cardType === "amex") return "linear-gradient(135deg, #0a1a10 0%, #005a23 55%, #007a32 100%)"
  if (cardType === "eftpos") return "linear-gradient(135deg, #0f0f2d 0%, #2d1b6e 55%, #1a0f3d 100%)"
  if (accountType === "credit") return "linear-gradient(135deg, #1a0820 0%, #4a1060 55%, #2d0a40 100%)"
  return "linear-gradient(135deg, #0d1424 0%, #1e2d50 55%, #0f1a2e 100%)"
}

function cardNetworkLabel(cardType: string | null | undefined) {
  if (!cardType) return null
  const labels: Record<string, string> = {
    visa: "VISA",
    mastercard: "Mastercard",
    amex: "American Express",
    eftpos: "eftpos",
  }
  return labels[cardType] ?? cardType
}

function BankCard({ account }: { account: AccountDetail }) {
  const network = cardNetworkLabel(account.cardType)
  return (
    <div
      className="relative h-52 w-full max-w-sm overflow-hidden rounded-2xl select-none"
      style={{
        background: cardGradient(account.cardType, account.accountType),
        boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      {/* Decorative circles */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-10"
        style={{ background: "white" }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-8 h-48 w-48 rounded-full opacity-[0.06]"
        style={{ background: "white" }}
      />

      {/* Institution name */}
      <div className="absolute left-6 top-5 text-sm font-semibold tracking-wide text-white/90">
        {account.bankName}
      </div>

      {/* Network logo */}
      {network && (
        <div className="absolute right-6 top-5 text-sm font-extrabold italic tracking-tight text-white/80">
          {network}
        </div>
      )}

      {/* Chip */}
      <div
        className="absolute left-6 top-[4.5rem] h-8 w-11 rounded-md"
        style={{
          background: "linear-gradient(135deg, #c8922a 0%, #f0d060 50%, #b8831e 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      >
        <div className="absolute inset-x-1 top-[0.65rem] h-px bg-yellow-900/40" />
        <div className="absolute inset-y-1 left-[0.65rem] w-px bg-yellow-900/40" />
      </div>

      {/* Card number */}
      <div className="absolute bottom-14 left-6 font-mono text-lg tracking-[0.22em] text-white">
        {account.cardLastFour
          ? `•••• •••• •••• ${account.cardLastFour}`
          : "•••• •••• •••• ••••"}
      </div>

      {/* Expiry */}
      <div className="absolute bottom-5 left-6">
        <p className="text-[9px] uppercase tracking-[0.18em] text-white/50">Expires</p>
        <p className="mt-0.5 font-mono text-sm text-white/90">
          {account.cardExpiry || "MM/YY"}
        </p>
      </div>

      {/* Account name */}
      <div className="absolute bottom-5 right-6 text-right">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          {account.name}
        </p>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}>
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
        {label}
      </span>
      <span className={cn("text-sm font-medium", mono && "font-mono tabular-nums")} style={{ color: TOKENS.onSurface }}>
        {value}
      </span>
    </div>
  )
}

export function AccountDetailView({ id }: { id: string }) {
  const router = useRouter()
  const { formatCurrency } = useFormatCurrency()
  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/accounts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.account) {
          setAccount(data.account)
        } else {
          setError("Account not found")
        }
      })
      .catch(() => setError("Failed to load account"))
      .finally(() => setLoading(false))
  }, [id])

  const hasCardDetails = !!(account?.cardLastFour || account?.cardExpiry || account?.cardType)
  const hasAccountDetails = !!(account?.bsb || account?.accountNumber)
  const isCash = account?.accountType === "cash"

  return (
    <div className="min-h-screen pb-20" style={{ background: TOKENS.surface, color: TOKENS.onSurface }}>
      {/* Top bar */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to accounts
        </button>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 pt-4 sm:px-6 lg:px-8">
        {loading && (
          <div className="space-y-4">
            <div className="h-7 w-40 animate-pulse rounded-lg" style={{ background: TOKENS.surfaceContainer }} />
            <div className="h-48 w-full animate-pulse rounded-2xl" style={{ background: TOKENS.surfaceContainer }} />
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: TOKENS.loss }}>{error}</p>
        )}

        {account && (
          <>
            {/* Account header */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                    {typeLabel(account.accountType)}{account.isDefault ? " · Default" : ""}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: TOKENS.onSurface }}>
                    {account.name}
                  </h1>
                  <p className="mt-0.5 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                    {account.bankName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Balance
                  </p>
                  <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: account.balance < 0 ? TOKENS.loss : TOKENS.onSurface }}>
                    <MajorFigureCurrency amount={account.balance} variant="neutral" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card visual */}
            {!isCash && hasCardDetails && (
              <div>
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                  Card
                </p>
                <BankCard account={account} />
              </div>
            )}

            {/* Account details */}
            {!isCash && hasAccountDetails && (
              <div
                className="rounded-xl border p-5"
                style={{
                  background: TOKENS.surfaceContainer,
                  borderColor: TOKENS.outlineGhost,
                  boxShadow: "inset 0 1px 0 rgba(218,226,253,0.06)",
                }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Landmark className="h-3.5 w-3.5" style={{ color: TOKENS.secondary }} />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                    Account details
                  </p>
                </div>
                <div>
                  <DetailRow label="BSB" value={account.bsb} mono />
                  <DetailRow label="Account number" value={account.accountNumber} mono />
                </div>
              </div>
            )}

            {/* Card details text summary (if card exists) */}
            {!isCash && hasCardDetails && (
              <div
                className="rounded-xl border p-5"
                style={{
                  background: TOKENS.surfaceContainer,
                  borderColor: TOKENS.outlineGhost,
                  boxShadow: "inset 0 1px 0 rgba(218,226,253,0.06)",
                }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5" style={{ color: TOKENS.secondary }} />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                    Card details
                  </p>
                </div>
                <div>
                  <DetailRow label="Network" value={cardNetworkLabel(account.cardType)} />
                  <DetailRow label="Last 4 digits" value={account.cardLastFour} mono />
                  <DetailRow label="Expiry" value={account.cardExpiry} mono />
                </div>
              </div>
            )}

            {/* No optional details yet */}
            {!isCash && !hasAccountDetails && !hasCardDetails && (
              <div
                className="rounded-xl border px-5 py-8 text-center"
                style={{ borderColor: TOKENS.outlineGhost, borderStyle: "dashed" }}
              >
                <CreditCard className="mx-auto mb-3 h-8 w-8 opacity-30" style={{ color: TOKENS.onSurfaceMuted }} />
                <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                  No account or card details saved yet.
                </p>
                <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                  Edit the account to add BSB, account number, or card details.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
