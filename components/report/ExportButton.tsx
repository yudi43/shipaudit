'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, GitBranch, Download, Layout } from 'lucide-react'
import type { AuditReport } from '@/lib/types'

function buildMarkdown(report: AuditReport): string {
  const vitalsTable = [
    '| Metric | Value | Status |',
    '|--------|-------|--------|',
    ...report.vitals.map((v) => `| ${v.metric} | ${v.value}${v.unit} | ${v.status} |`),
  ].join('\n')

  const findingsList = report.findings
    .map(
      (f, i) =>
        `${i + 1}. **${f.title}** (+${f.estimatedPointImpact} pts)\n   ${f.description}\n\n   **Fix:** ${f.fix}`
    )
    .join('\n\n')

  return [
    `## ShipAudit Report — ${report.url}`,
    '',
    `**Score:** ${report.score.current}/100 (achievable: ${report.score.achievable}/100)`,
    '',
    '### Executive Summary',
    report.executiveSummary,
    '',
    '### Core Web Vitals',
    vitalsTable,
    '',
    '### Top Issues',
    findingsList,
    '',
    '### AI Fix Prompt',
    '```',
    report.cursorPrompt,
    '```',
  ].join('\n')
}

export function ExportButton({ report }: { report: AuditReport }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function copyToClipboard(label: string) {
    await navigator.clipboard.writeText(buildMarkdown(report))
    setCopied(label)
    setOpen(false)
    setTimeout(() => setCopied(null), 2000)
  }

  function downloadMarkdown() {
    const blob = new Blob([buildMarkdown(report)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipaudit-${report.id}.md`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const options = [
    { icon: <GitBranch className="w-3.5 h-3.5" />, label: 'GitHub Issue',      action: () => copyToClipboard('GitHub Issue') },
    { icon: <Layout className="w-3.5 h-3.5" />,    label: 'Linear Ticket',     action: () => copyToClipboard('Linear Ticket') },
    { icon: <Download className="w-3.5 h-3.5" />,  label: 'Download Markdown', action: downloadMarkdown },
  ]

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 text-sm hover:border-slate-300 hover:text-slate-700 transition-colors"
      >
        {copied ? 'Copied' : 'Export'}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-20">
          {options.map((o) => (
            <button
              key={o.label}
              onClick={o.action}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
            >
              <span className="text-slate-400">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
