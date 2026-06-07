'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Check, Zap, Rocket, BarChart2, Bot, Gauge, Target, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  'Fetching page structure',
  'Generating ShipAudit Score',
  'Ranking performance issues',
  'Writing AI fix instructions',
]

const STEP_DELAYS_MS = [0, 3000, 22000, 30000]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Root ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([])

  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(-1)
  const [analyzingUrl, setAnalyzingUrl] = useState('')

  // Waitlist state (Coming Soon section)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    inputRef.current?.focus()
    return () => timerIds.current.forEach(clearTimeout)
  }, [])

  function clearTimers() {
    timerIds.current.forEach(clearTimeout)
    timerIds.current = []
  }

  function startProgress() {
    clearTimers()
    STEP_DELAYS_MS.forEach((delay, i) => {
      timerIds.current.push(setTimeout(() => setCurrentStep(i), delay))
    })
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || isLoading) return

    setError('')
    setIsLoading(true)
    setAnalyzingUrl(trimmed)
    startProgress()

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })

      const data: { reportId?: string; error?: string } = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error ?? 'Audit failed. Please try again.')
      }

      router.push(`/report/${data.reportId}`)
    } catch (err) {
      clearTimers()
      setIsLoading(false)
      setCurrentStep(-1)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function handleWaitlist(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(waitlistEmail) || waitlistStatus === 'loading') return

    setWaitlistStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail }),
      })
      if (!res.ok) throw new Error('Failed')
      setWaitlistStatus('success')
    } catch {
      setWaitlistStatus('error')
    }
  }

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] overflow-x-hidden flex flex-col">
      <AnimatedBackground />

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-400" />
          <span className="text-white font-bold text-lg tracking-tight">ShipAudit</span>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-medium text-indigo-400 border border-indigo-500/30"
          style={{ background: 'rgba(99,102,241,0.1)' }}
        >
          AI-Powered · Free
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-12">
        <div className="w-full max-w-2xl flex flex-col items-center text-center gap-7">

          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-indigo-500/30 text-indigo-400 text-xs font-medium"
            style={{
              background: 'rgba(99,102,241,0.08)',
              boxShadow: '0 0 12px rgba(99,102,241,0.18)',
            }}
          >
            ✦ AI Performance Engineer
          </motion.div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.18] tracking-tight">
            <HeadlineLine delay={0.1} color="text-zinc-100">
              Paste any URL and get an
            </HeadlineLine>
            <HeadlineLine delay={0.22} color="text-indigo-400">
              AI performance engineer
            </HeadlineLine>
            <HeadlineLine delay={0.34} color="text-white font-extrabold">
              in 30 seconds.
            </HeadlineLine>
          </h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="text-zinc-400 text-base sm:text-lg max-w-md leading-relaxed"
          >
            No account. No setup. Instant AI analysis of your site&apos;s performance —
            with a fix prompt ready to paste into Cursor.
          </motion.p>

          {/* Unified pill input */}
          <motion.form
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            onSubmit={handleSubmit}
            noValidate
            className="w-full"
          >
            <PillInput
              inputRef={inputRef}
              value={url}
              onChange={(v) => { setUrl(v); if (error) setError('') }}
              loading={isLoading}
              disabled={isLoading}
            />

            <AnimatePresence>
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 mt-3 text-sm text-red-400 overflow-hidden"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>

          {/* Social proof pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {[
              { icon: <Gauge className="w-3 h-3" />, label: '22s average analysis' },
              { icon: <Target className="w-3 h-3" />, label: 'Google CWV thresholds' },
              { icon: <Wrench className="w-3 h-3" />, label: 'Framework-aware fixes' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs"
              >
                <span className="text-zinc-500">{icon}</span>
                {label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Coming Soon section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="w-full max-w-2xl mt-20"
        >
          <ComingSoonCard
            email={waitlistEmail}
            setEmail={setWaitlistEmail}
            status={waitlistStatus}
            onSubmit={handleWaitlist}
          />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-zinc-900 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-zinc-700" />
            <span className="text-zinc-700 font-bold text-sm">ShipAudit</span>
          </div>
          <p className="text-zinc-700 text-xs">AI-powered performance analysis. No account required.</p>
          <div className="flex items-center gap-4 text-zinc-700 text-xs">
            <a href="#" className="hover:text-zinc-500 transition-colors">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:text-zinc-500 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

      {/* Full-screen loading takeover */}
      <AnimatePresence>
        {isLoading && (
          <LoadingOverlay url={analyzingUrl} currentStep={currentStep} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── HeadlineLine ──────────────────────────────────────────────────────────────

function HeadlineLine({ children, delay, color }: { children: string; delay: number; color: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn('block', color)}
    >
      {children}
    </motion.span>
  )
}

// ── AnimatedBackground ────────────────────────────────────────────────────────

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        animate={{ x: ['-4%', '4%', '-4%'], y: ['-4%', '4%', '-4%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full blur-[160px]"
        style={{ background: 'rgba(99,102,241,0.07)' }}
      />
      <motion.div
        animate={{ x: ['4%', '-4%', '4%'], y: ['4%', '-4%', '4%'] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px]"
        style={{ background: 'rgba(139,92,246,0.06)' }}
      />
    </div>
  )
}

// ── PillInput ─────────────────────────────────────────────────────────────────

function PillInput({
  inputRef,
  value,
  onChange,
  loading,
  disabled,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  onChange: (v: string) => void
  loading: boolean
  disabled: boolean
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div
      className="flex w-full rounded-2xl overflow-hidden border border-zinc-800 transition-shadow duration-200"
      style={{
        boxShadow: focused
          ? '0 0 0 2px rgba(99,102,241,0.4), 0 0 24px rgba(99,102,241,0.1)'
          : '0 0 0 1px transparent',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="url"
        autoComplete="url"
        spellCheck={false}
        placeholder="https://yoursite.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        className="flex-[3] h-14 px-5 bg-zinc-900 text-zinc-100 placeholder-zinc-600 outline-none text-sm font-mono disabled:opacity-40 min-w-0"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className={cn(
          'flex-[1] h-14 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 whitespace-nowrap select-none transition-colors',
          'bg-indigo-600 text-white rounded-none',
          !disabled && value.trim() ? 'hover:bg-indigo-500 cursor-pointer' : 'opacity-50 cursor-not-allowed'
        )}
      >
        {loading ? (
          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <>Analyze →</>
        )}
      </button>
    </div>
  )
}

// ── ComingSoonCard ────────────────────────────────────────────────────────────

function ComingSoonCard({
  email,
  setEmail,
  status,
  onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  status: 'idle' | 'loading' | 'success' | 'error'
  onSubmit: (e: React.SyntheticEvent) => void
}) {
  return (
    <div
      className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden p-8 flex flex-col gap-6"
      style={{
        borderTop: '3px solid rgba(55,48,163,0.35)',
        boxShadow: '0 0 0 1px rgba(99,102,241,0.06), 0 0 40px rgba(99,102,241,0.05)',
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30"
            style={{ background: 'rgba(99,102,241,0.1)' }}
          >
            COMING SOON
          </span>
        </div>
        <h2 className="text-zinc-100 text-xl font-bold tracking-tight">
          ShipAudit Continuous
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
          Automatic performance analysis after every deployment. Get notified the moment
          a deploy degrades your Core Web Vitals — with an AI root cause and a fix prompt,
          before your users notice.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: <Rocket className="w-3.5 h-3.5" />, label: 'Deploy webhook' },
          { icon: <BarChart2 className="w-3.5 h-3.5" />, label: 'Before/after comparison' },
          { icon: <Bot className="w-3.5 h-3.5" />, label: 'AI root cause analysis' },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs"
          >
            <span className="text-zinc-500">{icon}</span>
            {label}
          </div>
        ))}
      </div>

      {/* Waitlist form */}
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-emerald-400 font-medium text-sm"
          >
            <Check className="w-4 h-4" />
            You&apos;re on the list. We&apos;ll be in touch.
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={onSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
              className="flex-1 h-11 px-4 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-indigo-500 focus:outline-none text-zinc-100 placeholder-zinc-600 text-sm transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Joining…
                </>
              ) : (
                'Join the waitlist'
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {status === 'error' && (
        <p className="text-red-400 text-xs -mt-3">Something went wrong. Please try again.</p>
      )}
    </div>
  )
}

// ── LoadingOverlay ────────────────────────────────────────────────────────────

function LoadingOverlay({ url, currentStep }: { url: string; currentStep: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-[#0A0A0A]/96 backdrop-blur-md flex items-center justify-center px-6"
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-10">

        {/* Wordmark with pulse */}
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-2"
        >
          <Zap className="w-6 h-6 text-indigo-400" />
          <span className="text-white font-bold text-xl tracking-tight">ShipAudit</span>
        </motion.div>

        {/* URL being analyzed */}
        <div className="text-center space-y-1.5">
          <p className="text-zinc-600 text-xs uppercase tracking-widest">Auditing</p>
          <p className="text-zinc-400 font-mono text-xs break-all max-w-[22rem] leading-relaxed">{url}</p>
        </div>

        {/* Sequenced steps */}
        <div className="w-full space-y-0">
          {STEPS.map((step, i) => {
            const isDone = i < currentStep
            const isActive = i === currentStep
            const isVisible = i <= currentStep

            return (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -12 }}
                animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-3 py-2.5 border-l-2 pl-4"
                style={{
                  borderLeftColor: isDone
                    ? '#34d399'
                    : isActive
                    ? '#6366f1'
                    : 'transparent',
                }}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {isDone ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : isActive ? (
                    <motion.span
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-indigo-400 text-base leading-none"
                    >
                      ✦
                    </motion.span>
                  ) : null}
                </div>
                <span
                  className={cn(
                    'text-sm',
                    isDone ? 'text-zinc-500' : isActive ? 'text-zinc-100' : 'text-zinc-700'
                  )}
                >
                  {step}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Estimated time */}
        <p className="text-zinc-600 text-xs">Usually takes 20–40 seconds</p>
      </div>
    </motion.div>
  )
}
