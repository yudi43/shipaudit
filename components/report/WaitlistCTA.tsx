'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function WaitlistCTA({ findingCount }: { findingCount: number }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email) || status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Submission failed')
      }

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-zinc-100 text-xl font-bold tracking-tight">
          This audit found {findingCount} issue{findingCount !== 1 ? 's' : ''}.
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
          ShipAudit Continuous would automatically detect regressions like these after every
          deployment — before your users notice them.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.p
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-emerald-400 font-medium"
          >
            You&apos;re on the list. We&apos;ll be in touch.
          </motion.p>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
              className="flex-1 h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-indigo-500 focus:outline-none text-zinc-100 placeholder-zinc-600 text-sm transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="h-11 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
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
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}
    </div>
  )
}
