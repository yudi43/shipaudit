import { ImageResponse } from 'next/og'
import { Redis } from '@upstash/redis'
import type { AuditReport } from '@/lib/types'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const report = await redis.get<AuditReport>(`report:${id}`)

  const domain = report ? new URL(report.url).hostname : 'unknown'
  const score = report?.score.current ?? 0
  const achievable = report?.score.achievable ?? 0
  const findingCount = report?.findings.length ?? 0

  const scoreColor = score >= 90 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  const stats = [
    `${findingCount} issues found`,
    'Throttled mobile',
    'getshipaudit.vercel.app',
  ]

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
          <div
            style={{
              background: '#4f46e5',
              borderRadius: '6px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>SA</div>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '18px' }}>ShipAudit</div>
          <div style={{ color: '#334155', fontSize: '18px' }}>·</div>
          <div style={{ color: '#64748b', fontSize: '18px' }}>Stress Test Report</div>
        </div>

        {/* Domain */}
        <div
          style={{
            color: '#e2e8f0',
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '48px',
            letterSpacing: '-0.5px',
          }}
        >
          {domain}
        </div>

        {/* Score row — use template literals to avoid expression+text multi-child */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '24px' }}>
          <div
            style={{
              color: scoreColor,
              fontSize: '96px',
              fontWeight: 'bold',
              lineHeight: 1,
              fontFamily: 'monospace',
            }}
          >
            {`${score}`}
          </div>
          <div style={{ color: '#475569', fontSize: '36px', fontFamily: 'monospace' }}>/100</div>
          <div style={{ color: '#334155', fontSize: '24px' }}>-&gt;</div>
          <div style={{ color: '#6366f1', fontSize: '28px', fontFamily: 'monospace' }}>
            {`${achievable}/100 achievable`}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
          {stats.map((label) => (
            <div
              key={label}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 20px',
                color: '#64748b',
                fontSize: '16px',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
