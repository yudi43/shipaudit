import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Redis } from '@upstash/redis'
import type { Metadata } from 'next'
import type { AuditReport } from '@/lib/types'
import { ReportFadeIn } from '@/components/report/ReportFadeIn'
import { StackBadges } from '@/components/report/StackBadges'
import { ScoreCard } from '@/components/report/ScoreCard'
import { ExecutiveSummary } from '@/components/report/ExecutiveSummary'
import { VitalsGrid } from '@/components/report/VitalsGrid'
import { ThirdPartyAudit } from '@/components/report/ThirdPartyAudit'
import { ImageAudit } from '@/components/report/ImageAudit'
import { FontAudit } from '@/components/report/FontAudit'
import { FindingsList } from '@/components/report/FindingsList'
import { CursorPromptButton } from '@/components/report/CursorPromptButton'
import { ExportButton } from '@/components/report/ExportButton'
import { WaitlistCTA } from '@/components/report/WaitlistCTA'
import { ReanalyzeButton } from '@/components/report/ReanalyzeButton'
import { MeasurementContext } from '@/components/report/MeasurementContext'
import Logo from '@/components/Logo'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const report = await redis.get<AuditReport>(`report:${id}`)

  if (!report) return { title: 'Report Not Found — ShipAudit' }

  const domain = new URL(report.url).hostname
  const title = `${domain} scored ${report.score.current}/100 — ShipAudit`
  const snippet = report.executiveSummary ? report.executiveSummary.slice(0, 120) + '…' : ''
  const description = `${domain} scored ${report.score.current}/100 on ShipAudit's stress test. Achievable: ${report.score.achievable}/100. ${report.findings.length} issues found. ${snippet}`
  const ogImage = `/api/og/report/${id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://getshipaudit.vercel.app/report/${id}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params
  const report = await redis.get<AuditReport>(`report:${id}`)
  if (!report) notFound()

  const auditedAt = new Date(report.createdAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const hasStack =
    report.stack.framework !== 'Unknown' ||
    report.stack.deployPlatform !== 'Unknown' ||
    report.stack.hasTailwind

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" theme="light" />
          </Link>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <p className="text-slate-700 font-mono text-xs truncate">{report.url}</p>
            <p className="text-slate-400 text-xs whitespace-nowrap">Audited {auditedAt}</p>
          </div>
          <ReanalyzeButton url={report.url} />
        </div>
      </header>

      <ReportFadeIn>
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex flex-col divide-y divide-slate-200">

            {hasStack && (
              <section className="py-8">
                <StackBadges stack={report.stack} />
              </section>
            )}

            <section className="pb-6">
              <MeasurementContext />
            </section>

            <section className="py-8">
              <ScoreCard score={report.score} />
            </section>

            {report.executiveSummary && (
              <section className="py-8">
                <ExecutiveSummary summary={report.executiveSummary} />
              </section>
            )}

            {report.vitals.length > 0 && (
              <section className="py-8">
                <VitalsGrid vitals={report.vitals} />
              </section>
            )}

            {report.thirdParty && report.thirdParty.services.length > 0 && (
              <section className="py-8">
                <ThirdPartyAudit data={report.thirdParty} />
              </section>
            )}

            {report.images && report.images.totalWastedKb >= 50 && (
              <section className="py-8">
                <ImageAudit data={report.images} />
              </section>
            )}

            {report.fonts && (
              <section className="py-8">
                <FontAudit data={report.fonts} />
              </section>
            )}

            <section className="py-8">
              <FindingsList findings={report.findings} />
            </section>

            <section className="py-8">
              <CursorPromptButton cursorPrompt={report.cursorPrompt} />
            </section>

            <section className="py-8 flex">
              <ExportButton report={report} />
            </section>

            <section className="py-8">
              <WaitlistCTA findingCount={report.findings.length} />
            </section>

          </div>
        </div>
      </ReportFadeIn>
    </div>
  )
}
