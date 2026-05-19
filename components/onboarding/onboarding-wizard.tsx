"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Loader2,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DISPLAY_CURRENCY_OPTIONS } from "@/lib/display-currency"
import {
  BUCKET_META,
  ONBOARDING_STEPS,
  type OnboardingAllocationDraft,
  type OnboardingStepId,
  defaultAllocationDraft,
  sumPercentageAllocation,
  validatePercentageAllocation,
} from "@/lib/onboarding"
import { parseMoneyInput } from "@/lib/money-input"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { parsePercentOrMoneyInput } from "@/lib/money-input"

const fieldClass =
  "w-full rounded-xl border px-3 py-2.5 text-sm transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

const selectFieldStyle = {
  background: TOKENS.surfaceHigh,
  borderColor: TOKENS.outlineGhost,
  color: TOKENS.onSurface,
} as const

const STEP_LABELS: Record<OnboardingStepId, string> = {
  welcome: "Welcome",
  basics: "Basics",
  accounts: "Accounts",
  buckets: "Buckets",
  done: "Done",
}

type Props = {
  initialName: string
  initialCurrency: string
  initialAllocation: OnboardingAllocationDraft
}

export function OnboardingWizard({ initialName, initialCurrency, initialAllocation }: Props) {
  const router = useRouter()
  const { update } = useSession()
  const [stepIndex, setStepIndex] = useState(0)
  const step = ONBOARDING_STEPS[stepIndex]!

  const [name, setName] = useState(initialName)
  const [currency, setCurrency] = useState(initialCurrency)
  const [allocation, setAllocation] = useState<OnboardingAllocationDraft>(initialAllocation)

  const [accountName, setAccountName] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountType, setAccountType] = useState("checking")
  const [startingFunds, setStartingFunds] = useState("")
  const [accountCount, setAccountCount] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const percentTotal = useMemo(() => sumPercentageAllocation(allocation), [allocation])

  const refreshAccountCount = useCallback(async () => {
    const res = await fetch("/api/accounts")
    if (!res.ok) return
    const data = (await res.json()) as { accounts?: unknown[] }
    setAccountCount(data.accounts?.length ?? 0)
  }, [])

  const saveBasics = async () => {
    const res = await fetch("/api/user/display-currency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayCurrency: currency,
        ...(name.trim() ? { name: name.trim() } : {}),
      }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      throw new Error(data.error ?? "Could not save currency.")
    }
    await update({
      displayCurrency: currency,
      ...(name.trim() ? { name: name.trim() } : {}),
    })
  }

  const saveAccount = async () => {
    if (!accountName.trim() || !bankName.trim()) {
      throw new Error("Account name and bank name are required.")
    }
    const startingFundsDollars =
      startingFunds.trim() === "" ? 0 : parseMoneyInput(startingFunds, currency)
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: accountName.trim(),
        bankName: bankName.trim(),
        accountType,
        startingFunds: startingFundsDollars,
        isDefault: accountCount === 0,
      }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      throw new Error(data.error ?? "Could not add account.")
    }
    setAccountName("")
    setBankName("")
    setStartingFunds("")
    await refreshAccountCount()
  }

  const saveBuckets = async () => {
    const validationError = validatePercentageAllocation(allocation)
    if (validationError) throw new Error(validationError)

    const res = await fetch("/api/onboarding/buckets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allocation),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      throw new Error(data.error ?? "Could not save bucket splits.")
    }
  }

  const finishOnboarding = async () => {
    const res = await fetch("/api/onboarding/complete", { method: "POST" })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      throw new Error(data.error ?? "Could not finish setup.")
    }
    router.push("/dashboard?tour=1")
    router.refresh()
  }

  const goNext = async () => {
    setError(null)
    setBusy(true)
    try {
      if (step === "welcome") {
        setStepIndex((i) => i + 1)
        return
      }
      if (step === "basics") {
        await saveBasics()
        await refreshAccountCount()
        setStepIndex((i) => i + 1)
        return
      }
      if (step === "accounts") {
        if (accountCount < 1 && accountName.trim() && bankName.trim()) {
          await saveAccount()
        }
        const countRes = await fetch("/api/accounts")
        const countData = (await countRes.json()) as { accounts?: unknown[] }
        const count = countData.accounts?.length ?? 0
        if (count < 1) {
          throw new Error("Add at least one account to continue.")
        }
        setAccountCount(count)
        setStepIndex((i) => i + 1)
        return
      }
      if (step === "buckets") {
        await saveBuckets()
        setStepIndex((i) => i + 1)
        return
      }
      if (step === "done") {
        await finishOnboarding()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  const goBack = () => {
    setError(null)
    setStepIndex((i) => Math.max(0, i - 1))
  }

  const updateAllocation = (key: keyof OnboardingAllocationDraft, value: number) => {
    setAllocation((prev) => ({ ...prev, [key]: value }))
  }

  const progressPercent = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100

  useEffect(() => {
    if (step === "accounts") {
      void refreshAccountCount()
    }
  }, [step, refreshAccountCount])

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex items-center gap-3">
        <Image src="/icon.svg" alt="" width={40} height={40} className="rounded-xl" />
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Setup guide
          </p>
          <p className="text-sm font-medium" style={{ color: TOKENS.onSurface }}>
            Conscious Spending Plan
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div
          className="h-1 overflow-hidden rounded-full"
          style={{ background: "rgba(218,226,253,0.1)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: TOKENS.primary,
            }}
          />
        </div>
        <div className="mt-3 flex justify-between gap-2">
          {ONBOARDING_STEPS.map((id, i) => (
            <span
              key={id}
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                i <= stepIndex ? "opacity-100" : "opacity-40",
              )}
              style={{ color: i <= stepIndex ? TOKENS.primary : TOKENS.onSurfaceMuted }}
            >
              {STEP_LABELS[id]}
            </span>
          ))}
        </div>
      </div>

      <div
        className="flex-1 rounded-2xl border p-6 sm:p-8"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        {step === "welcome" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: TOKENS.onSurface }}>
              Welcome to your spending plan
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              In a few steps you&apos;ll link an account and split income across four buckets:
              fixed costs, savings, investments, and guilt-free spending using the conscious
              spending framework.
            </p>
            <ul className="space-y-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TOKENS.primary }} />
                Choose your display currency
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TOKENS.primary }} />
                Add your first bank account
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TOKENS.primary }} />
                Set how income flows into each bucket
              </li>
            </ul>
          </div>
        )}

        {step === "basics" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: TOKENS.onSurface }}>
                The basics
              </h1>
              <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                We&apos;ll use this currency across your dashboard and reports.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-name" style={{ color: TOKENS.onSurfaceMuted }}>
                Name (optional)
              </Label>
              <Input
                id="onboarding-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={fieldClass}
                style={{
                  background: TOKENS.surfaceHigh,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-currency" style={{ color: TOKENS.onSurfaceMuted }}>
                Display currency
              </Label>
              <AppSelect
                id="onboarding-currency"
                value={currency}
                onValueChange={setCurrency}
                variant="console"
                className={fieldClass}
                style={selectFieldStyle}
                options={DISPLAY_CURRENCY_OPTIONS.map((o) => ({
                  value: o.code,
                  label: o.label,
                }))}
              />
            </div>
          </div>
        )}

        {step === "accounts" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: TOKENS.onSurface }}>
                Link an account
              </h1>
              <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                Income lands in an account first, then flows into your buckets. Add at least one
                to continue.
              </p>
              {accountCount > 0 ? (
                <p
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: "rgba(78,222,163,0.12)",
                    color: TOKENS.primary,
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  {accountCount} account{accountCount === 1 ? "" : "s"} linked
                </p>
              ) : null}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label style={{ color: TOKENS.onSurfaceMuted }}>Account name</Label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Everyday Checking"
                  className={fieldClass}
                  style={{
                    background: TOKENS.surfaceHigh,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ color: TOKENS.onSurfaceMuted }}>Bank / institution</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Your bank"
                  className={fieldClass}
                  style={{
                    background: TOKENS.surfaceHigh,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label style={{ color: TOKENS.onSurfaceMuted }}>Type</Label>
                  <AppSelect
                    value={accountType}
                    onValueChange={setAccountType}
                    variant="console"
                    className={fieldClass}
                    style={selectFieldStyle}
                    options={[
                      { value: "checking", label: "Checking" },
                      { value: "savings", label: "Savings" },
                      { value: "investment", label: "Investment" },
                      { value: "credit", label: "Credit" },
                      { value: "cash", label: "Other" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label style={{ color: TOKENS.onSurfaceMuted }}>Starting balance</Label>
                  <Input
                    value={startingFunds}
                    onChange={(e) => setStartingFunds(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    className={fieldClass}
                    style={{
                      background: TOKENS.surfaceHigh,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                  />
                </div>
              </div>
              {accountCount === 0 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setError(null)
                    setBusy(true)
                    try {
                      await saveAccount()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Could not add account.")
                    } finally {
                      setBusy(false)
                    }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors"
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    background: TOKENS.surfaceHigh,
                  }}
                >
                  <Building2 className="h-4 w-4" />
                  Save account
                </button>
              ) : null}
            </div>
          </div>
        )}

        {step === "buckets" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: TOKENS.onSurface }}>
                Split your income
              </h1>
              <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                Assign a percentage of each paycheck to each bucket. They should total 100%.
              </p>
            </div>

            <div
              className="rounded-xl border px-4 py-3"
              style={{
                borderColor: TOKENS.outlineGhost,
                background: TOKENS.surfaceHigh,
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                Total allocated
              </p>
              <p
                className="mt-1 text-2xl font-semibold tabular-nums"
                style={{
                  color: Math.abs(percentTotal - 100) < 0.01 ? TOKENS.primary : TOKENS.warning,
                }}
              >
                {percentTotal.toFixed(1)}%
              </p>
            </div>

            <div className="space-y-4">
              {BUCKET_META.map((meta) => {
                const Icon =
                  meta.category === "fixedCosts"
                    ? Wallet
                    : meta.category === "savings"
                      ? PiggyBank
                      : meta.category === "investment"
                        ? TrendingUp
                        : CreditCard
                const value = allocation[meta.valueKey] as number
                return (
                  <div key={meta.category} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: TOKENS.primary }} />
                      <span className="text-sm font-medium" style={{ color: TOKENS.onSurface }}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                      {meta.hint}
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => {
                          const parsed = parsePercentOrMoneyInput(
                            e.target.value,
                            "percentage",
                            currency,
                          )
                          if (parsed != null) updateAllocation(meta.valueKey, parsed)
                        }}
                        className={cn(fieldClass, "tabular-nums")}
                        style={{
                          background: TOKENS.surfaceHigh,
                          borderColor: TOKENS.outlineGhost,
                          color: TOKENS.onSurface,
                        }}
                      />
                      <span className="text-sm font-medium" style={{ color: TOKENS.onSurfaceMuted }}>
                        %
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              className="text-xs underline-offset-2 hover:underline"
              style={{ color: TOKENS.onSurfaceMuted }}
              onClick={() => setAllocation(defaultAllocationDraft())}
            >
              Reset to recommended 50 / 20 / 10 / 20
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "rgba(78,222,163,0.15)" }}
            >
              <Check className="h-7 w-7" style={{ color: TOKENS.primary }} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: TOKENS.onSurface }}>
              You&apos;re all set
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              Your account is linked and your buckets are ready. Log income to see it split
              automatically across your plan.
            </p>
          </div>
        )}
      </div>

      {error ? (
        <p
          className="mt-4 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: "rgba(255,180,171,0.35)",
            background: "rgba(255,180,171,0.08)",
            color: TOKENS.loss,
          }}
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
        {stepIndex > 0 && step !== "done" ? (
          <button
            type="button"
            onClick={goBack}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
              background: TOKENS.surfaceContainer,
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void goNext()}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50"
          style={{
            background: TOKENS.primary,
            color: TOKENS.onPrimary,
          }}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : step === "done" ? (
            "Go to dashboard"
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
