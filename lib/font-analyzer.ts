import type { LighthouseResult, FontAudit, FontIssue } from './types'

function isFontUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    lower.includes('.woff') ||
    lower.includes('.ttf') ||
    lower.includes('.otf') ||
    lower.includes('fonts.googleapis.com') ||
    lower.includes('fonts.gstatic.com') ||
    lower.includes('typekit.net')
  )
}

function extractFontFormat(url: string): string {
  const lower = url.toLowerCase().split('?')[0]
  if (lower.includes('.woff2')) return 'woff2'
  if (lower.includes('.woff')) return 'woff'
  if (lower.includes('.ttf')) return 'ttf'
  if (lower.includes('.otf')) return 'otf'
  return 'unknown'
}

function extractFontFamily(url: string): string {
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    const familyParam = url.match(/[?&]family=([^&;]+)/)
    if (familyParam) {
      const raw = decodeURIComponent(familyParam[1].split(':')[0].replace(/\+/g, ' '))
      return raw.split('|')[0].trim() || 'Google Font'
    }
    // gstatic path: /s/inter/v13/...
    const pathMatch = url.match(/\/s\/([a-z][a-z0-9]+)\//)
    if (pathMatch) return pathMatch[1].charAt(0).toUpperCase() + pathMatch[1].slice(1)
    return 'Google Font'
  }
  if (url.includes('typekit.net') || url.includes('adobe.com')) return 'Adobe Typekit font'

  // Self-hosted: infer from filename
  const filename = url.split('/').pop()?.split('?')[0] ?? ''
  const nameMatch = filename.match(/^([a-zA-Z][a-zA-Z0-9-]+?)[-_]?(regular|bold|italic|light|medium|semibold|thin|black|\d{3})?(\.|$)/i)
  if (nameMatch?.[1]) return nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)
  return filename || 'Unknown Font'
}

function detectSource(url: string): FontIssue['source'] {
  if (url.includes('googleapis.com') || url.includes('gstatic.com')) return 'google-fonts'
  if (url.includes('typekit.net') || url.includes('adobe.com')) return 'typekit'
  if (url.startsWith('http')) return 'self-hosted'
  return 'other'
}

interface LhrFontDisplayItem { url?: string; wastedMs?: number }
interface LhrRenderBlockingItem { url?: string; totalBytes?: number; wastedMs?: number }

export function analyzeFonts(lhr: LighthouseResult): FontAudit {
  const fontDisplayItems = (lhr.audits['font-display']?.details?.items ?? []) as LhrFontDisplayItem[]
  const renderBlockingItems = (lhr.audits['render-blocking-resources']?.details?.items ?? []) as LhrRenderBlockingItem[]

  const missingFontDisplay = new Set<string>(
    fontDisplayItems.map((i) => i.url).filter((u): u is string => !!u)
  )

  const renderBlockingFonts = new Set<string>(
    renderBlockingItems
      .map((i) => i.url)
      .filter((u): u is string => !!u && isFontUrl(u))
  )

  const sizeByUrl = new Map<string, number>()
  for (const item of renderBlockingItems) {
    if (item.url && item.totalBytes) sizeByUrl.set(item.url, item.totalBytes)
  }

  const allFontUrls = new Set<string>([...missingFontDisplay, ...renderBlockingFonts])

  if (allFontUrls.size === 0) {
    return { issues: [], renderBlockingCount: 0, missingFontDisplayCount: 0, totalFontSizeKb: 0, googleFontsCount: 0 }
  }

  const issues: FontIssue[] = Array.from(allFontUrls).map((url) => ({
    url,
    family: extractFontFamily(url),
    format: extractFontFormat(url),
    sizeKb: Math.round(((sizeByUrl.get(url) ?? 0) / 1024) * 10) / 10,
    hasFontDisplay: !missingFontDisplay.has(url),
    fontDisplayValue: missingFontDisplay.has(url) ? undefined : 'swap',
    isRenderBlocking: renderBlockingFonts.has(url),
    source: detectSource(url),
  }))

  return {
    issues,
    renderBlockingCount: issues.filter((i) => i.isRenderBlocking).length,
    missingFontDisplayCount: issues.filter((i) => !i.hasFontDisplay).length,
    totalFontSizeKb: Math.round(issues.reduce((s, i) => s + i.sizeKb, 0) * 10) / 10,
    googleFontsCount: issues.filter((i) => i.source === 'google-fonts').length,
  }
}
