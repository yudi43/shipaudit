import { ImageResponse } from 'next/og'
import { getRedis } from '@/lib/redis'
import type { AuditReport } from '@/lib/types'
import { demoReport } from '@/lib/demo-report'
import { reportView } from '@/lib/report-view'
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const report =
    id === 'demo'
      ? demoReport
      : await getRedis().get<AuditReport>(`report:v2:${id}`)
  const view = report ? reportView(report) : null
  const valid = report && view && !view.invalid && !view.legacy && !view.partial
  const score = valid ? report.score.current : null
  const color =
    score === null
      ? '#a1afa3'
      : score >= 90
        ? '#82d6ad'
        : score >= 60
          ? '#f4c477'
          : '#ff9a8e'
  return new ImageResponse(
    <div
      style={{
        background: '#101311',
        color: '#f1f3e9',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: 64,
        fontFamily: 'sans-serif',
        borderTop: '6px solid #d5f66b',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 28,
        }}
      >
        <span>
          Ship<span style={{ color: '#d5f66b' }}>Audit</span>
        </span>
        <span style={{ color: '#a1afa3', fontSize: 18 }}>
          {id === 'demo' ? 'EXAMPLE REPORT' : 'MOBILE LAB TEST'}
        </span>
      </div>
      <div style={{ fontSize: 40, marginTop: 52 }}>
        {report ? new URL(report.url).hostname : 'Report expired'}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 22,
          marginTop: 22,
        }}
      >
        <span
          style={{
            color,
            fontSize: 130,
            fontFamily: 'monospace',
            lineHeight: 1.1,
          }}
        >
          {score ?? '—'}
        </span>
        <span style={{ color: '#a1afa3', fontSize: 30 }}>
          {score === null ? 'Incomplete signal' : '/100'}
        </span>
        {valid && (
          <span style={{ color: '#d5f66b', fontSize: 28, marginLeft: 32 }}>
            → {report.score.achievable} potential*
          </span>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginTop: 'auto',
          color: '#a1afa3',
          fontSize: 20,
        }}
      >
        <span>
          {valid
            ? `${view.findings.length} failed checks · prioritized fixes`
            : 'Run a fresh audit for a reliable measurement'}
        </span>
        <span>getshipaudit.vercel.app</span>
      </div>
      <div style={{ color: '#a1afa3', fontSize: 14, marginTop: 16 }}>
        *Estimated gains overlap and need a re-test. Reports expire after one
        hour.
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
