'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Mail, Lock, User, MapPin, Eye, EyeOff,
  ArrowRight, CheckCircle, Loader, Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// validation schemas
const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'At least 6 characters'),
})
const signupSchema = z.object({
  displayName: z.string().min(2, 'At least 2 characters'),
  email:       z.string().email('Invalid email address'),
  password:    z.string().min(8, 'At least 8 characters'),
  city:        z.string().min(2, 'City is required'),
  state:       z.string().min(2, 'State is required'),
})
type LoginForm  = z.infer<typeof loginSchema>
type SignupForm = z.infer<typeof signupSchema>

// input field
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ComponentType<{ className?: string }>
  label: string
  error?: string
  showToggle?: boolean
  showPw?: boolean
  onTogglePw?: () => void
}

const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ icon: Icon, label, error, type = 'text', showToggle, showPw, onTogglePw, ...props }, ref) => (
    <div>
      <label className="font-sans text-xs font-semibold text-orbit-muted mb-1.5 block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orbit-dim" />
        <input
          ref={ref}
          type={showToggle ? (showPw ? 'text' : 'password') : type}
          className={cn(
            'orbit-input pl-10',
            error && 'border-orbit-critical/50 focus:border-orbit-critical/60'
          )}
          {...props}
        />
        {showToggle && (
          <button type="button" onClick={onTogglePw}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-orbit-dim hover:text-orbit-muted transition-colors">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="font-sans text-xs text-orbit-critical mt-1">{error}</p>}
    </div>
  )
)
Field.displayName = 'Field'

// google icon
function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function AuthPage() {
  return <Suspense><AuthContent /></Suspense>
}

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  )
  const [showPw, setShowPw] = useState(false)

  const { user, isLoading, error, clearError, signInWithGoogle, signInWithEmail, signUp } = useAuthStore()

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: '', email: '', password: '', city: '', state: '' },
  })

  const handleLogin  = async (d: LoginForm)  => { clearError(); await signInWithEmail(d.email, d.password) }
  const handleSignup = async (d: SignupForm) => { clearError(); await signUp(d.email, d.password, d.displayName, d.city, d.state) }

  const switchMode = (m: 'login' | 'signup') => { setMode(m); clearError(); loginForm.reset(); signupForm.reset() }

  const PERKS = ['Track inventory & expiry', 'AI health conflict detection', 'Budget alerts & insights', 'Community SwapSync marketplace']

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, hsl(243 72% 58%) 0%, hsl(270 62% 50%) 50%, hsl(22 90% 56%) 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, white, transparent)' }} />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, white, transparent)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="font-display text-white text-lg italic font-bold">O</span>
            </div>
            <span className="font-display text-2xl italic text-white tracking-wide">Orbit</span>
          </div>

          <h2 className="font-display text-4xl font-bold italic text-white leading-tight mb-4">
            Your home,<br />intelligently<br />managed.
          </h2>
          <p className="font-sans text-white/70 text-sm leading-relaxed mb-10">
            The AI-powered household command center that tracks everything, warns you about everything, and saves you money.
          </p>

          <div className="space-y-3">
            {PERKS.map((perk, i) => (
              <motion.div key={perk} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
                <span className="font-sans text-sm text-white/85">{perk}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative z-10 font-sans text-xs text-white/40">(c) 2026 Orbit. All rights reserved.</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #818CF8, #6366F1)' }}>
              <span className="font-display text-white text-sm italic font-bold">O</span>
            </div>
            <span className="font-display text-xl italic text-orbit-text">Orbit</span>
          </div>

          {/* Header */}
          <div className="mb-7">
            <h1 className="font-sans text-2xl font-bold text-orbit-text">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="font-sans text-sm text-orbit-muted mt-1">
              {mode === 'login'
                ? 'Sign in to your household dashboard'
                : 'Start managing your home smarter today'}
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-4 py-3 rounded-xl bg-orbit-critical/8 border border-orbit-critical/20 font-sans text-sm text-orbit-critical">
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google */}
          <button onClick={signInWithGoogle} disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-orbit-border bg-orbit-surface hover:bg-orbit-elevated hover:border-orbit-primary/30 transition-all font-sans text-sm font-medium text-orbit-text mb-5 disabled:opacity-50">
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-orbit-border" />
            <span className="font-sans text-xs text-orbit-dim">or continue with email</span>
            <div className="flex-1 h-px bg-orbit-border" />
          </div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form key="login"
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}
                onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <Field icon={Mail} label="Email address" type="email" placeholder="you@example.com"
                  autoComplete="email" error={loginForm.formState.errors.email?.message}
                  {...loginForm.register('email')} />
                <Field icon={Lock} label="Password" showToggle showPw={showPw}
                  onTogglePw={() => setShowPw(v => !v)} placeholder="Your password"
                  autoComplete="current-password" error={loginForm.formState.errors.password?.message}
                  {...loginForm.register('password')} />
                <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-sm gap-2 mt-2">
                  {isLoading
                    ? <><Loader className="w-4 h-4 animate-spin" /> Signing in...</>
                    : <>Sign in <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </motion.form>
            ) : (
              <motion.form key="signup"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}
                onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <Field icon={User} label="Full name" placeholder="Jane Smith"
                  autoComplete="name" error={signupForm.formState.errors.displayName?.message}
                  {...signupForm.register('displayName')} />
                <Field icon={Mail} label="Email address" type="email" placeholder="you@example.com"
                  autoComplete="email" error={signupForm.formState.errors.email?.message}
                  {...signupForm.register('email')} />
                <Field icon={Lock} label="Password" showToggle showPw={showPw}
                  onTogglePw={() => setShowPw(v => !v)} placeholder="8+ characters"
                  autoComplete="new-password" error={signupForm.formState.errors.password?.message}
                  {...signupForm.register('password')} />
                <div className="grid grid-cols-2 gap-3">
                  <Field icon={MapPin} label="City" placeholder="New York"
                    error={signupForm.formState.errors.city?.message}
                    {...signupForm.register('city')} />
                  <Field icon={MapPin} label="State" placeholder="NY"
                    error={signupForm.formState.errors.state?.message}
                    {...signupForm.register('state')} />
                </div>
                <p className="font-sans text-xs text-orbit-dim -mt-1">
                  Location is used for the community SwapSync marketplace
                </p>
                <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-sm gap-2 mt-2">
                  {isLoading
                    ? <><Loader className="w-4 h-4 animate-spin" /> Creating account...</>
                    : <>Create account <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          
          {/* Demo option */}
          <button
            type="button"
            onClick={() => router.push('/demo')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 font-sans text-sm font-semibold transition-all mt-4 mb-2"
          >
            <Sparkles className="w-4 h-4" />
            Try Interactive Demo Mode
          </button>
          {/* Switch mode */}
          <p className="font-sans text-sm text-orbit-muted text-center mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="font-semibold text-orbit-primary hover:text-orbit-primary/80 transition-colors">
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          <p className="font-sans text-xs text-orbit-dim text-center mt-4">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  )
}


