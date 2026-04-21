"use client"

import * as React from "react"
import Link from "next/link"
import { Check, Copy, ExternalLink, Wallet } from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { BENTO } from "@/lib/app-routes"

const JSON_BODY = `{
  "amount": <Provided Input "Amount">,
  "description": <Provided Input "Merchant">,
  "date": <Current Date>
}`

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <div className="relative">
      <pre
        className="overflow-x-auto rounded-lg border px-3 py-3 font-mono text-[12px] leading-relaxed"
        style={{
          borderColor: TOKENS.outlineGhost,
          background: TOKENS.surfaceLow,
          color: TOKENS.onSurface,
        }}
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          } catch {
            /* ignore */
          }
        }}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-white/[0.05]"
        style={{
          borderColor: TOKENS.outlineGhost,
          color: TOKENS.onSurfaceMuted,
          background: `color-mix(in srgb, ${TOKENS.surface} 60%, transparent)`,
        }}
        aria-label="Copy snippet"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" /> Copy
          </>
        )}
      </button>
    </div>
  )
}

function Step({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="grid grid-cols-[2rem_1fr] items-start gap-3">
      <span
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{
          background: `color-mix(in srgb, ${TOKENS.primary} 18%, transparent)`,
          color: TOKENS.primary,
        }}
      >
        {index}
      </span>
      <div className="min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: TOKENS.onSurface }}
        >
          {title}
        </p>
        <div
          className="mt-1.5 space-y-2 text-sm leading-relaxed"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          {children}
        </div>
      </div>
    </li>
  )
}

export function SetupGuide({ originUrl }: { originUrl: string }) {
  const endpoint = `${originUrl.replace(/\/$/, "")}/api/expenses`

  return (
    <section
      className="rounded-xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: TOKENS.surfaceLow, color: TOKENS.secondary }}
        >
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Apple Shortcuts setup
          </p>
          <p
            className="mt-1 max-w-2xl text-xs leading-relaxed"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Build a Shortcut that POSTs to <code className="font-mono">/api/expenses</code>{" "}
            with your token. The Shortcut can be triggered manually (home screen
            icon, widget) or, if you have an Apple Card, automatically when you
            buy something.
          </p>
        </div>
      </div>

      <div
        className="mt-5 rounded-lg border px-4 py-3 text-xs"
        style={{
          borderColor: TOKENS.outlineGhost,
          background: TOKENS.surfaceLow,
          color: TOKENS.onSurfaceMuted,
        }}
      >
        Make sure a <strong>default account</strong> is set first — otherwise the
        Shortcut needs an explicit <code className="font-mono">accountId</code>.
        You can set one on your{" "}
        <Link
          href={BENTO.accounts}
          className="underline-offset-2 hover:underline"
          style={{ color: TOKENS.primary }}
        >
          Accounts
        </Link>{" "}
        page.
      </div>

      <ol className="mt-6 space-y-6">
        <Step index={1} title="Create a token above">
          <p>
            Click <em>New token</em>, label it (e.g. <em>iPhone Shortcut</em>),
            then copy the value. You will only see it once.
          </p>
        </Step>

        <Step index={2} title="In Shortcuts, add 'Get contents of URL'">
          <p>
            URL — the endpoint for your account:
          </p>
          <CodeBlock code={endpoint} />
          <p>Method: POST.</p>
        </Step>

        <Step index={3} title="Add headers">
          <CodeBlock
            code={`Authorization: Bearer csp_your_token_here\nContent-Type: application/json`}
          />
          <p>
            Replace <code className="font-mono">csp_your_token_here</code> with
            the value you just copied.
          </p>
        </Step>

        <Step index={4} title="Add a JSON body">
          <p>
            For a manual flow, prompt yourself first:{" "}
            <em>Ask for Input → Number (Amount)</em> and{" "}
            <em>Ask for Input → Text (Merchant)</em>. Then plug those into the
            JSON body:
          </p>
          <CodeBlock code={JSON_BODY} />
          <p>
            Optional fields: <code className="font-mono">accountId</code> (skip
            it to use your default account),{" "}
            <code className="font-mono">category</code> (one of{" "}
            <code className="font-mono">fixedCosts</code>,{" "}
            <code className="font-mono">savings</code>,{" "}
            <code className="font-mono">investment</code>,{" "}
            <code className="font-mono">guiltFreeSpending</code>),{" "}
            <code className="font-mono">expenseCategory</code> (free-form, e.g.
            &ldquo;coffee&rdquo;).
          </p>
        </Step>

        <Step
          index={5}
          title="Optional: trigger automatically with Apple Card"
        >
          <p>
            In <em>Shortcuts → Automation</em> create &ldquo;When I buy something
            with Apple Card&rdquo;. Apple passes <em>Amount</em>,{" "}
            <em>Merchant</em>, and <em>Transaction Date</em> as variables —
            wire them straight into the same JSON body. Other banks don&apos;t
            expose this trigger; for those cards a home-screen Shortcut you tap
            after a purchase is the most reliable approach.
          </p>
        </Step>

        <Step index={6} title="Test it">
          <p>
            Run the Shortcut once. A successful response is a 201 with{" "}
            <code className="font-mono">{`{ "expense": { ... } }`}</code>. The
            new expense will appear under{" "}
            <Link
              href={BENTO.expenses}
              className="underline-offset-2 hover:underline"
              style={{ color: TOKENS.primary }}
            >
              Expenses
            </Link>{" "}
            and the chosen account&apos;s balance will be debited.
          </p>
        </Step>
      </ol>

      <p
        className="mt-6 inline-flex items-center gap-1.5 text-[11px]"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        <ExternalLink className="h-3 w-3" />
        Apple Shortcuts only exposes Wallet transaction data automatically for
        Apple Card. For other cards, use the manual prompt flow above.
      </p>
    </section>
  )
}
