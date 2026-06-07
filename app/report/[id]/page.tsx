import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Redis } from '@upstash/redis'
import type { AuditReport } from '@/lib/types'
import { AnimatedSection } from '@/components/report/AnimatedSection'
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const sections: { label: string; node: React.ReactNode }[] = [
    { label: 'stack',    node: <StackBadges stack={report.stack} /> },
    { label: 'score',    node: <ScoreCard score={report.score} /> },
    { label: 'summary',  node: <ExecutiveSummary summary={report.executiveSummary} /> },
    { label: 'vitals',   node: <VitalsGrid vitals={report.vitals} /> },
    { label: 'findings', node: <FindingsList findings={report.findings} /> },
    { label: 'cursor',   node: <CursorPromptButton cursorPrompt={report.cursorPrompt} /> },
    { label: 'export',   node: <ExportButton report={report} /> },
    { label: 'waitlist', node: <WaitlistCTA findingCount={report.findings.length} /> },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div className="flex flex-col gap-1.5">
            <Link
              href="/"
              className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
            >
              ← Analyze another URL
            </Link>
            <p className="text-zinc-500 text-sm font-mono break-all">{report.url}</p>
            <p className="text-zinc-700 text-xs">Audited {auditedAt}</p>
          </div>
          <ReanalyzeButton url={report.url} />
        </div>

        {/* Sections */}
        <div className="flex flex-col divide-y divide-zinc-800">
          {sections.map(({ label, node }) => (
            <div key={label} className="py-10">
              <AnimatedSection>{node}</AnimatedSection>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
