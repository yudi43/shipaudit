import { formatVitalValue } from '@/lib/utils'
import type { WebVital, VitalStatus } from '@/lib/types'

const FULL_NAME: Record<WebVital['metric'], string> = {
  LCP:  'Largest Contentful Paint',
  INP:  'Interaction to Next Paint',
  CLS:  'Cumulative Layout Shift',
  FCP:  'First Contentful Paint',
  TTFB: 'Time to First Byte',
}

const STATUS_STYLE: Record<VitalStatus, { value: string; pill: string; label: string }> = {
  'good':              { value: 'text-slate-900',  pill: 'bg-slate-100 text-slate-500',    label: 'Good' },
  'needs-improvement': { value: 'text-amber-600',  pill: 'bg-amber-50 text-amber-700',     label: 'Needs Improvement' },
  'poor':              { value: 'text-red-600',    pill: 'bg-red-50 text-red-700',          label: 'Poor' },
}

export function VitalsGrid({ vitals }: { vitals: WebVital[] }) {
  if (vitals.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Core Web Vitals</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {vitals.map((v) => {
          const s = STATUS_STYLE[v.status]
          return (
            <div key={v.metric} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-1.5">
              <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">{v.metric}</span>
              <span className={`text-2xl font-bold font-mono leading-none ${s.value}`}>
                {formatVitalValue(v.value, v.unit)}
              </span>
              <span className={`self-start px-1.5 py-0.5 rounded-full text-[10px] font-medium ${s.pill}`}>
                {s.label}
              </span>
              <span className="text-slate-400 text-[10px] leading-tight mt-auto">{FULL_NAME[v.metric]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
