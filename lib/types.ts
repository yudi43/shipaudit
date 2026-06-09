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
  | 'Node.js'
  | 'PHP'
  | 'nginx'
  | 'Apache'
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

// ── Third-party services ──────────────────────────────────────────────────────

export interface ThirdPartyService {
  name: string
  domain: string
  blockingTimeMs: number
  transferSizeKb: number
  requestCount: number
  category: 'analytics' | 'advertising' | 'social' | 'chat' | 'cdn' | 'other'
}

export interface ThirdPartyAudit {
  services: ThirdPartyService[]
  totalBlockingTimeMs: number
  totalTransferSizeKb: number
  worstOffender: ThirdPartyService | null
}

// ── Image audit ───────────────────────────────────────────────────────────────

export interface ImageIssue {
  url: string
  filename: string
  currentSizeKb: number
  wastedSizeKb: number
  naturalWidth?: number
  naturalHeight?: number
  renderedWidth?: number
  renderedHeight?: number
  format: string
  issues: string[]
  estimatedLcpImpactMs?: number
}

export interface ImageAudit {
  issues: ImageIssue[]
  totalWastedKb: number
  totalImages: number
  imagesWithIssues: number
}

// ── Font audit ────────────────────────────────────────────────────────────────

export interface FontIssue {
  url: string
  family: string
  format: string
  sizeKb: number
  hasFontDisplay: boolean
  fontDisplayValue?: string
  isRenderBlocking: boolean
  source: 'google-fonts' | 'typekit' | 'self-hosted' | 'other'
}

export interface FontAudit {
  issues: FontIssue[]
  renderBlockingCount: number
  missingFontDisplayCount: number
  totalFontSizeKb: number
  googleFontsCount: number
}

// ── Core report ───────────────────────────────────────────────────────────────

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
  // Optional so cached reports without these fields still render
  thirdParty?: ThirdPartyAudit
  images?: ImageAudit
  fonts?: FontAudit
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
  details?: {
    type?: string
    items?: Record<string, unknown>[]
  }
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
