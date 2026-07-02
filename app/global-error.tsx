"use client"

import { useEffect } from "react"

// Catches errors thrown by the root layout itself. Must render its own
// <html>/<body> and cannot rely on app CSS, so styles are inline.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error boundary:", error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f14",
          color: "#e8edf5",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: "32px 28px",
            borderRadius: 16,
            border: "1px solid rgba(218,226,253,0.12)",
            background: "#121822",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(232,237,245,0.65)",
            }}
          >
            The app hit an unexpected error. Your data is safe. Reload to
            continue.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "rgba(232,237,245,0.45)",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              minHeight: 44,
              padding: "10px 24px",
              borderRadius: 12,
              border: "none",
              background: "#4edea3",
              color: "#0b0f14",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
