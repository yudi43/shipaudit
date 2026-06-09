import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { randomUUID } from 'crypto'
import { normalizeUrl, generateReportId } from '@/lib/utils'
import { detectFramework } from '@/lib/framework-detect'
import type { AuditReport } from '@/lib/types'

export const maxDuration = 10

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(request: NextRequest) {
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

  let url: string
  try {
    url = normalizeUrl(b.url as string)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Cache hit — return immediately
  const reportId = await generateReportId(url)
  const cached = await redis.get<AuditReport>(`report:${reportId}`)
  if (cached) {
    return NextResponse.json({ reportId, status: 'complete' })
  }

  // Detect framework (fetches HTML headers — fast)
  const stack = await detectFramework(url)

  // Generate unique ID for this audit run
  const auditId = randomUUID()
  const host = request.headers.get('host')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const callbackUrl = `${protocol}://${host}/api/audit/callback`

  // Trigger GitHub Actions workflow
  const triggerRes = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/actions/workflows/lighthouse-audit.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { url, callback_url: callbackUrl, audit_id: auditId },
      }),
    }
  )

  if (!triggerRes.ok) {
    const errText = await triggerRes.text()
    console.error('[audit] GitHub Actions trigger failed:', errText)
    return NextResponse.json({ error: 'Failed to start audit' }, { status: 502 })
  }

  // Store pending record — callback route reads url + stack from here
  await redis.set(
    `audit-status:${auditId}`,
    JSON.stringify({ status: 'pending', url, auditId, stack }),
    { ex: 600 }
  )

  return NextResponse.json({ auditId, status: 'pending', reportId })
}
