import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { randomUUID } from 'crypto'
import { normalizeUrl, generateReportId } from '@/lib/utils'
import { detectFramework } from '@/lib/framework-detect'
import { reportView } from '@/lib/report-view'
import type { AuditReport } from '@/lib/types'

export const maxDuration = 30
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'invalid_url' },
      { status: 400 },
    )
  }
  const b = body as Record<string, unknown>
  if (!body || typeof body !== 'object' || typeof b.url !== 'string')
    return NextResponse.json(
      { error: 'Enter a website URL', code: 'invalid_url' },
      { status: 400 },
    )
  let url: string
  try {
    url = normalizeUrl(b.url)
  } catch {
    return NextResponse.json(
      { error: 'Enter a public http or https URL', code: 'invalid_url' },
      { status: 400 },
    )
  }
  try {
    const redis = getRedis()
    const reportId = await generateReportId(url)
    if (b.refresh !== true) {
      const cached = await redis.get<AuditReport>(`report:v2:${reportId}`)
      if (
        cached &&
        cached.dataVersion === 2 &&
        !reportView(cached).invalid &&
        cached.measurement?.status === 'complete'
      )
        return NextResponse.json({ reportId, status: 'complete' })
    }
    const stack = await detectFramework(url)
    const auditId = randomUUID()
    const callbackUrl = new URL(
      '/api/audit/callback',
      process.env.AUDIT_CALLBACK_ORIGIN || request.url,
    ).toString()
    // Persist before dispatch: the callback can arrive as soon as the runner starts.
    // Keep request metadata separate from mutable status, including callbacks
    // handled by an older deployment during a preview rollout.
    await redis.set(`audit-request:${auditId}`, { url, stack }, { ex: 600 })
    await redis.set(
      `audit-status:${auditId}`,
      JSON.stringify({ status: 'pending', url, auditId, stack }),
      { ex: 600 },
    )
    const triggerRes = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/actions/workflows/lighthouse-audit.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: { url, callback_url: callbackUrl, audit_id: auditId },
        }),
        signal: AbortSignal.timeout(12000),
      },
    )
    if (!triggerRes.ok) {
      console.error('[audit] Runner dispatch failed:', triggerRes.status)
      await redis.del(`audit-status:${auditId}`)
      await redis.del(`audit-request:${auditId}`)
      return NextResponse.json(
        { error: 'The runner could not start', code: 'service' },
        { status: 502 },
      )
    }
    return NextResponse.json({ auditId, status: 'pending', reportId })
  } catch (error) {
    console.error(
      '[audit] Service failure:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return NextResponse.json(
      { error: 'The audit service is unavailable', code: 'service' },
      { status: 503 },
    )
  }
}
