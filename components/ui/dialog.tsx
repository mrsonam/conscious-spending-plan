"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const SHEET_EASE = [0.32, 0.72, 0, 1] as const
const CLOSE_DRAG_PX = 100
const CLOSE_VELOCITY_Y = 450

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

type DialogSheetContextValue = {
  startSheetDrag: (e: React.PointerEvent) => void
} | null

const DialogSheetContext = React.createContext<DialogSheetContextValue>(null)

function useMaxSm() {
  const [maxSm, setMaxSm] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 639px)").matches : false
  )
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const onChange = () => setMaxSm(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return maxSm
}

type DialogBackdropProps = {
  onOpenChange: (open: boolean) => void
  reduceMotion: boolean
}

function DialogBackdrop({ onOpenChange, reduceMotion }: DialogBackdropProps) {
  return (
    <motion.div
      layout={false}
      className="fixed inset-0 z-[300] min-h-[100dvh] w-full bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
      onClick={() => onOpenChange(false)}
      aria-hidden
    />
  )
}

type DialogSheetProps = {
  maxSm: boolean
  reduceMotion: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function DialogSheet({ maxSm, reduceMotion, onOpenChange, children }: DialogSheetProps) {
  const dragControls = useDragControls()
  const sheetRef = React.useRef<HTMLDivElement | null>(null)

  const handleSheetDragEnd = React.useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (!maxSm) return
      if (info.offset.y > CLOSE_DRAG_PX || info.velocity.y > CLOSE_VELOCITY_Y) {
        onOpenChange(false)
        return
      }
      const el = sheetRef.current
      if (el) {
        animate(el, { y: 0 }, { type: "spring", stiffness: 420, damping: 38 })
      }
    },
    [maxSm, onOpenChange]
  )

  const mobileDrag =
    maxSm
      ? {
          drag: "y" as const,
          dragControls,
          dragListener: false,
          dragConstraints: { top: 0, bottom: 520 } as const,
          dragElastic: { top: 0, bottom: 0.14 } as const,
          dragMomentum: false,
          onDragEnd: handleSheetDragEnd,
        }
      : {}

  const desktopMotion = {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 8 },
    transition: { type: "spring" as const, stiffness: 380, damping: 32 },
  }

  const mobileMotionReduce = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  }

  const mobileMotionFull = {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    transition: { type: "tween" as const, duration: 0.5, ease: SHEET_EASE },
  }

  const sheetMotion = !maxSm ? desktopMotion : reduceMotion ? mobileMotionReduce : mobileMotionFull

  return (
    <div className="pointer-events-none fixed inset-0 z-[301] flex min-h-[100dvh] w-full items-center justify-center max-sm:items-end">
      <motion.div
        ref={sheetRef}
        layout={false}
        className={cn(
          "pointer-events-auto relative z-[302] w-full max-w-lg max-h-[90vh]",
          "scrollbar-none max-sm:max-w-none max-sm:max-h-[min(95dvh,100%-env(safe-area-inset-top))]",
          maxSm ? "max-sm:overflow-y-auto" : "overflow-y-auto"
        )}
        {...sheetMotion}
        {...mobileDrag}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogSheetContext.Provider
          value={maxSm ? { startSheetDrag: (e) => dragControls.start(e) } : null}
        >
          {children}
        </DialogSheetContext.Provider>
      </motion.div>
    </div>
  )
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)
  const prefersReducedMotion = useReducedMotion()
  const reduceMotion = Boolean(prefersReducedMotion)
  const maxSm = useMaxSm()

  React.useLayoutEffect(() => {
    setMounted(true)
  }, [])

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

  const dialogTree = (
    <AnimatePresence>
      {open && (
        <>
          <DialogBackdrop
            key="dialog-backdrop"
            onOpenChange={onOpenChange}
            reduceMotion={reduceMotion}
          />
          <DialogSheet
            key="dialog-sheet"
            maxSm={maxSm}
            reduceMotion={reduceMotion}
            onOpenChange={onOpenChange}
          >
            {children}
          </DialogSheet>
        </>
      )}
    </AnimatePresence>
  )

  if (!mounted || typeof document === "undefined") {
    return null
  }

  return createPortal(dialogTree, document.body)
}

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps) {
  const sheet = React.useContext(DialogSheetContext)

  return (
    <div
      className={cn(
        "scrollbar-none bg-white rounded-xl shadow-lg p-6 w-full max-sm:rounded-t-[2rem] max-sm:rounded-b-none max-sm:p-5 max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        className
      )}
      {...props}
    >
      <div
        role="presentation"
        className="mx-auto mt-[-8px] flex cursor-grab touch-none select-none justify-center pb-4 pt-2 active:cursor-grabbing sm:hidden"
        onPointerDown={(e) => sheet?.startSheetDrag(e)}
      >
        <div className="h-1 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
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
        "absolute right-4 top-4 rounded-sm text-white/90 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/45 focus:ring-offset-2 focus:ring-offset-transparent",
        className
      )}
    >
      <X className="h-4 w-4 text-inherit" strokeWidth={2} />
      <span className="sr-only">Close</span>
    </button>
  )
}
