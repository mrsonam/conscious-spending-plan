"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-lg p-6 w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogHeader({
  className,
  children,
  ...props
}: DialogHeaderProps) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 mb-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogTitle({
  className,
  children,
  ...props
}: DialogTitleProps) {
  return (
    <h2
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h2>
  )
}

export function DialogDescription({
  className,
  children,
  ...props
}: DialogDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-gray-500", className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function DialogClose({
  onClose,
  className,
}: {
  onClose: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
        className
      )}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  )
}
