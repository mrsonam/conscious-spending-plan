import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Conscious Spending Plan',
    short_name: 'Finance',
    description: 'Manage your finances with Ramit Sethi\'s Conscious Spending Plan',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6366f1',
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
        url: '/classic/dashboard',
        icons: [{ src: '/icon.svg', sizes: '192x192' }],
      },
      {
        name: 'Expenses',
        short_name: 'Expenses',
        description: 'Track expenses',
        url: '/classic/expenses',
        icons: [{ src: '/icon.svg', sizes: '192x192' }],
      },
      {
        name: 'Statement',
        short_name: 'Statement',
        description: 'View statement',
        url: '/classic/statement',
        icons: [{ src: '/icon.svg', sizes: '192x192' }],
      },
    ],
  }
}
