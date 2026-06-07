import type { LighthouseResult, WebVital, VitalStatus } from './types'

interface VitalSpec {
  metric: WebVital['metric']
  auditId: string
  unit: WebVital['unit']
  good: number
  needsImprovement: number
}

const VITAL_SPECS: VitalSpec[] = [
  { metric: 'LCP',  auditId: 'largest-contentful-paint', unit: 'ms', good: 2500,  needsImprovement: 4000  },
  { metric: 'INP',  auditId: 'interaction-to-next-paint', unit: 'ms', good: 200,   needsImprovement: 500   },
  { metric: 'CLS',  auditId: 'cumulative-layout-shift',  unit: '',   good: 0.1,   needsImprovement: 0.25  },
  { metric: 'FCP',  auditId: 'first-contentful-paint',   unit: 'ms', good: 1800,  needsImprovement: 3000  },
  { metric: 'TTFB', auditId: 'server-response-time',     unit: 'ms', good: 800,   needsImprovement: 1800  },
]

function getStatus(value: number, good: number, needsImprovement: number): VitalStatus {
  if (value <= good) return 'good'
  if (value <= needsImprovement) return 'needs-improvement'
  return 'poor'
}

export function parseVitals(lhr: LighthouseResult): WebVital[] {
  return VITAL_SPECS.map((spec) => {
    const audit = lhr.audits[spec.auditId]
    const value = audit?.numericValue ?? 0
    return {
      metric: spec.metric,
      value,
      unit: spec.unit,
      status: getStatus(value, spec.good, spec.needsImprovement),
      threshold: { good: spec.good, needsImprovement: spec.needsImprovement },
    }
  })
}
