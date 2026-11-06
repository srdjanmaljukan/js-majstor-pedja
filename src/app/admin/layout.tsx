import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin',
  manifest: '/admin-manifest.json',
  robots: { index: false, follow: false },
  icons: { apple: '/admin-icon-192.png' },
  appleWebApp: { capable: true, title: 'Admin', statusBarStyle: 'black' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}