"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Send, Bot, User, Sparkles } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = [
  "How much did I spend last month?",
  "Where can I cut spending?",
  "Am I on track with my budget?",
  "What are my biggest expenses?",
]

export function AiChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || streaming) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      }
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput("")
      setStreaming(true)

      try {
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(
            (err as { error?: string }).error ?? "Failed to get response",
          )
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let accumulated = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          const snapshot = accumulated
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: snapshot } : m,
            ),
          )
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content:
                    err instanceof Error
                      ? err.message
                      : "Something went wrong. Please try again.",
                }
              : m,
          ),
        )
      } finally {
        setStreaming(false)
      }
    },
    [messages, streaming],
  )

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl border shadow-2xl"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: TOKENS.outlineGhost }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${TOKENS.primary}20` }}
          >
            <Sparkles className="h-4 w-4" style={{ color: TOKENS.primary }} />
          </div>
          <div>
            <p
              className="text-[13px] font-semibold leading-tight"
              style={{ color: TOKENS.onSurface }}
            >
              Financial Assistant
            </p>
            <p
              className="text-[10px] leading-tight"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Powered by MiniMax M2.7
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn("rounded-lg p-1.5 transition-colors", consoleFocus)}
          style={{ color: TOKENS.onSurfaceMuted }}
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: `${TOKENS.primary}15` }}
            >
              <Bot className="h-6 w-6" style={{ color: TOKENS.primary }} />
            </div>
            <div className="text-center">
              <p
                className="text-[13px] font-medium"
                style={{ color: TOKENS.onSurface }}
              >
                Ask me anything about your finances
              </p>
              <p
                className="mt-1 text-[11px]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                I have access to your accounts, spending, and income data.
              </p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-[11px] transition-colors hover:border-[var(--border-hover)]",
                    consoleFocus,
                  )}
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurfaceMuted,
                    ["--border-hover" as string]: TOKENS.primary,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2.5",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {m.role === "assistant" && (
                  <div
                    className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${TOKENS.primary}20` }}
                  >
                    <Bot
                      className="h-3.5 w-3.5"
                      style={{ color: TOKENS.primary }}
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    m.role === "user" ? "rounded-br-md" : "rounded-bl-md",
                  )}
                  style={{
                    background:
                      m.role === "user"
                        ? `${TOKENS.primary}20`
                        : TOKENS.surface,
                    color: TOKENS.onSurface,
                    border:
                      m.role === "assistant"
                        ? `1px solid ${TOKENS.outlineGhost}`
                        : "none",
                  }}
                >
                  {m.content ? (
                    m.role === "assistant" ? (
                      <div className="ai-chat-markdown">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                        {streaming && messages[messages.length - 1]?.id === m.id && (
                          <span
                            className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse align-middle"
                            style={{ background: TOKENS.primary }}
                          />
                        )}
                      </div>
                    ) : (
                      m.content
                    )
                  ) : (
                    streaming && m.role === "assistant" ? (
                      <span className="inline-flex gap-1">
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full"
                          style={{
                            background: TOKENS.primary,
                            animationDelay: "0ms",
                          }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full"
                          style={{
                            background: TOKENS.primary,
                            animationDelay: "150ms",
                          }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full"
                          style={{
                            background: TOKENS.primary,
                            animationDelay: "300ms",
                          }}
                        />
                      </span>
                    ) : null
                  )}
                </div>
                {m.role === "user" && (
                  <div
                    className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: TOKENS.surfaceHigh }}
                  >
                    <User
                      className="h-3.5 w-3.5"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="border-t px-3 py-3"
        style={{ borderColor: TOKENS.outlineGhost }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances..."
            disabled={streaming}
            className={cn(
              "flex-1 rounded-xl border bg-transparent px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-[var(--placeholder)]",
              consoleFocus,
            )}
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
              ["--placeholder" as string]: TOKENS.onSurfaceMuted,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all disabled:opacity-30",
              consoleFocus,
            )}
            style={{
              background: input.trim() ? TOKENS.primary : TOKENS.surfaceHigh,
              color: input.trim() ? TOKENS.surface : TOKENS.onSurfaceMuted,
            }}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
