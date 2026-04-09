import type { MetadataRoute } from 'next'
import { PWA_THEME_COLOR_CONSOLE } from '@/lib/pwa-branding'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Conscious Spending Plan',
    short_name: 'Finance',
    description: 'Manage your finances with Ramit Sethi\'s Conscious Spending Plan',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: PWA_THEME_COLOR_CONSOLE,
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'View your finance dashboard',
        url: '/dashboard',
        icons: [{ src: '/icon.svg', sizes: '192x192' }],
      },
      {
        name: 'Expenses',
        short_name: 'Expenses',
        description: 'Track expenses',
        url: '/expenses',
        icons: [{ src: '/icon.svg', sizes: '192x192' }],
      },
      {
        name: 'Statement',
        short_name: 'Statement',
        description: 'View statement',
        url: '/statement',
        icons: [{ src: '/icon.svg', sizes: '192x192' }],
      },
    ],
  }
}
