import type { AuditReport, Finding } from './types'
const findings: Finding[] = [
  {
    id: 'image-delivery',
    lighthouseAuditId: 'image-delivery-insight',
    title: 'Right-size the hero image',
    description:
      'The 2,400px hero image is rendered at 720px. The page transfers 420KB more image data than needed.',
    estimatedPointImpact: 15,
    status: 'failed',
    category: 'Performance',
    affectedVital: 'LCP',
    effort: 'Moderate',
    resources: ['/images/hero-studio.jpg'],
    fix: 'Use next/image with responsive sizes="(max-width: 768px) 100vw, 50vw" and explicit width and height. Preload the hero image only if it is the LCP element. Serve AVIF or WebP.',
  },
  {
    id: 'render-blocking',
    lighthouseAuditId: 'render-blocking-insight',
    title: 'Clear the critical rendering path',
    description:
      'A third-party widget loads synchronously before the main page content can paint. Estimated time saved: 620ms.',
    estimatedPointImpact: 9,
    status: 'failed',
    category: 'Performance',
    affectedVital: 'FCP',
    effort: 'Quick fix',
    resources: ['https://widget.example.com/client.js'],
    fix: 'Load the non-essential widget with next/script using strategy="lazyOnload". Keep essential page styles in the critical path and verify the widget still works after deferring it.',
  },
  {
    id: 'unused-js',
    lighthouseAuditId: 'unused-javascript',
    title: 'Ship less JavaScript on the first visit',
    description:
      'The initial bundle includes a charting library used only below the fold. Approximately 86KB is unused during page load.',
    estimatedPointImpact: 0,
    status: 'failed',
    category: 'Performance',
    effort: 'Involved',
    resources: ['/_next/static/chunks/charts.js'],
    fix: 'Inspect the bundle with @next/bundle-analyzer. Dynamically import the charting component and load it when needed. Test the loading state and keyboard access.',
  },
  {
    id: 'image-alt',
    lighthouseAuditId: 'image-alt',
    title: 'Describe the project thumbnails',
    description:
      'Two meaningful project images do not have an accessible text alternative.',
    estimatedPointImpact: 0,
    status: 'failed',
    category: 'Accessibility',
    effort: 'Quick fix',
    resources: ['/images/project-one.webp', '/images/project-two.webp'],
    fix: 'Add concise, descriptive alt text to meaningful project thumbnails. Keep decorative images alt="". Verify the gallery with a screen reader.',
  },
]
const checks: Finding[] = [
  ...findings,
  ...[
    'Document has a descriptive title',
    'HTTPS connection is secure',
    'Layout stays stable while loading',
    'Text has sufficient contrast',
    'Links have descriptive names',
    'Viewport is configured for mobile',
  ].map((title, i) => ({
    id: `passed-${i}`,
    lighthouseAuditId: `passed-${i}`,
    title,
    description: 'This check passed in the example test.',
    estimatedPointImpact: 0,
    fix: '',
    status: 'passed' as const,
    category:
      i === 3 || i === 4
        ? ('Accessibility' as const)
        : i === 0
          ? ('SEO' as const)
          : ('Best practices' as const),
  })),
  {
    id: 'manual',
    lighthouseAuditId: 'manual',
    title: 'Check keyboard focus order manually',
    description:
      'Automated checks cannot fully assess keyboard navigation. Verify the focus order with Tab and Shift+Tab.',
    estimatedPointImpact: 0,
    fix: '',
    status: 'informational',
    category: 'Accessibility',
  },
]
export const demoReport: AuditReport = {
  id: 'demo',
  url: 'https://acme.studio',
  createdAt: '2026-09-30T11:30:00Z',
  dataVersion: 2,
  measurement: { status: 'complete', missingCategories: [] },
  stack: {
    framework: 'Next.js',
    deployPlatform: 'Vercel',
    hasTailwind: true,
    rawSignals: [],
  },
  score: {
    current: 71,
    achievable: 95,
    topOpportunities: findings.slice(0, 3),
    breakdown: {
      performance: 48,
      accessibility: 94,
      seo: 92,
      bestPractices: 96,
    },
  },
  vitals: [
    {
      metric: 'LCP',
      value: 3800,
      unit: 'ms',
      status: 'needs-improvement',
      threshold: { good: 2500, needsImprovement: 4000 },
    },
    {
      metric: 'INP',
      value: null,
      unit: 'ms',
      status: 'unavailable',
      threshold: { good: 200, needsImprovement: 500 },
    },
    {
      metric: 'CLS',
      value: 0.032,
      unit: '',
      status: 'good',
      threshold: { good: 0.1, needsImprovement: 0.25 },
    },
    {
      metric: 'FCP',
      value: 2200,
      unit: 'ms',
      status: 'needs-improvement',
      threshold: { good: 1800, needsImprovement: 3000 },
    },
    {
      metric: 'TTFB',
      value: 340,
      unit: 'ms',
      status: 'good',
      threshold: { good: 800, needsImprovement: 1800 },
    },
  ],
  findings,
  checks,
  executiveSummary:
    'Your content arrives, but the first impression is heavier than it needs to be. A large hero image and a blocking widget delay the main content to 3.8 seconds. Start with those two fixes, then split the charting bundle. The layout is stable and the server responds quickly; keep those wins as you reduce the page weight.',
  cursorPrompt:
    'Improve the mobile performance of https://acme.studio, a Next.js site with Tailwind CSS.\n\n1. Right-size /images/hero-studio.jpg with next/image and a responsive sizes prop. Verify that the hero is the LCP element before preloading.\n2. Load the non-essential widget with next/script using strategy="lazyOnload".\n3. Inspect the bundle and dynamically import the charting component below the fold.\n4. Add descriptive alt text to the project thumbnails.\n\nKeep the current visual design, behavior, and accessibility. Inspect existing code before making changes. Validate with a fresh mobile Lighthouse audit. Current lab LCP: 3.8s; aim for ≤2.5s. Estimated gains are directional and must be verified.',
  images: {
    issues: [
      {
        url: '/images/hero-studio.jpg',
        filename: 'hero-studio.jpg',
        currentSizeKb: 540,
        wastedSizeKb: 420,
        format: 'jpeg',
        issues: ['Oversized image'],
      },
    ],
    totalWastedKb: 420,
    totalImages: 8,
    imagesWithIssues: 1,
  },
  thirdParty: {
    services: [
      {
        name: 'Example widget',
        domain: 'widget.example.com',
        blockingTimeMs: 210,
        transferSizeKb: 74,
        requestCount: 3,
        category: 'other',
      },
    ],
    totalBlockingTimeMs: 210,
    totalTransferSizeKb: 74,
    worstOffender: null,
  },
  fonts: {
    issues: [],
    renderBlockingCount: 0,
    missingFontDisplayCount: 0,
    totalFontSizeKb: 38,
    googleFontsCount: 0,
  },
}
