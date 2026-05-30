import { toast } from "sonner"

import { TOKENS } from "@/lib/wealth-console-tokens"

const toastStyle = {
  background: TOKENS.surfaceContainer,
  border: `1px solid ${TOKENS.outlineGhost}`,
  color: TOKENS.onSurface,
  boxShadow: "inset 0 1px 0 0 rgba(218,226,253,0.06), 0 12px 40px rgba(0,0,0,0.45)",
} as const

export function toastSuccess(message: string) {
  toast.success(message, { style: toastStyle })
}

export function toastError(message: string) {
  toast.error(message, { style: toastStyle })
}

export function toastLoading(message: string) {
  return toast.loading(message, { style: toastStyle })
}

export function toastUpdate(
  id: string | number,
  message: string,
  type: "success" | "error"
) {
  if (type === "success") {
    toast.success(message, { id, style: toastStyle })
  } else {
    toast.error(message, { id, style: toastStyle })
  }
}
