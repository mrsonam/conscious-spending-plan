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
        src: '/next.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/next.svg',
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
        icons: [{ src: '/next.svg', sizes: '192x192' }],
      },
      {
        name: 'Expenses',
        short_name: 'Expenses',
        description: 'Track expenses',
        url: '/dashboard/expenses',
        icons: [{ src: '/next.svg', sizes: '192x192' }],
      },
      {
        name: 'Statement',
        short_name: 'Statement',
        description: 'View statement',
        url: '/dashboard/statement',
        icons: [{ src: '/next.svg', sizes: '192x192' }],
      },
    ],
  }
}
