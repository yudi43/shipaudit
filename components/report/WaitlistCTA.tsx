'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import posthog from 'posthog-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function WaitlistCTA({ findingCount }: { findingCount: number }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email) || status === 'loading') return

    setStatus('loading')
    posthog.capture('waitlist_signup_submitted', { source: 'report_page', finding_count: findingCount })
    posthog.identify(email, { email })
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-indigo-600 text-xs font-mono uppercase tracking-widest">Coming Soon</p>
        <h3 className="text-slate-900 text-lg font-semibold">ShipAudit Guard</h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          This audit found {findingCount} issue{findingCount !== 1 ? 's' : ''}. ShipAudit Guard
          would automatically detect regressions like these after every deployment — before your
          users notice them.
        </p>
      </div>

      {status === 'success' ? (
        <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
          <Check className="w-4 h-4" />
          You&apos;re on the list.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
            className="flex-1 h-10 px-3 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none text-slate-800 placeholder-slate-400 text-sm transition-colors"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email}
            className="h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              'Join the waitlist'
            )}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p className="text-red-500 text-xs">Something went wrong. Please try again.</p>
      )}
    </div>
  )
}
