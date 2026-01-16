"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog"
import { Button } from "./button"
import { AlertTriangle } from "lucide-react"

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {variant === "destructive" && (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
