'use client'
import { cn } from '@/lib/utils'

interface SystemPulseProps {
  isActive?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'accent' | 'neural' | 'success' | 'warning'
  label?: string
  className?: string
}

const colorMap: Record<string, string> = {
  primary: 'bg-orbit-primary',
  accent:  'bg-orbit-accent',
  neural:  'bg-orbit-neural',
  success: 'bg-orbit-success',
  warning: 'bg-orbit-warning',
}

const textColorMap: Record<string, string> = {
  primary: 'text-orbit-primary',
  accent:  'text-orbit-accent',
  neural:  'text-orbit-neural',
  success: 'text-orbit-success',
  warning: 'text-orbit-warning',
}

const sizes = {
  sm: { dot: 'w-1.5 h-1.5', label: 'text-[9px]' },
  md: { dot: 'w-2 h-2',     label: 'text-[10px]' },
  lg: { dot: 'w-2.5 h-2.5', label: 'text-xs' },
}

export function SystemPulse({
  isActive = true,
  size = 'md',
  color = 'primary',
  label,
  className,
}: SystemPulseProps) {
  const s = sizes[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'rounded-full',
        s.dot,
        isActive ? colorMap[color] : 'bg-orbit-dim',
        isActive && 'animate-pulse-glow'
      )} />
      {label && (
        <span className={cn(
          'font-mono font-medium tracking-wider uppercase',
          s.label,
          isActive ? textColorMap[color] : 'text-orbit-dim'
        )}>
          {label}
        </span>
      )}
    </div>
  )
}
