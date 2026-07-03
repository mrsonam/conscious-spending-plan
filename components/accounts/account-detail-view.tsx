"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  TrendingDown,
  TrendingUp,
  Unlink,
  Wallet,
  Zap,
} from "lucide-react"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AppSelect } from "@/components/ui/app-select"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
  requirePositiveMoney,
  requireSelection,
} from "@/lib/form-validation"
import { parseMoneyInput } from "@/lib/money-input"
import { toastSuccess, toastError } from "@/lib/app-toast"
import { AccountTransactionsSection } from "@/components/accounts/account-transactions-section"

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
  cardHolderName?: string | null
  redbarkAccountId?: string | null
}

const consoleField =
  "w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

// ─── helpers ────────────────────────────────────────────────────────────────

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

function typeAccent(accountType: string): string {
  const m: Record<string, string> = {
    checking: TOKENS.secondary,
    savings: TOKENS.primary,
    investment: TOKENS.tertiary,
    credit: TOKENS.loss,
    cash: TOKENS.onSurfaceMuted,
  }
  return m[accountType] ?? TOKENS.secondary
}

// ─── card colour + contrast system ──────────────────────────────────────────

type CardTheme = { bg: string; textDark: boolean }

function cardTheme(cardType: string | null | undefined, accountType: string): CardTheme {
  const themes: Record<string, CardTheme> = {
    visa:       { bg: "#1434CB",  textDark: false },
    mastercard: { bg: "#C8F026",  textDark: true  },
    amex:       { bg: "#007A3D",  textDark: false },
    eftpos:     { bg: "#5B21B6",  textDark: false },
  }
  if (cardType && themes[cardType]) return themes[cardType]
  const fallbacks: Record<string, CardTheme> = {
    credit:     { bg: "#2D1060",  textDark: false },
    savings:    { bg: "#2563EB",  textDark: false },
    investment: { bg: "#D97706",  textDark: true  },
  }
  return fallbacks[accountType] ?? { bg: "#4edea3", textDark: true }
}

function cardTypeLabel(cardType: string | null | undefined, accountType: string): string {
  if (accountType === "credit") return "Credit Card"
  if (cardType === "visa" || cardType === "mastercard" || cardType === "eftpos") return "Debit Card"
  if (accountType === "savings") return "Savings"
  if (accountType === "investment") return "Investment"
  return "Transaction"
}

// ─── card network logos (SVG) ────────────────────────────────────────────────

function MastercardLogo() {
  return (
    <svg width="52" height="32" viewBox="0 0 52 32" fill="none" aria-label="Mastercard">
      <circle cx="19" cy="16" r="14" fill="#EB001B" />
      <circle cx="33" cy="16" r="14" fill="#F79E1B" />
      <path
        d="M26 4.535a14 14 0 0 1 0 22.93A14 14 0 0 1 26 4.535z"
        fill="#FF5F00"
      />
    </svg>
  )
}

function VisaLogo({ dark }: { dark: boolean }) {
  return (
    <svg width="60" height="20" viewBox="0 0 60 20" fill="none" aria-label="Visa">
      <text
        x="0" y="18"
        fontFamily="Arial, sans-serif"
        fontSize="24"
        fontWeight="900"
        fontStyle="italic"
        fill={dark ? "#1434CB" : "white"}
        letterSpacing="-1"
      >
        VISA
      </text>
    </svg>
  )
}

function AmexLogo({ dark }: { dark: boolean }) {
  const fg = dark ? "#006FCF" : "white"
  return (
    <svg width="56" height="22" viewBox="0 0 56 22" fill="none" aria-label="American Express">
      <text
        x="0" y="17"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="800"
        letterSpacing="2"
        fill={fg}
      >
        AMEX
      </text>
    </svg>
  )
}

function EftposLogo({ dark }: { dark: boolean }) {
  const fg = dark ? "#007A8C" : "#7FFFD4"
  return (
    <svg width="60" height="22" viewBox="0 0 60 22" fill="none" aria-label="eftpos">
      <text
        x="0" y="17"
        fontFamily="Arial, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="1"
        fill={fg}
      >
        eftpos
      </text>
    </svg>
  )
}

function NetworkLogo({ cardType, dark }: { cardType: string | null | undefined; dark: boolean }) {
  if (cardType === "mastercard") return <MastercardLogo />
  if (cardType === "visa") return <VisaLogo dark={dark} />
  if (cardType === "amex") return <AmexLogo dark={dark} />
  if (cardType === "eftpos") return <EftposLogo dark={dark} />
  return null
}

// ─── bank card visual ────────────────────────────────────────────────────────

function BankCard({ account }: { account: AccountDetail }) {
  const { formatCurrency } = useFormatCurrency()
  const theme = cardTheme(account.cardType, account.accountType)
  const dark = theme.textDark
  const ink = dark ? "rgba(0,0,0,ALPHA)" : "rgba(255,255,255,ALPHA)"
  const t = (a: number) => ink.replace("ALPHA", String(a))

  const hasLogo = !!account.cardType

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-2xl"
      style={{
        aspectRatio: "1.586 / 1",
        background: theme.bg,
        boxShadow: dark
          ? "0 24px 64px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)"
          : "0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35)",
      }}
    >
      {/* noise texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "180px",
          opacity: dark ? 0.07 : 0.05,
          mixBlendMode: "overlay",
        }}
      />

      {/* sheen */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(115deg, transparent 30%, ${t(0.12)} 50%, ${t(0.04)} 55%, transparent 70%)`,
        }}
      />

      {/* top row: logo + card type */}
      <div className="absolute left-6 right-6 top-5 flex items-start justify-between">
        {hasLogo ? (
          <NetworkLogo cardType={account.cardType} dark={dark} />
        ) : (
          <p className="text-[13px] font-semibold tracking-wide" style={{ color: t(0.75) }}>
            {account.bankName}
          </p>
        )}
        <p className="text-[11px] font-semibold tracking-wide" style={{ color: t(0.6) }}>
          {cardTypeLabel(account.cardType, account.accountType)}
        </p>
      </div>

      {/* card number */}
      <p
        className="absolute left-6 right-6 font-mono tracking-[0.22em]"
        style={{
          top: "44%",
          color: t(0.85),
          fontSize: "clamp(13px, 2.4vw, 17px)",
          letterSpacing: "0.26em",
        }}
      >
        {account.cardLastFour
          ? `• • • •  • • • •  • • • •  ${account.cardLastFour}`
          : "• • • •  • • • •  • • • •  ••••"}
      </p>

      {/* bottom row */}
      <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em]" style={{ color: t(0.45) }}>
            Total Balance
          </p>
          <p className="mt-0.5 text-xl font-black tabular-nums sm:text-2xl" style={{ color: t(0.9) }}>
            {formatCurrency(account.balance)}
          </p>
        </div>
        {account.cardExpiry && (
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: t(0.45) }}>
              Valid Thru
            </p>
            <p className="mt-0.5 font-mono text-[13px] font-semibold" style={{ color: t(0.85) }}>
              {account.cardExpiry}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── stat chip ───────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: React.ReactNode
  accent?: string
  icon?: React.ReactNode
}) {
  return (
    <div
      className="flex flex-1 flex-col gap-2 rounded-xl border p-4"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: "inset 0 1px 0 rgba(218,226,253,0.05)",
      }}
    >
      <div className="flex items-center gap-1.5">
        {icon && <span style={{ color: accent ?? TOKENS.onSurfaceMuted }}>{icon}</span>}
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          {label}
        </p>
      </div>
      <div
        className="text-xl font-bold tabular-nums leading-none"
        style={{ color: accent ?? TOKENS.onSurface }}
      >
        {value}
      </div>
    </div>
  )
}

// ─── detail row ──────────────────────────────────────────────────────────────

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
    <div
      className="flex items-center justify-between gap-4 py-3.5"
      style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        {label}
      </span>
      <span
        className={cn("text-sm font-medium", mono && "font-mono tabular-nums")}
        style={{ color: TOKENS.onSurface }}
      >
        {value}
      </span>
    </div>
  )
}

// ─── edit modal ──────────────────────────────────────────────────────────────

function EditAccountModal({
  account,
  open,
  onClose,
  onSaved,
}: {
  account: AccountDetail
  open: boolean
  onClose: () => void
  onSaved: (updated: AccountDetail) => void
}) {
  const { currencyCode } = useFormatCurrency()

  const [name, setName] = useState(account.name)
  const [bankName, setBankName] = useState(account.bankName)
  const [accountType, setAccountType] = useState(account.accountType)
  const [balance, setBalance] = useState(String(account.balance))
  const [isDefault, setIsDefault] = useState(account.isDefault)
  const [bsb, setBsb] = useState(account.bsb ?? "")
  const [accountNumber, setAccountNumber] = useState(account.accountNumber ?? "")
  const [cardType, setCardType] = useState(account.cardType ?? "")
  const [cardLastFour, setCardLastFour] = useState(account.cardLastFour ?? "")
  const [cardExpiry, setCardExpiry] = useState(account.cardExpiry ?? "")
  const [cardNumber, setCardNumber] = useState("")
  const [cardHolderName, setCardHolderName] = useState(account.cardHolderName ?? "")

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({})

  const clearFieldError = (key: string) =>
    setFieldErrors((prev) => ({ ...prev, [key]: null }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const errors = buildFieldErrors([
      ["name", requireField(name, "Account name")],
      ["bankName", requireField(bankName, "Institution")],
      ["accountType", requireSelection(accountType, "an account type")],
      ["balance", requirePositiveMoney(balance, "Balance", currencyCode)],
    ])
    if (hasFieldErrors(errors)) {
      setFieldErrors(errors as Record<string, string | null>)
      return
    }

    const isCash = accountType === "cash"
    const rawDigits = cardNumber.replace(/\s/g, "")
    const derivedLastFour = rawDigits.length >= 4 ? rawDigits.slice(-4) : cardLastFour.trim() || null
    const detailsPayload = isCash
      ? { accountNumber: null, bsb: null, cardLastFour: null, cardExpiry: null, cardType: null, cardHolderName: null }
      : {
          accountNumber: accountNumber.trim() || null,
          bsb: bsb.trim() || null,
          cardLastFour: derivedLastFour,
          cardExpiry: cardExpiry.trim() || null,
          cardType: cardType.trim() || null,
          cardHolderName: cardHolderName.trim() || null,
        }

    setSaving(true)
    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: account.id,
          name,
          bankName,
          accountType,
          isDefault,
          balance: parseMoneyInput(balance, currencyCode) ?? account.balance,
          ...detailsPayload,
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setFormError(data.error ?? "Failed to save")
        toastError(data.error ?? "Failed to save")
        return
      }

      toastSuccess("Account updated!")
      onSaved({
        ...account,
        name,
        bankName,
        accountType,
        isDefault,
        balance: parseMoneyInput(balance, currencyCode) ?? account.balance,
        ...detailsPayload,
      })
      onClose()
    } catch {
      setFormError("An error occurred")
      toastError("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
        }}
      >
        <DialogClose onClose={onClose} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
              Edit account
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              Update institution details and current balance.
            </DialogDescription>
          </DialogHeader>

          <form noValidate className="mt-6 space-y-5" onSubmit={handleSubmit} inert={saving}>
            <FormErrorAlert error={formError} />
            <fieldset disabled={saving} className="min-w-0 space-y-5 border-0 p-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Account name *
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearFieldError("name") }}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs" style={{ color: TOKENS.loss }}>{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Institution *
                  </Label>
                  <Input
                    value={bankName}
                    onChange={(e) => { setBankName(e.target.value); clearFieldError("bankName") }}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                  {fieldErrors.bankName && (
                    <p className="mt-1 text-xs" style={{ color: TOKENS.loss }}>{fieldErrors.bankName}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Type *
                  </Label>
                  <AppSelect
                    value={accountType}
                    onValueChange={setAccountType}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                    options={[
                      { value: "checking", label: "Checking" },
                      { value: "savings", label: "Savings" },
                      { value: "investment", label: "Investment" },
                      { value: "credit", label: "Credit card" },
                      { value: "cash", label: "Other" },
                    ]}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Current balance
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={balance}
                    onChange={(e) => { setBalance(e.target.value); clearFieldError("balance") }}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                  />
                  {fieldErrors.balance && (
                    <p className="mt-1 text-xs" style={{ color: TOKENS.loss }}>{fieldErrors.balance}</p>
                  )}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border"
                  style={{ borderColor: TOKENS.outlineGhost, accentColor: TOKENS.primary }}
                />
                Default for income deposits
              </label>

              {accountType !== "cash" && (
                <>
                  <div className="border-t pt-5" style={{ borderColor: TOKENS.outlineGhost }}>
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "rgba(218,226,253,0.68)" }}>
                      Account details
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          BSB
                        </Label>
                        <Input
                          value={bsb}
                          onChange={(e) => setBsb(e.target.value)}
                          placeholder="000-000"
                          maxLength={7}
                          className={cn(consoleField, "mt-1 border-transparent")}
                          style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          Account number
                        </Label>
                        <Input
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="123456789"
                          className={cn(consoleField, "mt-1 border-transparent")}
                          style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-5" style={{ borderColor: TOKENS.outlineGhost }}>
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "rgba(218,226,253,0.68)" }}>
                      Card details
                    </p>
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                            Card type
                          </Label>
                          <AppSelect
                            value={cardType}
                            onValueChange={setCardType}
                            className={cn(consoleField, "mt-1 border-transparent")}
                            style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                            placeholder="None"
                            options={[
                              { value: "", label: "None" },
                              { value: "visa", label: "Visa" },
                              { value: "mastercard", label: "Mastercard" },
                              { value: "amex", label: "Amex" },
                              { value: "eftpos", label: "eftpos" },
                            ]}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                            Cardholder name
                          </Label>
                          <Input
                            value={cardHolderName}
                            onChange={(e) => setCardHolderName(e.target.value)}
                            placeholder="Name on card"
                            className={cn(consoleField, "mt-1 border-transparent")}
                            style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          Card number
                        </Label>
                        <Input
                          value={cardNumber}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 16)
                            const formatted = digits.replace(/(.{4})/g, "$1 ").trim()
                            setCardNumber(formatted)
                          }}
                          placeholder="XXXX XXXX XXXX XXXX"
                          maxLength={19}
                          inputMode="numeric"
                          className={cn(consoleField, "mt-1 border-transparent font-mono tracking-widest")}
                          style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                            Expiry
                          </Label>
                          <Input
                            value={cardExpiry}
                            onChange={(e) => {
                              let v = e.target.value.replace(/\D/g, "").slice(0, 4)
                              if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2)
                              setCardExpiry(v)
                            }}
                            placeholder="MM/YY"
                            maxLength={5}
                            className={cn(consoleField, "mt-1 border-transparent")}
                            style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                            Last 4 digits
                          </Label>
                          <Input
                            value={cardNumber ? cardNumber.replace(/\s/g, "").slice(-4) : cardLastFour}
                            onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            disabled={!!cardNumber}
                            placeholder={cardNumber ? "Auto" : "1234"}
                            maxLength={4}
                            inputMode="numeric"
                            className={cn(consoleField, "mt-1 border-transparent")}
                            style={{ backgroundColor: TOKENS.surfaceLow, borderColor: TOKENS.outlineGhost, color: cardNumber ? TOKENS.onSurfaceMuted : TOKENS.onSurface }}
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              )}
            </fieldset>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-60"
              style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── redbark link panel ──────────────────────────────────────────────────────

type RedbarkRemoteAccount = {
  id: string
  name: string
  institution: string
  accountType: string
}

function RedbarkLinkPanel({
  accountId,
  redbarkAccountId,
  onUpdated,
}: {
  accountId: string
  redbarkAccountId: string | null | undefined
  onUpdated: (id: string | null) => void
}) {
  const [remoteAccounts, setRemoteAccounts] = useState<RedbarkRemoteAccount[] | null>(null)
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [selected, setSelected] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const linked = !!redbarkAccountId

  // Fetch Redbark accounts when not yet linked
  useEffect(() => {
    if (linked) return
    setLoadingRemote(true)
    fetch("/api/redbark/accounts")
      .then((r) => r.json())
      .then((d: { accounts?: RedbarkRemoteAccount[]; error?: string }) => {
        if (d.accounts) setRemoteAccounts(d.accounts)
        else setRemoteAccounts([]) // no API key yet
      })
      .catch(() => setRemoteAccounts([]))
      .finally(() => setLoadingRemote(false))
  }, [linked])

  const save = async () => {
    const id = selected.trim()
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/redbark/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, redbarkAccountId: id }),
      })
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? "Failed to link")
        return
      }
      onUpdated(id)
      toastSuccess("Redbark account linked!")
    } catch {
      setError("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const unlink = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/redbark/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, redbarkAccountId: null }),
      })
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? "Failed to unlink")
        return
      }
      setSelected("")
      setRemoteAccounts(null)
      onUpdated(null)
      toastSuccess("Redbark account unlinked")
    } catch {
      setError("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  // Find the name of the currently linked account
  const linkedName = remoteAccounts?.find((a) => a.id === redbarkAccountId)?.name

  return (
    <div
      className="mt-4 rounded-xl border p-5"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: linked
          ? "color-mix(in srgb, #4edea3 22%, transparent)"
          : TOKENS.outlineGhost,
        boxShadow: "inset 0 1px 0 rgba(218,226,253,0.05)",
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-3.5 w-3.5" style={{ color: linked ? TOKENS.primary : TOKENS.onSurfaceMuted }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
          Redbark Sync
        </p>
        {linked && (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: "color-mix(in srgb, #4edea3 12%, transparent)",
              color: TOKENS.primary,
              border: "1px solid color-mix(in srgb, #4edea3 25%, transparent)",
            }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </span>
        )}
      </div>

      {linked ? (
        <div className="space-y-3">
          <p className="text-sm font-medium" style={{ color: TOKENS.onSurface }}>
            {linkedName ?? "Redbark account linked"}
          </p>
          <p className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            Transactions from this account will be automatically imported on every Redbark sync.
          </p>
          <button
            type="button"
            onClick={() => void unlink()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
          >
            <Unlink className="h-3 w-3" />
            {saving ? "Unlinking…" : "Unlink"}
          </button>
          {error && <p className="text-xs" style={{ color: TOKENS.loss }}>{error}</p>}
        </div>
      ) : loadingRemote ? (
        <p className="flex items-center gap-2 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading your Redbark accounts…
        </p>
      ) : remoteAccounts && remoteAccounts.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            Select which Redbark account maps to this account:
          </p>
          <div className="flex gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={saving}
              className="flex-1 min-w-0 rounded-lg border bg-transparent px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4edea3]/40 disabled:opacity-50"
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface, background: TOKENS.surfaceLow }}
            >
              <option value="" style={{ background: TOKENS.surfaceLow }}>Select an account…</option>
              {remoteAccounts.map((a) => (
                <option key={a.id} value={a.id} style={{ background: TOKENS.surfaceLow }}>
                  {a.name} — {a.institution}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !selected}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-opacity disabled:opacity-40"
              style={{ background: TOKENS.primary, color: TOKENS.surface }}
            >
              {saving ? "Linking…" : "Link"}
            </button>
          </div>
          {error && <p className="text-xs" style={{ color: TOKENS.loss }}>{error}</p>}
        </div>
      ) : (
        <p className="text-xs leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
          Add your Redbark API key on the{" "}
          <a href="/profile" className="underline" style={{ color: TOKENS.secondary }}>Profile page</a>
          {" "}to see your accounts here and link them with one click.
        </p>
      )}
    </div>
  )
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-2xl p-6 sm:p-8" style={{ background: TOKENS.surfaceContainer }}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded" style={{ background: TOKENS.surfaceHigh }} />
            <div className="h-7 w-48 rounded" style={{ background: TOKENS.surfaceHigh }} />
            <div className="h-4 w-32 rounded" style={{ background: TOKENS.surfaceHigh }} />
          </div>
          <div className="space-y-2 text-right">
            <div className="h-4 w-16 rounded" style={{ background: TOKENS.surfaceHigh }} />
            <div className="h-8 w-36 rounded" style={{ background: TOKENS.surfaceHigh }} />
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 flex-1 rounded-xl" style={{ background: TOKENS.surfaceContainer }} />
        ))}
      </div>
      <div
        className="w-full rounded-2xl"
        style={{ aspectRatio: "1.586 / 1", background: TOKENS.surfaceContainer }}
      />
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function AccountDetailView({ id }: { id: string }) {
  const router = useRouter()
  const { formatCurrency } = useFormatCurrency()
  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  const [redbarkAccountId, setRedbarkAccountId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    fetch(`/api/accounts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.account) {
          setAccount(data.account)
          setRedbarkAccountId(data.account.redbarkAccountId)
        } else {
          setError("Account not found")
        }
      })
      .catch(() => setError("Failed to load account"))
      .finally(() => setLoading(false))
  }, [id])

  const hasCardDetails = !!(account?.cardLastFour || account?.cardExpiry || account?.cardType || account?.cardHolderName)
  const hasAccountDetails = !!(account?.bsb || account?.accountNumber)
  const isCash = account?.accountType === "cash"
  const accent = account ? typeAccent(account.accountType) : TOKENS.secondary
  const netChange = account ? account.balance - account.startingFunds : 0
  const netPositive = netChange >= 0

  return (
    <div className="min-h-screen pb-24" style={{ background: TOKENS.surface, color: TOKENS.onSurface }}>
      {/* Back button */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          <ArrowLeft className="h-4 w-4" />
          Accounts
        </button>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        {loading && <Skeleton />}

        {error && (
          <p className="text-sm" style={{ color: TOKENS.loss }}>{error}</p>
        )}

        {account && (
          <>
            <div className="space-y-4">
              {/* ── Hero panel ── */}
              <div
                className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
                style={{
                  background: `radial-gradient(ellipse at 80% 40%, color-mix(in srgb, ${accent} 10%, transparent) 0%, transparent 65%), ${TOKENS.surfaceContainer}`,
                  borderColor: TOKENS.outlineGhost,
                  boxShadow: "inset 0 1px 0 rgba(218,226,253,0.07)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${accent} 40%, transparent), transparent)`,
                  }}
                />

                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                        style={{
                          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                          color: accent,
                          border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
                        }}
                      >
                        {typeLabel(account.accountType)}
                      </span>
                      {account.isDefault && (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                          style={{
                            background: "color-mix(in srgb, #89ceff 10%, transparent)",
                            color: TOKENS.secondary,
                            border: "1px solid color-mix(in srgb, #89ceff 20%, transparent)",
                          }}
                        >
                          Default
                        </span>
                      )}
                    </div>
                    <div>
                      <h1
                        className="text-2xl font-bold tracking-tight sm:text-3xl"
                        style={{ color: TOKENS.onSurface }}
                      >
                        {account.name}
                      </h1>
                      <p className="mt-1 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                        {account.bankName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row items-start justify-between gap-4 sm:flex-col sm:items-end">
                    <div className="text-right">
                      <p
                        className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        Balance
                      </p>
                      <div
                        className="mt-1 text-3xl font-bold tabular-nums leading-none sm:text-4xl"
                        style={{ color: account.balance < 0 ? TOKENS.loss : TOKENS.onSurface }}
                      >
                        <MajorFigureCurrency amount={account.balance} variant="neutral" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEdit(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
                      style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Stat chips ── */}
              <div className="flex gap-3">
                <StatChip
                  label="Current"
                  accent={account.balance < 0 ? TOKENS.loss : TOKENS.primary}
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  value={
                    <MajorFigureCurrency
                      amount={account.balance}
                      variant="neutral"
                      colorMain={account.balance < 0 ? TOKENS.loss : TOKENS.primary}
                      colorDecimal={TOKENS.onSurfaceMuted}
                    />
                  }
                />
                <StatChip
                  label="Starting"
                  icon={<Landmark className="h-3.5 w-3.5" />}
                  value={formatCurrency(account.startingFunds)}
                />
                <StatChip
                  label="Net change"
                  accent={netPositive ? TOKENS.primary : TOKENS.loss}
                  icon={
                    netPositive ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )
                  }
                  value={
                    <span style={{ color: netPositive ? TOKENS.primary : TOKENS.loss }}>
                      {netPositive ? "+" : ""}
                      {formatCurrency(netChange)}
                    </span>
                  }
                />
              </div>

              {/* ── Two-column grid on lg ── */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,32rem)_1fr]" id="account-details-grid">
                <div className="mx-auto w-full max-w-[34rem] space-y-4 lg:mx-0">
                  {!isCash && hasCardDetails && <BankCard account={account} />}

                  {!isCash && hasAccountDetails && (
                    <div
                      className="rounded-xl border p-5"
                      style={{
                        background: TOKENS.surfaceContainer,
                        borderColor: TOKENS.outlineGhost,
                        boxShadow: "inset 0 1px 0 rgba(218,226,253,0.05)",
                      }}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <Landmark className="h-3.5 w-3.5" style={{ color: TOKENS.secondary }} />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                          Account details
                        </p>
                      </div>
                      <DetailRow label="BSB" value={account.bsb} mono />
                      <DetailRow label="Account number" value={account.accountNumber} mono />
                    </div>
                  )}

                  {!isCash && !hasAccountDetails && !hasCardDetails && (
                    <div
                      className="flex flex-col items-center justify-center rounded-xl border px-6 py-12 text-center"
                      style={{ borderColor: TOKENS.outlineGhost, borderStyle: "dashed" }}
                    >
                      <CreditCard className="mb-3 h-9 w-9 opacity-25" style={{ color: TOKENS.onSurfaceMuted }} />
                      <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                        No banking or card details saved yet.
                      </p>
                      <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                        Click Edit above to add BSB, account number, or card info.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {!isCash && hasCardDetails && (
                    <div
                      className="rounded-xl border p-5"
                      style={{
                        background: TOKENS.surfaceContainer,
                        borderColor: TOKENS.outlineGhost,
                        boxShadow: "inset 0 1px 0 rgba(218,226,253,0.05)",
                      }}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5" style={{ color: TOKENS.secondary }} />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                          Card details
                        </p>
                      </div>
                      <DetailRow label="Network" value={account.cardType ?? null} />
                      <DetailRow label="Cardholder" value={account.cardHolderName} />
                      <DetailRow
                        label="Card number"
                        value={account.cardLastFour ? `•••• •••• •••• ${account.cardLastFour}` : null}
                        mono
                      />
                      <DetailRow label="Expiry" value={account.cardExpiry} mono />
                    </div>
                  )}

                  <div
                    className="rounded-xl border p-5"
                    style={{
                      background: TOKENS.surfaceContainer,
                      borderColor: TOKENS.outlineGhost,
                      boxShadow: "inset 0 1px 0 rgba(218,226,253,0.05)",
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Wallet className="h-3.5 w-3.5" style={{ color: TOKENS.secondary }} />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                        Account info
                      </p>
                    </div>
                    <DetailRow label="Account name" value={account.name} />
                    <DetailRow label="Institution" value={account.bankName} />
                    <DetailRow label="Type" value={typeLabel(account.accountType)} />
                  </div>
                </div>
              </div>

              <AccountTransactionsSection accountId={account.id} />
            </div>

            {!isCash && redbarkAccountId !== undefined && (
              <RedbarkLinkPanel
                accountId={account.id}
                redbarkAccountId={redbarkAccountId}
                onUpdated={setRedbarkAccountId}
              />
            )}

            <EditAccountModal
              account={account}
              open={showEdit}
              onClose={() => setShowEdit(false)}
              onSaved={(updated) => setAccount(updated)}
            />
          </>
        )}
      </div>
    </div>
  )
}
