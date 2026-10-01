import type { DetectedStack, Framework, DeployPlatform } from './types'

const UNKNOWN_STACK: DetectedStack = {
  framework: 'Unknown',
  deployPlatform: 'Unknown',
  hasTailwind: false,
  rawSignals: [],
}

export function detectTailwind(html: string): boolean {
  if (/--tw-[a-z-]+\s*:/.test(html)) return true
  const classes = Array.from(html.matchAll(/\bclass\s*=\s*["']([^"']*)["']/gi))
    .map((match) => match[1])
    .join(' ')
  const utilities = classes.match(
    /\b(?:text-(?:xs|sm|base|lg|xl|[2-9]xl)|(?:text|bg)-[a-z]+-\d{2,3}|[pm][xytrbl]?-\d+|(?:grid-cols|gap)-\d+|rounded-(?:sm|md|lg|xl|[2-3]xl))\b/g,
  )
  return new Set(utilities ?? []).size >= 3
}

export async function detectFramework(url: string): Promise<DetectedStack> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'ShipAudit/1.0' },
    })
    if (!res.ok) return UNKNOWN_STACK

    const html = await res.text()
    const headers = res.headers
    const rawSignals: string[] = []

    // ── Framework detection (HTML signals) ──────────────────────────────────
    let framework: Framework = 'Unknown'

    if (html.includes('__NEXT_DATA__') || html.includes('/_next/static/')) {
      framework = 'Next.js'
      rawSignals.push('html:__NEXT_DATA__')
    } else if (html.includes('__NUXT_DATA__') || html.includes('/_nuxt/')) {
      framework = 'Nuxt'
      rawSignals.push('html:__NUXT_DATA__')
    } else if (html.includes('__remixContext')) {
      framework = 'Remix'
      rawSignals.push('html:__remixContext')
    } else if (html.includes('<astro-island')) {
      framework = 'Astro'
      rawSignals.push('html:astro-island')
    } else if (html.includes('ng-version')) {
      framework = 'Angular'
      rawSignals.push('html:ng-version')
    } else if (html.includes('data-v-app')) {
      framework = 'Vue'
      rawSignals.push('html:data-v-app')
    } else if (html.includes('__svelte') || html.includes('svelte-')) {
      framework = 'Svelte'
      rawSignals.push('html:svelte')
    } else if (
      html.includes('data-reactroot') ||
      html.includes('data-reactid')
    ) {
      framework = 'React'
      rawSignals.push('html:data-reactroot')
    } else if (html.includes('wp-content') || html.includes('wp-includes')) {
      framework = 'WordPress'
      rawSignals.push('html:wp-content')
    }

    // ── Platform detection (response headers) ───────────────────────────────
    let deployPlatform: DeployPlatform = 'Unknown'

    if (
      headers.get('x-vercel-id') ||
      headers.get('server')?.includes('Vercel')
    ) {
      deployPlatform = 'Vercel'
      rawSignals.push('header:x-vercel-id')
    } else if (
      headers.get('x-railway-request-id') ||
      headers.get('server')?.includes('railway')
    ) {
      deployPlatform = 'Railway'
      rawSignals.push('header:x-railway-request-id')
    } else if (headers.get('x-nf-request-id') || headers.get('x-netlify')) {
      deployPlatform = 'Netlify'
      rawSignals.push('header:x-nf-request-id')
    } else if (
      headers.get('x-render-origin-server') ||
      headers.get('server')?.includes('Render')
    ) {
      deployPlatform = 'Render'
      rawSignals.push('header:x-render-origin-server')
    } else if (headers.get('fly-request-id')) {
      deployPlatform = 'Fly.io'
      rawSignals.push('header:fly-request-id')
    } else {
      const xPoweredBy = headers.get('x-powered-by')?.toLowerCase() ?? ''
      const serverHeader = headers.get('server')?.toLowerCase() ?? ''
      if (xPoweredBy.includes('express') || xPoweredBy.includes('node')) {
        deployPlatform = 'Node.js'
        rawSignals.push('header:x-powered-by:express')
      } else if (xPoweredBy.includes('php')) {
        deployPlatform = 'PHP'
        rawSignals.push('header:x-powered-by:php')
      } else if (serverHeader.includes('nginx')) {
        deployPlatform = 'nginx'
        rawSignals.push('header:server:nginx')
      } else if (serverHeader.includes('apache')) {
        deployPlatform = 'Apache'
        rawSignals.push('header:server:apache')
      }
    }

    // ── Tailwind detection ───────────────────────────────────────────────────
    const hasTailwind = detectTailwind(html)
    if (hasTailwind) rawSignals.push('html:tailwind-classes')

    return { framework, deployPlatform, hasTailwind, rawSignals }
  } catch {
    return UNKNOWN_STACK
  }
}
