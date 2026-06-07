import type { DetectedStack, Framework, DeployPlatform } from './types'

const UNKNOWN_STACK: DetectedStack = {
  framework: 'Unknown',
  deployPlatform: 'Unknown',
  hasTailwind: false,
  rawSignals: [],
}

export async function detectFramework(url: string): Promise<DetectedStack> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ShipAudit/1.0' },
    })
    clearTimeout(timeout)

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
    } else if (html.includes('data-reactroot') || html.includes('data-reactid')) {
      framework = 'React'
      rawSignals.push('html:data-reactroot')
    } else if (html.includes('wp-content') || html.includes('wp-includes')) {
      framework = 'WordPress'
      rawSignals.push('html:wp-content')
    }

    // ── Platform detection (response headers) ───────────────────────────────
    let deployPlatform: DeployPlatform = 'Unknown'

    if (headers.get('x-vercel-id') || headers.get('server')?.includes('Vercel')) {
      deployPlatform = 'Vercel'
      rawSignals.push('header:x-vercel-id')
    } else if (headers.get('x-railway-request-id') || headers.get('server')?.includes('railway')) {
      deployPlatform = 'Railway'
      rawSignals.push('header:x-railway-request-id')
    } else if (headers.get('x-nf-request-id') || headers.get('x-netlify')) {
      deployPlatform = 'Netlify'
      rawSignals.push('header:x-nf-request-id')
    } else if (headers.get('x-render-origin-server') || headers.get('server')?.includes('Render')) {
      deployPlatform = 'Render'
      rawSignals.push('header:x-render-origin-server')
    } else if (headers.get('fly-request-id')) {
      deployPlatform = 'Fly.io'
      rawSignals.push('header:fly-request-id')
    }

    // ── Tailwind detection ───────────────────────────────────────────────────
    const hasTailwind =
      /\b(?:text-\w+-\d+|bg-\w+-\d+|p[xy]?-\d+|m[xy]?-\d+|flex|grid|rounded(?:-\w+)?|shadow(?:-\w+)?)\b/.test(
        html
      )
    if (hasTailwind) rawSignals.push('html:tailwind-classes')

    return { framework, deployPlatform, hasTailwind, rawSignals }
  } catch {
    return UNKNOWN_STACK
  }
}
