import type { Metadata } from 'next'
import { IBM_Plex_Mono, DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { Toaster } from '@/components/ui/Toaster'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ORBIT - Life Command Center',
  description: 'Your autonomous domestic steward. Eliminate household cognitive load.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexMono.variable} ${playfair.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <AuthProvider>
          <Toaster>
            {children}
          </Toaster>
        </AuthProvider>
      </body>
    </html>
  )
}
