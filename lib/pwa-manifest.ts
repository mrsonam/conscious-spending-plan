import type { MetadataRoute } from "next"
import { PWA_THEME_COLOR_CONSOLE } from "@/lib/pwa-branding"

export const PWA_ICON_SVG = "/icon.svg"
export const PWA_ICON_192 = "/icon-192.png"
export const PWA_ICON_512 = "/icon-512.png"

const PWA_ICONS: MetadataRoute.Manifest["icons"] = [
  {
    src: PWA_ICON_SVG,
    sizes: "any",
    type: "image/svg+xml",
    purpose: "any",
  },
  {
    src: PWA_ICON_192,
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: PWA_ICON_512,
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: PWA_ICON_512,
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
]

const SHORTCUT_ICON = {
  src: PWA_ICON_192,
  sizes: "192x192",
  type: "image/png",
} as const

export function buildPwaManifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Conscious Spending Plan",
    short_name: "CSP",
    description:
      "Manage your finances with Ramit Sethi's Conscious Spending Plan",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: PWA_THEME_COLOR_CONSOLE,
    theme_color: PWA_THEME_COLOR_CONSOLE,
    orientation: "any",
    icons: PWA_ICONS,
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "View your finance dashboard",
        url: "/dashboard",
        icons: [SHORTCUT_ICON],
      },
      {
        name: "Expenses",
        short_name: "Expenses",
        description: "Track expenses",
        url: "/expenses",
        icons: [SHORTCUT_ICON],
      },
      {
        name: "Statement",
        short_name: "Statement",
        description: "View statement",
        url: "/statement",
        icons: [SHORTCUT_ICON],
      },
    ],
  }
}
