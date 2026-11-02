'use client'
import { useState, memo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Package, Heart, Wallet,
  RefreshCw, FlaskConical, ChevronRight,
  LogOut, Menu, X, MessageSquare, ChefHat, BookOpen, Handshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

type NavCategory = { label: string; tab: string }
type NavItemConfig = {
  href: string
  icon: typeof LayoutDashboard
  label: string
  categories?: NavCategory[]
}

const INVENTORY_CATEGORIES: NavCategory[] = [
  { label: 'Kitchen & Groceries', tab: 'kitchen' },
  { label: 'Electronics', tab: 'electronics' },
  { label: 'Appliances', tab: 'appliances' },
  { label: 'Documents', tab: 'documents' },
]

const NAV_ITEMS: NavItemConfig[] = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inventory',  icon: Package,         label: 'Inventory', categories: INVENTORY_CATEGORIES },
  { href: '/health',     icon: Heart,           label: 'Health'     },
  { href: '/wallet',     icon: Wallet,          label: 'Wallet'     },
  { href: '/swapsync',   icon: RefreshCw,       label: 'SwapSync'   },
  { href: '/smart-pairing', icon: Handshake,    label: 'Smart Pairing' },
  { href: '/assistant',  icon: MessageSquare,   label: 'Assistant'  },
  { href: '/get-flavored', icon: ChefHat,       label: 'Get Flavored' },
  { href: '/library',    icon: BookOpen,        label: 'Library'    },
  { href: '/sandbox',    icon: FlaskConical,    label: 'Household Sim' },
]

const NavItem = memo(function NavItem({ item, expanded, active, onNavigate }: {
  item: NavItemConfig; expanded: boolean; active: boolean; onNavigate: () => void
}) {
  const Icon = item.icon
  return (
    <div className="relative group/navitem">
      <Link href={item.href} onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex items-center gap-3 rounded-xl transition-all duration-150 group',
          expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
          active ? 'text-white' : 'text-[#C8D0E8] hover:text-white'
        )}>
        {/* Active bg */}
        {active && (
          <motion.div layoutId="nav-active-bg"
            className="absolute inset-0 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #818CF8, #6366F1)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
        )}
        {/* Hover bg */}
        {!active && (
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ background: 'rgba(99,102,241,0.08)' }} />
        )}

        <Icon className="w-[18px] h-[18px] shrink-0 relative z-10" strokeWidth={active ? 2.2 : 1.8} />

        <AnimatePresence>
          {expanded && (
            <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
              className="font-sans text-sm font-medium whitespace-nowrap overflow-hidden relative z-10">
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {!expanded && !item.categories && (
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 shadow-xl whitespace-nowrap text-xs font-medium"
            style={{ background: '#3A3B42', color: '#A1A1AA', border: '1px solid #4A4B52' }}>
            {item.label}
          </div>
        )}
      </Link>

      {item.categories && (
        <div
          className={cn(
            'absolute left-full ml-1 z-50 w-52 rounded-xl border p-2 shadow-xl opacity-0 pointer-events-none group-hover/navitem:opacity-100 group-hover/navitem:pointer-events-auto group-focus-within/navitem:opacity-100 group-focus-within/navitem:pointer-events-auto transition-all',
            expanded ? 'top-0' : 'top-1/2 -translate-y-1/2',
          )}
          style={{ background: '#1A1F2E', borderColor: '#2A3050' }}
        >
          <p className="font-sans text-[10px] uppercase tracking-wide mb-2 px-1" style={{ color: '#7F8DB0' }}>
            Inventory Categories
          </p>
          <div className="flex flex-col gap-1">
            {item.categories.map((category) => (
              <Link
                key={category.tab}
                href={`/inventory?tab=${category.tab}`}
                onClick={onNavigate}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: '#CDD6EE' }}
                onMouseEnter={(event) => { event.currentTarget.style.background = 'rgba(129,140,248,0.18)' }}
                onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent' }}
              >
                {category.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export function Sidebar() {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { user, profile, signOut } = useAuthStore()

  const handleSignOut = async () => {
    setMobileOpen(false)
    await signOut()
    router.push('/auth?mode=login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full py-1">
      {/* Logo */}
      <div className={cn('mb-7', expanded ? 'px-3' : 'flex justify-center')}>
        <AnimatePresence mode="wait">
          {expanded ? (
            <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <span className="font-display text-2xl italic font-bold tracking-wide"
                style={{ background: 'linear-gradient(135deg, #fff 0%, hsl(231 84% 77%) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Orbit
              </span>
              <div className="h-0.5 w-8 mt-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, hsl(231 84% 67%), hsl(221 83% 53%))' }} />
            </motion.div>
          ) : (
            <motion.div key="mini" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #818CF8, #6366F1)' }}>
                <span className="font-display text-white text-sm italic font-bold">O</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(item => (
          <NavItem key={item.href} item={item} expanded={expanded}
            active={pathname.startsWith(item.href)} onNavigate={() => setMobileOpen(false)} />
        ))}
      </nav>

      {/* Divider */}
      <div className="my-3 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* User */}
      {user && (
        <div className={cn('flex items-center gap-2.5', expanded ? 'px-1' : 'justify-center')}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #818CF8, #6366F1)' }}>
            {(profile?.displayName ?? user.displayName ?? user.email ?? 'U').charAt(0).toUpperCase()}
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="font-sans text-xs font-semibold truncate" style={{ color: 'hsl(220 25% 90%)' }}>{profile?.displayName ?? user.displayName ?? 'Orbit account'}</p>
                <p className="font-sans text-[10px] truncate" style={{ color: 'hsl(220 20% 60%)' }}>{profile?.location?.city || user.email || 'Profile unavailable'}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {expanded && (
            <button onClick={handleSignOut} aria-label="Sign out"
              className="p-1 rounded-lg transition-colors ml-auto"
              style={{ color: 'hsl(220 20% 60%)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'hsl(4 82% 65%)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'hsl(220 20% 60%)')}
              title="Sign Out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop floating dark sidebar */}
      <div className="hidden md:flex items-stretch py-4 pl-4 shrink-0">
        <motion.aside
          animate={{ width: expanded ? 210 : 60 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="relative flex flex-col overflow-visible sidebar-panel"
          style={{ padding: '16px 10px', background: 'var(--sidebar)', borderRadius: '20px', border: '1px solid var(--sidebar-b)', boxShadow: '6px 0 32px rgba(35,45,79,.28)' }}
        >
          <button onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={expanded}
            className="absolute -right-3 top-8 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-lg transition-all"
            style={{ background: '#1A1F2E', border: '1px solid #2A3050', color: '#6B7A9C' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'hsl(220 15% 55%)')}>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22 }}>
              <ChevronRight className="w-3 h-3" />
            </motion.div>
          </button>
          {sidebarContent}
        </motion.aside>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <button onClick={() => setMobileOpen(true)} aria-label="Open navigation menu"
          className="fixed top-4 left-4 z-50 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: 'var(--sidebar)', border: '1px solid var(--sidebar-b)', color: '#D6DEFC' }}>
          <Menu className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
              <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed top-0 left-0 h-full w-64 z-50 p-4 flex flex-col"
                style={{ background: 'var(--sidebar)', borderRadius: '20px', border: '1px solid var(--sidebar-b)', boxShadow: '0 8px 40px rgba(35,45,79,.4)' }}>
                <button onClick={() => setMobileOpen(false)} aria-label="Close navigation menu"
                  className="absolute top-4 right-4 p-1 rounded-lg transition-colors"
                  style={{ color: 'hsl(220 20% 60%)' }}>
                  <X className="w-4 h-4" />
                </button>
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

