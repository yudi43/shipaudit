import { after, NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
export const maxDuration = 60
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const redis = getRedis()
  const { auditId } = await params
  const raw = await redis.get<string>(`audit-status:${auditId}`)
  if (!raw) return NextResponse.json({ status: 'not_found' }, { status: 404 })
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (parsed.status === 'processing') {
    const locked = await redis.set(`audit-lock:${auditId}`, 'processing', {
      nx: true,
      ex: 90,
    })
    if (locked) {
      // after keeps the invocation alive while the report processor responds.
      after(async () => {
        try {
          const response = await fetch(
            new URL(`/api/audit/process/${auditId}`, req.url),
            {
              method: 'POST',
              headers: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
                ? {
                    'x-vercel-protection-bypass':
                      process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
                  }
                : {},
              signal: AbortSignal.timeout(55000),
            },
          )
          if (!response.ok)
            console.error('[audit] Processor response:', response.status)
        } catch {
          // The report may already have completed even if the HTTP connection timed out.
          const latest = await redis.get<string>(`audit-status:${auditId}`)
          const state = typeof latest === 'string' ? JSON.parse(latest) : latest
          if (state?.status === 'processing')
            await redis.set(
              `audit-status:${auditId}`,
              JSON.stringify({
                status: 'error',
                code: 'timeout',
                message: 'The report processor timed out.',
              }),
              { ex: 600 },
            )
        }
      })
    }
    return NextResponse.json({ status: 'processing' })
  }
  return NextResponse.json(parsed, { headers: { 'Cache-Control': 'no-store' } })
}
