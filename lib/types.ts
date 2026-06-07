export type Framework =
  | 'Next.js'
  | 'Nuxt'
  | 'Remix'
  | 'Astro'
  | 'Angular'
  | 'Vue'
  | 'Svelte'
  | 'React'
  | 'SolidJS'
  | 'Django'
  | 'Laravel'
  | 'Rails'
  | 'WordPress'
  | 'HTML'
  | 'Unknown'

export type DeployPlatform =
  | 'Vercel'
  | 'Railway'
  | 'Netlify'
  | 'Render'
  | 'Fly.io'
  | 'Unknown'

export interface DetectedStack {
  framework: Framework
  frameworkVersion?: string
  deployPlatform: DeployPlatform
  hasTailwind: boolean
  rawSignals: string[]
}

export type VitalStatus = 'good' | 'needs-improvement' | 'poor'

export interface WebVital {
  metric: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB'
  value: number
  unit: 'ms' | 's' | ''
  status: VitalStatus
  threshold: { good: number; needsImprovement: number }
}

export interface Finding {
  id: string
  title: string
  description: string
  estimatedPointImpact: number
  fix: string
  lighthouseAuditId: string
}

export interface ShipAuditScore {
  current: number
  achievable: number
  topOpportunities: Finding[]
  breakdown: {
    performance: number
    accessibility: number
    seo: number
    bestPractices: number
  }
}

export interface AuditReport {
  id: string
  url: string
  createdAt: string
  stack: DetectedStack
  score: ShipAuditScore
  vitals: WebVital[]
  findings: Finding[]
  executiveSummary: string
  cursorPrompt: string
}

export interface AuditRequest {
  url: string
}

export interface AuditResponse {
  reportId: string
}

export interface LighthouseAudit {
  id: string
  title: string
  description: string
  score: number | null
  numericValue?: number
  displayValue?: string
}

export interface LighthouseResult {
  categories: {
    performance?: { score: number | null }
    accessibility?: { score: number | null }
    'best-practices'?: { score: number | null }
    seo?: { score: number | null }
  }
  audits: Record<string, LighthouseAudit>
  finalDisplayedUrl?: string
  finalUrl?: string
  requestedUrl?: string
}
