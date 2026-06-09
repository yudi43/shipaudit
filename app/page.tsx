'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Check, Zap, BarChart2, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import posthog from 'posthog-js'

const STEPS = [
  'Fetching page structure',
  'Generating ShipAudit Score',
  'Ranking performance issues',
  'Writing AI fix instructions',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Geometric logo mark — two offset bars ────────────────────────────────────
function LogoMark({ muted }: { muted?: boolean }) {
  const fill = muted ? '#334155' : '#818cf8'
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" fill="none" aria-hidden>
      <rect x="0" y="0" width="18" height="3.5" rx="1" fill={fill} />
      <rect x="5" y="9.5" width="13" height="3.5" rx="1" fill={fill} />
    </svg>
  )
}

function Wordmark({ muted }: { muted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark muted={muted} />
      <span className="text-lg font-bold tracking-tight">
        <span className={muted ? 'text-slate-700' : 'text-white'}>Ship</span>
        <span className={muted ? 'text-slate-700' : 'text-indigo-400'}>Audit</span>
      </span>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([])

  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(-1)
  const [analyzingUrl, setAnalyzingUrl] = useState('')
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

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || isLoading) return
    setError('')
    setIsLoading(true)
    setAnalyzingUrl(trimmed)
    setCurrentStep(0)  // Step 1: "Fetching page structure" — immediately
    posthog.capture('audit_submitted', { url: trimmed })

    function handleError(message: string) {
      clearTimers()
      setIsLoading(false)
      setCurrentStep(-1)
      setError(message)
      posthog.capture('audit_failed', { url: trimmed, error: message })
    }

    // Step 2 advances at 8s — GitHub Actions has started by now
    timerIds.current.push(setTimeout(() => setCurrentStep(1), 8000))

    try {
      const triggerRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const triggerData: { auditId?: string; reportId?: string; status?: string; error?: string } =
        await triggerRes.json().catch(() => ({}))

      if (!triggerRes.ok) {
        handleError(triggerData.error ?? 'Failed to start audit. Please try again.')
        return
      }

      // Cache hit — go straight to report
      if (triggerData.status === 'complete') {
        router.push(`/report/${triggerData.reportId}`)
        return
      }

      const { auditId } = triggerData
      const maxAttempts = 60  // 60 × 5s = 5 min max
      let attempts = 0

      const poll = async () => {
        if (attempts >= maxAttempts) {
          handleError('Audit timed out. Please try again.')
          return
        }
        attempts++

        try {
          const statusRes = await fetch(`/api/audit/status/${auditId}`)
          const data: { status: string; reportId?: string; message?: string } = await statusRes.json()

          if (data.status === 'complete') {
            setCurrentStep(3)  // Step 4: "Writing AI fix instructions" — briefly before redirect
            timerIds.current.push(setTimeout(() => router.push(`/report/${data.reportId}`), 600))
            return
          }

          if (data.status === 'error') {
            handleError(data.message ?? 'Audit failed. Please try again.')
            return
          }

          // Still pending — poll again in 5s
          timerIds.current.push(setTimeout(poll, 5000))
        } catch {
          timerIds.current.push(setTimeout(poll, 5000))
        }
      }

      // Step 3 advances and first poll fires at 40s — Lighthouse is running by now
      timerIds.current.push(setTimeout(() => {
        setCurrentStep(2)
        poll()
      }, 40000))
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function handleWaitlist(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(waitlistEmail) || waitlistStatus === 'loading') return
    setWaitlistStatus('loading')
    posthog.capture('waitlist_signup_submitted', { source: 'homepage' })
    posthog.identify(waitlistEmail, { email: waitlistEmail })
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail }),
      })
      if (!res.ok) throw new Error()
      setWaitlistStatus('success')
    } catch {
      setWaitlistStatus('error')
    }
  }

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] overflow-x-hidden flex flex-col">
      <AnimatedBackground />

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-5 flex items-center justify-between">
        <Wordmark />
        <div
          className="px-3 py-1 rounded-full text-xs font-medium text-indigo-400 border border-indigo-500/30"
          style={{ background: 'rgba(79,70,229,0.1)' }}
        >
          AI-Powered · Free
        </div>
      </header>

      {/* Hero — everything above fold on 1280×800 */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-16 pb-12">
        <div className="w-full max-w-2xl flex flex-col items-center text-center gap-5">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="inline-flex items-center px-3 py-1 rounded-full border border-indigo-500/20 text-indigo-400 text-xs font-medium"
            style={{ background: 'rgba(99,102,241,0.08)', boxShadow: '0 0 12px rgba(99,102,241,0.18)' }}
          >
            ✦ AI Performance Auditor
          </motion.div>

          {/* Headline — hard cap text-4xl md:text-5xl */}
          <h1 className="text-4xl md:text-5xl font-bold leading-[1.15] tracking-tight">
            <HLine delay={0.06}>Paste any URL.</HLine>
            <HLine delay={0.14} indigo>AI-powered audit.</HLine>
            <HLine delay={0.22}>Human-readable fixes.</HLine>
          </h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="text-slate-400 text-sm max-w-xs leading-relaxed"
          >
            No account. No setup. Instant AI analysis with framework-specific fix instructions.
          </motion.p>

          {/* Pill input */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.45 }}
            onSubmit={handleSubmit}
            noValidate
            className="w-full max-w-2xl"
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
                  key="err"
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-1.5 mt-2.5 text-sm text-red-400 overflow-hidden"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.45 }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {['⚡ Under 90s', '✓ Google CWV thresholds', '⚙ Framework-aware fixes'].map((label) => (
              <span
                key={label}
                className="px-2.5 py-1 rounded-full bg-[#0f172a] border border-[#1e293b] text-slate-500 text-xs"
              >
                {label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Coming Soon — just below fold */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="w-full max-w-3xl mt-16"
        >
          <GuardCard
            email={waitlistEmail}
            setEmail={setWaitlistEmail}
            status={waitlistStatus}
            onSubmit={handleWaitlist}
          />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-zinc-900 pb-8 pt-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-1.5">
          <Wordmark muted />
          <p className="text-slate-700 text-xs">AI-powered performance analysis. No account required.</p>
        </div>
      </footer>

      <AnimatePresence>
        {isLoading && <LoadingOverlay url={analyzingUrl} currentStep={currentStep} />}
      </AnimatePresence>
    </div>
  )
}

function HLine({ children, delay, indigo, extrabold }: { children: string; delay: number; indigo?: boolean; extrabold?: boolean }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={cn('block', indigo ? 'text-indigo-400' : 'text-white', extrabold && 'font-extrabold')}
    >
      {children}
    </motion.span>
  )
}

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        animate={{ x: ['-4%', '4%', '-4%'], y: ['-4%', '4%', '-4%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-[160px]"
        style={{ background: 'rgba(99,102,241,0.07)' }}
      />
      <motion.div
        animate={{ x: ['4%', '-4%', '4%'], y: ['4%', '-4%', '4%'] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-[140px]"
        style={{ background: 'rgba(139,92,246,0.05)' }}
      />
    </div>
  )
}

function PillInput({
  inputRef, value, onChange, loading, disabled,
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
      className="flex w-full rounded-2xl overflow-hidden border border-[#1e293b] bg-[#0f172a] transition-shadow duration-150"
      style={{ boxShadow: focused ? '0 0 0 2px rgba(79,70,229,0.4)' : undefined }}
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
        className="flex-[3] h-12 px-5 bg-transparent text-slate-100 placeholder-[#475569] outline-none text-base font-mono disabled:opacity-40 min-w-0"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className={cn(
          'flex-[1] h-12 px-5 font-medium text-sm flex items-center justify-center whitespace-nowrap select-none transition-colors bg-indigo-600 text-white',
          !disabled && value.trim() ? 'hover:bg-[#4338ca] cursor-pointer' : 'opacity-40 cursor-not-allowed'
        )}
      >
        {loading
          ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          : 'Analyze →'
        }
      </button>
    </div>
  )
}

function GuardCard({
  email, setEmail, status, onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  status: 'idle' | 'loading' | 'success' | 'error'
  onSubmit: (e: React.SyntheticEvent) => void
}) {
  const features = [
    { icon: <Zap className="w-4 h-4 shrink-0" />,      text: '→ Deploy webhook — works with any CI/CD pipeline' },
    { icon: <BarChart2 className="w-4 h-4 shrink-0" />, text: '→ Before/after comparison on every deploy' },
    { icon: <Bot className="w-4 h-4 shrink-0" />,       text: '→ AI root cause + Cursor fix prompt' },
  ]

  return (
    <div
      className="rounded-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden"
      style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderTopColor: '#4f46e5',
        borderTopWidth: '3px',
        boxShadow: '0 0 40px rgba(79,70,229,0.08)',
      }}
    >
      <div className="flex flex-col gap-5 p-7 md:border-r border-[#1e293b]">
        <div className="flex flex-col gap-1">
          <span className="text-indigo-400 text-xs font-mono tracking-widest uppercase">Coming Soon</span>
          <h2 className="text-white text-xl font-bold tracking-tight">ShipAudit Guard</h2>
          <p className="text-[#64748b] text-sm leading-relaxed mt-1">
            Automatic performance analysis after every deployment. Get notified the moment a deploy
            degrades your Core Web Vitals — with an AI root cause and a fix prompt.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {features.map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm border border-[#1e293b]" style={{ background: '#1e293b', color: '#94a3b8' }}>
              <span style={{ color: '#818cf8' }}>{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start p-7">
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-slate-200 text-sm font-medium">Join the early access list</p>
            <p className="text-[#64748b] text-xs">Be first when ShipAudit Guard launches.</p>
          </div>
          {status === 'success' ? (
            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm py-1">
              <Check className="w-4 h-4 shrink-0" />
              You&apos;re on the list.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border focus:border-indigo-500 focus:outline-none text-sm transition-colors placeholder-[#475569]"
                style={{ background: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
              />
              <button
                type="submit"
                disabled={status === 'loading' || !email}
                className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-[#4338ca] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading'
                  ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : 'Join the waitlist'
                }
              </button>
              {status === 'error' && <p className="text-red-400 text-xs">Something went wrong. Please try again.</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingOverlay({ url, currentStep }: { url: string; currentStep: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col items-center justify-center px-6 min-h-screen"
    >
      <Wordmark />

      <div className="flex flex-col items-center mt-8">
        <p className="text-slate-400 text-xs font-mono tracking-widest uppercase">AUDITING</p>
        <p className="text-slate-200 font-mono text-sm mt-1 break-all max-w-xs text-center leading-relaxed">{url}</p>
      </div>

      <div className="flex flex-col w-fit mx-auto mt-10">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep
          const isActive = i === currentStep
          return (
            <div key={step} className="flex items-center gap-3 py-2">
              <div className="w-4 text-center shrink-0">
                {isDone ? (
                  <span className="text-emerald-400 text-sm">✓</span>
                ) : isActive ? (
                  <span className="text-indigo-400 text-sm animate-pulse inline-block">✦</span>
                ) : (
                  <span className="text-slate-500 text-lg leading-none">·</span>
                )}
              </div>
              <span className={cn('text-sm transition-colors duration-300',
                isDone ? 'text-slate-400' : isActive ? 'text-indigo-400 font-medium' : 'text-slate-500'
              )}>
                {step}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-slate-500 text-xs mt-12">Usually takes 60–90 seconds</p>
    </motion.div>
  )
}
