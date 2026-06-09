import type { LighthouseResult, ImageAudit, ImageIssue } from './types'

const AUDIT_TO_ISSUE: Record<string, string> = {
  'uses-optimized-images':  'oversized',
  'uses-webp-images':       'wrong-format',
  'offscreen-images':       'not-lazy',
  'uses-responsive-images': 'too-large-for-display',
}

interface LhrImageItem {
  url?: string
  totalBytes?: number
  wastedBytes?: number
  node?: Record<string, unknown>
}

function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const last = pathname.split('/').filter(Boolean).pop() ?? 'image'
    return last.split('?')[0] || 'image'
  } catch {
    return url.split('/').pop()?.split('?')[0] ?? 'image'
  }
}

function extractFormat(url: string): string {
  const clean = url.split('?')[0].toLowerCase()
  const ext = clean.split('.').pop() ?? ''
  const known: Record<string, string> = {
    jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif',
    webp: 'webp', avif: 'avif', svg: 'svg',
  }
  return known[ext] ?? 'unknown'
}

function getLcpImageUrl(lhr: LighthouseResult): string | null {
  try {
    const items = (lhr.audits['largest-contentful-paint-element']?.details?.items ?? []) as Record<string, unknown>[]
    for (const item of items) {
      const node = item.node as Record<string, unknown> | undefined
      if (!node) continue
      const snippet = (node.snippet as string) ?? ''
      const match = snippet.match(/src=["']([^"']+)["']/)
      if (match) return match[1]
    }
  } catch { /* ignore */ }
  return null
}

export function analyzeImages(lhr: LighthouseResult): ImageAudit {
  // Map: url → { totalBytes, wastedBytes, issues }
  const imageMap = new Map<string, { totalBytes: number; wastedBytes: number; issues: Set<string> }>()

  for (const [auditId, issueLabel] of Object.entries(AUDIT_TO_ISSUE)) {
    const audit = lhr.audits[auditId]
    if (!audit || audit.score === null || audit.score >= 0.9) continue
    const items = (audit.details?.items ?? []) as LhrImageItem[]
    for (const item of items) {
      if (!item.url) continue
      const existing = imageMap.get(item.url)
      if (existing) {
        existing.wastedBytes = Math.max(existing.wastedBytes, item.wastedBytes ?? 0)
        existing.issues.add(issueLabel)
      } else {
        imageMap.set(item.url, {
          totalBytes: item.totalBytes ?? 0,
          wastedBytes: item.wastedBytes ?? 0,
          issues: new Set([issueLabel]),
        })
      }
    }
  }

  if (imageMap.size === 0) {
    return { issues: [], totalWastedKb: 0, totalImages: 0, imagesWithIssues: 0 }
  }

  const lcpUrl = getLcpImageUrl(lhr)
  const lcpFilename = lcpUrl ? extractFilename(lcpUrl) : null

  const issues: ImageIssue[] = Array.from(imageMap.entries()).map(([url, data]) => {
    const wastedSizeKb = Math.round((data.wastedBytes / 1024) * 10) / 10
    const currentSizeKb = Math.round((data.totalBytes / 1024) * 10) / 10
    const filename = extractFilename(url)

    const issue: ImageIssue = {
      url,
      filename,
      currentSizeKb,
      wastedSizeKb,
      format: extractFormat(url),
      issues: Array.from(data.issues),
    }

    // Rough LCP impact heuristic: 100KB saved ≈ 150ms LCP improvement
    if (lcpFilename && filename === lcpFilename) {
      issue.estimatedLcpImpactMs = Math.round((wastedSizeKb / 100) * 150)
    }

    return issue
  })

  issues.sort((a, b) => b.wastedSizeKb - a.wastedSizeKb)

  const totalWastedKb = Math.round(issues.reduce((s, i) => s + i.wastedSizeKb, 0) * 10) / 10

  return {
    issues: issues.slice(0, 10),
    totalWastedKb,
    totalImages: imageMap.size,
    imagesWithIssues: imageMap.size,
  }
}
