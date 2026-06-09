import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { randomUUID } from 'crypto'
import { normalizeUrl, generateReportId } from '@/lib/utils'
import { detectFramework } from '@/lib/framework-detect'
import { parseVitals } from '@/lib/vitals'
import { runRuleEngine } from '@/lib/rule-engine'
import { generateExecutiveSummary, generateCursorPrompt } from '@/lib/summarize'
import { analyzeThirdParties } from '@/lib/third-party-analyzer'
import { analyzeImages } from '@/lib/image-analyzer'
import { analyzeFonts } from '@/lib/font-analyzer'
import { getPostHogClient } from '@/lib/posthog-server'
import type { AuditReport, LighthouseResult } from '@/lib/types'

export const maxDuration = 300

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(request: NextRequest) {
  // 1. Parse + validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  if (!body || typeof body !== 'object' || typeof b.url !== 'string') {
    return NextResponse.json({ error: 'Missing required field: url' }, { status: 400 })
  }

  const refresh = b.refresh === true

  // 2. Normalize URL
  let url: string
  try {
    url = normalizeUrl(b.url as string)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // 3. Cache check (skip if refresh=true)
  const reportId = await generateReportId(url)
  const cacheKey = `report:${reportId}`
  if (!refresh) {
    const cached = await redis.get<AuditReport>(cacheKey)
    if (cached) return NextResponse.json({ reportId })
  }

  // 4. Detect framework
  const stack = await detectFramework(url)

  // 5. Trigger GitHub Actions Lighthouse run and poll for result
  const auditId = randomUUID()
  const host = request.headers.get('host')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const callbackUrl = `${protocol}://${host}/api/audit/callback`

  const triggerRes = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/actions/workflows/lighthouse-audit.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { url, callback_url: callbackUrl, audit_id: auditId },
      }),
    }
  )

  if (!triggerRes.ok) {
    const error = await triggerRes.text()
    console.error('[audit] Failed to trigger GitHub Actions:', error)
    return NextResponse.json({ error: 'Failed to start audit' }, { status: 502 })
  }

  // Poll Redis for the LHR result (max 3 minutes)
  const maxWaitMs = 180_000
  const pollIntervalMs = 3_000
  const startTime = Date.now()
  let lhrData: string | null = null

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    lhrData = await redis.get<string>(`lhr:${auditId}`)
    if (lhrData) break
  }

  if (!lhrData) {
    return NextResponse.json({ error: 'Audit timed out — please try again' }, { status: 504 })
  }

  await redis.del(`lhr:${auditId}`)

  let lhr: LighthouseResult
  try {
    const parsed = typeof lhrData === 'string' ? JSON.parse(lhrData) : lhrData
    if ((parsed as Record<string, unknown>).error) {
      return NextResponse.json({ error: (parsed as Record<string, unknown>).error }, { status: 502 })
    }
    lhr = parsed as LighthouseResult
  } catch {
    return NextResponse.json({ error: 'Invalid Lighthouse result' }, { status: 502 })
  }

  // 6–7. Parse vitals + run rule engine
  const vitals = parseVitals(lhr)
  const { score, findings } = runRuleEngine(lhr, stack.framework)

  // 8. Run diagnostic modules (deterministic, no AI)
  const thirdParty = analyzeThirdParties(lhr)
  const images = analyzeImages(lhr)
  const fonts = analyzeFonts(lhr)

  // 9. Generate AI prose in parallel
  const [executiveSummary, cursorPrompt] = await Promise.all([
    generateExecutiveSummary({
      url,
      stack,
      vitals,
      topFindings: score.topOpportunities,
      currentScore: score.current,
      achievableScore: score.achievable,
      thirdParty,
      images,
      fonts,
    }),
    generateCursorPrompt({ url, stack, findings, thirdParty, images, fonts }),
  ])

  // 10. Assemble report
  const report: AuditReport = {
    id: reportId,
    url,
    createdAt: new Date().toISOString(),
    stack,
    score,
    vitals,
    findings,
    executiveSummary,
    cursorPrompt,
    thirdParty,
    images,
    fonts,
  }

  // 11. Cache for 1 hour
  await redis.set(cacheKey, report, { ex: 3600 })

  // 12. Track completion
  const posthog = getPostHogClient()
  posthog.capture({
    distinctId: url,
    event: 'audit_completed',
    properties: {
      url,
      report_id: reportId,
      framework: stack.framework,
      deploy_platform: stack.deployPlatform,
      score: score.current,
      achievable_score: score.achievable,
      findings_count: findings.length,
      is_refresh: refresh,
    },
  })
  await posthog.shutdown()

  // 13. Return
  return NextResponse.json({ reportId })
}
