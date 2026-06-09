import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const { auditId } = await params

  const status = await redis.get<string>(`audit-status:${auditId}`)

  if (!status) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 })
  }

  const parsed = typeof status === 'string' ? JSON.parse(status) : status

  return NextResponse.json(parsed)
}
