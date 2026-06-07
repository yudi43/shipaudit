import type { Framework, Finding, LighthouseResult, ShipAuditScore } from './types'

// PRD-defined score weights — do not change
const WEIGHTS = { performance: 0.5, accessibility: 0.2, seo: 0.15, bestPractices: 0.15 }

// PRD-defined audit impact weights — do not change
const WEIGHT_MAP: Record<string, number> = {
  'render-blocking-resources':    18,
  'uses-optimized-images':        16,
  'uses-responsive-images':       15,
  'largest-contentful-paint-element': 14,
  'unused-javascript':            13,
  'unused-css-rules':             10,
  'uses-text-compression':         9,
  'efficient-animated-content':    8,
  'server-response-time':          8,
  'uses-long-cache-ttl':           7,
  'unminified-javascript':         6,
  'unminified-css':                5,
  'dom-size':                      5,
  'uses-webp-images':              5,
  'offscreen-images':              5,
  'third-party-summary':           4,
  'bootup-time':                   4,
  'mainthread-work-breakdown':     4,
  'font-display':                  3,
  'image-alt':                     3,
  'document-title':                2,
  'meta-description':              2,
  'tap-targets':                   2,
  'cumulative-layout-shift':       2,
}

// Framework-aware fix instructions
type FixEntry = Partial<Record<Framework | 'default', string>>
const FIX_MAP: Record<string, FixEntry> = {
  'uses-optimized-images': {
    'Next.js': 'Replace <img> with next/image — it auto-compresses, resizes, and serves WebP. Add `sizes` prop to enable responsive srcset.',
    'Nuxt':    'Install @nuxt/image and replace <img> with <NuxtImg> — it handles compression and format conversion automatically.',
    'Astro':   'Use <Image> from astro:assets instead of <img>. Set `format="webp"` and `quality={80}`.',
    'default': 'Compress images with Squoosh or sharp. Serve WebP/AVIF and add proper width/height attributes to reduce CLS.',
  },
  'render-blocking-resources': {
    'Next.js': 'Wrap third-party scripts with next/script using `strategy="afterInteractive"` or `"lazyOnload"`. CSS: inline critical styles via `<style>` or use CSS Modules.',
    'Nuxt':    'Use `useScript` composable with `trigger: "client"`. Move non-critical CSS to lazy-loaded routes.',
    'Astro':   'Add `defer` or `async` to script tags. Use `is:inline` sparingly. Move non-critical styles to `<style is:global>` in a lazy-loaded layout.',
    'default': 'Add `defer` or `async` to non-critical scripts. Inline critical CSS and load the rest asynchronously using `media="print"` trick.',
  },
  'unused-javascript': {
    'Next.js': 'Run `ANALYZE=true next build` with @next/bundle-analyzer to find large dependencies. Use dynamic imports: `const Comp = dynamic(() => import("./Comp"))` for below-fold components.',
    'Nuxt':    'Use `defineAsyncComponent` for large components. Enable `splitChunks` in nuxt.config. Audit with `npx nuxi analyze`.',
    'Astro':   'Move JavaScript to `.astro` components and use `client:visible` or `client:idle` directives instead of `client:load`.',
    'default': 'Run `npx source-map-explorer dist/*.js` to identify large modules. Tree-shake unused exports and consider code-splitting with dynamic imports.',
  },
  'unused-css-rules': {
    'Next.js': 'Enable Tailwind CSS purging (already on in prod). Remove unused global CSS. Use CSS Modules to scope styles per component.',
    'Nuxt':    'Use scoped styles (`<style scoped>`). Add PurgeCSS via nuxt.config if using global CSS frameworks.',
    'default': 'Add PurgeCSS to your build pipeline. Audit with Chrome DevTools Coverage tab. Remove or lazy-load unused stylesheets.',
  },
  'server-response-time': {
    'Next.js': 'Wrap slow data fetches with `unstable_cache` or `cache()`. Add a CDN (Vercel Edge Network, Cloudflare) in front of your origin. Check for N+1 DB queries.',
    'Nuxt':    'Use `useFetch` with cache headers. Enable Nuxt server-side caching with `nitro.storage`. Add Cloudflare in front for static content.',
    'Rails':   'Add database indexes, use `bullet` gem to detect N+1s, and configure Redis caching with `cache_store = :redis_cache_store`.',
    'Django':  'Enable `django.middleware.cache.CacheMiddleware`, add DB indexes, and profile with `django-debug-toolbar`.',
    'default': 'Profile your server with APM tooling. Add database indexes for common queries. Put a CDN (Cloudflare) in front of your origin.',
  },
  'uses-responsive-images': {
    'Next.js': 'Add the `sizes` prop to next/image components: `sizes="(max-width: 768px) 100vw, 50vw"`. Next.js will generate a srcset automatically.',
    'Nuxt':    'Use <NuxtImg sizes="sm:100vw md:50vw"> to generate responsive srcset.',
    'Astro':   'Add `widths={[400, 800, 1200]}` and `sizes="..."` to your <Image> components.',
    'default': 'Add `srcset` and `sizes` attributes to your <img> tags to serve appropriately-sized images per viewport.',
  },
  'largest-contentful-paint-element': {
    'Next.js': 'Add `priority` prop to the hero next/image. Preload critical fonts in `<Head>`. Move the LCP element above the fold in the DOM.',
    'default': 'Add `<link rel="preload">` for the LCP image. Ensure the LCP element is above the fold and not hidden by JS.',
  },
  'uses-text-compression': {
    'Next.js': 'Enable compression in next.config: `compress: true` (default). Ensure your hosting layer (Vercel/Nginx) serves gzip/brotli.',
    'default': 'Enable gzip or brotli compression on your web server (Nginx: `gzip on;`, Apache: `mod_deflate`).',
  },
  'efficient-animated-content': {
    'default': 'Replace animated GIFs with `<video autoplay loop muted playsinline>` using WebM/MP4 — typically 5–10× smaller.',
  },
  'uses-long-cache-ttl': {
    'Next.js': 'Next.js hashes static assets by default. Set `Cache-Control: public, max-age=31536000, immutable` on /_next/static/ in your CDN or next.config headers.',
    'default': 'Set long `Cache-Control: max-age=31536000, immutable` headers for versioned assets. Use content-hashed filenames.',
  },
  'unminified-javascript': {
    'default': 'Ensure your bundler (Webpack/Vite/esbuild) runs with production mode enabled. Check that `NODE_ENV=production` is set during your build.',
  },
  'unminified-css': {
    'default': 'Enable CSS minification in your bundler. For PostCSS: add `cssnano`. For Vite: this is on by default in production builds.',
  },
  'dom-size': {
    'Next.js': 'Virtualize long lists with `react-window` or `@tanstack/virtual`. Avoid deeply-nested layout wrappers. Target < 1,500 DOM nodes.',
    'default': 'Virtualize long lists. Remove unnecessary wrapper divs. Target < 1,500 total DOM nodes per Google\'s recommendation.',
  },
  'uses-webp-images': {
    'Next.js': 'next/image serves WebP/AVIF automatically. For static assets in /public, run them through `sharp --webp` during your build.',
    'default': 'Convert images to WebP with `cwebp` or Squoosh. Serve with `<picture>` fallback for Safari/IE.',
  },
  'offscreen-images': {
    'Next.js': 'Add `loading="lazy"` to below-fold next/image components (or omit `priority`). This is the default for non-priority images.',
    'default': 'Add `loading="lazy"` to below-fold <img> tags. Native lazy-loading is supported in all modern browsers.',
  },
  'third-party-summary': {
    'default': 'Audit third-party scripts with WebPageTest. Self-host critical resources where possible. Load analytics and chat widgets with `defer` after page load.',
  },
  'bootup-time': {
    'Next.js': 'Reduce JS bundle size (see unused-javascript). Use `dynamic()` for heavy components. Move computation off the main thread with Web Workers.',
    'default': 'Profile with Chrome DevTools Performance panel. Move expensive computation to Web Workers. Reduce and split JS bundles.',
  },
  'mainthread-work-breakdown': {
    'default': 'Use Chrome DevTools Performance panel to identify long tasks. Break them up with `scheduler.postTask()` or `setTimeout(..., 0)`. Reduce JavaScript parse/compile time.',
  },
  'font-display': {
    'Next.js': 'Next.js font system (`next/font`) sets `font-display: swap` automatically. For self-hosted fonts, add `font-display: optional` for LCP fonts.',
    'default': 'Add `font-display: swap` (or `optional` for LCP fonts) to all @font-face declarations.',
  },
  'image-alt': {
    'default': 'Add descriptive `alt` attributes to all <img> tags. Use `alt=""` for decorative images. This is also required for WCAG 2.1 compliance.',
  },
  'document-title': {
    'Next.js': 'Add `export const metadata = { title: "..." }` to your page.tsx. For dynamic titles use `generateMetadata()`.',
    'default': 'Add a descriptive <title> tag to every page. It should be 50–60 characters and describe the page content.',
  },
  'meta-description': {
    'Next.js': 'Add `export const metadata = { description: "..." }` to your page.tsx. Keep it 120–160 characters.',
    'default': 'Add `<meta name="description" content="...">` to every page. Keep it 120–160 characters and unique per page.',
  },
  'tap-targets': {
    'default': 'Ensure interactive elements are at least 48×48px with 8px spacing between them. Use `min-height: 48px; min-width: 48px` in CSS.',
  },
  'cumulative-layout-shift': {
    'Next.js': 'Add explicit `width` and `height` to all next/image components. Reserve space for dynamically injected content (ads, embeds) with `aspect-ratio` or a placeholder div.',
    'default': 'Add `width` and `height` attributes to <img> and <video> tags. Reserve space for late-loading content using `aspect-ratio` in CSS.',
  },
}

function score100(s: number | null | undefined): number {
  return Math.round((s ?? 0) * 100)
}

export function runRuleEngine(
  lhr: LighthouseResult,
  framework: Framework
): { score: ShipAuditScore; findings: Finding[] } {
  const breakdown = {
    performance:    score100(lhr.categories.performance?.score),
    accessibility:  score100(lhr.categories.accessibility?.score),
    seo:            score100(lhr.categories.seo?.score),
    bestPractices:  score100(lhr.categories['best-practices']?.score),
  }

  const current = Math.round(
    breakdown.performance  * WEIGHTS.performance +
    breakdown.accessibility * WEIGHTS.accessibility +
    breakdown.seo          * WEIGHTS.seo +
    breakdown.bestPractices * WEIGHTS.bestPractices
  )

  // Collect findings for every weighted audit that is failing (score < 0.9 or null)
  const findings: Finding[] = []

  for (const [auditId, impact] of Object.entries(WEIGHT_MAP)) {
    const audit = lhr.audits[auditId]
    if (!audit) continue
    if (audit.score !== null && audit.score >= 0.9) continue

    const fixEntry = FIX_MAP[auditId] ?? {}
    const fix = fixEntry[framework] ?? fixEntry['default'] ?? 'Review this audit in Lighthouse for specific recommendations.'

    findings.push({
      id: auditId,
      title: audit.title,
      description: audit.description,
      estimatedPointImpact: impact,
      fix,
      lighthouseAuditId: auditId,
    })
  }

  findings.sort((a, b) => b.estimatedPointImpact - a.estimatedPointImpact)

  const topOpportunities = findings.slice(0, 3)
  const top3Impact = topOpportunities.reduce((sum, f) => sum + f.estimatedPointImpact, 0)
  const achievable = Math.min(100, current + top3Impact)

  return {
    score: { current, achievable, topOpportunities, breakdown },
    findings,
  }
}
