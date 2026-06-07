'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, GitBranch, Download, Link2 } from 'lucide-react'
import type { AuditReport } from '@/lib/types'

function buildMarkdown(report: AuditReport): string {
  const vitalsTable = [
    '| Metric | Value | Status |',
    '|--------|-------|--------|',
    ...report.vitals.map(
      (v) => `| ${v.metric} | ${v.value}${v.unit} | ${v.status} |`
    ),
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
    '### Cursor Fix Prompt',
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
    { icon: <GitBranch className="w-4 h-4" />, label: 'GitHub Issue', action: () => copyToClipboard('GitHub Issue') },
    { icon: <Link2 className="w-4 h-4" />, label: 'Linear Ticket', action: () => copyToClipboard('Linear Ticket') },
    { icon: <Download className="w-4 h-4" />, label: 'Download Markdown', action: downloadMarkdown },
  ]

  const buttonLabel = copied ? `Copied for ${copied}` : 'Export'

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-600 hover:text-zinc-100 transition-colors"
      >
        {buttonLabel}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-20"
          >
            {options.map((o) => (
              <button
                key={o.label}
                onClick={o.action}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-left"
              >
                <span className="text-zinc-500">{o.icon}</span>
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
