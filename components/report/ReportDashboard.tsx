'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  History,
  HardDrive,
  Code2,
  ExternalLink,
  Gauge,
  ImageIcon,
  Layers,
  MousePointer2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Timer,
  TriangleAlert,
  Type,
  Wifi,
} from 'lucide-react'
import type { AuditReport, Finding, WebVital } from '@/lib/types'
import { formatVitalValue } from '@/lib/utils'
import { findingPrompt, reportView } from '@/lib/report-view'
import Logo from '@/components/Logo'
import ScoreGauge, { scoreTone } from '@/components/ScoreGauge'
import GuardPanel from '@/components/GuardPanel'
import { CopyButton } from '@/components/ui/CopyButton'
import { ExportButton } from './ExportButton'
import { saveAudit } from '@/lib/audit-history'

const labels = {
  LCP: 'Largest contentful paint',
  INP: 'Interaction to next paint',
  CLS: 'Cumulative layout shift',
  FCP: 'First contentful paint',
  TTFB: 'Time to first byte',
}
const statusLabels = {
  good: 'Good',
  'needs-improvement': 'Needs work',
  poor: 'Poor',
  unavailable: 'Unavailable',
}
const icons = {
  LCP: ImageIcon,
  INP: MousePointer2,
  CLS: Layers,
  FCP: ScanLine,
  TTFB: Timer,
}
function plain(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}
function VitalCard({ vital }: { vital: WebVital }) {
  const Icon = icons[vital.metric]
  const tone = vital.status === 'needs-improvement' ? 'warn' : vital.status
  const t = vital.threshold
  const marker =
    vital.value === null
      ? 0
      : vital.value <= t.good
        ? (vital.value / t.good) * 33
        : vital.value <= t.needsImprovement
          ? 33 + ((vital.value - t.good) / (t.needsImprovement - t.good)) * 33
          : Math.min(
              98,
              66 +
                ((vital.value - t.needsImprovement) / t.needsImprovement) * 32,
            )
  return (
    <div className="vital-card">
      <div className="vital-top">
        <span>
          <Icon size={14} /> {vital.metric}
        </span>
        <span className={tone}>{statusLabels[vital.status]}</span>
      </div>
      <div className="metric-value mono">
        {formatVitalValue(vital.value, vital.unit)}
      </div>
      <p className="metric-label">{labels[vital.metric]}</p>
      {vital.value === null ? (
        <p className="vital-unavailable">
          {vital.metric === 'INP'
            ? 'Needs interaction data. A navigation-only lab test can’t measure it.'
            : 'This measurement was not returned. No result is better than a made-up zero.'}
        </p>
      ) : (
        <>
          <div className="threshold-track" aria-hidden="true">
            <span className="threshold-marker" style={{ left: `${marker}%` }} />
          </div>
          <p className="vital-caption">
            Good ≤ {formatVitalValue(t.good, vital.unit)} · Poor &gt;{' '}
            {formatVitalValue(t.needsImprovement, vital.unit)}
          </p>
        </>
      )}
    </div>
  )
}
function FindingRow({
  finding,
  index,
  report,
}: {
  finding: Finding
  index: number
  report: AuditReport
}) {
  return (
    <details
      className="finding"
      id={`finding-${finding.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
    >
      <summary>
        <span className="finding-rank">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="finding-title">
          <h3>{finding.title}</h3>
          <div>
            <span>{finding.category ?? 'Performance'}</span>
            {finding.affectedVital && <span>→ {finding.affectedVital}</span>}
            <span>{finding.effort ?? 'Review needed'}</span>
          </div>
        </div>
        <span className="finding-impact">
          {finding.estimatedPointImpact
            ? `+${finding.estimatedPointImpact} pts`
            : 'Review'}
        </span>
        <ChevronDown className="finding-chevron" />
      </summary>
      <div className="finding-content">
        <h4>What’s happening</h4>
        <p>{plain(finding.description)}</p>
        <h4>Why it matters</h4>
        <p>
          {finding.category === 'Accessibility'
            ? 'A barrier here can prevent someone from reading or using the page. A low point estimate does not make accessibility optional.'
            : finding.category === 'SEO'
              ? 'This affects how search engines understand and present this page.'
              : finding.category === 'Best practices'
                ? 'This affects the reliability, safety, or quality of the browsing experience.'
                : finding.affectedVital
                  ? `This can affect ${labels[finding.affectedVital].toLowerCase()}, especially on a slower mobile device or connection.`
                  : 'This adds work or friction during page load. Confirm the bottleneck before changing the code.'}
        </p>
        <h4>Affected resources</h4>
        {finding.resources?.length ? (
          <ul className="resource-list">
            {finding.resources.map((resource) => (
              <li key={resource}>{resource}</li>
            ))}
          </ul>
        ) : (
          <p>
            The test did not include a resource list. Locate the affected code
            before applying the fix.
          </p>
        )}
        <h4>
          {report.stack.framework === 'Unknown'
            ? 'Suggested fix · web standards'
            : `${report.stack.framework} · suggested fix`}
        </h4>
        <div className="fix-box">
          <p>{finding.fix}</p>
          <CopyButton
            text={findingPrompt(finding, report)}
            label="Copy this fix prompt"
          />
        </div>
        <p className="section-note">
          Effort is a rough estimate. Point gains are directional, overlap, and
          require a re-test.
        </p>
      </div>
    </details>
  )
}
export default function ReportDashboard({
  report,
  demo = false,
  saved = false,
}: {
  report: AuditReport
  demo?: boolean
  saved?: boolean
}) {
  const view = reportView(report)
  const [category, setCategory] = useState('All categories')
  const [vital, setVital] = useState('All vitals')
  const [effort, setEffort] = useState('All efforts')
  const [sort, setSort] = useState('Impact first')
  const [historyStatus, setHistoryStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >(saved ? 'saved' : 'idle')
  const [comparison, setComparison] = useState<number | null>(null)
  const valid = !view.invalid && !view.partial && !view.legacy
  const domain = new URL(report.url).hostname
  const share = () =>
    new URL(`/report/${report.id}`, window.location.origin).href
  const reAudit = `/?url=${encodeURIComponent(report.url)}&refresh=1`
  const findings = view.findings
    .filter(
      (f) =>
        (category === 'All categories' || f.category === category) &&
        (vital === 'All vitals' || f.affectedVital === vital) &&
        (effort === 'All efforts' || f.effort === effort),
    )
    .sort((a, b) =>
      sort === 'Quick fixes first'
        ? { 'Quick fix': 0, Moderate: 1, Involved: 2 }[a.effort ?? 'Involved'] -
            { 'Quick fix': 0, Moderate: 1, Involved: 2 }[
              b.effort ?? 'Involved'
            ] || b.estimatedPointImpact - a.estimatedPointImpact
        : b.estimatedPointImpact - a.estimatedPointImpact,
    )
  useEffect(() => {
    if (!valid || demo || saved) return
    const id = requestAnimationFrame(() => {
      try {
        const key = `shipaudit:score:${report.url}`
        const old = JSON.parse(localStorage.getItem(key) ?? 'null') as {
          score: number
          at: string
        } | null
        if (old && old.at !== report.createdAt)
          setComparison(report.score.current - old.score)
        localStorage.setItem(
          key,
          JSON.stringify({ score: report.score.current, at: report.createdAt }),
        )
      } catch {
        /* Comparison works without storing personal data on a server. */
      }
    })
    return () => cancelAnimationFrame(id)
  }, [report.url, report.createdAt, report.score, valid, demo, saved])
  useEffect(() => {
    if (demo || saved || view.invalid || view.legacy) return
    let active = true
    try {
      if (localStorage.getItem('shipaudit:save-next') === report.id) {
        saveAudit(report)
          .then(() => {
            if (active) setHistoryStatus('saved')
            if (localStorage.getItem('shipaudit:save-next') === report.id)
              localStorage.removeItem('shipaudit:save-next')
          })
          .catch(() => {
            if (active) setHistoryStatus('error')
          })
      }
    } catch {
      /* The user can save explicitly or export if storage is disabled. */
    }
    return () => {
      active = false
    }
  }, [report, demo, saved, view.invalid, view.legacy])
  async function saveSnapshot() {
    setHistoryStatus('saving')
    try {
      await saveAudit(report)
      setHistoryStatus('saved')
    } catch {
      setHistoryStatus('error')
    }
  }
  function openFinding(id: string) {
    setCategory('All categories')
    setVital('All vitals')
    setEffort('All efforts')
    requestAnimationFrame(() => {
      const element = document.getElementById(
        `finding-${id}`,
      ) as HTMLDetailsElement | null
      if (element) {
        element.open = true
        element.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'instant'
            : 'smooth',
          block: 'center',
        })
        element.querySelector('summary')?.focus({ preventScroll: true })
      }
    })
  }
  const verdict =
    report.score.current >= 90
      ? 'Ready to ship. Keep it that way.'
      : report.score.current >= 60
        ? 'Good bones. Room to move faster.'
        : 'Your first impression needs work.'
  return (
    <>
      <header className="report-header">
        <div className="shell">
          <Link href="/" aria-label="ShipAudit home">
            <Logo size="md" theme="dark" />
          </Link>
          <nav>
            <a href="#findings" className="text-button">
              Findings <ArrowDown size={13} />
            </a>
            <Link
              href="/history"
              className="button secondary"
              aria-label="Your audit history"
            >
              <History size={15} />
              <span>History</span>
            </Link>
            {!saved && <CopyButton label="Copy report link" text={share} />}
            <Link
              className="button secondary"
              href={demo ? '/' : reAudit}
              aria-label={demo ? 'Audit your site' : 'Re-audit this site'}
            >
              <RefreshCw size={15} />
              <span>{demo ? 'Audit your site' : 'Re-audit'}</span>
            </Link>
          </nav>
        </div>
        {saved && (
          <div className="demo-banner">
            <span>
              <HardDrive size={13} /> SAVED SNAPSHOT · Private to this browser.
            </span>
            <Link href="/history">
              Back to history <ArrowRight size={14} />
            </Link>
          </div>
        )}
        {demo && (
          <div className="demo-banner">
            <span>
              EXAMPLE REPORT · Illustrative data. Explore every control.
            </span>
            <Link href="/">
              Try your site <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </header>
      <main id="main" className="shell report-shell">
        <div className="report-meta">
          <div>
            <span className="eyebrow">
              DIAGNOSTIC REPORT /{' '}
              {demo ? 'DEMO' : report.id.slice(0, 8).toUpperCase()}
            </span>
            <h1>
              {domain}
              <span className="accent"> /</span>
            </h1>
            <p className="mono">
              {demo
                ? 'EXAMPLE AUDIT'
                : `AUDITED ${new Date(report.createdAt).toISOString().replace('T', ' ').slice(0, 16)} UTC`}{' '}
              · MOBILE LAB TEST
            </p>
          </div>
          <div className="stack-tags">
            {report.stack.framework === 'Unknown' ? (
              <span className="tag">
                <CircleHelp size={12} /> Framework not detected
              </span>
            ) : (
              <span className="tag">
                <Code2 size={12} />
                {report.stack.framework}
              </span>
            )}
            {report.stack.hasTailwind && (
              <span className="tag">Tailwind CSS</span>
            )}
            {report.stack.deployPlatform !== 'Unknown' && (
              <span className="tag">{report.stack.deployPlatform}</span>
            )}
            <a
              className="tag"
              href={report.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit site <ExternalLink size={12} />
            </a>
          </div>
        </div>
        {!valid && (
          <div className="report-error">
            <TriangleAlert size={24} className="warn" />
            <h2>
              {view.invalid
                ? 'No reliable measurement.'
                : view.legacy
                  ? 'This report needs a fresh test.'
                  : 'A partial test, with gaps.'}
            </h2>
            <p>
              {view.invalid
                ? 'The test did not measure the main content loading. A zero score and zero timings would be misleading, so the overall score and fix prompt are withheld.'
                : view.legacy
                  ? 'This older report did not distinguish failed checks from passing ones. Run a fresh audit for an accurate priority list.'
                  : `Missing categories: ${report.measurement?.missingCategories.join(', ')}. Available measurements appear below, but a complete score cannot be calculated.`}
            </p>
            <Link
              href={reAudit}
              className="button primary"
              style={{ marginTop: 20 }}
            >
              Run a fresh test <RefreshCw size={16} />
            </Link>
          </div>
        )}
        <div className="report-grid">
          <div className="report-main">
            <section
              className="panel overview-panel"
              aria-labelledby="score-title"
            >
              <div className="panel-head">
                <span className="eyebrow" id="score-title">
                  SHIPAUDIT SCORE
                </span>
                <span className="tag">STRESS TEST</span>
              </div>
              <div className="score-overview">
                <ScoreGauge score={report.score.current} unavailable={!valid} />
                <div className="score-copy">
                  <span
                    className={`eyebrow ${valid ? scoreTone(report.score.current) : 'muted'}`}
                  >
                    {valid
                      ? report.score.current >= 90
                        ? 'STRONG SIGNAL'
                        : report.score.current >= 60
                          ? 'ROOM TO IMPROVE'
                          : 'ACTION NEEDED'
                      : 'INCOMPLETE SIGNAL'}
                  </span>
                  <h2>{valid ? verdict : 'Measure first. Then fix.'}</h2>
                  <p>
                    {valid
                      ? view.findings.length
                        ? `${view.findings.length} failed checks. ${view.passed.length} passing. Start with the highest-impact fixes below.`
                        : 'No failing checks in this test. Review the manual checks and monitor future deployments.'
                      : 'Only returned measurements are shown. Missing data never earns a green badge.'}
                  </p>
                  {valid && (
                    <div className="potential">
                      <strong>
                        {report.score.achievable}
                        <span> /100 potential</span>
                      </strong>
                      <span className="tag accent">
                        +{report.score.achievable - report.score.current} pts
                        estimated
                      </span>
                    </div>
                  )}
                  {comparison !== null && (
                    <p
                      className={`comparison ${comparison > 0 ? 'good' : comparison < 0 ? 'poor' : 'muted'}`}
                    >
                      <RefreshCw size={12} />
                      {comparison > 0
                        ? `+${comparison} points since your last test. Nice work.`
                        : comparison < 0
                          ? `${comparison} points since your last test. Check the changes.`
                          : 'Same score as your last test.'}{' '}
                      Lab runs can vary.
                    </p>
                  )}
                </div>
              </div>
              <div className="subscores">
                {(
                  [
                    ['performance', 'Performance', 'performance'],
                    ['accessibility', 'Accessibility', 'accessibility'],
                    ['seo', 'SEO', 'seo'],
                    ['bestPractices', 'Best practices', 'best-practices'],
                  ] as const
                ).map(([key, label, categoryKey], i) => {
                  const missing =
                    view.invalid ||
                    report.measurement?.missingCategories.includes(categoryKey)
                  const value = report.score.breakdown[key]
                  return (
                    <div
                      className={`subscore ${missing ? 'unavailable' : scoreTone(value)}`}
                      key={key}
                    >
                      <p>{label}</p>
                      <div className="mono">{missing ? '—' : value}</div>
                      <div className="subscore-track" aria-hidden="true">
                        <span
                          style={{
                            width: missing ? 0 : `${value}%`,
                            animationDelay: `${i * 60}ms`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
            <div className="method-line">
              <span>
                <Gauge size={13} /> Simulated mobile CPU
              </span>
              <span>
                <Wifi size={13} /> Throttled 4G
              </span>
              <span>
                <RefreshCw size={13} /> Cold cache
              </span>
              <span>
                <Clock3 size={13} /> Snapshot, not field data
              </span>
            </div>
            {valid && (
              <section className="report-section" id="priorities">
                <div className="section-heading">
                  <h2>
                    <span className="section-number">01</span> Start here.
                  </h2>
                  <span className="eyebrow">IMPACT → EFFORT</span>
                </div>
                {view.findings.length ? (
                  <div className="priority-grid">
                    {view.findings.slice(0, 3).map((f, i) => (
                      <button
                        className="priority-card"
                        key={f.id}
                        onClick={() => openFinding(f.id)}
                      >
                        <span className="eyebrow">
                          {String(i + 1).padStart(2, '0')} /{' '}
                          {f.effort ?? 'Review needed'}
                        </span>
                        <h3>{f.title}</h3>
                        <div className="impact">
                          {f.estimatedPointImpact
                            ? `+${f.estimatedPointImpact}`
                            : 'Review'}{' '}
                          <small>
                            {f.estimatedPointImpact ? 'EST. PTS' : ''}
                          </small>
                          <ArrowUpRight size={15} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <ShieldCheck className="good" size={26} />
                    <h3>A clean run.</h3>
                    <p>
                      Automated checks found no failures. Manual checks still
                      deserve a look.
                    </p>
                  </div>
                )}
                <p className="section-note">
                  Potential scores are estimates. Gains overlap; they are not
                  additive or guaranteed.
                </p>
                <div className="summary-panel">
                  <span className="eyebrow">
                    <Sparkles size={13} />{' '}
                    {report.executiveSummary.startsWith(
                      'Performance analysis for',
                    )
                      ? 'RULE-BASED SUMMARY'
                      : 'THE DIAGNOSIS'}
                  </span>
                  <p>{report.executiveSummary}</p>
                </div>
              </section>
            )}
            <section className="report-section" id="vitals">
              <div className="section-heading">
                <h2>
                  <span className="section-number">02</span> The vital signs.
                </h2>
                <span className="eyebrow">LAB MEASUREMENTS</span>
              </div>
              <div className="vitals-grid">
                {view.vitals.map((v) => (
                  <VitalCard key={v.metric} vital={v} />
                ))}
              </div>
              <p className="section-note">
                LCP, INP and CLS are Core Web Vitals. FCP and TTFB help diagnose
                the cause. This is a lab snapshot; INP requires interaction
                data.
              </p>
            </section>
            <section className="report-section" id="findings">
              <div className="section-heading">
                <h2>
                  <span className="section-number">03</span> The fix queue.
                </h2>
                <span className="eyebrow">
                  {view.findings.length} FAILED CHECKS
                </span>
              </div>
              {!view.legacy && !view.invalid && (
                <>
                  <div className="filter-bar">
                    <select
                      aria-label="Filter by category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {[
                        'All categories',
                        'Performance',
                        'Accessibility',
                        'SEO',
                        'Best practices',
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by Web Vital"
                      value={vital}
                      onChange={(e) => setVital(e.target.value)}
                    >
                      {['All vitals', 'LCP', 'INP', 'CLS', 'FCP', 'TTFB'].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                    <select
                      aria-label="Filter by effort"
                      value={effort}
                      onChange={(e) => setEffort(e.target.value)}
                    >
                      {['All efforts', 'Quick fix', 'Moderate', 'Involved'].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                    <select
                      aria-label="Sort findings"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      {['Impact first', 'Quick fixes first'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </div>
                  <p className="sr-only" role="status">
                    {findings.length} findings match the filters.
                  </p>
                  {findings.length ? (
                    <div className="findings-list">
                      {findings.map((f, i) => (
                        <FindingRow
                          key={f.id}
                          finding={f}
                          index={i}
                          report={report}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Check size={24} />
                      <h3>
                        {view.findings.length
                          ? 'Nothing in this slice.'
                          : 'No failing checks.'}
                      </h3>
                      <p>
                        {view.findings.length
                          ? 'Try another filter to see the rest of the fix queue.'
                          : 'The automated checks in this test passed.'}
                      </p>
                      {view.findings.length > 0 && (
                        <button
                          className="text-button"
                          onClick={() => {
                            setCategory('All categories')
                            setVital('All vitals')
                            setEffort('All efforts')
                          }}
                        >
                          Reset filters <RefreshCw size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
              {view.passed.length > 0 && (
                <details className="passed-section">
                  <summary>
                    <ShieldCheck size={17} /> {view.passed.length} checks passed{' '}
                    <ChevronDown size={14} />
                  </summary>
                  <ul>
                    {view.passed.map((f) => (
                      <li key={f.id}>
                        <Check size={13} />
                        <span>{f.title}</span>
                        <small>{f.category}</small>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {view.informational.length > 0 && (
                <details className="passed-section">
                  <summary className="muted">
                    <CircleHelp size={17} /> {view.informational.length}{' '}
                    informational / manual checks <ChevronDown size={14} />
                  </summary>
                  <ul>
                    {view.informational.map((f) => (
                      <li key={f.id}>
                        <CircleHelp size={13} />
                        <div>
                          {f.title}
                          <p style={{ marginTop: 5 }}>{plain(f.description)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
            {!view.invalid && !view.legacy && (
              <section className="report-section" id="resources">
                <div className="section-heading">
                  <h2>
                    <span className="section-number">04</span> Under the hood.
                  </h2>
                </div>
                <div className="resource-overview">
                  <div className="panel">
                    <span className="eyebrow">
                      <ImageIcon size={13} /> IMAGES
                    </span>
                    <strong>
                      {report.images
                        ? `${Math.round(report.images.totalWastedKb)}KB`
                        : '—'}
                    </strong>
                    <p>
                      {report.images
                        ? `estimated excess image data · ${report.images.imagesWithIssues} flagged`
                        : 'No image analysis returned.'}
                    </p>
                    {!!report.images?.issues.length && (
                      <details>
                        <summary>
                          Inspect resources <ChevronDown size={12} />
                        </summary>
                        <ul>
                          {report.images.issues.map((i) => (
                            <li key={i.url}>
                              {i.filename} · {Math.round(i.wastedSizeKb)}KB
                              excess
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <div className="panel">
                    <span className="eyebrow">
                      <Code2 size={13} /> THIRD PARTIES
                    </span>
                    <strong>
                      {report.thirdParty
                        ? `${Math.round(report.thirdParty.totalBlockingTimeMs)}ms`
                        : '—'}
                    </strong>
                    <p>
                      {report.thirdParty
                        ? `main-thread blocking · ${report.thirdParty.services.length} services identified`
                        : 'No third-party analysis returned.'}
                    </p>
                    {!!report.thirdParty?.services.length && (
                      <details>
                        <summary>
                          Inspect services <ChevronDown size={12} />
                        </summary>
                        <ul>
                          {report.thirdParty.services.map((s) => (
                            <li key={s.domain}>
                              {s.name} · {Math.round(s.blockingTimeMs)}ms
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <div className="panel">
                    <span className="eyebrow">
                      <Type size={13} /> FONTS
                    </span>
                    <strong>
                      {report.fonts ? report.fonts.renderBlockingCount : '—'}
                    </strong>
                    <p>
                      {report.fonts
                        ? `${report.fonts.renderBlockingCount === 1 ? 'blocking font' : 'blocking fonts'} · ${report.fonts.missingFontDisplayCount} missing display strategy`
                        : 'No font analysis returned.'}
                    </p>
                    {!!report.fonts?.issues.length && (
                      <details>
                        <summary>
                          Inspect fonts <ChevronDown size={12} />
                        </summary>
                        <ul>
                          {report.fonts.issues.map((f) => (
                            <li key={f.url}>
                              {f.family} ·{' '}
                              {f.hasFontDisplay
                                ? (f.fontDisplayValue ?? 'display set')
                                : 'display not found'}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </section>
            )}
            <div className="share-row">
              {valid && <ExportButton report={report} />}
              {!saved && <CopyButton label="Copy report link" text={share} />}
              {!demo && !saved && !view.invalid && !view.legacy && (
                <button
                  className="button secondary"
                  disabled={
                    historyStatus === 'saving' || historyStatus === 'saved'
                  }
                  onClick={saveSnapshot}
                >
                  <HardDrive size={14} />
                  {historyStatus === 'saved'
                    ? 'Saved to history'
                    : historyStatus === 'saving'
                      ? 'Saving…'
                      : 'Save to history'}
                </button>
              )}
              <Link className="button secondary" href="/">
                Audit another site <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <aside
            className="report-aside"
            aria-label="Fix prompt and report navigation"
          >
            {valid && (
              <section className="prompt-panel" id="fix-prompt">
                <div className="panel-head">
                  <span className="eyebrow">
                    <Sparkles size={14} /> YOUR NEXT COMMIT
                  </span>
                  <span className="tag">AI FIX PROMPT</span>
                </div>
                <div className="prompt-body">
                  <h2>
                    Take it to
                    <br />
                    your editor<span className="accent">.</span>
                  </h2>
                  <p>
                    {view.findings.length
                      ? 'A prioritized fix plan, ready for Cursor, Claude Code, or your favorite coding agent.'
                      : 'No automated failures to fix. Use this review prompt to verify the remaining manual checks.'}
                  </p>
                  <CopyButton
                    text={report.cursorPrompt}
                    label="Copy AI fix prompt"
                    primary
                  />
                  <details>
                    <summary>
                      Read the full prompt <ChevronDown size={12} />
                    </summary>
                    <pre className="prompt-text" tabIndex={0}>
                      {report.cursorPrompt}
                    </pre>
                  </details>
                  <p className="section-note">
                    Review AI suggestions before applying them. Re-audit to
                    verify the gain.
                  </p>
                </div>
              </section>
            )}
            <nav className="panel aside-nav" aria-label="Report sections">
              <span className="eyebrow">ON THIS REPORT</span>
              {[
                ['priorities', '01 / Start here', view.findings.length],
                [
                  'vitals',
                  '02 / Vital signs',
                  view.vitals.filter((v) => v.value !== null).length,
                ],
                ['findings', '03 / Fix queue', view.findings.length],
                ['resources', '04 / Resources', '↗'],
              ].map(([id, label, count]) => (
                <a key={id} href={`#${id}`}>
                  <span>{label}</span>
                  <span className="mono">{count}</span>
                </a>
              ))}
            </nav>
            <p className="section-note" role="status">
              {saved
                ? 'This snapshot stays in this browser. Export it to share or move it to another device.'
                : historyStatus === 'saved'
                  ? 'Saved to your history on this browser. The online link expires after one hour.'
                  : historyStatus === 'error'
                    ? 'Couldn’t save history. Browser storage may be unavailable. Export a copy to keep this report.'
                    : 'Online reports last one hour. Save a local snapshot to revisit it anytime.'}{' '}
              <Link href="/history">Open history ↗</Link>
            </p>
          </aside>
        </div>
        <div className="report-guard">
          <GuardPanel findingCount={valid ? view.findings.length : undefined} />
        </div>
      </main>
      {valid && (
        <div className="mobile-prompt">
          <span>Ready for your editor?</span>
          <CopyButton
            primary
            text={report.cursorPrompt}
            label="Copy AI fix prompt"
          />
        </div>
      )}
      <footer className="site-footer shell">
        <Link href="/">
          <Logo size="sm" theme="dark" />
        </Link>
        <span>Measure. Fix. Re-audit. Ship.</span>
      </footer>
    </>
  )
}
