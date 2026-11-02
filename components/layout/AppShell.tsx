'use client'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { SmartCardData } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  smartCards?: SmartCardData[]
  onDismissCard?: (id: string) => void
  walletBalance?: number
}

export function AppShell({ children, title, subtitle, smartCards, onDismissCard, walletBalance }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="topbar-wrap shrink-0">
          <TopBar title={title} subtitle={subtitle} smartCards={smartCards} onDismissCard={onDismissCard} walletBalance={walletBalance} />
        </div>
        <main className="flex-1 overflow-y-auto px-5 pt-5 pb-10 md:px-7">
          {children}
        </main>
      </div>
    </div>
  )
}
