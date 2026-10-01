'use client'

import { Download, FileText } from 'lucide-react'
import type { AuditReport } from '@/lib/types'
import { formatVitalValue } from '@/lib/utils'
import { CopyButton } from '@/components/ui/CopyButton'

function buildMarkdown(report: AuditReport): string {
  return [
    `# ShipAudit — ${report.url}`,
    `Audited ${report.createdAt}. Simulated mobile lab test; not field data.`,
    `Score: ${report.score.current}/100. Potential: ${report.score.achievable}/100 (estimated, not guaranteed).`,
    '## Diagnosis',
    report.executiveSummary,
    '## Measurements',
    '| Metric | Value | Status |',
    '| --- | --- | --- |',
    ...report.vitals.map(
      (v) =>
        `| ${v.metric} | ${formatVitalValue(v.value, v.unit)} | ${v.status} |`,
    ),
    '## Failed checks',
    ...report.findings
      .filter((f) => f.status === 'failed')
      .map(
        (f, i) =>
          `${i + 1}. **${f.title}** — ${f.estimatedPointImpact ? `+${f.estimatedPointImpact} estimated pts` : 'Review needed'}\n${f.description}\n\nSuggested fix: ${f.fix}`,
      ),
    'Point gains overlap; do not add them together.',
    '## Passed checks',
    ...(report.checks ?? [])
      .filter((f) => f.status === 'passed')
      .map((f) => `- ${f.title}`),
    '## Informational / manual checks',
    ...(report.checks ?? [])
      .filter((f) => f.status === 'informational')
      .map((f) => `- ${f.title}: ${f.description}`),
    '## AI fix prompt',
    '```text',
    report.cursorPrompt,
    '```',
  ].join('\n\n')
}
export function ExportButton({ report }: { report: AuditReport }) {
  function download() {
    const url = URL.createObjectURL(
      new Blob([buildMarkdown(report)], { type: 'text/markdown' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `shipaudit-${report.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <details className="export-menu">
      <summary className="button secondary">
        <FileText size={14} /> Export report
      </summary>
      <div className="panel export-options">
        <CopyButton
          text={buildMarkdown(report)}
          label="Copy for GitHub / Linear"
        />
        <button className="button secondary" onClick={download}>
          <Download size={14} /> Download Markdown
        </button>
      </div>
    </details>
  )
}
