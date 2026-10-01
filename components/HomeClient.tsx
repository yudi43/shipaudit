'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  Clipboard,
  Command,
  Gauge,
  Globe,
  History,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import posthog from 'posthog-js'
import Logo from './Logo'
import GuardPanel from './GuardPanel'
import ScoreGauge from './ScoreGauge'
import AuditLoading from './AuditLoading'
import { normalizeUrl } from '@/lib/utils'
import { listHistory } from '@/lib/audit-history'

type Recent = { url: string; id: string; at: string; savedKey?: string }
type AuditError = { code: string; message?: string }
const errorCopy: Record<string, { title: string; text: string }> = {
  invalid_url: {
    title: 'That URL needs a second look.',
    text: 'Use a public http or https website, like example.com. We’ll add https:// for you.',
  },
  timeout: {
    title: 'The runner hasn’t returned a result.',
    text: 'The audit may still be queued or the page may be taking too long to load. Retry, or test a lighter page on the same site.',
  },
  blocked: {
    title: 'The site refused the audit browser.',
    text: 'We received an access-denied response. Try a public page without a login or ask the site owner to allow automated testing.',
  },
  site_down: {
    title: 'We couldn’t load this page.',
    text: 'Open the URL in your browser to check it’s reachable, then try again. Redirects, DNS errors, or an unavailable origin can stop the test.',
  },
  expired: {
    title: 'This session has expired.',
    text: 'The runner’s result didn’t arrive before this session expired. Start a fresh audit to try again.',
  },
  service: {
    title: 'We couldn’t start the audit.',
    text: 'The audit service is temporarily unavailable. Your URL is still here; try again in a moment.',
  },
  result: {
    title: 'The test returned an incomplete result.',
    text: 'We couldn’t calculate a reliable score for this page. Try another public page on the same domain or run the audit again.',
  },
}
export default function HomeClient({
  initialUrl = '',
  refresh = false,
}: {
  initialUrl?: string
  refresh?: boolean
}) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<AuditError | null>(null)
  const [recent, setRecent] = useState<Recent[]>([])
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abort = useRef<AbortController | null>(null)
  const sessionRun = useRef({ generation: 0 })
  useEffect(() => {
    const activeSession = sessionRun.current
    const id = requestAnimationFrame(() => {
      try {
        setRecent(
          JSON.parse(localStorage.getItem('shipaudit:recent') ?? '[]').slice(
            0,
            3,
          ),
        )
      } catch {
        /* Storage can be disabled. */
      }
    })
    let active = true
    listHistory()
      .then((audits) => {
        if (active && audits.length)
          setRecent(
            audits
              .slice(0, 3)
              .map((a) => ({
                url: a.report.url,
                id: a.report.id,
                at: a.report.createdAt,
                savedKey: a.key,
              })),
          )
      })
      .catch(() => {})
    function shortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => {
      active = false
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', shortcut)
      activeSession.generation++
      if (timer.current) clearTimeout(timer.current)
      abort.current?.abort()
    }
  }, [])
  function exit() {
    sessionRun.current.generation++
    if (timer.current) clearTimeout(timer.current)
    abort.current?.abort()
    setLoading(false)
    requestAnimationFrame(() => input.current?.focus())
  }
  function fail(code: string, message?: string) {
    setError({ code, message })
    setLoading(false)
    if (timer.current) clearTimeout(timer.current)
    posthog.capture('audit_failed', { code })
    requestAnimationFrame(() => input.current?.focus())
  }
  function finish(id: string, target: string) {
    try {
      localStorage.setItem('shipaudit:save-next', id)
      const stored = JSON.parse(
        localStorage.getItem('shipaudit:recent') ?? '[]',
      ) as Recent[]
      localStorage.setItem(
        'shipaudit:recent',
        JSON.stringify(
          [
            { url: target, id, at: new Date().toISOString() },
            ...stored.filter((r) => r.url !== target),
          ].slice(0, 3),
        ),
      )
    } catch {
      /* Recent audits are optional. */
    }
    setStage(3)
    timer.current = setTimeout(() => router.push(`/report/${id}`), 250)
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    let target: string
    try {
      target = normalizeUrl(url)
    } catch {
      fail('invalid_url')
      return
    }
    setUrl(target)
    setError(null)
    setLoading(true)
    setStage(0)
    const session = ++sessionRun.current.generation
    abort.current = new AbortController()
    posthog.capture('audit_submitted', { url: target })
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target, refresh }),
        signal: AbortSignal.any([
          abort.current.signal,
          AbortSignal.timeout(35000),
        ]),
      })
      const data = await response.json().catch(() => ({}))
      if (session !== sessionRun.current.generation) return
      if (!response.ok) {
        fail(data.code ?? 'service', data.error)
        return
      }
      if (data.status === 'complete' && data.reportId) {
        finish(data.reportId, target)
        return
      }
      if (!data.auditId) {
        fail('service')
        return
      }
      setStage(1)
      const started = Date.now()
      async function poll() {
        if (session !== sessionRun.current.generation) return
        if (Date.now() - started > 300000) {
          fail('timeout')
          return
        }
        try {
          const res = await fetch(`/api/audit/status/${data.auditId}`, {
            signal: AbortSignal.any([
              abort.current!.signal,
              AbortSignal.timeout(15000),
            ]),
            cache: 'no-store',
          })
          const state = await res.json()
          if (session !== sessionRun.current.generation) return
          if (state.status === 'complete' && state.reportId) {
            finish(state.reportId, target)
            return
          }
          if (state.status === 'error') {
            fail(state.code ?? 'result', state.message)
            return
          }
          if (res.status === 404) {
            fail('expired')
            return
          }
          if (state.status === 'processing') setStage(2)
        } catch {
          if (session !== sessionRun.current.generation) return
        }
        timer.current = setTimeout(poll, 4000)
      }
      await poll()
    } catch {
      if (session === sessionRun.current.generation) fail('service')
    }
  }
  const errorInfo = error ? (errorCopy[error.code] ?? errorCopy.result) : null
  return (
    <>
      <header className="site-header shell">
        <Link href="/" aria-label="ShipAudit home">
          <Logo theme="dark" />
        </Link>
        <nav>
          <span className="status-dot" />{' '}
          <Link href="/report/demo" className="demo-nav">
            Explore a report <ArrowUpRight size={14} />
          </Link>
          <Link href="/history">
            History <History size={13} />
          </Link>
          <a href="#guard">
            Guard <span className="tag">SOON</span>
          </a>
        </nav>
      </header>
      {loading ? (
        <AuditLoading url={url} stage={stage} onExit={exit} />
      ) : (
        <main id="main" className="shell">
          <section className="hero">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> WEB PERFORMANCE, DIAGNOSED.
              </div>
              <h1>
                Find the drag.
                <br />
                <span className="accent">Ship the fix.</span>
              </h1>
              <p className="hero-intro">
                A mobile stress test for your website. A clear order of fixes.
                One prompt to put your AI coding tool to work.
              </p>
              <form onSubmit={submit} className="hero-form" noValidate>
                <label className="url-label" htmlFor="audit-url">
                  WHAT ARE YOU SHIPPING?
                </label>
                <div className="url-control">
                  <Globe size={19} className="muted" />
                  <input
                    id="audit-url"
                    ref={input}
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    aria-describedby="url-help"
                    aria-invalid={error?.code === 'invalid_url'}
                    placeholder="your-site.com"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      setError(null)
                    }}
                    onBlur={() => {
                      if (url.trim()) {
                        try {
                          setUrl(normalizeUrl(url))
                        } catch {
                          /* Validate on submit. */
                        }
                      }
                    }}
                  />
                  <button className="button primary" type="submit">
                    {refresh ? 'Run fresh audit' : 'Audit my site'}
                    <ArrowRight size={17} />
                  </button>
                </div>
                <div className="input-help" id="url-help">
                  <span>No signup. Free. Usually 60–90s.</span>
                  <span>
                    <Command size={12} /> K to focus
                  </span>
                </div>
              </form>
              {errorInfo && (
                <div className="error-panel" role="alert">
                  <TriangleAlert size={21} />
                  <div>
                    <h2>{errorInfo.title}</h2>
                    <p>{errorInfo.text}</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setError(null)
                        input.current?.focus()
                      }}
                    >
                      Edit URL <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
              <div className="examples">
                <span>Try a URL</span>
                {['example.com', 'nextjs.org'].map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      setUrl(example)
                      setError(null)
                      input.current?.focus()
                    }}
                  >
                    {example}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
              {recent.length > 0 && (
                <div className="recent-row">
                  <span>
                    <History size={14} /> RECENT
                  </span>
                  {recent.map((item) => (
                    <Link
                      key={item.id}
                      href={
                        item.savedKey
                          ? `/history/${item.savedKey}`
                          : `/report/${item.id}`
                      }
                    >
                      {item.url.replace(/^https?:\/\//, '')}
                      <ArrowUpRight size={12} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="preview-wrap">
              <Link
                href="/report/demo"
                className="report-preview"
                aria-label="Explore the interactive example report"
              >
                <div className="preview-header">
                  <span className="mono">ACME.STUDIO /</span>
                  <span className="tag">EXAMPLE REPORT</span>
                </div>
                <div className="preview-overview">
                  <ScoreGauge score={71} compact />
                  <div>
                    <span className="preview-verdict">
                      ROOM TO PICK UP SPEED
                    </span>
                    <h3>
                      Good site.
                      <br />
                      Heavy first impression.
                    </h3>
                    <p>Start with the hero image and blocking CSS.</p>
                    <div className="preview-lift">
                      71 → 95 <span>potential</span>
                    </div>
                  </div>
                </div>
                <div className="preview-fixes">
                  <div>
                    01 &nbsp; Right-size the hero image<span>+15 pts</span>
                  </div>
                  <div>
                    02 &nbsp; Clear the critical rendering path
                    <span>+9 pts</span>
                  </div>
                </div>
                <div className="preview-action">
                  <span>
                    <Clipboard size={15} /> Copy the fix. Ship the gain.
                  </span>
                  <ArrowUpRight size={20} />
                </div>
              </Link>
              <span className="preview-caption">
                YOUR NEXT DEPLOY STARTS HERE ↗
              </span>
            </div>
          </section>
          <section className="proof-row" aria-label="How ShipAudit works">
            <div>
              <Gauge />
              <div>
                <h3>A little pressure. Real clarity.</h3>
                <p>Simulated mobile. Throttled 4G. Cold cache.</p>
              </div>
            </div>
            <div>
              <Braces />
              <div>
                <h3>Fixes that speak your stack.</h3>
                <p>Framework detection makes the advice relevant.</p>
              </div>
            </div>
            <div>
              <Sparkles />
              <div>
                <h3>From diagnosis to your editor.</h3>
                <p>Copy a prioritized prompt for Cursor or Claude Code.</p>
              </div>
            </div>
          </section>
          <GuardPanel />
        </main>
      )}
      <footer className="site-footer shell">
        <span>
          <Check size={13} /> Built for people who ship.
        </span>
        <span>
          Lab measurements. Actionable fixes. <ShieldCheck size={13} />
        </span>
      </footer>
    </>
  )
}
