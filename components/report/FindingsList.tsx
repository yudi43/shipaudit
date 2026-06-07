'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Finding } from '@/lib/types'

function FindingRow({ finding, rank }: { finding: Finding; rank: number }) {
  const [open, setOpen] = useState(false)
  const isTop3 = rank <= 3

  return (
    <div
      className={cn(
        'border-l-2 bg-zinc-900/50 rounded-r-xl',
        isTop3 ? 'border-indigo-700' : 'border-zinc-800'
      )}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-800/40 transition-colors rounded-r-xl"
      >
        <span className="text-zinc-600 font-mono text-xs w-5 shrink-0 text-right">{rank}</span>
        <span className="flex-1 text-zinc-100 text-sm font-medium">{finding.title}</span>
        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          +{finding.estimatedPointImpact} pts
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
        </motion.span>
      </button>

      {/* Expandable detail */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 ml-8 flex flex-col gap-3">
              <p className="text-zinc-400 text-sm leading-relaxed">{finding.description}</p>
              <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Fix</p>
                <p className="text-indigo-400 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {finding.fix}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FindingsList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <p className="text-zinc-500 text-sm">No failing audits found — great job!</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {findings.map((f, i) => (
        <FindingRow key={f.id} finding={f} rank={i + 1} />
      ))}
    </div>
  )
}
