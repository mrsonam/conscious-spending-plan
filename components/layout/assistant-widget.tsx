"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export function AssistantWidget() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your finance coach. I can answer questions, and I can also log income, expenses, and transfers for you.\n\nFor example:\n- \"How much have I spent this month?\"\n- \"Log $50 for groceries from my default account\"\n- \"Add $2000 income, salary\"\n- \"Transfer $100 from Checking to Savings\"",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If user is unauthenticated, clicking the widget should send them to login
  const handleOpen = () => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    setOpen(true)
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userText = input.trim()
    setInput("")
    setError(null)

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userText }]
    setMessages(nextMessages)
    setLoading(true)

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: nextMessages.slice(-8), // send last few turns for context
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Something went wrong talking to your assistant.")
        return
      }

      let reply = (data.reply as string) || "Sorry, I couldn't generate a response right now."
      const logAction = data.logAction as
        | { action: string; params: Record<string, unknown> }
        | undefined

      if (logAction?.action && logAction?.params) {
        let logOk = false
        let logError: string | null = null

        try {
          if (logAction.action === "log_expense") {
            const res = await fetch("/api/expenses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(logAction.params),
            })
            const j = await res.json().catch(() => ({}))
            logOk = res.ok
            if (!res.ok) logError = j.error || "Failed to log expense"
          } else if (logAction.action === "log_income") {
            const res = await fetch("/api/calculate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(logAction.params),
            })
            const j = await res.json().catch(() => ({}))
            logOk = res.ok
            if (!res.ok) logError = j.error || "Failed to log income"
          } else if (logAction.action === "log_transfer") {
            const res = await fetch("/api/transfers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(logAction.params),
            })
            const j = await res.json().catch(() => ({}))
            logOk = res.ok
            if (!res.ok) logError = j.error || "Failed to log transfer"
          } else if (logAction.action === "log_loan") {
            const res = await fetch("/api/loans", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(logAction.params),
            })
            const j = await res.json().catch(() => ({}))
            logOk = res.ok
            if (!res.ok) logError = j.error || "Failed to log loan"
          }
        } catch {
          logError = "Network error while logging the entry."
        }

        if (logError) setError(logError)
        if (logOk) reply = reply + "\n\n✓ Logged successfully."
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
    } catch {
      setError("Network error while calling the assistant.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Floating button hidden until auth state is known to avoid flicker
  const showButton = status !== "loading"

  return (
    <>
      {showButton && (
        <button
          type="button"
          onClick={handleOpen}
          className="fixed bottom-4 right-4 z-40 flex items-center justify-center rounded-full bg-indigo-600 text-white w-11 h-11 shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Open AI finance coach"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <DialogTitle className="text-base">AI Finance Coach</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <Card className="border-0 rounded-none shadow-none">
            <CardHeader className="pt-0 px-4">
              <CardDescription className="text-xs text-gray-500">
                Ask questions about your finances or log income, expenses, and transfers in plain language.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="h-64 sm:h-72 border rounded-lg p-3 bg-gray-50 overflow-y-auto space-y-3">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-xs whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-white border border-gray-200">
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                      <span>Thinking about your finances…</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  placeholder='Ask or log: e.g. "Log $30 for lunch" or "Add $500 income"'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-xs"
                />
                <Button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs"
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>

              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                This assistant only uses data from this app and your logged entries.
              </p>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  )
}

