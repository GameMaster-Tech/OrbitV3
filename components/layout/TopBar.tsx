'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChevronDown, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { SmartCard } from '@/components/ui/SmartCard'
import { formatCredits } from '@/lib/utils'
import type { SmartCardData } from '@/types'

interface TopBarProps {
  title?: string
  subtitle?: string
  smartCards?: SmartCardData[]
  onDismissCard?: (id: string) => void
  walletBalance?: number
}

export function TopBar({ title, subtitle, smartCards = [], onDismissCard, walletBalance }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const router = useRouter()
  const { profile, signOut } = useAuthStore()
  const unread = smartCards.filter(c => !c.read).length
  const displayedCredits = walletBalance ?? profile?.creditBalance ?? 0

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  const handleSignOut = async () => {
    setUserOpen(false)
    await signOut()
    router.replace('/auth?mode=login')
  }

  return (
    <div className="topbar">
      {/* Left — page title */}
      <div className="flex-1 min-w-0 pl-10 md:pl-0">
        {title && (
          <h1 className="font-display text-lg font-semibold italic text-white leading-none tracking-wide">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="font-sans text-xs text-white/60 mt-0.5 leading-none">{subtitle}</p>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Credits */}
        {profile && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, hsl(243 72% 58% / 0.1), hsl(243 72% 58% / 0.06))',
              border: '1px solid hsl(243 72% 58% / 0.2)',
            }}>
            <div className="w-1.5 h-1.5 rounded-full bg-orbit-primary animate-pulse" />
            <span className="font-sans text-xs font-semibold text-orbit-primary">
              {formatCredits(displayedCredits)}
            </span>
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(v => !v); setUserOpen(false) }}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150"
            style={{ color: 'rgba(255,255,255,.76)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.12)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.76)' }}
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orbit-critical text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-80 z-40 max-h-96 overflow-y-auto"
                  style={{
                    background: 'hsl(var(--orbit-surface))',
                    border: '1px solid hsl(var(--orbit-border))',
                    borderRadius: 'var(--r-xl)',
                    boxShadow: '0 20px 60px rgba(20,14,8,0.18), 0 4px 16px rgba(20,14,8,0.08)',
                    padding: '14px',
                  }}
                >
                  <p className="section-label mb-3">Notifications</p>
                  {smartCards.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-10 h-10 rounded-2xl bg-orbit-elevated flex items-center justify-center mx-auto mb-2">
                        <Bell className="w-4 h-4 text-orbit-dim" />
                      </div>
                      <p className="font-sans text-sm text-orbit-muted">All clear</p>
                      <p className="font-sans text-xs text-orbit-dim mt-0.5">No active alerts</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {smartCards.slice(0, 5).map(card => (
                        <SmartCard key={card.id} card={card} onDismiss={onDismissCard} compact />
                      ))}
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen(v => !v); setNotifOpen(false) }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all duration-150 hover:bg-orbit-elevated"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, hsl(var(--orbit-primary)), hsl(var(--orbit-accent)))' }}>
              {initials}
            </div>
            {profile && (
              <span className="hidden sm:block font-sans text-sm font-medium text-orbit-text max-w-[90px] truncate">
                {profile.displayName?.split(' ')[0]}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-orbit-dim" />
          </button>

          <AnimatePresence>
            {userOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setUserOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-52 z-40"
                  style={{
                    background: 'hsl(var(--orbit-surface))',
                    border: '1px solid hsl(var(--orbit-border))',
                    borderRadius: 'var(--r-xl)',
                    boxShadow: '0 20px 60px rgba(20,14,8,0.18), 0 4px 16px rgba(20,14,8,0.08)',
                    padding: '8px',
                  }}
                >
                  {profile && (
                    <div className="px-3 py-2.5 mb-1" style={{ borderBottom: '1px solid hsl(var(--orbit-border))' }}>
                      <p className="font-sans text-sm font-semibold text-orbit-text">{profile.displayName}</p>
                      <p className="font-sans text-xs text-orbit-dim mt-0.5 truncate">{profile.email}</p>
                    </div>
                  )}
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-orbit-muted hover:text-orbit-text hover:bg-orbit-elevated transition-colors text-sm mt-1">
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </button>
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-orbit-critical hover:bg-orbit-critical/8 transition-colors text-sm">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
