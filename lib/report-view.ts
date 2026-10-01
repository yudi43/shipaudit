import type { AuditReport, Finding, LighthouseResult } from './types'

export const CATEGORY_KEYS = [
  'performance',
  'accessibility',
  'seo',
  'best-practices',
] as const
export function inspectMeasurement(lhr: LighthouseResult) {
  const missingCategories = CATEGORY_KEYS.filter(
    (key) =>
      !Number.isFinite(lhr.categories?.[key]?.score) ||
      lhr.categories![key]!.score! < 0 ||
      lhr.categories![key]!.score! > 1,
  )
  const error = lhr.runtimeError
  const http = lhr.audits?.['http-status-code']?.numericValue
  if (
    http === 403 ||
    http === 429 ||
    /\b(?:403|429)\b/.test(error?.message ?? '')
  )
    return {
      error: {
        code: 'blocked',
        message: 'The site denied access to the audit browser.',
      },
      missingCategories,
    }
  if (error)
    return {
      error: {
        code: /DOCUMENT|DNS|FAILED|TIMED_OUT/.test(error.code)
          ? 'site_down'
          : 'result',
        message: error.message,
      },
      missingCategories,
    }
  if (
    !lhr.audits ||
    missingCategories.length === 4 ||
    !Number.isFinite(lhr.audits['largest-contentful-paint']?.numericValue) ||
    (lhr.audits['largest-contentful-paint']?.numericValue ?? 0) <= 0
  )
    return {
      error: {
        code: 'result',
        message: 'Lighthouse did not return a usable page measurement.',
      },
      missingCategories,
    }
  return { error: null, missingCategories }
}
export function reportView(report: AuditReport) {
  const legacy = report.dataVersion !== 2
  const vitals = report.vitals.map((v) =>
    v.value === null || (v.value === 0 && v.metric !== 'CLS')
      ? { ...v, value: null, status: 'unavailable' as const }
      : v,
  )
  const invalid = !vitals.some(
    (v) => v.metric === 'LCP' && v.value !== null && v.value > 0,
  )
  const partial = report.measurement?.status === 'partial'
  // Legacy reports mixed passed and failed checks without retaining their scores.
  // Showing those rows as failures would repeat the original data error.
  const findings = legacy
    ? []
    : report.findings.filter((f) => f.status === 'failed')
  return {
    legacy,
    invalid,
    partial,
    vitals,
    findings,
    passed: (report.checks ?? []).filter((f) => f.status === 'passed'),
    informational: (report.checks ?? []).filter(
      (f) => f.status === 'informational',
    ),
  }
}
export function findingPrompt(finding: Finding, report: AuditReport) {
  const stack =
    report.stack.framework === 'Unknown'
      ? 'Use standard web techniques; confirm the framework from the codebase.'
      : `This site uses ${report.stack.framework}.`
  return `Improve ${report.url}. ${stack}\n\nIssue: ${finding.title}\nEvidence: ${finding.description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}\nAffected resources: ${finding.resources?.join(', ') || 'Identify the relevant resources in the codebase.'}\n\nSuggested fix: ${finding.fix}\n\nInspect the implementation before changing it. Preserve behavior and accessibility. Verify the change with a fresh mobile Lighthouse audit.`
}
