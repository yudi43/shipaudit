import { notFound } from 'next/navigation'
import { cache } from 'react'
import { getRedis } from '@/lib/redis'
import type { Metadata } from 'next'
import type { AuditReport } from '@/lib/types'
import { demoReport } from '@/lib/demo-report'
import { reportView } from '@/lib/report-view'
import ReportDashboard from '@/components/report/ReportDashboard'

const getReport = cache(async (id: string) => {
  if (id === 'demo') return demoReport
  const redis = getRedis()
  const [current, legacy] = await Promise.all([
    redis.get<AuditReport>(`report:v2:${id}`),
    redis.get<AuditReport>(`report:${id}`),
  ])
  return current ?? legacy
})
type Props = { params: Promise<{ id: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const report = await getReport(id)
  if (!report) return { title: 'Report expired | ShipAudit' }
  const domain = new URL(report.url).hostname
  const view = reportView(report)
  const measured = !view.invalid && !view.partial && !view.legacy
  const title =
    id === 'demo'
      ? 'Explore an example report | ShipAudit'
      : measured
        ? `${domain} scored ${report.score.current}/100 | ShipAudit`
        : `${domain} · incomplete measurement | ShipAudit`
  const description =
    id === 'demo'
      ? 'Explore the interactive ShipAudit report with illustrative sample data.'
      : measured
        ? `${report.findings.length} failed checks. A prioritized fix plan for ${domain}.`
        : 'Run a fresh audit for a reliable measurement and prioritized fixes.'
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og/report/${id}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og/report/${id}`],
    },
  }
}
export default async function ReportPage({ params }: Props) {
  const { id } = await params
  const report = await getReport(id)
  if (!report) notFound()
  return <ReportDashboard report={report} demo={id === 'demo'} />
}
