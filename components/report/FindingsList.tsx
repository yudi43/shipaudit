'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Finding } from '@/lib/types'

function FindingRow({ finding, rank }: { finding: Finding; rank: number }) {
  const [open, setOpen] = useState(false)
  const isTop3 = rank <= 3

  return (
    <div className={cn(
      'border-b border-slate-100',
      isTop3 && 'border-l-2 border-l-indigo-200 pl-2'
    )}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 transition-colors -mx-1 px-1 rounded"
      >
        <span className="text-slate-300 font-mono text-xs w-5 shrink-0 text-right tabular-nums">{rank}</span>
        <span className="flex-1 text-slate-700 text-sm">{finding.title}</span>
        <span className="shrink-0 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-xs font-mono">
          +{finding.estimatedPointImpact} pts
        </span>
        <ChevronDown
          className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="pb-3 pl-8 flex flex-col gap-2">
          <p className="text-slate-500 text-xs leading-relaxed">{finding.description}</p>
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
            <p className="text-slate-400 text-[10px] font-mono uppercase mb-1">Fix</p>
            <p className="text-slate-600 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
              {finding.fix}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function FindingsList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <p className="text-slate-500 text-sm">No failing audits found — great job!</p>
  }

  return (
    <div className="flex flex-col gap-0">
      <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-3">Findings</p>
      {findings.map((f, i) => (
        <FindingRow key={f.id} finding={f} rank={i + 1} />
      ))}
    </div>
  )
}
