import type { LighthouseResult, ThirdPartyAudit, ThirdPartyService } from './types'

type ServiceCategory = ThirdPartyService['category']
interface ServiceInfo { name: string; category: ServiceCategory }

const SERVICE_MAP: Record<string, ServiceInfo> = {
  // Analytics
  'googletagmanager.com':    { name: 'Google Tag Manager',    category: 'analytics' },
  'google-analytics.com':    { name: 'Google Analytics',      category: 'analytics' },
  'analytics.google.com':    { name: 'Google Analytics',      category: 'analytics' },
  'segment.com':             { name: 'Segment',                category: 'analytics' },
  'segment.io':              { name: 'Segment',                category: 'analytics' },
  'mixpanel.com':            { name: 'Mixpanel',               category: 'analytics' },
  'amplitude.com':           { name: 'Amplitude',              category: 'analytics' },
  'hotjar.com':              { name: 'Hotjar',                 category: 'analytics' },
  'fullstory.com':           { name: 'FullStory',              category: 'analytics' },
  'heap.io':                 { name: 'Heap',                   category: 'analytics' },
  'posthog.com':             { name: 'PostHog',                category: 'analytics' },
  'clarity.ms':              { name: 'Microsoft Clarity',      category: 'analytics' },
  'plausible.io':            { name: 'Plausible',              category: 'analytics' },
  // Advertising
  'googlesyndication.com':   { name: 'Google Ads',             category: 'advertising' },
  'doubleclick.net':         { name: 'Google DoubleClick',     category: 'advertising' },
  'facebook.net':            { name: 'Meta Pixel',             category: 'advertising' },
  'connect.facebook.net':    { name: 'Meta Pixel',             category: 'advertising' },
  'ads.twitter.com':         { name: 'Twitter Ads',            category: 'advertising' },
  'static.ads-twitter.com':  { name: 'Twitter Ads',            category: 'advertising' },
  'snap.licdn.com':          { name: 'LinkedIn Insight Tag',   category: 'advertising' },
  // Social
  'platform.twitter.com':    { name: 'Twitter Embed',          category: 'social' },
  'platform.linkedin.com':   { name: 'LinkedIn',               category: 'social' },
  'www.facebook.com':        { name: 'Facebook SDK',           category: 'social' },
  // Chat
  'intercom.io':             { name: 'Intercom',               category: 'chat' },
  'intercom.com':            { name: 'Intercom',               category: 'chat' },
  'js.intercomcdn.com':      { name: 'Intercom',               category: 'chat' },
  'widget.intercom.io':      { name: 'Intercom',               category: 'chat' },
  'tawk.to':                 { name: 'Tawk.to',                category: 'chat' },
  'zopim.com':               { name: 'Zendesk Chat',           category: 'chat' },
  'zendesk.com':             { name: 'Zendesk',                category: 'chat' },
  'freshchat.com':           { name: 'Freshchat',              category: 'chat' },
  'drift.com':               { name: 'Drift',                  category: 'chat' },
  'driftt.com':              { name: 'Drift',                  category: 'chat' },
  'hubspot.com':             { name: 'HubSpot',                category: 'chat' },
  'hs-scripts.com':          { name: 'HubSpot',                category: 'chat' },
  'hs-analytics.net':        { name: 'HubSpot',                category: 'analytics' },
  // CDN
  'cloudflare.com':          { name: 'Cloudflare',             category: 'cdn' },
  'jsdelivr.net':            { name: 'jsDelivr',               category: 'cdn' },
  'unpkg.com':               { name: 'unpkg',                  category: 'cdn' },
  'cdnjs.cloudflare.com':    { name: 'cdnjs',                  category: 'cdn' },
}

function extractHostname(origin: string): string {
  try {
    const normalized = origin.startsWith('http') ? origin : `https://${origin}`
    return new URL(normalized).hostname.replace(/^www\./, '')
  } catch {
    return origin.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}

function lookupService(hostname: string): ServiceInfo {
  if (SERVICE_MAP[hostname]) return SERVICE_MAP[hostname]
  // Walk suffixes: sub.domain.com → domain.com → com
  const parts = hostname.split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join('.')
    if (SERVICE_MAP[suffix]) return SERVICE_MAP[suffix]
  }
  return { name: hostname, category: 'other' }
}

interface LhrThirdPartyItem {
  entity: string | { name?: string; origins?: string[]; homepage?: string }
  blockingTime?: number
  mainThreadTime?: number
  transferSize?: number
  requestCount?: number
}

export function analyzeThirdParties(lhr: LighthouseResult): ThirdPartyAudit {
  const audit = lhr.audits['third-party-summary']
  const items = (audit?.details?.items ?? []) as unknown as LhrThirdPartyItem[]

  if (items.length === 0) {
    return { services: [], totalBlockingTimeMs: 0, totalTransferSizeKb: 0, worstOffender: null }
  }

  const services: ThirdPartyService[] = items.map((item) => {
    const entityName = typeof item.entity === 'string' ? item.entity : (item.entity?.name ?? '')
    const origins = typeof item.entity === 'object' ? (item.entity?.origins ?? []) : []

    // Try each origin for a named service match
    let info: ServiceInfo | null = null
    for (const origin of origins) {
      const h = extractHostname(origin)
      const candidate = lookupService(h)
      if (candidate.category !== 'other') { info = candidate; break }
    }
    // Fall back to entity name as a domain
    if (!info) {
      const hostname = origins[0] ? extractHostname(origins[0]) : extractHostname(entityName)
      info = lookupService(hostname)
      // If still 'other', use the entity name as a friendly label
      if (info.category === 'other' && entityName && !entityName.includes('.')) {
        info = { name: entityName, category: 'other' }
      }
    }

    const domain = origins[0] ? extractHostname(origins[0]) : extractHostname(entityName)

    return {
      name: info.name,
      domain,
      blockingTimeMs: Math.round(item.blockingTime ?? 0),
      transferSizeKb: Math.round(((item.transferSize ?? 0) / 1024) * 10) / 10,
      requestCount: item.requestCount ?? 0,
      category: info.category,
    }
  })

  services.sort((a, b) => b.blockingTimeMs - a.blockingTimeMs)

  const totalBlockingTimeMs = services.reduce((s, v) => s + v.blockingTimeMs, 0)
  const totalTransferSizeKb = Math.round(services.reduce((s, v) => s + v.transferSizeKb, 0) * 10) / 10
  const worstOffender = (services[0]?.blockingTimeMs ?? 0) > 0 ? services[0] : null

  return { services, totalBlockingTimeMs, totalTransferSizeKb, worstOffender }
}
