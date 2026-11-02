import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// date helpers

export function daysUntilExpiry(date: Date | string): number {
  const d    = typeof date === 'string' ? new Date(date) : date
  const now  = new Date()
  const diff = d.getTime() - now.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function formatRelativeDate(date: Date | string): string {
  const days = daysUntilExpiry(date)
  if (days < 0)    return `${Math.abs(days)}d ago`
  if (days === 0)  return 'Today'
  if (days === 1)  return 'Tomorrow'
  if (days <= 7)   return `${days}d`
  if (days <= 30)  return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

// styling helpers

export function getExpiryColor(days: number): string {
  if (days < 0)    return 'text-orbit-critical'
  if (days === 0)  return 'text-orbit-critical'
  if (days <= 1)   return 'text-orbit-warning'
  if (days <= 3)   return 'text-orbit-warning'
  return 'text-orbit-success'
}

export function getExpiryBgColor(days: number): string {
  if (days < 0)    return 'bg-orbit-critical/10 border-orbit-critical/30'
  if (days <= 1)   return 'bg-orbit-warning/10 border-orbit-warning/30'
  if (days <= 3)   return 'bg-orbit-warning/8 border-orbit-warning/20'
  return 'bg-orbit-success/8 border-orbit-success/20'
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'hsl(0 85% 55%)'
    case 'high':     return 'hsl(45 100% 50%)'
    case 'medium':   return 'hsl(38 50% 58%)'
    case 'low':      return 'hsl(140 70% 50%)'
    default:         return 'hsl(38 8% 55%)'
  }
}

export function getPriorityBg(priority: string): string {
  return getPriorityColor(priority)
}

export function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'hsl(140 70% 50%)'
  if (score >= 60) return 'hsl(45 100% 50%)'
  if (score >= 40) return 'hsl(30 90% 55%)'
  return 'hsl(0 85% 55%)'
}

export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Service'
}

export function getBudgetStatus(spent: number, limit: number): 'safe' | 'warning' | 'exceeded' {
  const ratio = spent / limit
  if (ratio >= 1)   return 'exceeded'
  if (ratio >= 0.8) return 'warning'
  return 'safe'
}

// format helpers

export function formatCredits(n: number): string {
  return `${n} ◈`
}

export function formatCurrency(n: number): string {
  return `\u20b9${n.toFixed(2)}`
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function normalizeIngredientName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(fresh|chopped|minced|diced|organic|large|small|medium)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// file helpers

export function toBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => {
      const result = reader.result as string
      // Strip the data:xxx;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64 ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getCommunityKey(city: string, state: string): string {
  const c = (city || '').trim().toLowerCase().replace(/\s+/g, '-')
  const s = (state || '').trim().toLowerCase().replace(/\s+/g, '-')
  return `${c}_${s}`
}
