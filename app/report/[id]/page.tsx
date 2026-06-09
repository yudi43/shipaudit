import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Redis } from '@upstash/redis'
import type { AuditReport } from '@/lib/types'
import { ReportFadeIn } from '@/components/report/ReportFadeIn'
import { StackBadges } from '@/components/report/StackBadges'
import { ScoreCard } from '@/components/report/ScoreCard'
import { ExecutiveSummary } from '@/components/report/ExecutiveSummary'
import { VitalsGrid } from '@/components/report/VitalsGrid'
import { FindingsList } from '@/components/report/FindingsList'
import { CursorPromptButton } from '@/components/report/CursorPromptButton'
import { ExportButton } from '@/components/report/ExportButton'
import { WaitlistCTA } from '@/components/report/WaitlistCTA'
import { ReanalyzeButton } from '@/components/report/ReanalyzeButton'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <Link
              href="/"
              className="text-indigo-600 text-sm hover:text-indigo-800 hover:underline transition-colors no-underline w-fit"
            >
              ← Analyze another URL
            </Link>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-slate-700 font-mono text-xs truncate max-w-xs">{report.url}</p>
              <span className="text-slate-300 text-xs">·</span>
              <p className="text-slate-400 text-xs whitespace-nowrap">Audited {auditedAt}</p>
            </div>
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
