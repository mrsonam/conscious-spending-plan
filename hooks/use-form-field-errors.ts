"use client"

import { useCallback, useState } from "react"
import type { FieldErrors } from "@/lib/form-validation"
import { clearFieldErrorKey } from "@/lib/form-validation"

export function useFormFieldErrors<K extends string>() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<K>>({})

  const clearFieldError = useCallback((key: K) => {
    setFieldErrors((prev) => clearFieldErrorKey(prev, key))
  }, [])

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({})
  }, [])

  return {
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFieldErrors,
  }
}
