import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
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

export const maxDuration = 90

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

  // 5. Run Lighthouse worker
  const workerUrl = process.env.LIGHTHOUSE_WORKER_URL ?? 'http://localhost:3001'
  let lhr: LighthouseResult
  try {
    const ac = new AbortController()
    const timeout = setTimeout(() => ac.abort(), 90_000)
    const workerRes = await fetch(`${workerUrl}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: ac.signal,
    })
    clearTimeout(timeout)

    if (!workerRes.ok) {
      const err = await workerRes.text().catch(() => 'Worker error')
      return NextResponse.json({ error: `Lighthouse worker failed: ${err}` }, { status: 502 })
    }

    lhr = await workerRes.json() as LighthouseResult
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Could not reach Lighthouse worker: ${msg}` }, { status: 502 })
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
