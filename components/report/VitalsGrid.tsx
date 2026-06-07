'use client'

import { motion } from 'framer-motion'
import { formatVitalValue } from '@/lib/utils'
import type { WebVital, VitalStatus } from '@/lib/types'

const FULL_NAME: Record<WebVital['metric'], string> = {
  LCP:  'Largest Contentful Paint',
  INP:  'Interaction to Next Paint',
  CLS:  'Cumulative Layout Shift',
  FCP:  'First Contentful Paint',
  TTFB: 'Time to First Byte',
}

const STATUS_STYLE: Record<VitalStatus, { text: string; pill: string; label: string }> = {
  'good':              { text: 'text-emerald-400', pill: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', label: 'Good' },
  'needs-improvement': { text: 'text-amber-400',   pill: 'bg-amber-400/10 text-amber-400 border-amber-400/20',   label: 'Needs Improvement' },
  'poor':              { text: 'text-red-400',      pill: 'bg-red-400/10 text-red-400 border-red-400/20',         label: 'Poor' },
}

export function VitalsGrid({ vitals }: { vitals: WebVital[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {vitals.map((v, i) => {
        const s = STATUS_STYLE[v.status]
        return (
          <motion.div
            key={v.metric}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2"
          >
            <span className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
              {v.metric}
            </span>
            <span className={`text-2xl font-mono font-bold leading-none ${s.text}`}>
              {formatVitalValue(v.value, v.unit)}
            </span>
            <span className={`self-start px-2 py-0.5 rounded-full border text-[10px] font-medium ${s.pill}`}>
              {s.label}
            </span>
            <span className="text-zinc-600 text-[10px] leading-tight mt-auto">
              {FULL_NAME[v.metric]}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
