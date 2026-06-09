import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-audit-secret')
  if (secret !== process.env.AUDIT_CALLBACK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const auditId = req.headers.get('x-audit-id')
  if (!auditId) {
    return NextResponse.json({ error: 'Missing audit ID' }, { status: 400 })
  }

  const body = await req.text()

  // Store the raw LHR for the process route to consume
  await redis.set(`lhr:${auditId}`, body, { ex: 600 })

  // Advance status to 'processing' — the next status poll will trigger the pipeline
  const statusRaw = await redis.get<string>(`audit-status:${auditId}`)
  if (statusRaw) {
    const existing = typeof statusRaw === 'string' ? JSON.parse(statusRaw) : statusRaw
    await redis.set(
      `audit-status:${auditId}`,
      JSON.stringify({ ...existing, status: 'processing' }),
      { ex: 600 }
    )
  }

  // Respond immediately — GitHub Actions doesn't need to wait for the pipeline
  return NextResponse.json({ ok: true })
}
