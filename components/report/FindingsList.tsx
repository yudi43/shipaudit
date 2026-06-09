'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Finding } from '@/lib/types'

function FindingRow({ finding, rank, isLast }: { finding: Finding; rank: number; isLast: boolean }) {
  const [open, setOpen] = useState(false)
  const isTop3 = rank <= 3

  return (
    <div className={cn(
      'transition-colors',
      !isLast && 'border-b border-slate-100',
      isTop3 && 'border-l-2 border-l-indigo-200 bg-indigo-50/30',
    )}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
      >
        <span className="text-slate-300 font-mono text-xs w-5 shrink-0 text-right tabular-nums">{rank}</span>
        <span className="flex-1 text-slate-800 text-sm font-medium">{finding.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-indigo-50 text-indigo-700 text-xs font-mono rounded px-2 py-0.5">
            +{finding.estimatedPointImpact} pts
          </span>
          <ChevronDown
            className={cn('w-4 h-4 text-slate-400 transition-transform duration-150', open && 'rotate-180')}
          />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 bg-slate-50 flex flex-col gap-2">
          <p className="text-slate-500 text-xs leading-relaxed mb-2">{finding.description}</p>
          <div className="bg-white border border-slate-200 rounded-md p-3">
            <span className="block text-indigo-500 text-[10px] font-mono uppercase tracking-wider mb-1">Fix</span>
            <p className="text-indigo-700 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
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
    <div className="flex flex-col gap-3">
      <p className="text-slate-400 text-[11px] font-mono uppercase tracking-widest">Findings</p>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {findings.map((f, i) => (
          <FindingRow key={f.id} finding={f} rank={i + 1} isLast={i === findings.length - 1} />
        ))}
      </div>
    </div>
  )
}
