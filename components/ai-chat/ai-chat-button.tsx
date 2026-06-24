"use client"

import { useState } from "react"
import { MessageSquareText, X } from "lucide-react"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { AiChatPanel } from "./ai-chat-panel"

export function AiChatButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 w-[380px] sm:right-6"
          style={{ height: "min(560px, calc(100dvh - 120px))" }}
        >
          <AiChatPanel onClose={() => setOpen(false)} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 sm:right-6",
          consoleFocus,
        )}
        style={{
          background: TOKENS.primary,
          color: TOKENS.surface,
        }}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquareText className="h-5 w-5" />
        )}
      </button>
    </>
  )
}
