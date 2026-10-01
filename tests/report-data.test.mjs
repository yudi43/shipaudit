import test from 'node:test'
import assert from 'node:assert/strict'
import { parseVitals } from '../lib/vitals.ts'
import { runRuleEngine } from '../lib/rule-engine.ts'
import { inspectMeasurement, reportView } from '../lib/report-view.ts'
import { normalizeUrl, formatVitalValue } from '../lib/utils.ts'
import { demoReport } from '../lib/demo-report.ts'
import { detectTailwind } from '../lib/framework-detect.ts'
const base = () => ({
  categories: {
    performance: { score: 0.8 },
    accessibility: { score: 0.8 },
    seo: { score: 0.8 },
    'best-practices': { score: 0.8 },
  },
  audits: {
    'largest-contentful-paint': {
      id: 'largest-contentful-paint',
      title: 'LCP',
      description: '',
      score: 0.5,
      numericValue: 3800,
    },
  },
})
test('missing timings are unavailable; genuine zero CLS stays valid', () => {
  const lhr = base()
  lhr.audits['cumulative-layout-shift'] = {
    id: 'cumulative-layout-shift',
    title: 'CLS',
    description: '',
    score: 1,
    numericValue: 0,
  }
  lhr.audits['first-contentful-paint'] = {
    id: 'first-contentful-paint',
    title: 'FCP',
    description: '',
    score: 0,
    numericValue: 0,
  }
  const vitals = parseVitals(lhr)
  assert.equal(vitals.find((v) => v.metric === 'INP').status, 'unavailable')
  assert.equal(vitals.find((v) => v.metric === 'FCP').value, null)
  assert.equal(vitals.find((v) => v.metric === 'CLS').status, 'good')
  assert.equal(formatVitalValue(null, 'ms'), '—')
})
test('passing and informational checks never get problem point values', () => {
  const lhr = base()
  lhr.audits['document-title'] = {
    id: 'document-title',
    title: 'Has a title',
    description: '',
    score: 1,
  }
  lhr.audits['font-display'] = {
    id: 'font-display',
    title: 'Check fonts',
    description: '',
    score: null,
    scoreDisplayMode: 'informative',
  }
  lhr.audits['render-blocking-insight'] = {
    id: 'render-blocking-insight',
    title: 'Blocking CSS',
    description: '',
    score: 0,
    details: { items: [{ url: '/site.css' }] },
  }
  const result = runRuleEngine(lhr, 'Next.js')
  assert.deepEqual(
    result.findings.map((f) => f.id),
    ['render-blocking-insight'],
  )
  assert.equal(result.findings[0].estimatedPointImpact, 18)
  assert.deepEqual(result.findings[0].resources, ['/site.css'])
  assert.match(result.findings[0].fix, /next\/script/)
  assert.equal(
    result.checks.find((f) => f.id === 'document-title').estimatedPointImpact,
    0,
  )
  assert.equal(
    result.checks.find((f) => f.id === 'font-display').status,
    'informational',
  )
})
test('Lighthouse checklist details are objects, not resource rows', () => {
  const lhr = base()
  lhr.categories.performance.auditRefs = [{ id: 'document-latency-insight' }]
  lhr.audits['document-latency-insight'] = {
    id: 'document-latency-insight',
    title: 'Document latency',
    description: '',
    score: 1,
    details: {
      type: 'checklist',
      items: {
        noRedirects: { value: true },
        serverResponseIsFast: { value: true },
        usesCompression: { value: true },
      },
    },
  }
  const result = runRuleEngine(lhr, 'HTML')
  const check = result.checks.find((f) => f.id === 'document-latency-insight')
  assert.equal(check.status, 'passed')
  assert.deepEqual(check.resources, [])
})
test('modern and legacy audit IDs do not double-count the same failure', () => {
  const lhr = base()
  lhr.audits['uses-long-cache-ttl'] = {
    id: 'uses-long-cache-ttl',
    title: 'Cache legacy',
    description: '',
    score: 0.5,
  }
  lhr.audits['cache-insight'] = {
    id: 'cache-insight',
    title: 'Cache modern',
    description: '',
    score: 0.5,
    details: { items: [{ url: '/app.js' }] },
  }
  const result = runRuleEngine(lhr, 'HTML')
  assert.deepEqual(
    result.findings.map((f) => f.id),
    ['cache-insight'],
  )
  assert.equal(result.score.achievable, result.score.current + 7)
  assert.deepEqual(result.findings[0].resources, ['/app.js'])
})
test('failed loads and denied access produce errors instead of a zero score', () => {
  assert.equal(
    inspectMeasurement({
      ...base(),
      runtimeError: {
        code: 'ERRORED_DOCUMENT_REQUEST',
        message: 'Could not load page',
      },
    }).error.code,
    'site_down',
  )
  const denied = base()
  denied.audits['http-status-code'] = { numericValue: 403 }
  assert.equal(inspectMeasurement(denied).error.code, 'blocked')
  assert.equal(
    inspectMeasurement({ categories: {}, audits: {} }).error.code,
    'result',
  )
})
test('partial categories are retained explicitly instead of silently scored as zero', () => {
  const lhr = base()
  lhr.categories.seo = { score: null }
  const measurement = inspectMeasurement(lhr)
  assert.equal(measurement.error, null)
  assert.deepEqual(measurement.missingCategories, ['seo'])
  assert.equal(
    reportView({
      ...demoReport,
      measurement: { status: 'partial', missingCategories: ['seo'] },
    }).partial,
    true,
  )
})
test('old ambiguous reports require a fresh run; measured zero scores are still valid', () => {
  const old = reportView({ ...demoReport, dataVersion: undefined })
  assert.equal(old.legacy, true)
  assert.equal(old.findings.length, 0)
  const measured = reportView({
    ...demoReport,
    score: { ...demoReport.score, current: 0 },
  })
  assert.equal(measured.invalid, false)
  const empty = reportView({
    ...demoReport,
    vitals: demoReport.vitals.map((v) => ({ ...v, value: 0 })),
  })
  assert.equal(empty.invalid, true)
})
test('URL entry adds HTTPS and rejects invalid protocols and credentials', () => {
  assert.equal(normalizeUrl(' example.com '), 'https://example.com')
  assert.equal(normalizeUrl('http://example.com/#anchor'), 'http://example.com')
  for (const value of [
    'javascript:alert(1)',
    'ftp://example.com',
    'localhost',
    'https://user:password@example.com',
  ])
    assert.throws(() => normalizeUrl(value))
})
test('Tailwind detection needs utility classes or CSS variables, not prose', () => {
  assert.equal(
    detectTailwind(
      '<style>body { display: flex; }</style><p>A grid with a shadow</p>',
    ),
    false,
  )
  assert.equal(detectTailwind('<div class="flex rounded shadow">'), false)
  assert.equal(detectTailwind('<div class="text-sm bg-gray-100 p-4">'), true)
  assert.equal(
    detectTailwind('<style>* { --tw-ring-color: #fff; }</style>'),
    true,
  )
})
