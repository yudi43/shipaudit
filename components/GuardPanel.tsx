'use client'

import { useId, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  ShieldCheck,
  GitCompareArrows,
  Bell,
} from 'lucide-react'
import posthog from 'posthog-js'

export default function GuardPanel({
  findingCount,
}: {
  findingCount?: number
}) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      posthog.capture('waitlist_signup_submitted', {
        source: findingCount === undefined ? 'homepage' : 'report_page',
      })
    } catch {
      setStatus('error')
    }
  }
  return (
    <section className="guard-panel" id="guard" aria-labelledby={id + '-title'}>
      <div className="guard-intro">
        <div className="eyebrow">
          <ShieldCheck size={15} /> THE NEXT DEPLOY
        </div>
        <h2 id={id + '-title'}>
          Keep the gains.
          <br />
          Catch the regressions.
        </h2>
        <p>
          {findingCount === undefined
            ? 'One audit is a snapshot. ShipAudit Guard will watch every deployment.'
            : `${findingCount ? `Found ${findingCount} things to improve?` : 'A clean report is worth keeping.'} Guard will catch performance regressions after every deploy.`}
        </p>
        <div className="guard-features">
          <span>
            <GitCompareArrows size={15} /> Before / after
          </span>
          <span>
            <Bell size={15} /> Regression alerts
          </span>
          <span>
            <ShieldCheck size={15} /> AI root cause
          </span>
        </div>
      </div>
      <div className="guard-form">
        <span className="tag">GUARD · COMING SOON</span>
        <h3>Get the first signal.</h3>
        <p>Join the early access list. We’ll email you when Guard is ready.</p>
        {status === 'success' ? (
          <p className="success" role="status">
            <Check size={18} /> You’re on the list. Stay tuned.
          </p>
        ) : (
          <form onSubmit={submit}>
            <label className="sr-only" htmlFor={id}>
              Email address
            </label>
            <input
              id={id}
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="button primary" disabled={status === 'loading'}>
              {status === 'loading' ? 'Joining…' : 'Join early access'}
              <ArrowUpRight size={17} />
            </button>
            {status === 'error' && (
              <p role="alert" className="copy-error">
                Couldn’t join the list. Try again in a moment.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  )
}
