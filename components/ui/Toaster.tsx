'use client'
import { useState, createContext, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextType {
  toast: (opts: Omit<Toast, 'id'>) => void
  success: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside Toaster')
  return ctx
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4" />,
  error:   <XCircle    className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info:    <Info       className="w-4 h-4" />,
}

const colors: Record<ToastType, string> = {
  success: 'text-orbit-success border-orbit-success/30 bg-orbit-success/10',
  error:   'text-orbit-critical border-orbit-critical/30 bg-orbit-critical/10',
  warning: 'text-orbit-warning border-orbit-warning/30 bg-orbit-warning/10',
  info:    'text-orbit-primary border-orbit-primary/30 bg-orbit-primary/10',
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...opts, id }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const contextValue: ToastContextType = {
    toast:   addToast,
    success: (title, msg) => addToast({ type: 'success', title, message: msg }),
    error:   (title, msg) => addToast({ type: 'error',   title, message: msg }),
    warning: (title, msg) => addToast({ type: 'warning', title, message: msg }),
    info:    (title, msg) => addToast({ type: 'info',    title, message: msg }),
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'rounded-xl p-3 flex items-start gap-3 pointer-events-auto border',
                colors[t.type]
              )}
              style={{ background: 'var(--surface)', boxShadow: '0 8px 32px rgba(15,17,23,0.15)' }}
            >
              <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-xs font-bold">{t.title}</p>
                {t.message && <p className="font-sans text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>{t.message}</p>}
              </div>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 transition-colors"
                style={{ color: 'var(--dim)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
