import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/hooks/useAuth'
import './globals.css'

export const metadata: Metadata = {
  title: '現場レポート',
  description: '現場作業のエビデンスをすばやく記録・共有',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black', title: '現場レポート' },
}
export const viewport: Viewport = {
  themeColor: '#1a1916',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head><link rel="apple-touch-icon" href="/icon-192.png" /></head>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  )
}
