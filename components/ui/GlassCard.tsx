'use client'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva('card', {
  variants: {
    size: {
      sm: 'card-sm',
      md: 'card-md',
      lg: 'card-lg',
    },
    interactive: {
      true:  'card-hover cursor-pointer',
      false: '',
    },
  },
  defaultVariants: { size: 'md', interactive: false },
})

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  children: React.ReactNode
  accent?: 'blue' | 'purple' | 'amber' | 'green' | 'red' | 'indigo' | 'coral'
}

export function GlassCard({ className, size, interactive, accent, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        cardVariants({ size, interactive }),
        accent && `card-accent-${accent}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
