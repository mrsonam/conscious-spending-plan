/** Shared palette for Wealth Console (bento) shell, sidebar, headers, cards. */
export const TOKENS = {
  surface: "#0b1326",
  surfaceLow: "#131b2e",
  surfaceContainer: "#171f33",
  surfaceHigh: "#1e2740",
  onSurface: "#dae2fd",
  onSurfaceMuted: "rgba(218, 226, 253, 0.55)",
  /** Stronger muted for small type on surfaceContainer (≥4.5:1 on #171f33). */
  onSurfaceMutedElevated: "rgba(218, 226, 253, 0.68)",
  outlineGhost: "rgba(218, 226, 253, 0.12)",
  primary: "#4edea3",
  secondary: "#89ceff",
  tertiary: "#b9c8de",
  loss: "#ffb4ab",
  warning: "#e8c547",
  /** Text on mint primary surfaces (projection CTA, etc.). */
  onPrimary: "#f0fdf4",
  onPrimaryMuted: "rgba(11, 19, 38, 0.55)",
  onPrimarySubtle: "rgba(11, 19, 38, 0.68)",
} as const

export const CARD_INSET = "inset 0 1px 0 0 rgba(218,226,253,0.06)" as const

/** Rows per page for console transaction tables (income, expenses, statements). */
export const CONSOLE_TABLE_PAGE_SIZE = 12
