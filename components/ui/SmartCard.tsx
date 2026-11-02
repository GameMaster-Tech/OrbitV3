'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Clock, DollarSign, Heart, Zap,
  ChefHat, RefreshCw, X, Wrench, Info, ShieldAlert,
  TrendingDown, ArrowRight, Handshake,
} from 'lucide-react'
import { cn, formatRelativeDate } from '@/lib/utils'
import type { SmartCardData, SmartCardType } from '@/types'

const TYPE_CONFIG: Record<SmartCardType, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  expiring:         { icon: Clock,         label: 'Expiring'    },
  expired:          { icon: AlertTriangle, label: 'Expired'     },
  budget:           { icon: DollarSign,    label: 'Budget'      },
  budgetAllocation: { icon: TrendingDown,  label: 'Budget'      },
  conflict:         { icon: ShieldAlert,   label: 'Conflict'    },
  healthConflict:   { icon: Heart,         label: 'Health'      },
  oracle:           { icon: Zap,           label: 'Insight'     },
  swap:             { icon: RefreshCw,     label: 'SwapSync'    },
  deviceService:    { icon: Wrench,        label: 'Device'      },
  recipe:           { icon: ChefHat,       label: 'Recipe'      },
  pairing:          { icon: Handshake,     label: 'Pairing'     },
  system:           { icon: Info,          label: 'System'      },
}

const PRIORITY_CONFIG = {
  critical: {
    bar:    'bg-orbit-critical',
    icon:   'text-orbit-critical',
    badge:  'bg-orbit-critical/10 text-orbit-critical',
    border: 'border-orbit-critical/20',
    bg:     'bg-orbit-critical/4',
    label:  'Critical',
  },
  high: {
    bar:    'bg-orbit-warning',
    icon:   'text-orbit-warning',
    badge:  'bg-orbit-warning/10 text-orbit-warning',
    border: 'border-orbit-warning/20',
    bg:     'bg-orbit-warning/4',
    label:  'High',
  },
  medium: {
    bar:    'bg-orbit-primary',
    icon:   'text-orbit-primary',
    badge:  'bg-orbit-primary/10 text-orbit-primary',
    border: 'border-orbit-primary/20',
    bg:     'bg-orbit-primary/4',
    label:  'Medium',
  },
  low: {
    bar:    'bg-orbit-dim',
    icon:   'text-orbit-dim',
    badge:  'bg-orbit-elevated text-orbit-muted',
    border: 'border-orbit-border',
    bg:     'bg-orbit-surface',
    label:  'Low',
  },
}

interface SmartCardProps {
  card: SmartCardData
  onDismiss?: (id: string) => void
  compact?: boolean
}

export function SmartCard({ card, onDismiss, compact = false }: SmartCardProps) {
  const router = useRouter()
  const p = PRIORITY_CONFIG[card.priority] ?? PRIORITY_CONFIG.low
  const t = TYPE_CONFIG[card.type] ?? TYPE_CONFIG.system
  const Icon = t.icon

  const handleAction = (type: string, href?: string) => {
    if (href) router.push(href)
    if (type === 'ignore' || type === 'snooze') onDismiss?.(card.id)
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className={cn('flex items-start gap-2.5 p-3 rounded-xl border', p.bg, p.border)}
      >
        <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5', p.badge)}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sans text-xs font-semibold text-orbit-text truncate">{card.title}</p>
          <p className="font-sans text-[11px] text-orbit-muted mt-0.5 line-clamp-2">{card.message}</p>
        </div>
        {onDismiss && (
          <button onClick={() => onDismiss(card.id)} className="text-orbit-dim hover:text-orbit-muted transition-colors shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={cn('relative overflow-hidden rounded-2xl border', p.bg, p.border)}
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
    >
      {/* Priority bar — left edge */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl', p.bar)} />

      <div className="pl-4 pr-4 py-3.5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Icon bubble */}
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', p.badge)}>
            <Icon className="w-3.5 h-3.5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-sans text-sm font-semibold text-orbit-text truncate">{card.title}</p>
                <span className={cn('shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full', p.badge)}>
                  {p.label}
                </span>
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(card.id)}
                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-orbit-dim hover:text-orbit-muted hover:bg-orbit-elevated transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="font-sans text-xs text-orbit-muted leading-relaxed">{card.message}</p>
          </div>
        </div>

        {/* Actions row */}
        {card.actions.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pl-11">
            {card.actions.slice(0, 2).map((action, i) => (
              <button
                key={i}
                onClick={() => handleAction(action.type, action.href)}
                className={cn(
                  'flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                  i === 0
                    ? cn('text-white', p.bar, 'hover:opacity-90')
                    : 'text-orbit-muted bg-orbit-elevated hover:text-orbit-text hover:bg-orbit-border'
                )}
              >
                {action.label}
                {i === 0 && <ArrowRight className="w-3 h-3" />}
              </button>
            ))}
            <span className="ml-auto font-sans text-[10px] text-orbit-dim">
              {formatRelativeDate(card.timestamp)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
