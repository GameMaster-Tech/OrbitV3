'use client'
import { useState, useEffect, useMemo } from 'react'
import { listenSmartCards, dismissSmartCard, addSmartCard } from '@/lib/firestore'
import { daysUntilExpiry } from '@/lib/utils'
import type { SmartCardData, InventoryItem, Budget } from '@/types'

export function useSmartCards(uid: string | undefined) {
  const [firestoreCards, setFirestoreCards] = useState<SmartCardData[]>([])

  useEffect(() => {
    if (!uid) return
    const unsub = listenSmartCards(uid, setFirestoreCards)
    return () => unsub()
  }, [uid])

  const dismiss = async (cardId: string) => {
    if (!uid) return
    await dismissSmartCard(uid, cardId)
  }

  const createCard = async (card: Omit<SmartCardData, 'id'>) => {
    if (!uid) return
    await addSmartCard(uid, card)
  }

  return { cards: firestoreCards, dismiss, createCard }
}

export function useDerivedSmartCards(
  items: InventoryItem[],
  budgets: Budget[],
): SmartCardData[] {
  return useMemo(() => {
    const cards: SmartCardData[] = []
    const now = new Date()
    const seen = new Set<string>()

    for (const item of items) {
      const itemValue = item.price ? item.price * item.quantity : null
      const valueStr  = itemValue ? ` worth ₹${itemValue.toFixed(2)}` : ''
      const lossStr   = itemValue ? ` Prevent a ₹${itemValue.toFixed(2)} loss.` : ''

      // food expiry
      if (item.tab === 'kitchen') {
        const expiry = item.adjustedExpiryDate ?? item.expiryDate
        if (expiry && !seen.has(`food_${item.id}`)) {
          const days = daysUntilExpiry(expiry)
          seen.add(`food_${item.id}`)

          // Build the Orbit predicted expiry suffix if available
          const orbitSuffix = item.orbitPredictedExpiry
            ? ` Orbit predicts actual expiry: ${new Date(item.orbitPredictedExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${item.orbitPredictedReason ? ` (${item.orbitPredictedReason})` : ''}.`
            : ''

          if (days < 0) {
            cards.push({
              id: `expired_${item.id}`, type: 'expired', priority: 'high',
              title: 'Item Expired',
              message: `${item.productName}${valueStr} expired ${Math.abs(days)}d ago. Remove or check if still usable.${orbitSuffix}`,
              itemId: item.id,
              actions: [{ label: 'Remove', type: 'fix', href: '/inventory' }, { label: 'Dismiss', type: 'ignore' }],
              timestamp: now,
            })
          } else if (days === 0) {
            cards.push({
              id: `expiring_today_${item.id}`, type: 'expiring', priority: 'critical',
              title: 'Expiring Today',
              message: `Your ${item.productName}${valueStr} expires today.${lossStr} Use it now or list on SwapSync.${orbitSuffix}`,
              itemId: item.id,
              actions: [{ label: 'Swap', type: 'view', href: '/swapsync' }, { label: 'Dismiss', type: 'ignore' }],
              timestamp: now,
            })
          } else if (days <= 3) {
            cards.push({
              id: `expiring_soon_${item.id}`, type: 'expiring', priority: 'high',
              title: 'Expiring Soon',
              message: `Your ${item.productName}${valueStr} expires in ${days}d.${lossStr} Plan a meal or list on SwapSync.${orbitSuffix}`,
              itemId: item.id,
              actions: [{ label: 'Swap', type: 'view', href: '/swapsync' }, { label: 'Snooze', type: 'snooze' }],
              timestamp: now,
            })
          } else if (days <= 7) {
            cards.push({
              id: `expiring_week_${item.id}`, type: 'expiring', priority: 'medium',
              title: 'Use This Week',
              message: `${item.productName}${valueStr} expires in ${days}d. Add it to your meal plan.${orbitSuffix}`,
              itemId: item.id,
              actions: [{ label: 'View', type: 'view', href: '/inventory' }, { label: 'Snooze', type: 'snooze' }],
              timestamp: now,
            })
          }
        }
      }

      // warranty checks
      if ((item.tab === 'electronics' || item.tab === 'appliances') && item.warrantyExpiry) {
        const key = `warranty_${item.id}`
        if (!seen.has(key)) {
          seen.add(key)
          const days = daysUntilExpiry(item.warrantyExpiry)
          const deviceLabel = item.brand ? `${item.brand} ${item.productName}` : item.productName

          if (days < 0) {
            cards.push({
              id: key, type: 'deviceService', priority: 'medium',
              title: 'Warranty Expired',
              message: `Warranty on your ${deviceLabel} expired ${Math.abs(days)}d ago. Consider extended coverage.`,
              itemId: item.id,
              actions: [{ label: 'View Device', type: 'view', href: '/inventory' }, { label: 'Dismiss', type: 'ignore' }],
              timestamp: now,
            })
          } else if (days <= 30) {
            cards.push({
              id: key, type: 'deviceService', priority: 'high',
              title: 'Warranty Expiring',
              message: `Warranty on your ${deviceLabel} expires in ${days}d. Back up data and consider renewal.`,
              itemId: item.id,
              actions: [{ label: 'View Device', type: 'view', href: '/inventory' }, { label: 'Snooze', type: 'snooze' }],
              timestamp: now,
            })
          } else if (days <= 90) {
            cards.push({
              id: key, type: 'deviceService', priority: 'low',
              title: 'Warranty Ending Soon',
              message: `${deviceLabel} warranty expires in ${days}d. Plan for renewal or extended coverage.`,
              itemId: item.id,
              actions: [{ label: 'View Device', type: 'view', href: '/inventory' }, { label: 'Snooze', type: 'snooze' }],
              timestamp: now,
            })
          }
        }
      }

      // document renewal
      if (item.tab === 'documents' && item.expiryDate) {
        const key = `doc_${item.id}`
        if (!seen.has(key)) {
          seen.add(key)
          const days = daysUntilExpiry(item.expiryDate)

          if (days < 0) {
            cards.push({
              id: key, type: 'system', priority: 'critical',
              title: 'Document Expired',
              message: `Your ${item.productName} expired ${Math.abs(days)}d ago. Renew immediately to avoid legal issues.`,
              itemId: item.id,
              actions: [{ label: 'View Document', type: 'view', href: '/inventory' }, { label: 'Dismiss', type: 'ignore' }],
              timestamp: now,
            })
          } else if (days <= 30) {
            cards.push({
              id: key, type: 'system', priority: 'critical',
              title: 'Document Expiring',
              message: `Your ${item.productName} expires in ${days}d. Renew now to avoid disruption.`,
              itemId: item.id,
              actions: [{ label: 'View Document', type: 'view', href: '/inventory' }, { label: 'Snooze', type: 'snooze' }],
              timestamp: now,
            })
          } else if (days <= 90) {
            cards.push({
              id: key, type: 'system', priority: 'high',
              title: 'Document Renewal Due',
              message: `${item.productName} expires in ${days}d. Schedule renewal soon.`,
              itemId: item.id,
              actions: [{ label: 'View Document', type: 'view', href: '/inventory' }, { label: 'Snooze', type: 'snooze' }],
              timestamp: now,
            })
          }
        }
      }
    }

    // budget alerts
    for (const budget of budgets) {
      const ratio = budget.spent / budget.limit
      if (ratio >= 1) {
        cards.push({
          id: `budget_exceeded_${budget.id}`, type: 'budgetAllocation', priority: 'high',
          title: 'Budget Exceeded',
          message: `${budget.category} budget exceeded by ${Math.round((ratio - 1) * 100)}% this ${budget.period}.`,
          actions: [{ label: 'Review', type: 'view', href: '/wallet' }],
          timestamp: now,
        })
      } else if (ratio >= 0.8) {
        cards.push({
          id: `budget_warning_${budget.id}`, type: 'budgetAllocation', priority: 'medium',
          title: 'Budget Warning',
          message: `${budget.category} budget is at ${Math.round(ratio * 100)}% of ${budget.period} limit.`,
          actions: [{ label: 'View Budget', type: 'view', href: '/wallet' }, { label: 'Dismiss', type: 'ignore' }],
          timestamp: now,
        })
      }
    }

    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return cards.sort((a, b) => order[a.priority] - order[b.priority])
  }, [items, budgets])
}
