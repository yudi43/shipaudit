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

  // Store raw LHR in Redis — the main audit route is polling for it
  await redis.set(`lhr:${auditId}`, body, { ex: 600 })

  return NextResponse.json({ ok: true })
}
