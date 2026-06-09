import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const { auditId } = await params

  const status = await redis.get<string>(`audit-status:${auditId}`)

  if (!status) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 })
  }

  const parsed = typeof status === 'string' ? JSON.parse(status) : status

  // First time we see 'processing': update to 'running' then fire the pipeline.
  // Updating first prevents subsequent polls from double-triggering.
  if (parsed.status === 'processing') {
    await redis.set(
      `audit-status:${auditId}`,
      JSON.stringify({ ...parsed, status: 'running' }),
      { ex: 600 }
    )

    const host = req.headers.get('host')
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    fetch(`${protocol}://${host}/api/audit/process/${auditId}`, {
      method: 'POST',
    }).catch(() => {})

    return NextResponse.json({ status: 'processing' })
  }

  // 'running' = pipeline is executing — tell client to keep polling
  if (parsed.status === 'running') {
    return NextResponse.json({ status: 'processing' })
  }

  return NextResponse.json(parsed)
}
