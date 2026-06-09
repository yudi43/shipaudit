import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { generateReportId } from '@/lib/utils'
import { parseVitals } from '@/lib/vitals'
import { runRuleEngine } from '@/lib/rule-engine'
import { generateExecutiveSummary, generateCursorPrompt } from '@/lib/summarize'
import { analyzeThirdParties } from '@/lib/third-party-analyzer'
import { analyzeImages } from '@/lib/image-analyzer'
import { analyzeFonts } from '@/lib/font-analyzer'
import { getPostHogClient } from '@/lib/posthog-server'
import type { AuditReport, DetectedStack, LighthouseResult } from '@/lib/types'

export const maxDuration = 10

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const { auditId } = await params

  const [lhrRaw, statusRaw] = await Promise.all([
    redis.get<string>(`lhr:${auditId}`),
    redis.get<string>(`audit-status:${auditId}`),
  ])

  if (!lhrRaw) return NextResponse.json({ error: 'LHR not found' }, { status: 404 })
  if (!statusRaw) return NextResponse.json({ error: 'Status not found' }, { status: 404 })

  const statusData = typeof statusRaw === 'string' ? JSON.parse(statusRaw) : statusRaw
  const { url, stack } = statusData as { url: string; stack: DetectedStack }

  let lhrParsed: Record<string, unknown>
  try {
    lhrParsed = typeof lhrRaw === 'string' ? JSON.parse(lhrRaw) : (lhrRaw as Record<string, unknown>)
  } catch {
    await redis.set(
      `audit-status:${auditId}`,
      JSON.stringify({ status: 'error', message: 'Invalid Lighthouse result' }),
      { ex: 600 }
    )
    return NextResponse.json({ error: 'Invalid LHR' }, { status: 422 })
  }

  if (lhrParsed.error) {
    await redis.set(
      `audit-status:${auditId}`,
      JSON.stringify({ status: 'error', message: lhrParsed.error }),
      { ex: 600 }
    )
    return NextResponse.json({ ok: true })
  }

  try {
    const lhr = lhrParsed as unknown as LighthouseResult

    const vitals = parseVitals(lhr)
    const { score, findings } = runRuleEngine(lhr, stack.framework)
    const thirdParty = analyzeThirdParties(lhr)
    const images = analyzeImages(lhr)
    const fonts = analyzeFonts(lhr)

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

    const reportId = await generateReportId(url)
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

    await redis.set(`report:${reportId}`, report, { ex: 3600 })
    await redis.set(
      `audit-status:${auditId}`,
      JSON.stringify({ status: 'complete', reportId, url }),
      { ex: 600 }
    )
    await redis.del(`lhr:${auditId}`)

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
      },
    })
    await posthog.shutdown()

    return NextResponse.json({ ok: true, reportId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipeline failed'
    await redis.set(
      `audit-status:${auditId}`,
      JSON.stringify({ status: 'error', message }),
      { ex: 600 }
    )
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
