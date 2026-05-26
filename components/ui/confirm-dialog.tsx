"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative border p-6 shadow-2xl sm:max-w-[425px]"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow:
            "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            {variant === "destructive" && (
              <AlertTriangle
                className="h-5 w-5 shrink-0"
                style={{ color: "#ffb4ab" }}
                strokeWidth={2}
              />
            )}
            <DialogTitle style={{ color: TOKENS.onSurface }}>{title}</DialogTitle>
          </div>
          <DialogDescription style={{ color: TOKENS.onSurfaceMuted }}>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/[0.06]"
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurfaceMuted,
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-95"
            style={{
              background:
                variant === "destructive"
                  ? "color-mix(in srgb, #ffb4ab 22%, #2a1820)"
                  : TOKENS.primary,
              color: variant === "destructive" ? "#ffb4ab" : TOKENS.surface,
              border:
                variant === "destructive"
                  ? `1px solid color-mix(in srgb, #ffb4ab 35%, transparent)`
                  : undefined,
              boxShadow: variant === "destructive" ? undefined : CARD_INSET,
            }}
          >
            {confirmText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
