'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  HardDrive,
  History,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import Logo from './Logo'
import {
  clearHistory,
  HISTORY_LIMIT,
  listHistory,
  removeSavedAudit,
  type SavedAudit,
} from '@/lib/audit-history'
import { reportView } from '@/lib/report-view'
import { scoreTone } from './ScoreGauge'
export default function AuditHistory() {
  const [audits, setAudits] = useState<SavedAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    listHistory()
      .then((data) => {
        if (active) setAudits(data)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  async function remove() {
    try {
      if (confirm === 'all') await clearHistory()
      else if (confirm) await removeSavedAudit(confirm)
      setAudits(await listHistory())
      setConfirm(null)
    } catch {
      setError(true)
    }
  }
  const visible = audits.filter((a) =>
    a.report.url.toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <>
      <header className="site-header shell">
        <Link href="/" aria-label="ShipAudit home">
          <Logo theme="dark" />
        </Link>
        <Link className="button primary" href="/">
          New audit <ArrowRight size={15} />
        </Link>
      </header>
      <main id="main" className="shell history-page">
        <span className="eyebrow accent">
          <History size={15} /> YOUR AUDIT HISTORY
        </span>
        <h1>
          Every test.
          <br />
          <span className="accent">A clearer next step.</span>
        </h1>
        <p className="history-intro">
          Your completed audits, saved on this browser. Revisit a diagnosis,
          compare the signal, and pick up where you left off.
        </p>
        <div className="history-notice">
          <HardDrive size={17} />
          <p>
            No account needed. Full report snapshots stay on this device, even
            after the online report expires. Clearing browser data removes them.
          </p>
        </div>
        {confirm && (
          <div className="error-panel" role="alert">
            <TriangleAlert size={20} />
            <div>
              <h2>
                {confirm === 'all'
                  ? 'Clear all saved audits?'
                  : 'Remove this saved audit?'}
              </h2>
              <p>
                This deletes{' '}
                {confirm === 'all'
                  ? 'the saved report snapshots'
                  : 'this snapshot'}{' '}
                from this browser. It cannot be undone.
              </p>
              <div className="share-row">
                <button
                  className="button secondary"
                  onClick={() => setConfirm(null)}
                >
                  Keep {confirm === 'all' ? 'my history' : 'it'}
                </button>
                <button className="button secondary" onClick={remove}>
                  Delete {confirm === 'all' ? 'all' : 'snapshot'}{' '}
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="error-panel" role="alert">
            <TriangleAlert size={20} />
            <div>
              <h2>Browser storage isn’t available.</h2>
              <p>
                Private browsing or storage settings may prevent saving reports.
                You can still run an audit and export it as Markdown.
              </p>
            </div>
          </div>
        )}
        {loading ? (
          <div className="empty-state" role="status">
            Opening your saved audits…
          </div>
        ) : audits.length ? (
          <>
            <div className="history-toolbar">
              <label className="history-search">
                <Search size={16} />
                <span className="sr-only">Search audit history by URL</span>
                <input
                  type="search"
                  placeholder="Find a site…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <span className="mono muted">
                {visible.length} / {audits.length} AUDITS
              </span>
              <button className="text-button" onClick={() => setConfirm('all')}>
                Clear history <Trash2 size={13} />
              </button>
            </div>
            <div className="history-table">
              <div className="history-table-head">
                <span>WEBSITE / AUDITED</span>
                <span>STACK</span>
                <span>SCORE</span>
                <span />
              </div>
              {visible.map(({ key, report }) => {
                const view = reportView(report)
                const measured = !view.partial && !view.invalid && !view.legacy
                return (
                  <div className="history-row" key={key}>
                    <Link href={`/history/${key}`} className="history-site">
                      <strong>
                        {new URL(report.url).hostname}
                        <ArrowUpRight size={15} />
                      </strong>
                      <span className="mono">
                        {new Date(report.createdAt)
                          .toISOString()
                          .replace('T', ' ')
                          .slice(0, 16)}{' '}
                        UTC
                      </span>
                      <span className="history-url">{report.url}</span>
                    </Link>
                    <span className="tag">
                      {report.stack.framework === 'Unknown'
                        ? 'Not detected'
                        : report.stack.framework}
                    </span>
                    <div className="history-score">
                      <strong
                        className={`mono ${measured ? scoreTone(report.score.current) : 'muted'}`}
                      >
                        {measured ? report.score.current : '—'}
                      </strong>
                      <span>
                        {measured
                          ? `${view.findings.length} failed checks`
                          : 'Partial measurement'}
                      </span>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setConfirm(key)}
                      aria-label={`Remove audit of ${new URL(report.url).hostname} from ${report.createdAt}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
            {!visible.length && (
              <div className="empty-state">
                <h3>No matching sites.</h3>
                <p>Try another URL or clear the search.</p>
                <button className="text-button" onClick={() => setSearch('')}>
                  Clear search
                </button>
              </div>
            )}
          </>
        ) : (
          !error && (
            <div className="empty-state history-empty">
              <History size={34} />
              <h2>Your first signal starts here.</h2>
              <p>
                Run an audit and its report will appear here automatically. No
                signup, no setup.
              </p>
              <Link className="button primary" href="/">
                Audit a site <ArrowRight size={16} />
              </Link>
            </div>
          )
        )}
        <p className="section-note">
          Keeps your latest {HISTORY_LIMIT} measured reports. Failed runs and
          the example report aren’t saved. History is private to this browser
          and does not sync across devices.
        </p>
      </main>
      <footer className="site-footer shell">
        <span>Measure. Fix. Re-audit. Ship.</span>
        <Link href="/">
          Back to the workbench <ArrowUpRight size={13} />
        </Link>
      </footer>
    </>
  )
}
